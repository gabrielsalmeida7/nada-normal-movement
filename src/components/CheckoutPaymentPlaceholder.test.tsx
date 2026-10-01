import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckoutPaymentPlaceholder } from "@/components/CheckoutPaymentPlaceholder";

describe("CheckoutPaymentPlaceholder", () => {
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
