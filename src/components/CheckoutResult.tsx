import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { checkoutProEnabled, checkoutStatusEnabled, getCheckoutStatus, prepareWalletCheckout, CheckoutStateError } from "@/lib/checkout-pro";
import { useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { cartSignature, consumePaidCheckout } from "@/lib/checkout-state";
import { useCartStore } from "@/stores/cart-store";

const CheckoutWallet = lazy(() => import("./CheckoutWallet").then(module => ({ default: module.CheckoutWallet })));

/** Return pages never trust a payment status supplied in the browser URL. */
export function CheckoutResult() {
  const [params] = useSearchParams();
  const orderId = params.get("order") ?? "";
  const { user, loading } = useAuth();
  const userId = user?.id;
  const [wallet, setWallet] = useState<{ userId: string; orderId: string; preferenceId: string } | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const resumeLock = useRef(false);
  useEffect(() => {
    setWallet(null); setResumeError(null);
  }, [userId, orderId]);
  const validId = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(orderId);
  const query = useQuery({ queryKey: ["checkout-pro-status", user?.id, orderId], queryFn: () => getCheckoutStatus(orderId, userId),
    enabled: checkoutStatusEnabled && validId && !!user, retry: 1,
    refetchInterval: (q) => q.state.error || (q.state.data && ["paid", "refunded", "chargeback", "cancelled", "failed"].includes(q.state.data.financialStatus)) ? false : 5000,
  });
  const status = user ? query.data?.financialStatus : undefined;
  const paid = status === "paid";
  const expiresAt = query.data?.reservationExpiresAt;
  const awaitingPayment = ["pending", "processing"].includes(status ?? "");
  const expired = awaitingPayment && !!expiresAt && Date.parse(expiresAt) <= Date.now();
  const canResume = checkoutProEnabled && !!user && !query.isError && query.data?.reservationState === "held" &&
    awaitingPayment && !!expiresAt && !expired;
  const resumePayment = async () => {
    if (!canResume || !user || resumeLock.current) return;
    resumeLock.current = true; setResuming(true); setResumeError(null);
    try {
      const result = await prepareWalletCheckout(orderId, user.id);
      setWallet({ userId: user.id, orderId, preferenceId: result.preferenceId });
    } catch (error) {
      setResumeError(error instanceof CheckoutStateError ? error.message : "Não foi possível retomar o pagamento. Consulte o pedido novamente.");
    } finally { resumeLock.current = false; setResuming(false); }
  };
  useEffect(() => {
    if (!paid || !userId) return;
    const signature = consumePaidCheckout(userId, orderId);
    const cart = useCartStore.getState();
    if (signature !== null && cartSignature(cart.items) === signature) cart.clearCart();
  }, [paid, userId, orderId]);
  const title = !validId || !checkoutStatusEnabled ? "Consulta de pedido indisponível"
    : query.isError ? "Não foi possível consultar o pedido"
    : !user && !loading ? "Entre para consultar seu pedido"
    : paid ? "Pagamento confirmado!" : status === "refunded" ? "Pagamento estornado"
    : status === "partially_refunded" ? "Pagamento parcialmente estornado"
    : status === "chargeback" ? "Pagamento em contestação"
    : status === "cancelled" || status === "failed" ? "Pagamento não concluído"
    : expired ? "Reserva de pagamento expirada" : "Aguardando confirmação do pagamento";
  const Icon = paid ? CheckCircle : Clock;
  return <div className="min-h-screen bg-background">
    <Header />
    <main className="pt-32 pb-16"><div className="container mx-auto px-4 text-center max-w-md" aria-live="polite">
      <Icon className="mx-auto mb-6 h-16 w-16 text-nn-pink" />
      <h1 className="font-display text-3xl mb-4">{title}</h1>
      <p className="text-muted-foreground mb-6">{paid ? `Pedido #${orderId.slice(0, 8)} confirmado pela loja.`
        : query.isError ? "Não conseguimos consultar o pedido agora. Entre na sua conta e consulte novamente antes de iniciar outro pagamento."
        : loading ? "Consultando sua sessão…"
        : !user ? "Entre na sua conta para consultar a confirmação deste pedido."
        : !checkoutStatusEnabled || !validId ? "Não há confirmação disponível para este pedido."
        : status && ["refunded", "partially_refunded", "chargeback", "cancelled", "failed"].includes(status)
          ? `Consulte o atendimento para mais informações sobre o pedido #${orderId.slice(0, 8)}.`
          : expired ? "O prazo para pagar este pedido terminou. Precisamos confirmar o resultado do pagamento antes de liberar uma nova tentativa. Consulte este pedido novamente ou entre em contato com o atendimento."
          : "Este pedido ainda não tem pagamento confirmado. Consulte novamente ou retome o pagamento, se essa opção estiver disponível."}</p>
      {query.isError && <Button variant="outline" className="mb-4" onClick={() => void query.refetch()}>Consultar novamente</Button>}
      {canResume && <div className="mb-6 space-y-4">
        <p className="text-sm text-muted-foreground">Você pode continuar o pagamento deste mesmo pedido.</p>
        {wallet?.userId === user?.id && wallet.orderId === orderId ?
          <Suspense fallback={<p role="status">Carregando botão do Mercado Pago…</p>}>
            <CheckoutWallet key={wallet.preferenceId} preferenceId={wallet.preferenceId}
              expiresAt={expiresAt!} orderId={orderId} />
          </Suspense>
          : <Button disabled={resuming} onClick={() => void resumePayment()}>{resuming ? "Consultando pedido…" : "Retomar pagamento deste pedido"}</Button>}
        {resumeError && <p role="alert" className="text-sm">{resumeError}</p>}
      </div>}
      <div className="flex gap-4 justify-center"><Link to="/home"><Button variant="outline">Voltar à loja</Button></Link>
        {!user && validId ? <Link to={`/login?redirect=${encodeURIComponent(`/checkout/pendente?order=${orderId}`)}`}><Button>Entrar para consultar</Button></Link>
          : ["cancelled", "failed"].includes(status ?? "") && query.data?.reservationState === "released" &&
            <Link to="/checkout"><Button>Revisar carrinho</Button></Link>}</div>
    </div></main><Footer />
  </div>;
}
