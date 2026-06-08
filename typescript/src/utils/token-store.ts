import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

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
}

export class EncryptedTokenStore {
  private readonly filePath: string;
  private readonly key: Buffer;

  constructor(config: TokenStoreConfig) {
    this.filePath = config.filePath;
    this.key = Buffer.from(config.encryptionKey.padEnd(32, "x").slice(0, 32));
  }

  save(token: string, expiresAt: Date): void {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    const dir = this.filePath.substring(0, this.filePath.lastIndexOf("/"));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const stored: StoredToken = {
      token: encrypted,
      expiresAt: expiresAt.toISOString(),
      iv: iv.toString("hex"),
      tag,
    };

    writeFileSync(this.filePath, JSON.stringify(stored), { mode: 0o600 });
  }

  load(): { token: string; expiresAt: Date } | null {
    if (!existsSync(this.filePath)) return null;

    try {
      const raw = readFileSync(this.filePath, "utf8");
      const stored: StoredToken = JSON.parse(raw);

      const decipher = createDecipheriv(
        ALGORITHM,
        this.key,
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
        writeFileSync(this.filePath, "");
      }
    } catch {
      // ignore
    }
  }
}
