import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { customerOrderDate, customerPaymentLabel, fetchCustomerOrders } from "@/lib/customer-orders";
import { formatCurrency, orderStatusLabels } from "@/lib/admin-format";
import type { OrderStatus } from "@/types/admin";

export default function MyOrders() {
  const { user, loading } = useAuth();
  const [pagination, setPagination] = useState({ userId: user?.id, page: 0 });
  const page = pagination.userId === user?.id ? pagination.page : 0;
  const query = useQuery({ queryKey: ["customer-orders", user?.id, page],
    queryFn: ({ signal }) => fetchCustomerOrders(user!.id, page, signal), enabled: !!user && !loading,
    staleTime: 10000, refetchInterval: 30000, retry: 1 });
  const orders = user ? query.data?.orders ?? [] : [];
  const changePage = (next: number) => setPagination({ userId: user?.id, page: next });

  return <div className="min-h-screen bg-background">
    <Header />
    <main className="pt-40 pb-20">
      <div className="container max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-5 mb-10">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">Meus pedidos</h1>
            <p className="text-muted-foreground mt-3">Acompanhe suas compras e a confirmação dos pagamentos.</p>
          </div>
          {user && <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            {query.isFetching ? "Atualizando…" : "Atualizar pedidos"}
          </Button>}
        </div>
        <div aria-live="polite" aria-busy={loading || (!!user && query.isPending)}>
          {loading ? <p role="status">Consultando sua sessão…</p>
            : !user ? <div className="space-y-5">
              <p>Entre na sua conta para visualizar seus pedidos.</p>
              <Button asChild><Link to="/login?redirect=/meus-pedidos">Entrar para consultar</Link></Button>
            </div>
            : query.isPending ? <p role="status">Carregando seus pedidos…</p>
            : query.isError ? <div role="alert" className="space-y-3">
              <p>Não foi possível atualizar seus pedidos. Tente novamente pelo botão acima.</p>
              <p className="text-muted-foreground">Consulte a confirmação antes de iniciar outro pagamento.</p>
            </div>
            : orders.length === 0 ? <div className="space-y-5">
              <h2 className="font-display text-2xl">{page === 0 ? "Você ainda não tem pedidos" : "Nenhum pedido nesta página"}</h2>
              <p className="text-muted-foreground">{page === 0 ? "Suas compras aparecerão aqui assim que o pedido for criado." : "Volte à página anterior para consultar suas compras."}</p>
              {page === 0 && <Button asChild variant="outline"><Link to="/street">Conhecer a coleção</Link></Button>}
            </div>
            : <ol className="divide-y divide-border border-y border-border">
              {orders.map(order => <li key={order.id} className="py-7">
                <article aria-labelledby={`order-${order.id}`}>
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <h2 id={`order-${order.id}`} className="font-display text-2xl">Pedido #{order.id.slice(0, 8)}</h2>
                      <time dateTime={order.created_at} className="text-sm text-muted-foreground">{customerOrderDate(order.created_at)}</time>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xl font-semibold tabular-nums">{formatCurrency(order.total_cents)}</p>
                      <p className="text-sm text-muted-foreground">Frete {formatCurrency(order.shipping_cents)}</p>
                    </div>
                  </div>
                  <dl className="grid sm:grid-cols-2 gap-4 my-5">
                    <div><dt className="text-sm text-muted-foreground">Status do pedido</dt>
                      <dd className="font-medium">{orderStatusLabels[order.status as OrderStatus] ?? "Status indisponível"}</dd></div>
                    <div><dt className="text-sm text-muted-foreground">Pagamento</dt>
                      <dd className="font-medium">{customerPaymentLabel(order)}</dd></div>
                  </dl>
                  <ul className="space-y-2 mb-5" aria-label="Itens do pedido">
                    {order.order_items.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-x-5 gap-y-1 text-sm">
                      <span className="min-w-0 break-words">{item.quantity}× {item.products?.name ?? "Produto indisponível no catálogo"}
                        {item.product_variants && <span className="text-muted-foreground"> — {item.product_variants.size}{item.product_variants.color_name ? ` / ${item.product_variants.color_name}` : ""}</span>}
                      </span>
                      <span className="text-muted-foreground">{formatCurrency(item.price_cents_at_purchase)} por unidade</span>
                    </li>)}
                  </ul>
                  <Button asChild variant="outline"><Link to={`/checkout/pendente?order=${order.id}`}>Consultar pagamento<span className="sr-only"> do pedido #{order.id.slice(0, 8)}</span></Link></Button>
                </article>
              </li>)}
            </ol>}
        </div>
        {user && !query.isPending && !query.isError && <nav aria-label="Páginas dos pedidos" className="flex flex-wrap items-center justify-between gap-4 mt-8">
          <Button variant="outline" disabled={page === 0} onClick={() => changePage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page + 1}</span>
          <Button variant="outline" disabled={!query.data?.hasNext} onClick={() => changePage(page + 1)}>Próxima</Button>
        </nav>}
      </div>
    </main>
    <Footer />
  </div>;
}
