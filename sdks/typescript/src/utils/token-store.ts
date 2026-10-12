import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

const ALGORITHM = "aes-256-gcm";

export interface TokenStoreConfig {
  filePath: string;
  encryptionKey: string;
}

interface StoredToken {
  token: string;
  expiresAt: string;
  iv: string;
  tag: string;
  salt?: string;
  version?: number;
}

export class EncryptedTokenStore {
  private readonly filePath: string;
  private readonly password: string;

  constructor(config: TokenStoreConfig) {
    this.filePath = config.filePath;
    this.password = config.encryptionKey;
  }

  private deriveKey(salt?: Buffer): { key: Buffer; salt: Buffer } {
    const s = salt || randomBytes(16);
    const key = pbkdf2Sync(this.password, s, 200000, 32, "sha256");
    return { key, salt: s };
  }

  save(token: string, expiresAt: Date): void {
    const { key, salt } = this.deriveKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    const dir = dirname(this.filePath);
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const stored: StoredToken = {
      token: encrypted,
      expiresAt: expiresAt.toISOString(),
      iv: iv.toString("hex"),
      tag,
      salt: salt.toString("hex"),
      version: 2,
    };

    writeFileSync(this.filePath, JSON.stringify(stored), { mode: 0o600 });
    try {
      chmodSync(this.filePath, 0o600);
    } catch {
      /* ignore chmod failures on platforms/filesystems without POSIX permissions */
    }
  }

  load(): { token: string; expiresAt: Date } | null {
    if (!existsSync(this.filePath)) return null;

    try {
      const raw = readFileSync(this.filePath, "utf8");
      const stored: StoredToken = JSON.parse(raw);

      let key: Buffer;
      if (stored.version === 2 && stored.salt) {
        key = pbkdf2Sync(this.password, Buffer.from(stored.salt, "hex"), 200000, 32, "sha256");
      } else {
        key = Buffer.from(this.password.padEnd(32, "x").slice(0, 32));
      }

      const decipher = createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(stored.iv, "hex"),
      );
      decipher.setAuthTag(Buffer.from(stored.tag, "hex"));
      let decrypted = decipher.update(stored.token, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return {
        token: decrypted,
        expiresAt: new Date(stored.expiresAt),
      };
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      if (existsSync(this.filePath)) {
        try {
          unlinkSync(this.filePath);
        } catch {
          writeFileSync(this.filePath, "", { mode: 0o600 });
        }
      }
    } catch {
      // ignore
    }
  }
}
