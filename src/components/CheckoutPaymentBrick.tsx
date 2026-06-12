import { useEffect, useRef } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { Loader2 } from "lucide-react";
import { nnPaymentBrickCustomization } from "@/lib/mercadopago-brick-theme";

const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;

let mercadoPagoInitialized = false;

function ensureMercadoPagoInit() {
  if (mercadoPagoInitialized || !publicKey) return;
  initMercadoPago(publicKey, { locale: "pt-BR" });
  mercadoPagoInitialized = true;
}

export interface CheckoutPaymentBrickProps {
  amount: number;
  preferenceId: string;
  orderId: string;
  payerEmail: string;
  payerFirstName?: string;
  payerLastName?: string;
  payerZipCode?: string;
  payerFederalUnit?: string;
  payerCity?: string;
  payerNeighborhood?: string;
  payerStreetName?: string;
  payerStreetNumber?: string;
  payerComplement?: string;
  accessToken: string;
  onApproved: (orderId: string, paymentId?: number) => void;
  onPending: (orderId: string, paymentId?: number) => void;
  onError: (message: string) => void;
}

export function CheckoutPaymentBrick({
  amount,
  preferenceId,
  orderId,
  payerEmail,
  payerFirstName,
  payerLastName,
  payerZipCode,
  payerFederalUnit,
  payerCity,
  payerNeighborhood,
  payerStreetName,
  payerStreetNumber,
  payerComplement,
  accessToken,
  onApproved,
  onPending,
  onError,
}: CheckoutPaymentBrickProps) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (!publicKey) {
    return (
      <div className="border-2 border-destructive/50 bg-card p-6 rounded-lg text-sm text-muted-foreground">
        Configure <code className="text-foreground">VITE_MP_PUBLIC_KEY</code> no ambiente para exibir o pagamento.
      </div>
    );
  }

  ensureMercadoPagoInit();

  const apiBase = import.meta.env.VITE_API_URL ?? "";

  const initialization = {
    amount,
    preferenceId,
    payer: {
      email: payerEmail,
      firstName: payerFirstName,
      lastName: payerLastName,
      address: {
        zipCode: payerZipCode,
        federalUnit: payerFederalUnit,
        city: payerCity,
        neighborhood: payerNeighborhood,
        streetName: payerStreetName,
        streetNumber: payerStreetNumber,
        complement: payerComplement,
      },
    },
  };

  const handleSubmit = async ({
    formData,
  }: {
    selectedPaymentMethod: string;
    formData: Record<string, unknown>;
  }) => {
    const response = await fetch(`${apiBase}/api/mercadopago/process-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ orderId, formData }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = typeof data.error === "string" ? data.error : "Erro ao processar pagamento.";
      if (mountedRef.current) onError(message);
      throw new Error(message);
    }

    const paymentId = typeof data.id === "number" ? data.id : undefined;

    if (data.status === "approved") {
      if (mountedRef.current) onApproved(orderId, paymentId);
      return;
    }

    if (data.status === "pending" || data.status === "in_process") {
      if (mountedRef.current) onPending(orderId, paymentId);
      return;
    }

    const detail = typeof data.status_detail === "string" ? data.status_detail : "Pagamento recusado.";
    if (mountedRef.current) onError(detail);
    throw new Error(detail);
  };

  return (
    <div className="border-2 border-nn-purple-neon bg-card p-6 rounded-lg space-y-4">
      <h2 className="font-display text-xl text-foreground">Pagamento</h2>
      <p className="text-sm text-muted-foreground">
        Escolha a forma de pagamento. Cartão, Pix, boleto e outras opções ficam aqui, sem sair do site.
      </p>
      <Payment
        initialization={initialization}
        customization={nnPaymentBrickCustomization}
        onSubmit={handleSubmit}
        onReady={() => undefined}
        onError={(error) => {
          console.error("[Payment Brick]", error);
          onError("Erro ao carregar o formulário de pagamento.");
        }}
      />
    </div>
  );
}

export function CheckoutPaymentBrickLoading() {
  return (
    <div className="border-2 border-nn-purple-neon bg-card p-10 rounded-lg flex items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-nn-purple-neon" />
      <span className="text-muted-foreground font-display">Preparando pagamento…</span>
    </div>
  );
}
