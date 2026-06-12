import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useCartStore } from "@/stores/cart-store";
import { useAddresses } from "@/hooks/use-addresses";
import { useProfile } from "@/hooks/use-profile";
import { CheckoutAddressStep } from "@/components/CheckoutAddressStep";
import { CheckoutSummary } from "@/components/CheckoutSummary";
import { CheckoutPaymentBrick, CheckoutPaymentBrickLoading } from "@/components/CheckoutPaymentBrick";
import { getShippingCost } from "@/lib/shipping";
import { createOrder } from "@/lib/orders";
import type { Address } from "@/types/address";
import type { ShippingAddress } from "@/types/address";
import { toast } from "sonner";

type CheckoutStep = "address" | "payment";

interface PaymentSession {
  orderId: string;
  preferenceId: string;
  amount: number;
}

function splitFullName(fullName: string | null | undefined): { firstName?: string; lastName?: string } {
  if (!fullName?.trim()) return {};
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);

  const { addresses, isLoading: loadingAddresses, insertAddress } = useAddresses(user?.id);
  const { profile, isLoading: loadingProfile } = useProfile(user?.id);

  const [step, setStep] = useState<CheckoutStep>("address");
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [formAddress, setFormAddress] = useState<ShippingAddress | null>(null);
  const [saveForNext, setSaveForNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phoneOverride, setPhoneOverride] = useState("");

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress && !formAddress) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress, formAddress]);

  const useNewAddress = !selectedAddress && (addresses.length === 0 || formAddress !== null);
  const shippingAddress: ShippingAddress | null = selectedAddress
    ? {
        street: selectedAddress.street,
        number: selectedAddress.number,
        complement: selectedAddress.complement ?? undefined,
        neighborhood: selectedAddress.neighborhood ?? undefined,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zip_code: selectedAddress.zip_code,
      }
    : formAddress;

  const uf = shippingAddress?.state ?? "";
  const shippingCost = getShippingCost(uf, subtotal);
  const totalAmount = subtotal + shippingCost;

  useEffect(() => {
    if (!user) {
      navigate("/login?redirect=/checkout", { replace: true });
      return;
    }
    if (items.length === 0 && step === "address") {
      navigate("/carrinho", { replace: true });
    }
  }, [user, items.length, navigate, step]);

  const handleContinueToPayment = async () => {
    if (!user || !shippingAddress || items.length === 0) return;

    const shippingName = profile?.full_name ?? user.email ?? "Cliente";
    const shippingPhone = (profile?.phone ?? phoneOverride).trim();
    if (!shippingPhone) {
      toast.error("Informe seu telefone para contato e entrega.");
      return;
    }

    if (!shippingAddress.street || !shippingAddress.number || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip_code) {
      toast.error("Preencha todos os campos obrigatórios do endereço.");
      return;
    }

    const token = session?.access_token;
    if (!token) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    setSubmitting(true);
    try {
      if (saveForNext && useNewAddress && formAddress) {
        await insertAddress({
          user_id: user.id,
          label: null,
          street: formAddress.street,
          number: formAddress.number,
          complement: formAddress.complement ?? null,
          neighborhood: formAddress.neighborhood ?? null,
          city: formAddress.city,
          state: formAddress.state,
          zip_code: formAddress.zip_code,
        });
      }

      const { orderId } = await createOrder({
        userId: user.id,
        items,
        shippingAddress,
        shippingName,
        shippingPhone,
        subtotalCents: Math.round(subtotal * 100),
        shippingCents: Math.round(shippingCost * 100),
      });

      const apiBase = import.meta.env.VITE_API_URL ?? "";
      const prefRes = await fetch(`${apiBase}/api/mercadopago/preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });

      const prefData = await prefRes.json().catch(() => ({}));

      if (!prefRes.ok) {
        toast.error(prefData.error ?? "Erro ao preparar pagamento. Tente novamente.");
        return;
      }

      if (!prefData.preferenceId || typeof prefData.amount !== "number") {
        toast.error("Resposta inválida ao preparar pagamento.");
        return;
      }

      setPaymentSession({
        orderId,
        preferenceId: prefData.preferenceId,
        amount: prefData.amount,
      });
      setStep("payment");
      toast.success("Endereço confirmado. Escolha como pagar.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao criar pedido. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentApproved = (orderId: string) => {
    clearCart();
    toast.success("Pagamento aprovado!");
    navigate(`/checkout/sucesso?order=${orderId}&status=approved`, { replace: true });
  };

  const handlePaymentPending = (orderId: string) => {
    clearCart();
    toast.message("Pagamento pendente", {
      description: "Finalize conforme as instruções exibidas.",
    });
    navigate(`/checkout/pendente?order=${orderId}`, { replace: true });
  };

  const handlePaymentError = (message: string) => {
    toast.error(message);
  };

  if (!user || (items.length === 0 && step === "address")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { firstName, lastName } = splitFullName(profile?.full_name ?? user.email);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Link
              to={step === "payment" ? "#" : "/carrinho"}
              onClick={(e) => {
                if (step === "payment") {
                  e.preventDefault();
                  setStep("address");
                  setPaymentSession(null);
                }
              }}
              className="text-muted-foreground hover:text-foreground text-sm font-display"
            >
              {step === "payment" ? "← Voltar ao endereço" : "← Voltar ao carrinho"}
            </Link>
            <h1 className="font-display text-3xl text-foreground mt-2">Checkout</h1>
            <p className="text-sm text-muted-foreground mt-1 font-display uppercase tracking-wider">
              {step === "address" ? "Passo 1 — Entrega" : "Passo 2 — Pagamento"}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              {step === "address" ? (
                <>
                  <CheckoutAddressStep
                    addresses={addresses}
                    selectedAddressId={selectedAddress?.id ?? null}
                    onSelectAddress={(addr) => {
                      setSelectedAddress(addr);
                      if (addr) setFormAddress(null);
                    }}
                    formAddress={formAddress}
                    onFormAddressChange={(addr) => {
                      setFormAddress(addr);
                      setSelectedAddress(null);
                    }}
                    saveForNext={saveForNext}
                    onSaveForNextChange={setSaveForNext}
                    isLoadingAddresses={loadingAddresses}
                  />
                  {(!profile?.phone || profile.phone.trim() === "") && (
                    <div className="space-y-2">
                      <h2 className="font-display text-xl text-foreground">Telefone para contato</h2>
                      <p className="text-sm text-muted-foreground">
                        Necessário para entrega e comunicação sobre seu pedido.
                      </p>
                      <div className="max-w-xs">
                        <Label htmlFor="phone" className="font-display uppercase tracking-wider">
                          Telefone
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          value={phoneOverride}
                          onChange={(e) => setPhoneOverride(e.target.value)}
                          className="border-2 mt-1"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : paymentSession && session?.access_token && shippingAddress ? (
                <CheckoutPaymentBrick
                  amount={paymentSession.amount}
                  preferenceId={paymentSession.preferenceId}
                  orderId={paymentSession.orderId}
                  payerEmail={user.email ?? ""}
                  payerFirstName={firstName}
                  payerLastName={lastName}
                  payerZipCode={shippingAddress.zip_code}
                  payerFederalUnit={shippingAddress.state}
                  payerCity={shippingAddress.city}
                  payerNeighborhood={shippingAddress.neighborhood}
                  payerStreetName={shippingAddress.street}
                  payerStreetNumber={shippingAddress.number}
                  payerComplement={shippingAddress.complement}
                  accessToken={session.access_token}
                  onApproved={handlePaymentApproved}
                  onPending={handlePaymentPending}
                  onError={handlePaymentError}
                />
              ) : (
                <CheckoutPaymentBrickLoading />
              )}
            </div>
            <div className="lg:col-span-1">
              <div className="space-y-2">
                <CheckoutSummary shippingCost={shippingCost} />
                {step === "address" && (
                  <Button
                    size="lg"
                    className="w-full font-display tracking-wider"
                    disabled={!shippingAddress || submitting || loadingProfile}
                    onClick={handleContinueToPayment}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Preparando pagamento…
                      </>
                    ) : (
                      "Continuar para pagamento"
                    )}
                  </Button>
                )}
                {step === "payment" && (
                  <p className="text-xs text-muted-foreground text-center px-2">
                    Total: R$ {totalAmount.toFixed(2).replace(".", ",")} — pagamento seguro via Mercado Pago
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
