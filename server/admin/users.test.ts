import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/admin/users";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

function makeResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const setHeader = vi.fn();
  return {
    response: { status, setHeader } as unknown as VercelResponse,
    status,
    json,
    setHeader,
  };
}

function makeRequest(authorization?: string): VercelRequest {
  return {
    method: "GET",
    headers: { authorization },
    query: {},
  } as unknown as VercelRequest;
}

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("responde 401 sem Bearer token", async () => {
    const result = makeResponse();
    await handler(makeRequest(), result.response);
    expect(result.status).toHaveBeenCalledWith(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("responde 403 para usuário autenticado sem papel admin", async () => {
    mocks.createClient.mockReturnValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "customer", app_metadata: { role: "customer" } } },
          error: null,
        }),
      },
    });
    const result = makeResponse();

    await handler(makeRequest("Bearer customer-token"), result.response);

    expect(result.status).toHaveBeenCalledWith(403);
    expect(mocks.createClient).toHaveBeenCalledTimes(1);
  });

  it("lista o mínimo de dados para um admin e mascara o CPF", async () => {
    mocks.createClient
      .mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "admin", app_metadata: { role: "admin" } } },
            error: null,
          }),
        },
      })
      .mockReturnValueOnce({
        auth: {
          admin: {
            listUsers: vi.fn().mockResolvedValue({
              data: {
                users: [
                  {
                    id: "user-1",
                    email: "cliente@example.com",
                    app_metadata: { provider: "email" },
                    identities: [],
                    created_at: "2026-01-01T00:00:00.000Z",
                  },
                ],
                total: 1,
              },
              error: null,
            }),
          },
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [{ id: "user-1", full_name: "Cliente", phone: "11999999999", cpf: "12345678901" }],
              error: null,
            }),
          })),
        })),
      });
    const result = makeResponse();

    await handler(makeRequest("Bearer admin-token"), result.response);

    expect(result.status).toHaveBeenCalledWith(200);
    expect(result.json).toHaveBeenCalledWith({
      users: [
        {
          id: "user-1",
          email: "cliente@example.com",
          fullName: "Cliente",
          phone: "11999999999",
          cpf: "123.***.***-01",
          provider: "email",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
    });
  });
});
