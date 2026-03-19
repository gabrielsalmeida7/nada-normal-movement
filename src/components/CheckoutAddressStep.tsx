import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fetchAddressByCep, maskCep } from "@/lib/viacep";
import type { Address } from "@/types/address";
import type { ShippingAddress } from "@/types/address";

interface CheckoutAddressStepProps {
  addresses: Address[];
  selectedAddressId: string | null;
  onSelectAddress: (addr: Address | null) => void;
  formAddress: ShippingAddress | null;
  onFormAddressChange: (addr: ShippingAddress) => void;
  saveForNext: boolean;
  onSaveForNextChange: (v: boolean) => void;
  isLoadingAddresses?: boolean;
}

const emptyForm: ShippingAddress = {
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zip_code: "",
};

export function CheckoutAddressStep({
  addresses,
  selectedAddressId,
  onSelectAddress,
  formAddress,
  onFormAddressChange,
  saveForNext,
  onSaveForNextChange,
  isLoadingAddresses,
}: CheckoutAddressStepProps) {
  const [useNewAddress, setUseNewAddress] = useState(addresses.length === 0);
  const [cepLoading, setCepLoading] = useState(false);

  const currentForm = formAddress ?? emptyForm;

  const handleCepBlur = async () => {
    const cep = currentForm.zip_code.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const data = await fetchAddressByCep(cep);
      if (data) {
        onFormAddressChange({
          ...currentForm,
          street: data.logradouro ?? "",
          neighborhood: data.bairro ?? "",
          city: data.localidade ?? "",
          state: data.uf ?? "",
        });
      }
    } finally {
      setCepLoading(false);
    }
  };

  const updateField = (field: keyof ShippingAddress, value: string) => {
    if (field === "zip_code") {
      onFormAddressChange({ ...currentForm, zip_code: maskCep(value) });
    } else {
      onFormAddressChange({ ...currentForm, [field]: value });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl text-foreground">Endereço de entrega</h2>

      {isLoadingAddresses ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
          Carregando endereços…
        </div>
      ) : addresses.length > 0 ? (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <Card
              key={addr.id}
              className={`cursor-pointer border-2 transition-colors ${
                !useNewAddress && selectedAddressId === addr.id
                  ? "border-nn-pink bg-nn-pink/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
              onClick={() => {
                setUseNewAddress(false);
                onSelectAddress(addr);
              }}
            >
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-4 w-4 rounded-full border-2 ${
                      !useNewAddress && selectedAddressId === addr.id ? "border-nn-pink bg-nn-pink" : "border-border"
                    }`}
                  />
                  <span className="font-display text-sm">
                    {addr.street}, {addr.number}
                    {addr.complement ? ` - ${addr.complement}` : ""} • {addr.city}/{addr.state}
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))}
          <button
            type="button"
            className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
              useNewAddress ? "border-nn-pink bg-nn-pink/5" : "border-border hover:border-muted-foreground/50"
            }`}
            onClick={() => {
              setUseNewAddress(true);
              onSelectAddress(null);
              onFormAddressChange(emptyForm);
            }}
          >
            <span className="font-display">+ Novo endereço</span>
          </button>
        </div>
      ) : null}

      {useNewAddress && (
        <Card className="border-2 border-border">
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cep" className="font-display uppercase tracking-wider">
                  CEP
                </Label>
                <div className="relative">
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={currentForm.zip_code}
                    onChange={(e) => updateField("zip_code", e.target.value)}
                    onBlur={handleCepBlur}
                    maxLength={9}
                    className="border-2"
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="number" className="font-display uppercase tracking-wider">
                  Número
                </Label>
                <Input
                  id="number"
                  placeholder="123"
                  value={currentForm.number}
                  onChange={(e) => updateField("number", e.target.value)}
                  required
                  className="border-2"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="street" className="font-display uppercase tracking-wider">
                Rua
              </Label>
              <Input
                id="street"
                placeholder="Rua, Avenida..."
                value={currentForm.street}
                onChange={(e) => updateField("street", e.target.value)}
                required
                className="border-2"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="complement" className="font-display uppercase tracking-wider">
                  Complemento
                </Label>
                <Input
                  id="complement"
                  placeholder="Apto, bloco..."
                  value={currentForm.complement ?? ""}
                  onChange={(e) => updateField("complement", e.target.value)}
                  className="border-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="neighborhood" className="font-display uppercase tracking-wider">
                  Bairro
                </Label>
                <Input
                  id="neighborhood"
                  placeholder="Bairro"
                  value={currentForm.neighborhood ?? ""}
                  onChange={(e) => updateField("neighborhood", e.target.value)}
                  className="border-2"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city" className="font-display uppercase tracking-wider">
                  Cidade
                </Label>
                <Input
                  id="city"
                  placeholder="Cidade"
                  value={currentForm.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  required
                  className="border-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="font-display uppercase tracking-wider">
                  Estado (UF)
                </Label>
                <Input
                  id="state"
                  placeholder="SP"
                  value={currentForm.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  maxLength={2}
                  required
                  className="border-2 uppercase"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="save-address"
                checked={saveForNext}
                onCheckedChange={(c) => onSaveForNextChange(!!c)}
              />
              <Label htmlFor="save-address" className="text-sm cursor-pointer">
                Salvar endereço para próximas compras
              </Label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
