import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Sparkles, LogOut, User as UserIcon, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const navItems = [
  { to: "/", label: "Início" },
  { to: "/assinatura", label: "Planos" },
  { to: "/produtos", label: "Produtos" },
  { to: "/cronograma", label: "Cronograma" },
  { to: "/evolucao", label: "Evolução" },
] as const;

export function SiteHeader() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location.href });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Você saiu da sua conta");
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow transition-smooth group-hover:scale-110">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-lg font-black tracking-tight">
            Meu <span className="text-gradient">Cronograma</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-muted-foreground hover:text-foreground transition-smooth"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-9 w-24 rounded-full bg-card/50 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs">
                <UserIcon className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium truncate max-w-[160px]">Olá, {userName}</span>
              </span>
              <button
                onClick={handleLogout}
                title="Sair"
                className="hidden md:inline-flex h-9 w-9 sm:w-auto sm:px-4 items-center justify-center gap-2 rounded-full border border-border bg-card/50 text-sm font-bold transition-smooth hover:bg-card hover:text-primary"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="hidden md:inline-flex items-center justify-center rounded-full bg-gradient-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105"
            >
              Entrar
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-card/50 text-foreground transition-smooth hover:border-primary hover:text-primary"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border/40 bg-background/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-smooth hover:bg-card hover:text-foreground"
                activeProps={{ className: "bg-card text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {!loading && (
            <div className="mt-4 border-t border-border/40 pt-4">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/50 px-4 py-3 text-sm">
                    <UserIcon className="h-4 w-4 text-primary" />
                    <span className="truncate">Olá, {userName}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card/50 px-4 py-3 text-sm font-bold transition-smooth hover:text-primary"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="inline-flex w-full items-center justify-center rounded-full bg-gradient-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-smooth"
                >
                  Entrar
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
