export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export interface StructuredLoggerConfig {
  minLevel?: LogLevel;
  service?: string;
  prettyPrint?: boolean;
}

export class StructuredLogger {
  private minLevel: number;
  private service: string;
  private pretty: boolean;

  constructor(config?: StructuredLoggerConfig) {
    this.minLevel = config?.minLevel ? LOG_LEVELS[config.minLevel] : LOG_LEVELS.INFO;
    this.service = config?.service ?? "mpesa-sdk";
    this.pretty = config?.prettyPrint ?? false;
  }

  private log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message: msg,
      service: this.service,
    };

    if (meta && Object.keys(meta).length > 0) {
      entry.metadata = meta;
    }

    const output = this.pretty ? JSON.stringify(entry, null, 2) : JSON.stringify(entry);

    switch (level) {
      case "ERROR":
        console.error(output);
        break;
      case "WARN":
        console.warn(output);
        break;
      case "DEBUG":
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    this.log("DEBUG", msg, meta);
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    this.log("INFO", msg, meta);
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    this.log("WARN", msg, meta);
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    this.log("ERROR", msg, meta);
  }

  child(service: string): StructuredLogger {
    return new StructuredLogger({
      minLevel: this.minLevel as unknown as LogLevel,
      service: `${this.service}.${service}`,
      prettyPrint: this.pretty,
    });
  }
}
