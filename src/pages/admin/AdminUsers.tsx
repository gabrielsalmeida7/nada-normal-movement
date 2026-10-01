import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminUsers } from "@/hooks/admin/use-admin-data";
import { formatDate } from "@/lib/admin-format";

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useAdminUsers(page);
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 25));

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-3xl">Usuários</h2>
        <p className="text-sm text-muted-foreground">
          Consulta somente leitura. Senhas e tokens nunca são exibidos.
        </p>
      </div>

      {data?.limited && (
        <p className="rounded-md border border-nn-yellow/40 bg-nn-yellow/10 p-3 text-sm">
          No servidor Vite local, a listagem usa os perfis protegidos pelo RLS. E-mail e provedor
          ficam disponíveis quando a função serverless é executada no ambiente Vercel.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? (
          <p className="p-8 text-center text-muted-foreground">Carregando usuários…</p>
        ) : error ? (
          <p className="p-8 text-center text-destructive">{error.message}</p>
        ) : !data?.users.length ? (
          <p className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Provedor</TableHead>
                <TableHead>Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-medium">{user.fullName || "Nome não informado"}</p>
                    <p className="text-xs text-muted-foreground">{user.email || "E-mail disponível via API"}</p>
                  </TableCell>
                  <TableCell>{user.phone || "—"}</TableCell>
                  <TableCell>{user.cpf || "—"}</TableCell>
                  <TableCell className="capitalize">{user.provider || "—"}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{data?.total ?? 0} usuário(s)</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span>
            {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Próxima
          </Button>
        </div>
      </div>
    </section>
  );
}
