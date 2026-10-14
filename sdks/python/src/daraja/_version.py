"""Runtime accessor for the Python SDK version.

``pyproject.toml`` (``[project]`` → ``version``) is the single source of truth,
and it is also what the build backend records as the installed distribution
metadata. This module resolves that value so the version string is never
duplicated in code:

1. when running from a source checkout, the adjacent ``pyproject.toml`` is read
   directly (so a development tree is correct without reinstalling);
2. otherwise the installed distribution metadata is used, because a built wheel
   does not ship ``pyproject.toml``.

Importing this module never raises: if neither source is available the version
degrades to ``"0.0.0+unknown"``.
"""

import tomllib
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

_DISTRIBUTION = "daraja-sdk-py"
_SOURCE_PYPROJECT = Path(__file__).resolve().parents[2] / "pyproject.toml"
_UNKNOWN = "0.0.0+unknown"


def _from_pyproject() -> str | None:
    """Read ``[project].version`` from the adjacent ``pyproject.toml``."""
    if not _SOURCE_PYPROJECT.is_file():
        return None
    try:
        with _SOURCE_PYPROJECT.open("rb") as handle:
            project = tomllib.load(handle)["project"]
        return str(project["version"])
    except (KeyError, OSError, tomllib.TOMLDecodeError):
        return None


def _from_installed_distribution() -> str | None:
    """Read the version recorded in the installed distribution metadata."""
    try:
        return version(_DISTRIBUTION)
    except PackageNotFoundError:
        return None


def _resolve_version() -> str:
    """Resolve the version, preferring the checkout's ``pyproject.toml``."""
    return _from_pyproject() or _from_installed_distribution() or _UNKNOWN


__version__: str = _resolve_version()
