import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { pickRandomWelcomeMessage } from "@/lib/welcome-messages";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null; user?: User }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null; needsEmailConfirmation?: boolean; user?: User }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("nn_show_welcome") === "1") {
      sessionStorage.removeItem("nn_show_welcome");
      toast.success(pickRandomWelcomeMessage(user), { duration: 5000 });
    }
  }, [user]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        return { error: { message: "Supabase não configurado", name: "AuthError", status: 500 } as AuthError };
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      return { error: error ?? null, user: data?.user };
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      if (!supabase) {
        return { error: { message: "Supabase não configurado", name: "AuthError", status: 500 } as AuthError };
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName ?? undefined } },
      });
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      return {
        error: error ?? null,
        needsEmailConfirmation: !error && !data.session,
        user: data?.user,
      };
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      return { error: { message: "Supabase não configurado", name: "AuthError", status: 500 } as AuthError };
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/home` },
    });
    if (!error && data?.url) {
      sessionStorage.setItem("nn_show_welcome", "1");
      window.location.href = data.url;
      return { error: null };
    }
    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signInWithPassword,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
