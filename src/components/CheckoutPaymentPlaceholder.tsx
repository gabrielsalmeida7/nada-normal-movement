import { CreditCard, LockKeyhole, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PaymentMethod = "pix" | "credit_card";

interface CheckoutPaymentPlaceholderProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
}

const methods: Array<{
  id: PaymentMethod;
  title: string;
  description: string;
  icon: typeof QrCode;
}> = [
  {
    id: "pix",
    title: "Pix",
    description: "Confirmação rápida e pagamento por QR Code.",
    icon: QrCode,
  },
  {
    id: "credit_card",
    title: "Cartão de crédito",
    description: "Pagamento seguro e opção de parcelamento.",
    icon: CreditCard,
  },
];

export function CheckoutPaymentPlaceholder({
  selectedMethod,
  onMethodChange,
}: CheckoutPaymentPlaceholderProps) {
  return (
    <section className="space-y-6" aria-labelledby="payment-step-title">
      <div>
        <h2 id="payment-step-title" className="font-display text-xl text-foreground">
          Forma de pagamento
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha como deseja pagar. Nenhum dado de pagamento será solicitado nesta etapa.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Forma de pagamento">
        {methods.map((method) => {
          const Icon = method.icon;
          const selected = selectedMethod === method.id;

          return (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onMethodChange(method.id)}
              className={`flex min-h-32 items-start gap-4 rounded-lg border-2 p-5 text-left transition-colors ${
                selected
                  ? "border-nn-pink bg-nn-pink/5"
                  : "border-border bg-card hover:border-muted-foreground/50"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  selected ? "bg-nn-pink text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display text-base text-foreground">{method.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {method.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border-2 border-dashed border-nn-yellow/60 bg-nn-yellow/10 p-5">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-nn-yellow" />
          <div>
            <p className="font-display text-sm uppercase tracking-wider text-foreground">
              Pagamento temporariamente indisponível
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Estamos finalizando nosso novo ambiente de pagamentos. Seu carrinho continuará
              salvo para você concluir a compra quando o recurso estiver disponível.
            </p>
          </div>
        </div>
      </div>

      <Button size="lg" className="w-full font-display tracking-wider" disabled>
        Finalizar compra em breve
      </Button>
    </section>
  );
}
