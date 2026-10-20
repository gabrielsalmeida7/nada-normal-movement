import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/checkout/expire-reservations";
import { RESERVATION_PROCESSOR_WORKER_ID } from "./expire-reservations-core";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

const PROCESSOR_SECRET = "reservation-processor-secret";

function makeResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const setHeader = vi.fn();
  return {
    response: { status, setHeader } as unknown as VercelResponse,
    status,
    json,
  };
}

function makeRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: "POST",
    headers: { "x-reservation-processor-secret": PROCESSOR_SECRET },
    query: {},
    body: {},
    ...overrides,
  } as VercelRequest;
}

describe("POST /api/checkout/expire-reservations", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "secret";
    process.env.RESERVATION_PROCESSOR_SECRET = PROCESSOR_SECRET;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.RESERVATION_PROCESSOR_SECRET;
  });

  it("recusa chamada sem o segredo do processador", async () => {
    const result = makeResponse();

    await handler(makeRequest({ headers: {} as VercelRequest["headers"] }), result.response);

    expect(result.status).toHaveBeenCalledWith(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("processa a outbox com identificador fixo de worker", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        processed: 2,
        released: 1,
        alreadyReleased: 1,
        rescheduled: 0,
        failed: 0,
      },
      error: null,
    });
    mocks.createClient.mockReturnValueOnce({ rpc });
    const result = makeResponse();

    await handler(makeRequest({ body: { limit: 10, workerId: "attacker" } }), result.response);

    expect(rpc).toHaveBeenCalledWith("process_expired_reservations", {
      p_worker_id: RESERVATION_PROCESSOR_WORKER_ID,
      p_limit: 10,
    });
    expect(result.status).toHaveBeenCalledWith(200);
    expect(result.json).toHaveBeenCalledWith({
      processed: 2,
      released: 1,
      alreadyReleased: 1,
      rescheduled: 0,
      failed: 0,
    });
  });

  it("rejeita contagem incoerente sem repetir a mensagem do banco", async () => {
    mocks.createClient.mockReturnValueOnce({
      rpc: vi.fn().mockResolvedValue({
        data: {
          processed: 2,
          released: 2,
          alreadyReleased: 2,
          rescheduled: 0,
          failed: 0,
        },
        error: null,
      }),
    });
    const result = makeResponse();

    await handler(makeRequest(), result.response);

    expect(result.status).toHaveBeenCalledWith(503);
    expect(JSON.stringify(result.json.mock.calls)).not.toContain("duplicate");
  });
});
