import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthErrorMessage } from "@/lib/auth-messages";
import { pickRandomWelcomeMessage } from "@/lib/welcome-messages";

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/home";
  const { signUp, signInWithGoogle, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<"created" | "confirm_email" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err, needsEmailConfirmation, user } = await signUp(email, password, fullName.trim() || undefined);
    setLoading(false);
    if (err) {
      setError(getAuthErrorMessage(err, "register"));
      return;
    }
    if (needsEmailConfirmation) {
      setSuccess("confirm_email");
      setError(null);
      setTimeout(
        () =>
          navigate(
            redirectTo !== "/home" ? `/login?message=confirm_email&redirect=${encodeURIComponent(redirectTo)}` : "/login?message=confirm_email",
            { replace: true }
          ),
        3000
      );
      return;
    }
    setSuccess("created");
    toast.success(pickRandomWelcomeMessage(user), { duration: 5000 });
    navigate(redirectTo.startsWith("/") ? redirectTo : "/home", { replace: true });
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error: err } = await signInWithGoogle();
    setGoogleLoading(false);
    if (err) setError(getAuthErrorMessage(err, "register"));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16">
        <div className="container max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border-4 border-border p-8 rounded-[20px_5px_20px_5px]"
          >
            <h1 className="font-display text-3xl text-nn-pink mb-2">Cadastre-se</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Entre no Movimento. Crie sua conta.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="font-display uppercase tracking-wider">
                  Nome
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className="border-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-display uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="border-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-display uppercase tracking-wider">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="border-2"
                />
              </div>
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-green-500 text-sm" role="status">
                  {success === "confirm_email"
                    ? "Enviamos um link de confirmação para seu email. Confirme e depois faça login. Redirecionando…"
                    : "Conta criada. Redirecionando…"}
                </p>
              )}
              <Button
                type="submit"
                className="w-full bg-nn-pink text-nn-black font-display uppercase tracking-wider border-2 border-nn-black hover:bg-nn-pink/90"
                disabled={loading || authLoading}
              >
                {loading ? "Criando conta…" : "Criar conta"}
              </Button>

              <div className="relative my-4">
                <span className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </span>
                <span className="relative flex justify-center text-xs uppercase text-muted-foreground font-display tracking-wider">
                  ou
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-2 font-display uppercase tracking-wider"
                disabled={googleLoading || authLoading}
                onClick={handleGoogleSignIn}
              >
                {googleLoading ? "Redirecionando…" : "Cadastrar com Google"}
              </Button>
            </form>

            <p className="mt-6 text-center text-muted-foreground text-sm">
              Já tem conta?{" "}
              <Link
                to={redirectTo !== "/home" ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
                className="text-nn-pink hover:underline font-display"
              >
                Entrar
              </Link>
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;
