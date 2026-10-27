import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyOrders from "./MyOrders";
import { fetchCustomerOrders, type CustomerOrder } from "@/lib/customer-orders";

const auth = vi.hoisted(() => ({ user: { id: "11111111-1111-4111-8111-111111111111" } as { id: string } | null, loading: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/components/Header", () => ({ Header: () => null }));
vi.mock("@/components/Footer", () => ({ Footer: () => null }));
vi.mock("@/lib/customer-orders", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/customer-orders")>(), fetchCustomerOrders: vi.fn() }));
const order: CustomerOrder = { id: "22222222-2222-4222-8222-222222222222", user_id: "11111111-1111-4111-8111-111111111111",
  status: "pending", financial_status: "paid", created_at: "2026-10-26T19:42:00Z", total_cents: 11900,
  shipping_cents: 2000, reservation_state: "held", reservation_expires_at: "2026-10-26T20:12:06Z",
  order_items: [{ id: "33333333-3333-4333-8333-333333333333", quantity: 1, price_cents_at_purchase: 9900,
    products: { name: "Camisa Sem Tempo NN" }, product_variants: { size: "P", color_name: "Preta" } }] };
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(<QueryClientProvider client={client}><MemoryRouter><MyOrders /></MemoryRouter></QueryClientProvider>);
  return { ...result, client };
}
beforeEach(() => { vi.clearAllMocks(); auth.user = { id: order.user_id }; auth.loading = false; });

describe("my orders page", () => {
  it("shows order and payment statuses separately and links to the existing payment consultation", async () => {
    vi.mocked(fetchCustomerOrders).mockResolvedValue({ orders: [order], hasNext: false });
    renderPage();
    expect(await screen.findByText("Pagamento confirmado")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByText(/Camisa Sem Tempo NN/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Consultar pagamento/ })).toHaveAttribute("href", `/checkout/pendente?order=${order.id}`);
  });
  it("shows an empty state with access to the collection", async () => {
    vi.mocked(fetchCustomerOrders).mockResolvedValue({ orders: [], hasNext: false }); renderPage();
    expect(await screen.findByText("Você ainda não tem pedidos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conhecer a coleção" })).toHaveAttribute("href", "/street");
  });
  it("requires login without querying order history", () => {
    auth.user = null; renderPage();
    expect(screen.getByRole("link", { name: "Entrar para consultar" })).toHaveAttribute("href", "/login?redirect=/meus-pedidos");
    expect(fetchCustomerOrders).not.toHaveBeenCalled();
  });
  it("supports pagination and hides the previous account's cached data when signing out", async () => {
    vi.mocked(fetchCustomerOrders).mockResolvedValue({ orders: [order], hasNext: true });
    const { rerender, client } = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(fetchCustomerOrders).toHaveBeenCalledWith(order.user_id, 1, expect.any(AbortSignal)));
    auth.user = null;
    rerender(<QueryClientProvider client={client}><MemoryRouter><MyOrders /></MemoryRouter></QueryClientProvider>);
    expect(screen.queryByText("Pagamento confirmado")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar para consultar" })).toBeInTheDocument();
  });
});
