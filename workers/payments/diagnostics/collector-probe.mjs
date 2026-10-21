// Operational probe only: not imported by the payments Worker or deployed by CI.
// Bindings are inherited from the existing staging version, never downloaded.
export function collectorProbe(challengeHash, expiresAt) {
  const json = (value, status) => Response.json(value, { status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.origin !== "https://pagamentos-staging.nadanormalclub.com.br" ||
          url.pathname !== "/__ops/verify-collector" || url.search ||
          request.method !== "POST" || request.headers.has("Origin") ||
          env.APP_ENV !== "staging" || env.PAYMENTS_ENABLED !== "false" ||
          Date.now() >= expiresAt) return json({ code: "NOT_FOUND" }, 404);
      const provided = request.headers.get("X-Collector-Probe") ?? "";
      if (provided.length > 128) return json({ code: "UNAUTHORIZED" }, 401);
      const actual = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(provided));
      const expected = Uint8Array.from(challengeHash.match(/../g), hex => parseInt(hex, 16));
      if (!crypto.subtle.timingSafeEqual(actual, expected)) return json({ code: "UNAUTHORIZED" }, 401);
      if (!env.MP_ACCESS_TOKEN) return json({ code: "CREDENTIAL_MISSING" }, 503);
      try {
        const upstream = await fetch("https://api.mercadopago.com/users/me", {
          method: "GET", headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
          redirect: "manual", signal: AbortSignal.timeout(10000),
        });
        if (!upstream.ok) {
          await upstream.body?.cancel();
          return json({ verified: false, upstreamStatus: upstream.status, paymentsEnabled: false }, 502);
        }
        if (!upstream.headers.get("Content-Type")?.includes("application/json") || !upstream.body) {
          await upstream.body?.cancel();
          return json({ code: "UPSTREAM_RESPONSE_INVALID" }, 502);
        }
        const reader = upstream.body.getReader();
        const chunks = [];
        let total = 0;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > 65536) {
              await reader.cancel();
              throw new Error("UPSTREAM_RESPONSE_TOO_LARGE");
            }
            chunks.push(value);
          }
        } finally { reader.releaseLock(); }
        const bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        const data = JSON.parse(new TextDecoder().decode(bytes));
        const collectorMatches = String(data?.id) === "3272217989";
        const countryMatches = data?.site_id === "MLB";
        const testUser = data?.user_type === "test_user" ||
          (Array.isArray(data?.tags) && data.tags.includes("test_user"));
        const verified = collectorMatches && countryMatches && testUser;
        return json({ verified, collectorMatches, countryMatches, testUser,
          upstreamStatus: upstream.status, paymentsEnabled: false }, verified ? 200 : 409);
      } catch {
        // Never serialize exceptions, upstream JSON, request headers or env.
        return json({ code: "VERIFICATION_UNAVAILABLE", paymentsEnabled: false }, 502);
      }
    },
  };
}

export function buildCollectorProbe(challengeHash, expiresAt) {
  if (!/^[a-f0-9]{64}$/.test(challengeHash) || !Number.isSafeInteger(expiresAt) ||
      expiresAt <= Date.now() || expiresAt > Date.now() + 10 * 60 * 1000) {
    throw new Error("PROBE_CONFIGURATION_INVALID");
  }
  return `export default (${collectorProbe.toString()})(${JSON.stringify(challengeHash)}, ${expiresAt});`;
}
