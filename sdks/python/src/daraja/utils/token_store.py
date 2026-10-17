import json
import os
from datetime import datetime
from typing import Any

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from daraja.models import Logger, _get_logger

#: Current on-disk envelope version: PBKDF2-SHA256 with a per-file random salt.
VERSION = 2


class EncryptedTokenStore:
    def __init__(
        self, file_path: str, encryption_key: str, logger: Logger | None = None
    ) -> None:
        self._file_path = file_path
        self._password = encryption_key.encode("utf-8")
        self._logger = _get_logger(logger)

    def _derive_key(self, salt: bytes | None = None) -> tuple[bytes, bytes]:
        if salt is None:
            salt = os.urandom(16)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=200_000,
            backend=default_backend(),
        )
        key = kdf.derive(self._password)
        return key, salt

    def save(self, token: str, expires_at: datetime) -> None:
        key, salt = self._derive_key()
        iv = os.urandom(16)
        cipher = Cipher(algorithms.AES(key), modes.GCM(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        encrypted = encryptor.update(token.encode()) + encryptor.finalize()

        os.makedirs(os.path.dirname(self._file_path) or ".", exist_ok=True)

        data = {
            "token": encrypted.hex(),
            "expires_at": expires_at.isoformat(),
            "iv": iv.hex(),
            "tag": encryptor.tag.hex(),
            "salt": salt.hex(),
            "version": VERSION,
        }
        with open(self._file_path, "w") as f:
            json.dump(data, f)
        try:
            os.chmod(self._file_path, 0o600)
        except Exception:
            pass

    def load(self) -> tuple[str, datetime] | None:
        """Read the stored token, upgrading a legacy (v1) file to v2.

        A v1 file was encrypted with a key derived by padding/truncating the
        password, which is only as strong as the password itself. That derivation
        is now used **once**, to decrypt such a file, after which the token is
        re-encrypted with the v2 KDF (PBKDF2-SHA256 + fresh random salt) and the
        file is replaced. No v1 file is ever written.
        """
        if not os.path.exists(self._file_path):
            return None

        try:
            with open(self._file_path) as f:
                data = json.load(f)
            legacy = not (data.get("version") == VERSION and "salt" in data)
            if legacy:
                # Migration-only path; see `_migrate_to_v2`.
                key = self._password.ljust(32, b"x")[:32]
            else:
                salt = bytes.fromhex(data["salt"])
                key, _ = self._derive_key(salt)
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(bytes.fromhex(data["iv"]), bytes.fromhex(data["tag"])),
                backend=default_backend(),
            )
            decryptor = cipher.decryptor()
            token = decryptor.update(bytes.fromhex(data["token"])) + decryptor.finalize()
            expires_at = datetime.fromisoformat(data["expires_at"])
        except Exception:
            return None

        if legacy:
            self._migrate_to_v2(token, expires_at, data)
        return token.decode(), expires_at

    def _migrate_to_v2(
        self, token: bytes, expires_at: datetime, legacy_data: dict[str, Any]
    ) -> None:
        """Rewrite a successfully-read v1 file using the v2 KDF.

        The migration is one-way, so the original v1 envelope is copied to
        ``<path>.v1.bak`` (created `0o600`, never overwritten) first. A failure
        here never fails the read: the caller already has the token, and the v1
        file is left in place for the next attempt.
        """
        backup_path = f"{self._file_path}.v1.bak"
        try:
            try:
                descriptor = os.open(
                    backup_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600
                )
            except FileExistsError:
                pass  # A previous migration already kept a copy; don't replace it.
            else:
                with os.fdopen(descriptor, "w") as backup:
                    json.dump(legacy_data, backup)
            self.save(token.decode(), expires_at)
        except Exception:
            self._logger.warning(
                "Token store v1->v2 migration failed; v1 file left unchanged",
                extra={"path": self._file_path},
            )
            return
        self._logger.info(
            "Token store migrated to v%s", VERSION, extra={"path": self._file_path}
        )

    def clear(self) -> None:
        try:
            if os.path.exists(self._file_path):
                os.remove(self._file_path)
        except Exception:
            pass
