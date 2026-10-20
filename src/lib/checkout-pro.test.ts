import { afterEach, describe, expect, it, vi } from "vitest";
import { validateCheckoutRedirect } from "./checkout-pro";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
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
});
