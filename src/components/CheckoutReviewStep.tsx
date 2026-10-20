import { MapPin, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ShippingAddress } from "@/types/address";

interface CheckoutReviewStepProps {
  fullName: string;
  email: string;
  cpf: string;
  phone: string;
  shippingAddress: ShippingAddress;
}

export function CheckoutReviewStep({
  fullName,
  email,
  cpf,
  phone,
  shippingAddress,
}: CheckoutReviewStepProps) {
  return (
    <section className="space-y-6" aria-labelledby="review-step-title">
      <div>
        <h2 id="review-step-title" className="font-display text-xl text-foreground">
          Revise seus dados
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confira as informações antes de escolher como pagar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-border">
          <CardContent className="flex gap-3 pt-6">
            <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-nn-pink" />
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-display text-base text-foreground">Identificação</p>
              <p className="font-medium">{fullName}</p>
              <p className="break-all text-muted-foreground">{email}</p>
              <p className="text-muted-foreground">{cpf}</p>
              <p className="text-muted-foreground">{phone}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-border">
          <CardContent className="flex gap-3 pt-6">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-nn-purple-neon" />
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-display text-base text-foreground">Entrega</p>
              <p>
                {shippingAddress.street}, {shippingAddress.number}
              </p>
              {shippingAddress.complement && (
                <p className="text-muted-foreground">{shippingAddress.complement}</p>
              )}
              {shippingAddress.neighborhood && (
                <p className="text-muted-foreground">{shippingAddress.neighborhood}</p>
              )}
              <p className="text-muted-foreground">
                {shippingAddress.city}/{shippingAddress.state} · {shippingAddress.zip_code}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
