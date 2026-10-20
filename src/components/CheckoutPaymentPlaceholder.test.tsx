import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckoutPaymentPlaceholder } from "@/components/CheckoutPaymentPlaceholder";

describe("CheckoutPaymentPlaceholder", () => {
  it("confirma o total antes de direcionar ao Mercado Pago, sem coletar cartão", () => {
    const onPay = vi.fn();
    render(<CheckoutPaymentPlaceholder selectedMethod="pix" onMethodChange={vi.fn()} enabled totalCents={12000} onPay={onPay} />);
    expect(screen.getByRole("status")).toHaveTextContent("120,00");
    fireEvent.click(screen.getByRole("button", { name: "Continuar no Mercado Pago" }));
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
