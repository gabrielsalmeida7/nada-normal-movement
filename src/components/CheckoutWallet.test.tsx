import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutWallet } from "./CheckoutWallet";

const sdk = vi.hoisted(() => ({ init: vi.fn(), props: null as null | {
  initialization: { preferenceId: string; redirectMode: string }; onReady: () => void; onError: () => void;
}, unmount: vi.fn(), loadFails: false }));
vi.mock("@mercadopago/sdk-js", () => ({ loadMercadoPago: () => ({
  then: (callback: () => void) => {
    if (!sdk.loadFails) callback();
    return { catch: (onError: () => void) => { if (sdk.loadFails) onError(); } };
  },
}) }));
vi.mock("@/lib/checkout-pro", () => ({ getWalletPublicKey: () => "public-test-key" }));
vi.mock("@mercadopago/sdk-react", async () => {
  const { useEffect } = await import("react");
  return { initMercadoPago: sdk.init, Wallet: (props: NonNullable<typeof sdk.props>) => {
    sdk.props = props;
    useEffect(() => () => { sdk.unmount(); }, []);
    return <button>Botão oficial Wallet</button>;
  } };
});
const props = { preferenceId: "3272217989-test-preference", expiresAt: "2030-01-01T00:30:00Z" };
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
  sdk.init.mockReset(); sdk.unmount.mockClear(); sdk.props = null; sdk.loadFails = false;
});
afterEach(() => { vi.useRealTimers(); });

describe("official Wallet Brick", () => {
  it("catches script loading failure before mounting the Wallet", () => {
    sdk.loadFails = true;
    render(<CheckoutWallet {...props} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.props).toBeNull();
  });
  it("initializes the public SDK and passes only preference ID and opening mode", () => {
    render(<CheckoutWallet {...props} />);
    expect(sdk.init).toHaveBeenCalledWith("public-test-key", { locale: "pt-BR" });
    expect(sdk.props?.initialization).toEqual({ preferenceId: props.preferenceId, redirectMode: "self" });
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    act(() => sdk.props?.onReady());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cartão/i)).not.toBeInTheDocument();
  });
  it("does not remount the SDK on a parent rerender", () => {
    const { rerender } = render(<CheckoutWallet {...props} />);
    const initialization = sdk.props?.initialization;
    const onReady = sdk.props?.onReady;
    rerender(<CheckoutWallet {...props} />);
    expect(sdk.props?.initialization).toBe(initialization);
    expect(sdk.props?.onReady).toBe(onReady);
    expect(sdk.init).toHaveBeenCalledOnce();
    expect(sdk.unmount).not.toHaveBeenCalled();
  });
  it("retries the same preference after an SDK error without a backend request", () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    const { unmount } = render(<CheckoutWallet {...props} />);
    act(() => sdk.props?.onError());
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(screen.queryByRole("button", { name: "Botão oficial Wallet" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Recarregar botão do mesmo pedido" }));
    expect(sdk.props?.initialization.preferenceId).toBe(props.preferenceId);
    expect(fetcher).not.toHaveBeenCalled();
    unmount(); fetcher.mockRestore();
  });
  it("shows a recoverable error if the SDK never becomes ready", () => {
    render(<CheckoutWallet {...props} />);
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
  });
  it("removes the Wallet at expiration and never offers a new payment", () => {
    render(<CheckoutWallet {...props} expiresAt="2030-01-01T00:00:02Z" />);
    act(() => sdk.props?.onReady());
    act(() => vi.advanceTimersByTime(2001));
    expect(screen.getByRole("alert")).toHaveTextContent("reserva deste pedido expirou");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(sdk.unmount).toHaveBeenCalledOnce();
  });
  it("never mounts Wallet for an already expired reservation", () => {
    render(<CheckoutWallet {...props} expiresAt="2029-12-31T23:59:59Z" />);
    expect(sdk.props).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("expirou");
  });
  it("unmounts the SDK when navigating away and clears timers", () => {
    const { unmount } = render(<CheckoutWallet {...props} />);
    unmount();
    expect(sdk.unmount).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
