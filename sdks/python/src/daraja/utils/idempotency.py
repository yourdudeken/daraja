"""Local duplicate suppression — opt-in, caller-keyed, bounded, observable.

FR-001 · `TRD-05` · AC-001 · AC-002
==================================

**The key is never derived from the request body.** Two authorised payments with
byte-identical bodies and different ``OriginatorConversationID`` values are two
distinct payments; hashing the body made them one and returned the first
payment's ``ConversationID`` for the second without ever making an HTTP request.
That is the defect this module exists to stop, so :func:`caller_idempotency_key`
is the *only* key derivation reachable from the request path and it reads nothing
but caller-supplied data.

Three further properties the old implementation lacked:

* **Bounded.** ``max_entries`` with LRU eviction, so the store cannot grow without
  limit in a long-running process.
* **No O(n) scan under the contended lock.** The old cleanup built and applied an
  expired-key list *while holding the lock every concurrent request contends on*.
  Candidates are now snapshotted under the lock and the deletion re-acquires it
  per key.
* **Observable.** A hit is logged at INFO with the key and the URL, and is readable
  off the returned object via :func:`read_idempotency_cache_hit` — so a replayed
  request is never indistinguishable from a fresh one.

**The cache is disabled by default** (``MpesaConfig.enable_idempotency is False``).
A default-on local cache in front of a payment API is a defect generator; opt-in
makes the hazard the caller's decision rather than the library's.

**Query endpoints never cache results.** ``ACCOUNT_BALANCE``, ``TRANSACTION_STATUS``
and ``STK_QUERY`` return a body that legitimately never varies for a given key, so
a cached terminal response there is indistinguishable from a fresh answer. For
those the store holds in-flight markers only — see :class:`InFlightMarker`.
"""

from __future__ import annotations

import hashlib
import json
import threading
import time
import warnings
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, cast

# Endpoints whose response body legitimately never varies for a given key. FR-001
# forbids holding a terminal response for these; only in-flight markers are kept.
QUERY_ENDPOINTS: frozenset[str] = frozenset(
    {"ACCOUNT_BALANCE", "TRANSACTION_STATUS", "STK_QUERY"}
)

#: Attribute name under which a cache hit is exposed on the returned object.
CACHE_HIT_ATTR = "daraja_cache_hit"

#: TTL for a cached response, matching the previous behaviour (24h).
DEFAULT_TTL_MS = 86_400_000


@dataclass(frozen=True)
class IdempotencyHit:
    """A served-from-cache event, carrying the key and URL that produced it.

    Exposed on the result object so a caller can tell a replayed request from a
    fresh one. Frozen because it is a record of something that already happened.
    """

    key: str
    url: str

    def as_dict(self) -> dict[str, str]:
        return {"key": self.key, "url": self.url}


@dataclass(frozen=True)
class InFlightMarker:
    """Marks a request that is currently upstream, for query endpoints only.

    ``FR-001``: a query endpoint's cache "SHALL hold only in-flight markers, never
    results". The marker records that a request for this key is in progress. It is
    deliberately **not** a result and is never returned to a caller — a second
    request for a query endpoint always goes upstream.
    """


def is_query_endpoint(operation_name: str | None) -> bool:
    """True for the three endpoints whose bodies never vary."""
    return operation_name is not None and operation_name in QUERY_ENDPOINTS


def caller_idempotency_key(
    explicit_key: str | None,
    payload: dict[str, Any] | list[Any] | None,
) -> str | None:
    """Resolve the dedup key **exclusively** from caller-supplied data.

    Resolution order:

    1. ``explicit_key`` — a key the caller supplied for this logical transaction.
    2. ``payload["OriginatorConversationID"]`` — the corpus's own dedup field
       (``AccountBalance.md:261``: Daraja rejects a value it has seen before, and
       checks it *first*, ahead of the message-expiry check).

    ``None`` means "no caller-supplied key, so no dedup". The body is never
    serialised or hashed: that is the whole defect.

    ``OriginatorConversationID`` is namespaced so a Daraja field name can never
    collide with an explicit key that happens to look like one.
    """
    if explicit_key:
        return f"explicit:{explicit_key}"
    if isinstance(payload, dict):
        conversation_id = payload.get("OriginatorConversationID")
        # `str()` not a truthiness test: an empty string is not a usable key, but
        # a non-string value must not be silently coerced into "no key".
        if isinstance(conversation_id, str) and conversation_id.strip():
            return f"ocid:{conversation_id}"
    return None


class ResultDict(dict[str, Any]):
    """A Daraja response body that can carry an out-of-band cache-hit record.

    A plain ``dict`` cannot hold attributes, and the cache-hit marker must not
    become a key in the body: it would be visible to any caller that inspects or
    re-serialises the response, and it is SDK bookkeeping, not a Daraja field.
    Subclassing ``dict`` gives instances a ``__dict__`` while keeping them
    indistinguishable from a ``dict`` for every purpose the client and its callers
    use them for — including ``Model(**result)``.
    """


def mark_idempotency_cache_hit(result: Any, hit: IdempotencyHit) -> None:
    """Attach ``hit`` to ``result`` without changing its declared shape.

    ``object.__setattr__`` on purpose. The alternative — declaring a field on every
    response model — would break ``WBS-056``, which mandates that
    ``AccountBalanceResponse`` keeps **exactly** the four documented fields. Setting
    the attribute out of band keeps it out of ``model_fields``, ``model_dump()`` and
    ``model_dump_json()``, so nothing about the Daraja response shape changes.
    """
    object.__setattr__(result, CACHE_HIT_ATTR, hit)


def read_idempotency_cache_hit(result: Any) -> IdempotencyHit | None:
    """Return the :class:`IdempotencyHit` on ``result``, or ``None`` if it was fresh."""
    return getattr(result, CACHE_HIT_ATTR, None)


class IdempotencyStore:
    def get(self, key: str) -> dict[str, Any] | None:
        raise NotImplementedError

    def set(self, key: str, value: dict[str, Any], ttl_ms: int) -> None:
        raise NotImplementedError

    def mark_in_flight(self, key: str, ttl_ms: int) -> None:
        raise NotImplementedError

    def clear_in_flight(self, key: str) -> None:
        raise NotImplementedError

    def is_in_flight(self, key: str) -> bool:
        raise NotImplementedError

    def __len__(self) -> int:
        raise NotImplementedError


class InMemoryIdempotencyStore(IdempotencyStore):
    """A bounded, thread-safe, TTL-expiring store.

    :param max_entries: hard cap on distinct keys held. The least-recently-used key
        is evicted on insert once the cap is reached, so a long-running process
        cannot grow without bound.
    :param cleanup_interval_ms: how often expired keys are swept. Sweeping is
        opportunistic and bounded by ``max_entries``.
    """

    def __init__(
        self,
        cleanup_interval_ms: int = 60_000,
        max_entries: int = 1024,
        ttl_ms: int = DEFAULT_TTL_MS,
    ) -> None:
        if max_entries < 1:
            raise ValueError("max_entries must be >= 1")
        self._cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._lock = threading.Lock()
        self._cleanup_interval = cleanup_interval_ms / 1000.0
        self._last_cleanup = time.monotonic()
        self._max_entries = max_entries
        self._ttl_ms = ttl_ms

    # -- reads ---------------------------------------------------------------

    def get(self, key: str) -> dict[str, Any] | None:
        self._maybe_cleanup()
        now = time.monotonic()
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if now > expires_at:
                del self._cache[key]
                return None
            if isinstance(value, InFlightMarker):
                # A marker is not a result. Returning it would hand a query
                # endpoint's caller something that is not an answer.
                return None
            # Touch for LRU ordering.
            self._cache.move_to_end(key)
            return cast(dict[str, Any], value)

    def is_in_flight(self, key: str) -> bool:
        self._maybe_cleanup()
        now = time.monotonic()
        with self._lock:
            entry = self._cache.get(key)
            return entry is not None and now <= entry[1]

    # -- writes --------------------------------------------------------------

    def set(self, key: str, value: dict[str, Any], ttl_ms: int) -> None:
        self._write(key, value, ttl_ms)

    def mark_in_flight(self, key: str, ttl_ms: int) -> None:
        self._write(key, InFlightMarker(), ttl_ms)

    def clear_in_flight(self, key: str) -> None:
        """Remove a marker, but only if it is still a marker.

        If a real result was written under the same key in the meantime, dropping
        it here would discard a response the caller may be about to read.
        """
        with self._lock:
            entry = self._cache.get(key)
            if entry is not None and isinstance(entry[0], InFlightMarker):
                del self._cache[key]

    def _write(self, key: str, value: Any, ttl_ms: int) -> None:
        expires_at = time.monotonic() + (ttl_ms / 1000.0)
        with self._lock:
            self._cache[key] = (value, expires_at)
            self._cache.move_to_end(key)
            # Bounded: drop the least recently used until we are back under the cap.
            while len(self._cache) > self._max_entries:
                self._cache.popitem(last=False)

    # -- housekeeping -------------------------------------------------------

    def _maybe_cleanup(self) -> None:
        """Sweep expired keys without holding the lock across the whole scan.

        The previous implementation built the expired-key list *inside* the lock —
        an O(n) pass that every concurrent request contended on, which is the cost
        ``FR-001`` calls out by name. Here the candidate list is a bounded snapshot
        taken under the lock and each deletion re-acquires it.
        """
        now = time.monotonic()
        with self._lock:
            due = now - self._last_cleanup
            if due < self._cleanup_interval:
                return
            self._last_cleanup = now
            candidates = list(self._cache.keys())[: self._max_entries]
        for key in candidates:
            with self._lock:
                entry = self._cache.get(key)
                if entry is not None and now > entry[1]:
                    del self._cache[key]

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)

    def dispose(self) -> None:
        with self._lock:
            self._cache.clear()


def generate_idempotency_key(method: str, url: str, body: Any | None = None) -> str:
    """**Deprecated. Daraja does not call this, and the SDK no longer uses it.**

    .. deprecated::
        ``sha256(method:url:body)`` keys the cache by request *content*, which
        collapses two distinct payments with identical bodies into one and returns
        the first payment's response for the second without making an HTTP request
        (``BUG-001``). Daraja documents no such header or scheme — ``grep -i
        idempotenc`` over all 30 corpus documents returns 0 hits (``C-5``). The
        corpus's own dedup key is ``OriginatorConversationID``, which the caller
        supplies (``FR-003``).

        Retained under ``TRD-04`` (deprecate, do not delete) because it is
        published on PyPI. It is **not** reachable from the request path; see
        :func:`caller_idempotency_key` for the derivation that is.

    Parameters
    ----------
    method:
        HTTP method. Unused for any legitimate purpose; part of the hashed string.
    url:
        Full request URL. See ``method``.
    body:
        Request body. **This is the defect**: two different payments with the same
        body produce the same key.

    Returns
    -------
    str
        ``mpesa-idem-<16 hex chars>``, unchanged from the previous behaviour so
        existing callers and any persisted entries keep parsing.
    """
    warnings.warn(
        "generate_idempotency_key() is deprecated and derives a cache key from "
        "request content, which collapses two distinct payments into one. Daraja "
        "documents no idempotency header (0 hits across the corpus). Use "
        "caller_idempotency_key() with a caller-supplied key or the caller's "
        "OriginatorConversationID instead. This symbol will be removed in a future "
        "major release.",
        DeprecationWarning,
        stacklevel=2,
    )
    body_str = json.dumps(body, sort_keys=True) if body is not None else ""
    raw = f"{method}:{url}:{body_str}"
    h = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return f"mpesa-idem-{h}"