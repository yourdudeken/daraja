import json
import os
from datetime import datetime, timezone
from typing import Optional

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend


class EncryptedTokenStore:
    def __init__(self, file_path: str, encryption_key: str) -> None:
        self._file_path = file_path
        key_bytes = encryption_key.encode("utf-8")
        self._key = key_bytes.ljust(32, b"x")[:32]

    def save(self, token: str, expires_at: datetime) -> None:
        iv = os.urandom(16)
        cipher = Cipher(algorithms.AES(self._key), modes.GCM(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        encrypted = encryptor.update(token.encode()) + encryptor.finalize()

        os.makedirs(os.path.dirname(self._file_path), exist_ok=True)

        data = {
            "token": encrypted.hex(),
            "expires_at": expires_at.isoformat(),
            "iv": iv.hex(),
            "tag": encryptor.tag.hex(),
        }
        with open(self._file_path, "w") as f:
            json.dump(data, f)
        os.chmod(self._file_path, 0o600)

    def load(self) -> Optional[tuple[str, datetime]]:
        if not os.path.exists(self._file_path):
            return None

        try:
            with open(self._file_path) as f:
                data = json.load(f)

            cipher = Cipher(
                algorithms.AES(self._key),
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
