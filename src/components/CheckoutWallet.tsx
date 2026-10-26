import { useCallback, useEffect, useMemo, useState } from "react";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { Button } from "@/components/ui/button";
import { getWalletPublicKey } from "@/lib/checkout-pro";
import { Link } from "react-router-dom";

interface CheckoutWalletProps {
  preferenceId: string;
  expiresAt: string;
  orderId?: string;
}

export function CheckoutWallet({ preferenceId, expiresAt, orderId }: CheckoutWalletProps) {
  const deadline = Date.parse(expiresAt);
  const [expired, setExpired] = useState(() => !Number.isFinite(deadline) || Date.now() >= deadline);
  const [initialized, setInitialized] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const initialization = useMemo(() => ({ preferenceId, redirectMode: "self" as const }), [preferenceId]);
  const onReady = useCallback(() => setReady(true), []);
  // Never print the SDK error: it may contain provider/session information.
  const onError = useCallback(() => setFailed(true), []);

  useEffect(() => {
    const check = () => setExpired(!Number.isFinite(deadline) || Date.now() >= deadline);
    check();
    const interval = window.setInterval(check, 1000);
    return () => window.clearInterval(interval);
  }, [deadline]);

  useEffect(() => {
    if (expired) return;
    let active = true;
    try {
      const publicKey = getWalletPublicKey();
      // Catch script loading failures before mounting the React SDK wrapper.
      // The official loader caches its promise, so only one script is injected.
      void loadMercadoPago().then(() => {
        if (!active) return;
        initMercadoPago(publicKey, { locale: "pt-BR" });
        setInitialized(true);
      }).catch(() => { if (active) setFailed(true); });
    } catch {
      setFailed(true);
    }
    return () => { active = false; };
  }, [attempt, expired]);

  useEffect(() => {
    if (ready || failed || expired) return;
    const timeout = window.setTimeout(() => setFailed(true), 20000);
    return () => window.clearTimeout(timeout);
  }, [attempt, ready, failed, expired]);

  if (expired) return <div role="alert" className="space-y-3 text-sm">
    <p>A reserva deste pedido expirou. Consulte o estado do pagamento antes de iniciar outra compra.</p>
    {orderId && <Link className="inline-block underline underline-offset-4" to={`/checkout/pendente?order=${encodeURIComponent(orderId)}`}>Consultar este pedido</Link>}
  </div>;

  if (failed) return <div className="space-y-3">
    <p role="alert" className="text-sm text-nn-yellow">
      Não foi possível carregar o botão do Mercado Pago. Confira a conexão e eventuais bloqueios do navegador.
      Se necessário, atualize a página. Seu pedido foi mantido; esta ação não confirma um pagamento.
    </p>
    {initialized && <Button variant="outline" onClick={() => {
      setReady(false);
      setFailed(false);
      setAttempt(value => value + 1);
    }}>Recarregar botão do mesmo pedido</Button>}
  </div>;

  return <div className="min-w-0 space-y-3" aria-label="Checkout Pro de teste">
    <p className="text-sm text-muted-foreground">Ambiente de teste: use apenas comprador e cartão de teste do Mercado Pago.</p>
    {!ready && <p role="status" className="text-sm text-muted-foreground">Carregando botão do Mercado Pago…</p>}
    {initialized && <Wallet key={attempt} initialization={initialization} onReady={onReady} onError={onError} />}
  </div>;
}
