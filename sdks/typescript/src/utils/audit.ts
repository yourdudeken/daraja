import type { Logger } from "../types/index.js";

export interface AuditLogger extends Logger {
  audit(event: string, meta?: Record<string, unknown>): void;
}

export function createAuditLogger(logger: Logger): AuditLogger {
  return {
    debug: (msg, meta) => logger.debug(msg, meta),
    info: (msg, meta) => logger.info(msg, meta),
    warn: (msg, meta) => logger.warn(msg, meta),
    error: (msg, meta) => logger.error(msg, meta),
    audit: (event: string, meta?: Record<string, unknown>) => {
      logger.info(`[AUDIT] ${event}`, {
        ...meta,
        audit: true,
        audit_event: event,
        timestamp: new Date().toISOString(),
      });
    },
  };
}

export function auditLog(
  logger: Logger,
  event: string,
  meta?: Record<string, unknown>,
): void {
  logger.info(`[AUDIT] ${event}`, {
    ...meta,
    audit: true,
    audit_event: event,
    timestamp: new Date().toISOString(),
  });
}
