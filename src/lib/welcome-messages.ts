import type { User } from "@supabase/supabase-js";

const MENSAGENS_ENTRADA = [
  "{nome}… você entrou mesmo?",
  "Ok {nome}, agora não tem volta.",
  "{nome} desbloqueou a parte estranha da internet.",
  "{nome} decidiu ignorar o aviso.",
  "Entrada confirmada. O estranho começa agora.",
  "{nome} passou pelo filtro de normalidade.",
  "Sistema confuso: {nome} conseguiu entrar.",
  "Você ignorou o aviso. Bem-vindo ao caos, {nome}.",
  "{nome} entrou. A normalidade saiu.",
  "Nível de estranheza aumentado.",
  "{nome} desbloqueou a área Nada Normal.",
  "Sistema alerta: mais um humano estranho detectado.",
  "A porta estava trancada. {nome} entrou assim mesmo.",
  "{nome} está dentro. A anormalidade agradece.",
  "Bem-vindo ao lado de cá, {nome}.",
];

/**
 * Extrai o primeiro nome do usuário (user_metadata.full_name ou parte do email).
 */
export function getFirstName(user: User | null | undefined): string {
  if (!user) return "você";
  const fullName = user.user_metadata?.full_name as string | undefined;
  if (fullName && fullName.trim()) {
    const first = fullName.trim().split(/\s+/)[0];
    if (first) return first;
  }
  const email = user.email ?? "";
  const part = email.split("@")[0];
  if (part && part.length > 0) return part;
  return "você";
}

/**
 * Escolhe uma mensagem de boas-vindas aleatória com o nome do usuário.
 */
export function pickRandomWelcomeMessage(user: User | null | undefined): string {
  const nome = getFirstName(user);
  const template = MENSAGENS_ENTRADA[Math.floor(Math.random() * MENSAGENS_ENTRADA.length)];
  return template.replace(/\{nome\}/g, nome);
}
