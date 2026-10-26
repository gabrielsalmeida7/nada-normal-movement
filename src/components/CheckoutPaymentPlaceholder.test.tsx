import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckoutPaymentPlaceholder } from "@/components/CheckoutPaymentPlaceholder";
import { MemoryRouter } from "react-router-dom";

describe("CheckoutPaymentPlaceholder", () => {
  it("keeps the order consultation action accessible after a failure", () => {
    const orderId = "11111111-1111-4111-8111-111111111111";
    render(<MemoryRouter><CheckoutPaymentPlaceholder selectedMethod="pix" onMethodChange={vi.fn()} enabled
      checkoutError={{ message: "Estamos verificando o pagamento.", orderId }} /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("Estamos verificando");
    expect(screen.getByRole("link", { name: "Consultar este pedido" })).toHaveAttribute("href", `/checkout/pendente?order=${orderId}`);
  });
  it("confirma o total antes de direcionar ao Mercado Pago, sem coletar cartão", () => {
    const onPay = vi.fn();
    render(<CheckoutPaymentPlaceholder selectedMethod="pix" onMethodChange={vi.fn()} enabled totalCents={12000} onPay={onPay} />);
    expect(screen.getByRole("status")).toHaveTextContent("120,00");
    fireEvent.click(screen.getByRole("button", { name: "Carregar botão do Mercado Pago" }));
    expect(onPay).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText(/número do cartão/i)).not.toBeInTheDocument();
  });
  it("permite escolher o método sem coletar dados sensíveis", () => {
    const onMethodChange = vi.fn();

    render(
      <CheckoutPaymentPlaceholder
        selectedMethod="pix"
        onMethodChange={onMethodChange}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /cartão de crédito/i }));

    expect(onMethodChange).toHaveBeenCalledWith("credit_card");
    expect(screen.queryByLabelText(/número do cartão/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cvv/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /finalizar compra em breve/i })).toBeDisabled();
  });
});
