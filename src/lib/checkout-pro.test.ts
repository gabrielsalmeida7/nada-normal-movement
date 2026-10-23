import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateCheckoutRedirect } from "./checkout-pro";

vi.mock("@/lib/supabase", () => ({ supabase: { auth: {
  getSession: vi.fn(async () => ({ data: { session: { access_token: "test-jwt" } } })),
} } }));
const preferenceId = "3272217989-11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";
const enableWallet = () => {
  vi.stubEnv("VITE_CHECKOUT_PRO_ENABLED", "true");
  vi.stubEnv("VITE_APP_ENV", "staging");
  vi.stubEnv("VITE_CHECKOUT_PRO_MODE", "sandbox");
  vi.stubEnv("VITE_PAYMENTS_API_URL", "https://pagamentos-staging.nadanormalclub.com.br");
  vi.stubEnv("VITE_MERCADO_PAGO_PUBLIC_KEY", "APP_USR-e39b420f-08ac-48ed-b17a-3bea9480aa7f");
};

beforeEach(() => vi.stubGlobal("AbortSignal", { timeout: () => new AbortController().signal }));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); vi.restoreAllMocks(); });
describe("Checkout Pro browser boundary", () => {
  it("accepts only the sandbox checkout", () => {
    const url = "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=example";
    expect(validateCheckoutRedirect(url)).toBe(url);
    for (const input of ["javascript:alert(1)", "https://attacker.example.com", "https://sandbox.mercadopago.com.br.evil.test/",
      "https://token@sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=x", "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=x"]) {
      expect(() => validateCheckoutRedirect(input)).toThrow();
    }
  });
  it("requires explicit frontend activation", async () => {
    vi.stubEnv("VITE_CHECKOUT_PRO_ENABLED", "false");
    const api = await import("./checkout-pro");
    expect(api.checkoutProEnabled).toBe(false);
    await expect(api.prepareCheckout("user", [], "address", "pix")).rejects.toThrow("temporariamente indisponível");
  });
  it("returns only the preference ID, never follows the returned checkout URL", async () => {
    enableWallet();
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ preferenceId,
      checkoutUrl: "https://attacker.example.com" }));
    const { prepareWalletCheckout } = await import("./checkout-pro");
    expect(await prepareWalletCheckout(orderId)).toEqual({ preferenceId });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("https://pagamentos-staging.nadanormalclub.com.br/v1/checkout/preferences",
      expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer test-jwt", "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }) }));
  });
  it.each([
    ["VITE_APP_ENV", "production"], ["VITE_CHECKOUT_PRO_MODE", "production"],
    ["VITE_MERCADO_PAGO_PUBLIC_KEY", "APP_USR-wrong-app"], ["VITE_MERCADO_PAGO_PUBLIC_KEY", ""],
    ["VITE_PAYMENTS_API_URL", "https://wrong.example.com"], ["VITE_CHECKOUT_PRO_ENABLED", "false"],
  ])("refuses unsafe wallet settings before external I/O: %s", async (name, value) => {
    enableWallet();
    vi.stubEnv(name, value);
    const fetcher = vi.spyOn(globalThis, "fetch");
    const { prepareWalletCheckout } = await import("./checkout-pro");
    await expect(prepareWalletCheckout(orderId)).rejects.toThrow("Checkout de teste indisponível");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["999-wrong-seller", "", "https://sandbox.mercadopago.com.br", "3272217989-<script>"])(
    "rejects malformed/foreign preferences: %s", async preferenceId => {
      enableWallet();
      const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ preferenceId }));
      const { prepareWalletCheckout } = await import("./checkout-pro");
      await expect(prepareWalletCheckout(orderId)).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledOnce();
    });
});
