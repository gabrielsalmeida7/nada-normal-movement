import { Boxes, CircleDollarSign, PackageX, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminMetrics, useAdminOrders, useAdminProducts } from "@/hooks/admin/use-admin-data";
import { formatCurrency, formatDate, orderStatusLabels } from "@/lib/admin-format";
import type { OrderStatus } from "@/types/admin";

export default function AdminDashboard() {
  const metricsQuery = useAdminMetrics();
  const productsQuery = useAdminProducts();
  const ordersQuery = useAdminOrders();
  const metrics = metricsQuery.data;
  const criticalStock = (productsQuery.data ?? [])
    .flatMap((product) =>
      product.product_variants
        .filter((variant) => variant.stock_quantity <= 5)
        .map((variant) => ({ product, variant })),
    )
    .sort((a, b) => a.variant.stock_quantity - b.variant.stock_quantity)
    .slice(0, 8);
  const recentOrders = (ordersQuery.data ?? []).slice(0, 6);

  const cards = [
    { label: "Produtos ativos", value: metrics?.activeProducts ?? "—", icon: Boxes },
    { label: "Usuários cadastrados", value: metrics?.users ?? "—", icon: Users },
    {
      label: "Variantes sem estoque",
      value: metrics?.outOfStockVariants ?? "—",
      detail: metrics ? `${metrics.lowStockVariants} com estoque baixo` : undefined,
      icon: PackageX,
    },
    {
      label: "Receita confirmada",
      value: metrics ? formatCurrency(metrics.confirmedRevenueCents) : "—",
      icon: CircleDollarSign,
    },
  ];

  return (
    <section className="space-y-8">
      <div>
        <h2 className="font-display text-3xl">Visão geral</h2>
        <p className="text-sm text-muted-foreground">Acompanhe catálogo, estoque, clientes e pedidos.</p>
      </div>

      {metricsQuery.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Não foi possível carregar todos os indicadores.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
              {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Pedidos por status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(orderStatusLabels).map(([status, label]) => (
            <Badge key={status} variant="outline" className="px-3 py-1">
              {label}: {metrics?.ordersByStatus[status as OrderStatus] ?? 0}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl">Estoque crítico</CardTitle>
            <Link to="/admin/produtos?stock=low" className="text-sm text-nn-pink hover:underline">
              Ver produtos
            </Link>
          </CardHeader>
          <CardContent>
            {criticalStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma variante com estoque crítico.</p>
            ) : (
              <ul className="divide-y">
                {criticalStock.map(({ product, variant }) => (
                  <li key={variant.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <Link to={`/admin/produtos/${product.id}`} className="font-medium hover:text-nn-pink">
                        {product.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {variant.size}
                        {variant.color_name ? ` / ${variant.color_name}` : ""}
                      </span>
                    </span>
                    <Badge variant={variant.stock_quantity === 0 ? "destructive" : "secondary"}>
                      {variant.stock_quantity} un.
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl">Pedidos recentes</CardTitle>
            <Link to="/admin/pedidos" className="text-sm text-nn-pink hover:underline">
              Ver pedidos
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido cadastrado.</p>
            ) : (
              <ul className="divide-y">
                {recentOrders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <span className="font-medium">{order.shipping_name || order.id.slice(0, 8)}</span>
                      <span className="block text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-medium">{formatCurrency(order.total_cents)}</span>
                      <span className="text-xs text-muted-foreground">{orderStatusLabels[order.status]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
