import type { Logger } from "../types/index.js";
import { noopLogger, delay, calculateBackoff } from "../utils/index.js";
import type { WebhookManager, WebhookEvent } from "./index.js";

export interface DeliveryRecord {
  event: string;
  payload: unknown;
  attempts: number;
  lastError?: string;
}

const DEFAULT_MAX_RETRIES = 3;

export class WebhookRetryQueue {
  private queue: DeliveryRecord[] = [];
  private processing = false;
  private readonly logger: Logger;
  private readonly maxRetries: number;
  private readonly deadLetterQueue: DeliveryRecord[] = [];
  private readonly webhookManager: WebhookManager;

  constructor(
    webhookManager: WebhookManager,
    logger: Logger = noopLogger,
    maxRetries = DEFAULT_MAX_RETRIES,
  ) {
    this.webhookManager = webhookManager;
    this.logger = logger;
    this.maxRetries = maxRetries;
  }

  enqueue(event: string, payload: unknown): void {
    this.queue.push({ event, payload, attempts: 0 });
    this.logger.warn("Webhook enqueued for retry", { event });
    if (!this.processing) {
      this.processing = true;
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const record = this.queue.shift()!;
      record.attempts++;

      try {
        await this.webhookManager.handleEvent({
          type: record.event,
          payload: record.payload,
        } as unknown as WebhookEvent);
        this.logger.info("Retrying webhook delivery", {
          event: record.event,
          attempt: record.attempts,
        });
      } catch (err) {
        record.lastError = String(err);
        if (record.attempts < this.maxRetries) {
          const backoff = calculateBackoff(
            record.attempts - 1,
            1000,
            30000,
          );
          this.logger.warn("Webhook retry failed, re-enqueuing", {
            event: record.event,
            attempt: record.attempts,
            backoffMs: backoff,
          });
          this.queue.push(record);
          await delay(backoff);
        } else {
          this.logger.error("Webhook delivery failed, moving to DLQ", {
            event: record.event,
            attempts: record.attempts,
          });
          this.deadLetterQueue.push(record);
        }
      }
    }
    this.processing = false;
  }

  getDeadLetterQueue(): readonly DeliveryRecord[] {
    return this.deadLetterQueue;
  }
}
