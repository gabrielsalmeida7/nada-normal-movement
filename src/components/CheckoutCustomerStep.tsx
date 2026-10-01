import { Mail, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskCpf, maskPhone } from "@/lib/customer";

interface CheckoutCustomerStepProps {
  email: string;
  fullName: string;
  cpf: string;
  phone: string;
  errors: {
    fullName?: string;
    cpf?: string;
    phone?: string;
  };
  onFullNameChange: (value: string) => void;
  onCpfChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}

export function CheckoutCustomerStep({
  email,
  fullName,
  cpf,
  phone,
  errors,
  onFullNameChange,
  onCpfChange,
  onPhoneChange,
}: CheckoutCustomerStepProps) {
  return (
    <section className="space-y-6" aria-labelledby="customer-step-title">
      <div>
        <h2 id="customer-step-title" className="font-display text-xl text-foreground">
          Seus dados
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Usaremos essas informações somente para identificar e acompanhar seu pedido.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="checkout-name" className="font-display uppercase tracking-wider">
            Nome completo
          </Label>
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="checkout-name"
              autoComplete="name"
              value={fullName}
              onChange={(event) => onFullNameChange(event.target.value)}
              className="border-2 pl-10"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "checkout-name-error" : undefined}
            />
          </div>
          {errors.fullName && (
            <p id="checkout-name-error" className="text-sm text-destructive">
              {errors.fullName}
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="checkout-email" className="font-display uppercase tracking-wider">
            E-mail
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="checkout-email"
              type="email"
              autoComplete="email"
              value={email}
              disabled
              className="border-2 pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            O e-mail está vinculado à sua conta Nada Normal.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout-cpf" className="font-display uppercase tracking-wider">
            CPF
          </Label>
          <Input
            id="checkout-cpf"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(event) => onCpfChange(maskCpf(event.target.value))}
            maxLength={14}
            className="border-2"
            aria-invalid={Boolean(errors.cpf)}
            aria-describedby={errors.cpf ? "checkout-cpf-error" : undefined}
          />
          {errors.cpf && (
            <p id="checkout-cpf-error" className="text-sm text-destructive">
              {errors.cpf}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout-phone" className="font-display uppercase tracking-wider">
            Telefone
          </Label>
          <Input
            id="checkout-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(event) => onPhoneChange(maskPhone(event.target.value))}
            maxLength={15}
            className="border-2"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "checkout-phone-error" : undefined}
          />
          {errors.phone && (
            <p id="checkout-phone-error" className="text-sm text-destructive">
              {errors.phone}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
