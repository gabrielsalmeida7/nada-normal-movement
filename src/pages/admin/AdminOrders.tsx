import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminOrders } from "@/hooks/admin/use-admin-data";
import { formatCurrency, formatDate, orderStatusLabels } from "@/lib/admin-format";

export default function AdminOrders() {
  const { data: orders = [], isLoading, error } = useAdminOrders();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-3xl">Pedidos</h2>
        <p className="text-sm text-muted-foreground">
          Consulta somente leitura nesta versão. O pagamento permanece fora do painel.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? (
          <p className="p-8 text-center text-muted-foreground">Carregando pedidos…</p>
        ) : error ? (
          <p className="p-8 text-center text-destructive">Não foi possível carregar os pedidos.</p>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">Nenhum pedido cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente e entrega</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="align-top">
                    <p className="font-mono text-xs">{order.id.slice(0, 8)}</p>
                    <details className="mt-2 min-w-52">
                      <summary className="cursor-pointer text-xs text-nn-pink">
                        {order.order_items.length} item(ns)
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs">
                        {order.order_items.map((item) => (
                          <li key={item.id}>
                            {item.quantity}× {item.products?.name ?? "Produto removido"}
                            {item.product_variants
                              ? ` — ${item.product_variants.size}${item.product_variants.color_name ? ` / ${item.product_variants.color_name}` : ""}`
                              : ""}
                            {" · "}
                            {formatCurrency(item.price_cents_at_purchase)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </TableCell>
                  <TableCell className="max-w-xs align-top">
                    <p className="font-medium">{order.shipping_name || "Cliente não informado"}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.shipping_street}, {order.shipping_number}
                      {order.shipping_complement ? `, ${order.shipping_complement}` : ""}
                      <br />
                      {order.shipping_neighborhood ? `${order.shipping_neighborhood} — ` : ""}
                      {order.shipping_city}/{order.shipping_state} · {order.shipping_zip_code}
                    </p>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>
                      {orderStatusLabels[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="font-medium">{formatCurrency(order.total_cents)}</p>
                    <p className="text-xs text-muted-foreground">Frete {formatCurrency(order.shipping_cents)}</p>
                  </TableCell>
                  <TableCell className="align-top">{formatDate(order.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}
