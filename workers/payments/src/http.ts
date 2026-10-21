export class HttpError extends Error {
  constructor(public readonly code: string, public readonly status = 503) { super(code); }
}

/** Read through a bounded stream; Content-Length alone is not authoritative. */
export async function readJson(message: Request | Response, limit = 64 * 1024): Promise<unknown> {
  if (!message.body) throw new HttpError("INVALID_PAYLOAD", 400);
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError("PAYLOAD_TOO_LARGE", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new HttpError("INVALID_PAYLOAD", 400); }
}

export async function upstreamJson(url: string, init: RequestInit): Promise<unknown> {
  try {
    const response = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      await response.body?.cancel();
      throw new HttpError("UPSTREAM_UNAVAILABLE");
    }
    return await readJson(response, 128 * 1024);
  } catch { throw new HttpError("UPSTREAM_UNAVAILABLE"); }
}
