import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCartStore } from "@/stores/cart-store";
import { useAddresses } from "@/hooks/use-addresses";
import { useProfile } from "@/hooks/use-profile";
import { CheckoutAddressStep } from "@/components/CheckoutAddressStep";
import { CheckoutCustomerStep } from "@/components/CheckoutCustomerStep";
import {
  CheckoutPaymentPlaceholder,
  type PaymentMethod,
} from "@/components/CheckoutPaymentPlaceholder";
import { CheckoutReviewStep } from "@/components/CheckoutReviewStep";
import { CheckoutSummary } from "@/components/CheckoutSummary";
import { getShippingCost } from "@/lib/shipping";
import { isValidCpf, isValidPhone, maskCpf, maskPhone, onlyDigits } from "@/lib/customer";
import type { Address } from "@/types/address";
import type { ShippingAddress } from "@/types/address";
import { toast } from "sonner";

type CheckoutStep = "customer" | "delivery" | "review" | "payment";

interface CustomerErrors {
  fullName?: string;
  cpf?: string;
  phone?: string;
}

const steps: Array<{ id: CheckoutStep; label: string }> = [
  { id: "customer", label: "Identificação" },
  { id: "delivery", label: "Entrega" },
  { id: "review", label: "Revisão" },
  { id: "payment", label: "Pagamento" },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());

  const {
    addresses,
    isLoading: loadingAddresses,
    insertAddress,
    isInserting: isSavingAddress,
  } = useAddresses(user?.id);
  const {
    profile,
    isLoading: loadingProfile,
    updateProfile,
    isUpdating: isSavingProfile,
  } = useProfile(user?.id);

  const profileInitialized = useRef(false);
  const [step, setStep] = useState<CheckoutStep>("customer");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [customerErrors, setCustomerErrors] = useState<CustomerErrors>({});
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [formAddress, setFormAddress] = useState<ShippingAddress | null>(null);
  const [saveForNext, setSaveForNext] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress && !formAddress) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress, formAddress]);

  useEffect(() => {
    if (!profile || profileInitialized.current) return;

    setFullName(profile.full_name ?? "");
    setCpf(maskCpf(profile.cpf ?? ""));
    setPhone(maskPhone(profile.phone ?? ""));
    profileInitialized.current = true;
  }, [profile]);

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
  const currentStepIndex = steps.findIndex((item) => item.id === step);
  const isBusy = isSavingProfile || isSavingAddress;

  useEffect(() => {
    if (!user) {
      navigate("/login?redirect=/checkout", { replace: true });
      return;
    }
    if (items.length === 0) {
      navigate("/carrinho", { replace: true });
    }
  }, [user, items.length, navigate]);

  const handleCustomerNext = async () => {
    if (!user) return;

    const errors: CustomerErrors = {};
    if (fullName.trim().length < 3) {
      errors.fullName = "Informe seu nome completo.";
    }
    if (!isValidCpf(cpf)) {
      errors.cpf = "Informe um CPF válido.";
    }
    if (!isValidPhone(phone)) {
      errors.phone = "Informe um telefone com DDD.";
    }

    setCustomerErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await updateProfile({
        full_name: fullName.trim(),
        cpf: onlyDigits(cpf),
        phone: onlyDigits(phone),
      });
      setStep("delivery");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar seus dados. Tente novamente.");
    }
  };

  const handleDeliveryNext = async () => {
    if (!user || !shippingAddress) {
      toast.error("Selecione ou preencha um endereço de entrega.");
      return;
    }

    const requiredAddressFields = [
      shippingAddress.street,
      shippingAddress.number,
      shippingAddress.city,
      shippingAddress.state,
      shippingAddress.zip_code,
    ];
    if (requiredAddressFields.some((field) => !field.trim())) {
      toast.error("Preencha todos os campos obrigatórios do endereço.");
      return;
    }
    if (onlyDigits(shippingAddress.zip_code).length !== 8) {
      toast.error("Informe um CEP válido.");
      return;
    }
    if (shippingAddress.state.trim().length !== 2) {
      toast.error("Informe a UF com duas letras.");
      return;
    }

    if (saveForNext && useNewAddress && formAddress) {
      try {
        const savedAddress = await insertAddress({
          user_id: user.id,
          label: null,
          street: formAddress.street.trim(),
          number: formAddress.number.trim(),
          complement: formAddress.complement?.trim() || null,
          neighborhood: formAddress.neighborhood?.trim() || null,
          city: formAddress.city.trim(),
          state: formAddress.state.trim().toUpperCase(),
          zip_code: formAddress.zip_code,
        });
        setSelectedAddress(savedAddress);
        setFormAddress(null);
        setSaveForNext(false);
      } catch (error) {
        console.error(error);
        toast.error("Não foi possível salvar o endereço. Tente novamente.");
        return;
      }
    }

    setStep("review");
  };

  const handleBack = () => {
    switch (step) {
      case "customer":
        navigate("/carrinho");
        return;
      case "delivery":
        setStep("customer");
        return;
      case "review":
        setStep("delivery");
        return;
      case "payment":
        setStep("review");
        return;
      default: {
        const exhaustiveCheck: never = step;
        return exhaustiveCheck;
      }
    }
  };

  const renderStep = () => {
    switch (step) {
      case "customer":
        return (
          <CheckoutCustomerStep
            email={user?.email ?? ""}
            fullName={fullName}
            cpf={cpf}
            phone={phone}
            errors={customerErrors}
            onFullNameChange={(value) => {
              setFullName(value);
              setCustomerErrors((current) => ({ ...current, fullName: undefined }));
            }}
            onCpfChange={(value) => {
              setCpf(value);
              setCustomerErrors((current) => ({ ...current, cpf: undefined }));
            }}
            onPhoneChange={(value) => {
              setPhone(value);
              setCustomerErrors((current) => ({ ...current, phone: undefined }));
            }}
          />
        );
      case "delivery":
        return (
          <CheckoutAddressStep
            addresses={addresses}
            selectedAddressId={selectedAddress?.id ?? null}
            onSelectAddress={(address) => {
              setSelectedAddress(address);
              if (address) setFormAddress(null);
            }}
            formAddress={formAddress}
            onFormAddressChange={(address) => {
              setFormAddress(address);
              setSelectedAddress(null);
            }}
            saveForNext={saveForNext}
            onSaveForNextChange={setSaveForNext}
            isLoadingAddresses={loadingAddresses}
          />
        );
      case "review":
        if (!shippingAddress) return null;
        return (
          <CheckoutReviewStep
            fullName={fullName.trim()}
            email={user?.email ?? ""}
            cpf={cpf}
            phone={phone}
            shippingAddress={shippingAddress}
          />
        );
      case "payment":
        return (
          <CheckoutPaymentPlaceholder
            selectedMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
          />
        );
      default: {
        const exhaustiveCheck: never = step;
        return exhaustiveCheck;
      }
    }
  };

  if (!user || items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Link to="/carrinho" className="text-muted-foreground hover:text-foreground text-sm font-display">
              ← Voltar ao carrinho
            </Link>
            <h1 className="mt-2 font-display text-3xl text-foreground">Finalizar compra</h1>
          </div>

          <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Etapas do checkout">
            {steps.map((item, index) => {
              const completed = index < currentStepIndex;
              const active = item.id === step;
              return (
                <li key={item.id} className="min-w-0">
                  <div
                    className={`mb-2 h-1 rounded-full ${
                      completed || active ? "bg-nn-pink" : "bg-muted"
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        completed
                          ? "bg-nn-pink text-white"
                          : active
                            ? "border-2 border-nn-pink text-nn-pink"
                            : "border-2 border-border text-muted-foreground"
                      }`}
                    >
                      {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span
                      className={`hidden truncate text-xs font-medium sm:block ${
                        active ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              {loadingProfile ? (
                <div className="flex min-h-48 items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando seus dados…
                </div>
              ) : (
                renderStep()
              )}

              {step !== "payment" && !loadingProfile && (
                <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
                  <Button variant="outline" onClick={handleBack} disabled={isBusy}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button
                    onClick={
                      step === "customer"
                        ? handleCustomerNext
                        : step === "delivery"
                          ? handleDeliveryNext
                          : () => setStep("payment")
                    }
                    disabled={isBusy}
                    className="font-display tracking-wider"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando…
                      </>
                    ) : (
                      <>
                        {step === "review" ? "Escolher pagamento" : "Continuar"}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {step === "payment" && (
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar para revisão
                </Button>
              )}
            </div>
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-36">
                <CheckoutSummary shippingCost={shippingCost} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
