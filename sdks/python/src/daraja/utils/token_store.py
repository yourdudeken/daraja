import json
import os
from datetime import datetime

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class EncryptedTokenStore:
    def __init__(self, file_path: str, encryption_key: str) -> None:
        self._file_path = file_path
        self._password = encryption_key.encode("utf-8")

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
            "version": 2,
        }
        with open(self._file_path, "w") as f:
            json.dump(data, f)
        try:
            os.chmod(self._file_path, 0o600)
        except Exception:
            pass

    def load(self) -> tuple[str, datetime] | None:
        if not os.path.exists(self._file_path):
            return None

        try:
            with open(self._file_path) as f:
                data = json.load(f)
            if data.get("version") == 2 and "salt" in data:
                salt = bytes.fromhex(data["salt"])
                key, _ = self._derive_key(salt)
            else:
                # Backward compatibility
                key = self._password.ljust(32, b"x")[:32]
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(bytes.fromhex(data["iv"]), bytes.fromhex(data["tag"])),
                backend=default_backend(),
            )
            decryptor = cipher.decryptor()
            token = decryptor.update(bytes.fromhex(data["token"])) + decryptor.finalize()
            return token.decode(), datetime.fromisoformat(data["expires_at"])
        except Exception:
            return None

    def clear(self) -> None:
        try:
            if os.path.exists(self._file_path):
                os.remove(self._file_path)
        except Exception:
            pass
