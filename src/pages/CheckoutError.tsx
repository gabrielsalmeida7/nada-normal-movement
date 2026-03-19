import { useSearchParams, Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function CheckoutError() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order") ?? searchParams.get("external_reference");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/20 text-destructive mb-6">
            <XCircle size={48} />
          </div>
          <h1 className="font-display text-3xl text-foreground mb-2">Pagamento não realizado</h1>
          <p className="text-muted-foreground mb-6">
            O pagamento foi recusado ou cancelado. Você pode tentar novamente acessando seu carrinho ou escolhendo outro método de pagamento.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/carrinho">
              <Button variant="outline" className="w-full sm:w-auto">
                Voltar ao carrinho
              </Button>
            </Link>
            <Link to="/running">
              <Button className="w-full sm:w-auto">
                Continuar comprando
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
