import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutResult } from "./CheckoutResult";
import { getCheckoutStatus, prepareWalletCheckout } from "@/lib/checkout-pro";
import { cartSignature, readCheckoutDraft, writeCheckoutDraft } from "@/lib/checkout-state";
import { useCartStore } from "@/stores/cart-store";
import type { CartItem } from "@/types/cart";

vi.mock("@/components/Header", () => ({ Header: () => null }));
vi.mock("@/components/Footer", () => ({ Footer: () => null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "customer" } }) }));
vi.mock("@/lib/checkout-pro", () => ({ checkoutProEnabled: true, checkoutStatusEnabled: true,
  getCheckoutStatus: vi.fn(), prepareWalletCheckout: vi.fn(), CheckoutStateError: class extends Error {} }));
vi.mock("./CheckoutWallet", () => ({ CheckoutWallet: () => <p>Wallet do mesmo pedido</p> }));
const orderId = "11111111-1111-4111-8111-111111111111";
function result(path: string) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><CheckoutResult /></MemoryRouter>
  </QueryClientProvider>);
}
const purchased: CartItem[] = [{ productId: "product", productVariantId: "variant", name: "Camiseta", image: "", price: 100, quantity: 1 }];
function saveDraft() {
  writeCheckoutDraft("customer", { key: "22222222-2222-4222-8222-222222222222", fingerprint: "test", cartSignature: cartSignature(purchased),
    order: { orderId, paymentAttemptId: "33333333-3333-4333-8333-333333333333", totalCents: 10000, subtotalCents: 10000,
      shippingCents: 0, reservationExpiresAt: "2099-01-01T00:00:00Z" } });
}
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); useCartStore.setState({ items: [] }); });
describe("server-authoritative checkout return", () => {
  it("does not display approval just because the URL says approved", async () => {
    vi.mocked(getCheckoutStatus).mockResolvedValue({ orderId, financialStatus: "processing" });
    result(`/checkout/sucesso?order=${orderId}&status=approved&collection_status=approved`);
    await waitFor(() => expect(getCheckoutStatus).toHaveBeenCalledWith(orderId, "customer"));
    expect(screen.queryByText("Pagamento confirmado!")).not.toBeInTheDocument();
    expect(screen.getByRole("heading")).toHaveTextContent("Aguardando confirmação");
  });
  it("displays approval only after the authenticated server confirms it", async () => {
    vi.mocked(getCheckoutStatus).mockResolvedValue({ orderId, financialStatus: "paid" });
    result(`/checkout/pendente?order=${orderId}`);
    expect(await screen.findByText("Pagamento confirmado!")).toBeInTheDocument();
  });
  it("does not query an arbitrary external_reference or malformed order ID", () => {
    result("/checkout/sucesso?order=invalid&external_reference=paid&status=approved");
    expect(getCheckoutStatus).not.toHaveBeenCalled();
    expect(screen.queryByText("Pagamento confirmado!")).not.toBeInTheDocument();
  });
  it("clears the unchanged purchased cart only after server confirmation, once", async () => {
    saveDraft(); useCartStore.setState({ items: purchased });
    vi.mocked(getCheckoutStatus).mockResolvedValue({ orderId, financialStatus: "paid", reservationState: "held" });
    result(`/checkout/sucesso?order=${orderId}`);
    await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
    expect(readCheckoutDraft("customer")).toBeNull();
    useCartStore.setState({ items: purchased });
    expect(useCartStore.getState().items).toEqual(purchased);
  });
  it("preserves cart changes made while payment was taking place", async () => {
    saveDraft(); const changed = [{ ...purchased[0], quantity: 2 }]; useCartStore.setState({ items: changed });
    vi.mocked(getCheckoutStatus).mockResolvedValue({ orderId, financialStatus: "paid", reservationState: "held" });
    result(`/checkout/sucesso?order=${orderId}`);
    await screen.findByText("Pagamento confirmado!");
    expect(useCartStore.getState().items).toEqual(changed);
    expect(readCheckoutDraft("customer")).toBeNull();
  });
  it("never clears the cart based on an approved query string while the server is processing", async () => {
    saveDraft(); useCartStore.setState({ items: purchased });
    vi.mocked(getCheckoutStatus).mockResolvedValue({ orderId, financialStatus: "processing", reservationState: "held" });
    result(`/checkout/sucesso?order=${orderId}&status=approved`);
    await screen.findByText("Aguardando confirmação do pagamento");
    expect(useCartStore.getState().items).toEqual(purchased);
    expect(readCheckoutDraft("customer")?.order?.orderId).toBe(orderId);
  });
  it("resumes after losing the original tab, using the authenticated server deadline", async () => {
    vi.mocked(getCheckoutStatus).mockResolvedValue({ orderId, financialStatus: "processing", reservationState: "held",
      reservationExpiresAt: "2099-01-01T00:00:00Z" });
    vi.mocked(prepareWalletCheckout).mockResolvedValue({ preferenceId: "3272217989-resumed" });
    result(`/checkout/pendente?order=${orderId}`);
    fireEvent.click(await screen.findByRole("button", { name: "Retomar pagamento deste pedido" }));
    expect(await screen.findByText("Wallet do mesmo pedido")).toBeInTheDocument();
    expect(prepareWalletCheckout).toHaveBeenCalledExactlyOnceWith(orderId, "customer");
  });
  it("explains expiration and refuses resume even if the local draft is still valid", async () => {
    saveDraft();
    vi.mocked(getCheckoutStatus).mockResolvedValue({ orderId, financialStatus: "processing", reservationState: "held",
      reservationExpiresAt: "2020-01-01T00:00:00Z" });
    result(`/checkout/pendente?order=${orderId}`);
    expect(await screen.findByRole("heading", { name: "Reserva de pagamento expirada" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retomar pagamento deste pedido" })).not.toBeInTheDocument();
    expect(prepareWalletCheckout).not.toHaveBeenCalled();
  });
  it.each([
    { financialStatus: "paid", reservationState: "held", reservationExpiresAt: "2099-01-01T00:00:00Z" },
    { financialStatus: "processing", reservationState: "released", reservationExpiresAt: "2099-01-01T00:00:00Z" },
    { financialStatus: "processing", reservationState: "held" },
  ] as const)("never resumes an ineligible server state (%#)", async state => {
    saveDraft(); vi.mocked(getCheckoutStatus).mockResolvedValue({ orderId, ...state });
    result(`/checkout/pendente?order=${orderId}`);
    await waitFor(() => expect(getCheckoutStatus).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Retomar pagamento deste pedido" })).not.toBeInTheDocument();
    expect(prepareWalletCheckout).not.toHaveBeenCalled();
  });
});
