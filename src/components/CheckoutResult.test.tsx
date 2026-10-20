import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutResult } from "./CheckoutResult";
import { getCheckoutStatus } from "@/lib/checkout-pro";

vi.mock("@/components/Header", () => ({ Header: () => null }));
vi.mock("@/components/Footer", () => ({ Footer: () => null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "customer" } }) }));
vi.mock("@/lib/checkout-pro", () => ({ checkoutProEnabled: true, getCheckoutStatus: vi.fn() }));
const orderId = "11111111-1111-4111-8111-111111111111";
function result(path: string) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><CheckoutResult /></MemoryRouter>
  </QueryClientProvider>);
}
beforeEach(() => vi.clearAllMocks());
describe("server-authoritative checkout return", () => {
  it("does not display approval just because the URL says approved", async () => {
    vi.mocked(getCheckoutStatus).mockResolvedValue({ orderId, financialStatus: "processing" });
    result(`/checkout/sucesso?order=${orderId}&status=approved&collection_status=approved`);
    await waitFor(() => expect(getCheckoutStatus).toHaveBeenCalledWith(orderId));
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
});
