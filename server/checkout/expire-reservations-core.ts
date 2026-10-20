import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const RESERVATION_PROCESSOR_WORKER_ID = "reservation-processor";
const MINIMUM_SECRET_LENGTH = 16;

const expirePayloadSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

const expireResultSchema = z.object({
  processed: z.number().int().nonnegative(),
  released: z.number().int().nonnegative(),
  alreadyReleased: z.number().int().nonnegative(),
  rescheduled: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export type ExpireReservationsResult = z.infer<typeof expireResultSchema>;

export class ExpireReservationsError extends Error {
  constructor(
    public readonly code: "INVALID_CHECKOUT_PAYLOAD" | "CHECKOUT_UNAVAILABLE",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ExpireReservationsError";
  }
}

export function readProcessorSecret(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  const secret = value?.trim();
  return secret || null;
}

export function processorSecretMatches(provided: string, expected: string | undefined): boolean {
  if (!expected || expected.length < MINIMUM_SECRET_LENGTH) return false;

  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (providedBytes.length !== expectedBytes.length) {
    timingSafeEqual(expectedBytes, expectedBytes);
    return false;
  }
  return timingSafeEqual(providedBytes, expectedBytes);
}

export function parseExpirePayload(input: unknown): { limit: number } {
  const result = expirePayloadSchema.safeParse(input ?? {});
  if (!result.success) {
    throw new ExpireReservationsError(
      "INVALID_CHECKOUT_PAYLOAD",
      400,
      "Dados do processamento inválidos.",
    );
  }
  return { limit: result.data.limit ?? 20 };
}

export function parseExpireResult(input: unknown): ExpireReservationsResult {
  const result = expireResultSchema.safeParse(input);
  if (!result.success) {
    throw new ExpireReservationsError(
      "CHECKOUT_UNAVAILABLE",
      503,
      "Não foi possível processar as reservas.",
    );
  }

  const { processed, released, alreadyReleased, rescheduled, failed } = result.data;
  if (released + alreadyReleased + rescheduled + failed !== processed) {
    throw new ExpireReservationsError(
      "CHECKOUT_UNAVAILABLE",
      503,
      "Não foi possível processar as reservas.",
    );
  }
  return result.data;
}

export function mapExpireDatabaseError(error: unknown): ExpireReservationsError {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";

  if (message.includes("INVALID_CHECKOUT_PAYLOAD")) {
    return new ExpireReservationsError(
      "INVALID_CHECKOUT_PAYLOAD",
      400,
      "Dados do processamento inválidos.",
    );
  }

  return new ExpireReservationsError(
    "CHECKOUT_UNAVAILABLE",
    503,
    "Não foi possível processar as reservas.",
  );
}
