import { afterEach, describe, expect, it, vi } from "vitest";
import { upstreamJson } from "../src/http";

afterEach(() => vi.unstubAllGlobals());

describe("upstream fetch compatível com Workers", () => {
  it("usa manual e recusa redirect sem seguir a Location", async () => {
    const fetcher = vi.fn(async () => new Response(null, {
      status: 302, headers: { Location: "https://other.example.com" },
    }));
    vi.stubGlobal("fetch", fetcher);
    await expect(upstreamJson("https://upstream.example.com", {})).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("https://upstream.example.com", expect.objectContaining({ redirect: "manual" }));
  });
});
