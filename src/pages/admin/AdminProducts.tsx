import { Edit, Plus, Power } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminProducts, useSetProductActive } from "@/hooks/admin/use-admin-data";
import { formatCurrency } from "@/lib/admin-format";

const PAGE_SIZE = 10;

export default function AdminProducts() {
  const { data: products = [], isLoading, error } = useAdminProducts();
  const activeMutation = useSetProductActive();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState("all");
  const [stock, setStock] = useState(() => searchParams.get("stock") ?? "all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return products.filter((product) => {
      const totalStock = product.product_variants.reduce((total, variant) => total + variant.stock_quantity, 0);
      return (
        (!normalizedSearch ||
          product.name.toLowerCase().includes(normalizedSearch) ||
          product.slug.toLowerCase().includes(normalizedSearch)) &&
        (category === "all" || product.category === category) &&
        (active === "all" || product.is_active === (active === "active")) &&
        (stock === "all" ||
          (stock === "out" && totalStock === 0) ||
          (stock === "low" && totalStock > 0 && totalStock <= 5) ||
          (stock === "available" && totalStock > 5))
      );
    });
  }, [active, category, products, search, stock]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleActive = async (id: string, isActive: boolean, name: string) => {
    if (isActive && !window.confirm(`Retirar "${name}" da loja? O histórico será preservado.`)) return;
    try {
      await activeMutation.mutateAsync({ id, isActive: !isActive });
      toast.success(isActive ? "Produto desativado." : "Produto ativado.");
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "Não foi possível alterar o produto.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl">Produtos</h2>
          <p className="text-sm text-muted-foreground">Gerencie catálogo, variantes e estoque.</p>
        </div>
        <Button asChild>
          <Link to="/admin/produtos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo produto
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Buscar por nome ou slug"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por categoria"
        >
          <option value="all">Todas as categorias</option>
          <option value="street">Street</option>
          <option value="running">Running</option>
          <option value="social">Social</option>
        </select>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={active}
          onChange={(event) => {
            setActive(event.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por situação"
        >
          <option value="all">Ativos e inativos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={stock}
          onChange={(event) => {
            setStock(event.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por estoque"
        >
          <option value="all">Qualquer estoque</option>
          <option value="out">Sem estoque</option>
          <option value="low">Estoque baixo (1–5)</option>
          <option value="available">Mais de 5 unidades</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? (
          <p className="p-8 text-center text-muted-foreground">Carregando produtos…</p>
        ) : error ? (
          <p className="p-8 text-center text-destructive">Não foi possível carregar os produtos.</p>
        ) : visible.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">Nenhum produto encontrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((product) => {
                const totalStock = product.product_variants.reduce(
                  (total, variant) => total + variant.stock_quantity,
                  0,
                );
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.slug}</p>
                    </TableCell>
                    <TableCell className="capitalize">{product.category}</TableCell>
                    <TableCell>{formatCurrency(product.price_cents)}</TableCell>
                    <TableCell>
                      <span className={totalStock === 0 ? "font-semibold text-destructive" : ""}>
                        {totalStock}
                      </span>
                      <span className="text-xs text-muted-foreground"> / {product.product_variants.length} var.</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild aria-label={`Editar ${product.name}`}>
                          <Link to={`/admin/produtos/${product.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={product.is_active ? `Desativar ${product.name}` : `Ativar ${product.name}`}
                          disabled={activeMutation.isPending}
                          onClick={() => void toggleActive(product.id, product.is_active, product.name)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{filtered.length} produto(s)</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            Anterior
          </Button>
          <span>
            {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </section>
  );
}
