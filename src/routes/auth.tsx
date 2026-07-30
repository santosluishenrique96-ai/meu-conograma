import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sparkles,
  Mail,
  Lock,
  Loader2,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Meu Cronograma" },
      { name: "description", content: "Acesse sua conta e gerencie seu cronograma capilar." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe o e-mail")
  .email("Digite um e-mail válido")
  .max(255);
const passwordSchema = z.string().min(6, "A senha deve ter no mínimo 6 caracteres").max(72);
const nameSchema = z.string().trim().min(2, "Informe seu nome completo").max(80);

function translateAuthError(error: Error | string): string {
  const message = typeof error === "string" ? error : error.message || "";

  if (message.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos. Por favor, verifique seus dados.";
  }
  if (message.includes("User already registered") || message.includes("User already exists")) {
    return "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";
  }
  if (message.includes("Email not confirmed")) {
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada para ativar a conta.";
  }
  if (message.includes("Password should be at least 6 characters")) {
    return "A senha deve ter no mínimo 6 caracteres.";
  }
  if (message.includes("rate limit") || message.includes("Too many requests")) {
    return "Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos.";
  }
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "Erro de conexão com o servidor. Verifique sua conexão de internet.";
  }

  return message || "Ocorreu um erro ao processar sua solicitação.";
}

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!authLoading && session) {
      navigate({ to: "/cronograma" });
    }
  }, [session, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="relative w-full max-w-md rounded-3xl border border-border bg-gradient-card p-8 text-center shadow-elegant">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h1 className="mt-4 text-2xl font-black">Verificando seu acesso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Estamos preparando sua conta para entrar no cronograma...
          </p>
        </div>
      </div>
    );
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      if (mode === "forgot") {
        const parsedEmail = emailSchema.parse(email);
        const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        setResetSent(true);
        toast.success("Link de redefinição enviado para seu e-mail!");
        return;
      }

      const parsedEmail = emailSchema.parse(email);
      const parsedPassword = passwordSchema.parse(password);

      if (mode === "signup") {
        const parsedName = nameSchema.parse(name);
        const { data, error } = await supabase.auth.signUp({
          email: parsedEmail,
          password: parsedPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/cronograma`,
            data: { display_name: parsedName },
          },
        });

        if (error) throw error;

        if (data?.session) {
          toast.success("Conta criada e conectada com sucesso!");
          navigate({ to: "/cronograma" });
        } else {
          toast.success("Conta criada! Verifique seu e-mail para confirmar a conta.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsedEmail,
          password: parsedPassword,
        });

        if (error) throw error;

        toast.success("Bem-vinda de volta!");
        navigate({ to: "/cronograma" });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.issues[0].message);
      } else {
        toast.error(translateAuthError(err as Error));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      // Tentar via Lovable Auth primeiro
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/cronograma`,
      });

      if (result?.error) {
        // Fallback para Supabase nativo se houver falha
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/cronograma`,
          },
        });
        if (error) throw error;
        return;
      }

      if (result?.redirected) return;
      navigate({ to: "/cronograma" });
    } catch (err) {
      toast.error(translateAuthError(err as Error));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-60" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 group">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow transition-smooth group-hover:scale-110">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-xl font-black">
            Meu <span className="text-gradient">Cronograma</span>
          </span>
        </Link>

        <div className="rounded-3xl bg-gradient-card border border-border p-8 shadow-elegant">
          {mode !== "forgot" && (
            <div className="flex rounded-full bg-background/50 p-1 mb-8">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setResetSent(false);
                }}
                className={`flex-1 rounded-full py-2 text-sm font-bold transition-smooth ${
                  mode === "login"
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setResetSent(false);
                }}
                className={`flex-1 rounded-full py-2 text-sm font-bold transition-smooth ${
                  mode === "signup"
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Criar conta
              </button>
            </div>
          )}

          <h1 className="text-2xl font-black text-center mb-2">
            {mode === "login"
              ? "Bem-vinda de volta"
              : mode === "signup"
                ? "Comece agora"
                : "Recuperar senha"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {mode === "login"
              ? "Entre para acompanhar seu cronograma capilar"
              : mode === "signup"
                ? "Crie sua conta gratuita em segundos"
                : "Digite seu e-mail para receber as instruções"}
          </p>

          {mode !== "forgot" && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 rounded-full border border-border bg-card/80 px-6 py-3 font-semibold transition-smooth hover:bg-card disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar com Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground uppercase font-bold">OU</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          {mode === "forgot" && resetSent ? (
            <div className="text-center py-4 space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <p className="text-sm font-medium">
                Enviamos um e-mail para <strong className="text-foreground">{email}</strong> com o
                link para redefinir sua senha.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setResetSent(false);
                }}
                className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline font-bold"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar para o Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === "signup" && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={80}
                    className="w-full rounded-2xl border border-border bg-background/50 pl-11 pr-4 py-3 text-sm focus:border-primary focus:outline-none transition-smooth"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Seu e-mail melhor"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                  className="w-full rounded-2xl border border-border bg-background/50 pl-11 pr-4 py-3 text-sm focus:border-primary focus:outline-none transition-smooth"
                />
              </div>

              {mode !== "forgot" && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha (mín. 6 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={72}
                    className="w-full rounded-2xl border border-border bg-background/50 pl-11 pr-11 py-3 text-sm focus:border-primary focus:outline-none transition-smooth"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                    title={showPassword ? "Ocultar senha" : "Exibir senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {mode === "login" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-primary transition-smooth font-medium"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3 font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login"
                  ? "Entrar"
                  : mode === "signup"
                    ? "Criar conta grátis"
                    : "Enviar link de recuperação"}
              </button>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="w-full flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground hover:text-foreground font-semibold"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a tela de login
                </button>
              )}
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos termos e política de privacidade.
          </p>
        </div>

        <Link
          to="/"
          className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground transition-smooth"
        >
          ← Voltar para a página inicial
        </Link>
      </div>
    </div>
  );
}
