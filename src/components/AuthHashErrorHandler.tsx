import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Lê erros de auth no hash da URL (ex.: link de confirmação de email expirado)
 * e exibe mensagem amigável, depois limpa o hash.
 */
export function AuthHashErrorHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const error = params.get("error");
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description") ?? "";

    const isAuthError =
      error === "access_denied" ||
      errorCode === "otp_expired" ||
      /expired|invalid|invalid or has expired/i.test(decodeURIComponent(errorDescription));

    if (isAuthError) {
      const message =
        errorCode === "otp_expired"
          ? "Link de confirmação expirou ou já foi usado. Vá para o login e use \"Esqueci minha senha\" para redefinir, ou cadastre-se novamente."
          : "Algo deu errado com o link de confirmação. Tente fazer login ou cadastre-se novamente.";
      toast.error("Link de confirmação", {
        description: message,
        action: {
          label: "Ir para Login",
          onClick: () => navigate("/login"),
        },
      });
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [navigate]);

  return null;
}
