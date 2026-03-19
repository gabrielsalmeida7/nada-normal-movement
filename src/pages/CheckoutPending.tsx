import { useSearchParams, Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function CheckoutPending() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order") ?? searchParams.get("external_reference");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-nn-yellow/20 text-nn-yellow mb-6">
            <Clock size={48} />
          </div>
          <h1 className="font-display text-3xl text-foreground mb-2">Pagamento pendente</h1>
          <p className="text-muted-foreground mb-6">
            {orderId ? (
              <>Seu pedido <strong>#{orderId.slice(0, 8)}</strong> está aguardando confirmação do pagamento (PIX ou boleto). Você receberá uma notificação quando for aprovado.</>
            ) : (
              "Seu pagamento está pendente. Você receberá uma notificação quando for aprovado."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/home">
              <Button variant="outline" className="w-full sm:w-auto">
                Voltar ao início
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
