declare module "redis" {
  export interface RedisClientType {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, opts?: { EX?: number }): Promise<void>;
    connect(): Promise<void>;
    quit(): Promise<void>;
    on(event: string, listener: (...args: unknown[]) => void): void;
  }
  export function createClient(opts?: { url?: string }): RedisClientType;
}
