import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  openSync,
  closeSync,
  writeSync,
  fsyncSync,
  renameSync,
} from "node:fs";
import { dirname } from "node:path";
import type { Logger } from "../types/index.js";

const ALGORITHM = "aes-256-gcm";
/** Current on-disk envelope version: PBKDF2-SHA256 with a per-file random salt. */
const VERSION = 2;

const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

export interface TokenStoreConfig {
  filePath: string;
  encryptionKey: string;
  logger?: Logger;
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
  private readonly logger: Logger;

  constructor(config: TokenStoreConfig) {
    this.filePath = config.filePath;
    this.password = config.encryptionKey;
    this.logger = config.logger ?? noopLogger;
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
      version: VERSION,
    };
    this.writeAtomically(JSON.stringify(stored));
  }

  /**
   * Write the envelope to a sibling temp file (created owner-only) and rename it
   * over the target, so the token file is never briefly world-readable through
   * the umask and a crash mid-write leaves the previous file intact.
   */
  private writeAtomically(payload: string): void {
    const tempPath = `${this.filePath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
    let descriptor: number | null = null;
    try {
      descriptor = openSync(tempPath, "wx", 0o600);
      writeSync(descriptor, payload, null, "utf8");
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = null;
      renameSync(tempPath, this.filePath);
    } catch (error) {
      if (descriptor !== null) {
        try {
          closeSync(descriptor);
        } catch {
          /* ignore: the descriptor may already be closed */
        }
      }
      try {
        unlinkSync(tempPath);
      } catch {
        /* ignore: a failed write may have left no temp file */
      }
      throw error;
    }
  }

  /**
   * Read the stored token, upgrading a legacy (v1) file to v2.
   *
   * A v1 file was encrypted with a key derived by padding/truncating the
   * password, which is only as strong as the password itself. That derivation is
   * now used **once**, to decrypt such a file, after which the token is
   * re-encrypted with the v2 KDF (PBKDF2-SHA256 + fresh random salt) and the
   * file is replaced. No v1 file is ever written.
   */
  load(): { token: string; expiresAt: Date } | null {
    if (!existsSync(this.filePath)) return null;

    try {
      const raw = readFileSync(this.filePath, "utf8");
      const stored: StoredToken = JSON.parse(raw);

      let key: Buffer;
      const legacy = !(stored.version === VERSION && stored.salt);
      if (!legacy) {
        key = pbkdf2Sync(this.password, Buffer.from(stored.salt!, "hex"), 200000, 32, "sha256");
      } else {
        // Migration-only path; see migrateToV2.
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

      const expiresAt = new Date(stored.expiresAt);
      if (legacy) this.migrateToV2(decrypted, expiresAt);
      return { token: decrypted, expiresAt };
    } catch {
      return null;
    }
  }

  /**
   * Rewrite a successfully-read v1 file using the v2 KDF.
   *
   * The migration is one-way, so the original v1 envelope is copied to
   * `<path>.v1.bak` (created `0o600`, never overwritten) first. A failure here
   * never fails the read: the caller already has the token, and the v1 file is
   * left in place for the next attempt.
   */
  private migrateToV2(token: string, expiresAt: Date): void {
    const backupPath = `${this.filePath}.v1.bak`;
    try {
      if (!existsSync(backupPath)) {
        try {
          writeFileSync(backupPath, readFileSync(this.filePath, "utf8"), {
            mode: 0o600,
            flag: "wx",
          });
        } catch (error) {
          // A backup that appeared between the check and the write is still a
          // backup: keep it and continue migrating rather than leaving the weak
          // file in place.
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        }
      }
      this.save(token, expiresAt);
    } catch {
      this.logger.warn("Token store v1->v2 migration failed; v1 file left unchanged", {
        path: this.filePath,
      });
      return;
    }
    this.logger.info(`Token store migrated to v${VERSION}`, { path: this.filePath });
  }

  clear(): void {
    // The migration backup is a second copy of the token, so deleting the token
    // must delete it too.
    for (const target of [this.filePath, `${this.filePath}.v1.bak`]) {
      try {
        if (existsSync(target)) {
          try {
            unlinkSync(target);
          } catch {
            writeFileSync(target, "", { mode: 0o600 });
          }
        }
      } catch {
        // ignore
      }
    }
  }
}
