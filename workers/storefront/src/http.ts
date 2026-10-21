import { HttpError, readJson } from "../../payments/src/http";

export { HttpError, readJson };

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  } });
}

/** Bound upstream JSON consumed by the SDK, including error responses. Never retry mutations. */
export const boundedFetch: typeof fetch = async (input, init) => {
  try {
    const response = await fetch(input, {
      ...init, redirect: "manual",
      signal: AbortSignal.any([AbortSignal.timeout(8000), ...(init?.signal ? [init.signal] : [])]),
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new HttpError("UPSTREAM_UNAVAILABLE", 503);
    }
    if (!response.body) return response;
    const data = await readJson(response, 1024 * 1024);
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(JSON.stringify(data), { status: response.status, headers });
  } catch { throw new HttpError("UPSTREAM_UNAVAILABLE", 503); }
};
