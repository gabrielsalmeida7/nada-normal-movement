import type { AuthError } from "@supabase/supabase-js";

/**
 * Mensagem amigável para erros do Supabase Auth (400, 429, email não confirmado, etc.)
 */
export function getAuthErrorMessage(err: AuthError | null, context: "login" | "register"): string {
  if (!err) return "";
  const status = (err as AuthError & { status?: number }).status;
  const msg = (err.message || "").toLowerCase();
  if (status === 429) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (status === 400 && (msg.includes("confirm") || msg.includes("email"))) {
    return context === "login"
      ? "Confirme seu email antes de entrar. Verifique sua caixa de entrada (e spam)."
      : "Verifique seu email e senha. Se acabou de se cadastrar, confirme o email primeiro.";
  }
  return err.message || (context === "login" ? "Erro ao entrar. Verifique email e senha." : "Erro ao criar conta. Tente outro email.");
}
