import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { checkoutProEnabled, getCheckoutStatus } from "@/lib/checkout-pro";
import { useAuth } from "@/contexts/AuthContext";

/** Return pages never trust a payment status supplied in the browser URL. */
export function CheckoutResult() {
  const [params] = useSearchParams();
  const orderId = params.get("order") ?? "";
  const { user } = useAuth();
  const validId = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(orderId);
  const query = useQuery({ queryKey: ["checkout-pro-status", user?.id, orderId], queryFn: () => getCheckoutStatus(orderId),
    enabled: checkoutProEnabled && validId && !!user, retry: 1,
    refetchInterval: (q) => q.state.data && ["paid", "refunded", "chargeback", "cancelled", "failed"].includes(q.state.data.financialStatus) ? false : 5000,
  });
  const status = user ? query.data?.financialStatus : undefined;
  const paid = status === "paid";
  const title = paid ? "Pagamento confirmado!" : status === "refunded" ? "Pagamento estornado"
    : status === "partially_refunded" ? "Pagamento parcialmente estornado"
    : status === "chargeback" ? "Pagamento em contestação"
    : status === "cancelled" || status === "failed" ? "Pagamento não concluído" : "Aguardando confirmação do pagamento";
  const Icon = paid ? CheckCircle : Clock;
  return <div className="min-h-screen bg-background">
    <Header />
    <main className="pt-32 pb-16"><div className="container mx-auto px-4 text-center max-w-md" aria-live="polite">
      <Icon className="mx-auto mb-6 h-16 w-16 text-nn-pink" />
      <h1 className="font-display text-3xl mb-4">{title}</h1>
      <p className="text-muted-foreground mb-6">{paid ? `Pedido #${orderId.slice(0, 8)} confirmado pela loja.`
        : query.isError ? "Não conseguimos consultar o pedido agora. Entre na sua conta e consulte novamente antes de iniciar outro pagamento."
        : !user ? "Entre na sua conta para consultar a confirmação deste pedido."
        : !checkoutProEnabled || !validId ? "Não há confirmação disponível para este pedido."
        : status && ["refunded", "partially_refunded", "chargeback", "cancelled", "failed"].includes(status)
          ? `Consulte o atendimento para mais informações sobre o pedido #${orderId.slice(0, 8)}.`
          : "Estamos consultando a confirmação. Seu carrinho permanece salvo."}</p>
      {query.isError && <Button variant="outline" className="mb-4" onClick={() => void query.refetch()}>Consultar novamente</Button>}
      <div className="flex gap-4 justify-center"><Link to="/home"><Button variant="outline">Voltar à loja</Button></Link>
        <Link to="/login"><Button>Minha conta</Button></Link></div>
    </div></main><Footer />
  </div>;
}
