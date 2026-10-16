declare module "redis" {
  export interface RedisClientType {
    get(key: string): Promise<string | null>;
    ttl(key: string): Promise<number>;
    set(key: string, value: string, opts?: { EX?: number }): Promise<void>;
    del(key: string): Promise<number>;
    connect(): Promise<void>;
    quit(): Promise<void>;
    on(event: string, listener: (...args: unknown[]) => void): void;
  }
  export function createClient(opts?: { url?: string }): RedisClientType;
}
