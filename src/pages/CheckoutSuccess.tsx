import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order") ?? searchParams.get("external_reference");
  const status = searchParams.get("status") ?? searchParams.get("collection_status");
  const paid = status === "approved";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-nn-lime/20 text-nn-lime mb-6">
            <CheckCircle size={48} />
          </div>
          <h1 className="font-display text-3xl text-foreground mb-2">
            {paid ? "Pagamento aprovado!" : "Pedido criado!"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {orderId ? (
              paid ? (
                <>Seu pedido <strong>#{orderId.slice(0, 8)}</strong> foi pago com sucesso. Em breve você receberá a confirmação.</>
              ) : (
                <>Seu pedido <strong>#{orderId.slice(0, 8)}</strong> foi registrado. Finalize o pagamento no Mercado Pago.</>
              )
            ) : (
              "Seu pedido foi registrado com sucesso."
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
