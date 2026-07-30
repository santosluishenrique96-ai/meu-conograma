import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Droplets,
  Leaf,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Stars,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos Capilares — Meu Cronograma" },
      {
        name: "description",
        content:
          "Conheça nossa seleção de produtos para hidratação, nutrição, reconstrução e finalização dos cabelos.",
      },
    ],
  }),
  component: ProdutosPage,
});

const products = [
  {
    id: "hidratacao-gloss",
    name: "Kit Hidratação Gloss",
    subtitle: "Maciez intensa e brilho imediato",
    price: "R$ 89,90",
    priceValue: 89.9,
    badge: "Mais vendido",
    icon: Droplets,
    accent: "from-cyan-500 to-sky-400",
    benefits: [
      "Máscara hidratante de alta performance",
      "Leave-in com proteção térmica",
      "Fórmula leve para uso semanal",
    ],
  },
  {
    id: "nutricao-power-oils",
    name: "Kit Nutrição Power Oils",
    subtitle: "Controle de frizz e nutrição profunda",
    price: "R$ 109,90",
    priceValue: 109.9,
    badge: "Favorito das cacheadas",
    icon: Leaf,
    accent: "from-emerald-500 to-lime-400",
    benefits: [
      "Blend de óleos vegetais nutritivos",
      "Umectação com toque seco",
      "Ideal para fios ressecados e opacos",
    ],
  },
  {
    id: "reconstrucao-expert",
    name: "Kit Reconstrução Expert",
    subtitle: "Força, elasticidade e reparo",
    price: "R$ 129,90",
    priceValue: 129.9,
    badge: "Tratamento intensivo",
    icon: ShieldCheck,
    accent: "from-rose-500 to-orange-400",
    benefits: [
      "Queratina inteligente para reposição de massa",
      "Máscara de reconstrução sem pesar",
      "Recuperação para fios fragilizados",
    ],
  },
];

const reasons = [
  "Produtos pensados para cada etapa do cronograma capilar",
  "Combinações fáceis para rotina diária, semanal e mensal",
  "Seleção ideal para cabelos lisos, ondulados, cacheados e crespos",
  "Resultados visíveis com constância e cuidado certo",
];

type Product = (typeof products)[number];

type CartItem = {
  id: Product["id"];
  name: Product["name"];
  priceValue: Product["priceValue"];
  quantity: number;
};

const CART_STORAGE_KEY = "meu-cronograma-cart";
const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_NUMBER;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function buildWhatsAppLink(message: string) {
  const baseUrl = WHATSAPP_PHONE ? `https://wa.me/${WHATSAPP_PHONE}` : "https://wa.me/";

  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

function ProdutosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "linda";
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!rawCart) return;

    try {
      const parsedCart = JSON.parse(rawCart) as CartItem[];
      setCart(parsedCart);
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const cartItemsCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart],
  );
  const cartTotal = useMemo(
    () => cart.reduce((total, item) => total + item.priceValue * item.quantity, 0),
    [cart],
  );

  const addToCart = (product: Product) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...currentCart,
        {
          id: product.id,
          name: product.name,
          priceValue: product.priceValue,
          quantity: 1,
        },
      ];
    });

    setCartOpen(true);
    toast.success(`${product.name} adicionado ao carrinho`);
  };

  const updateCartItemQuantity = (productId: CartItem["id"], nextQuantity: number) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => (item.id === productId ? { ...item, quantity: nextQuantity } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (productId: CartItem["id"]) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== productId));
  };

  const openWhatsApp = (message: string) => {
    if (typeof window === "undefined") return;
    window.open(buildWhatsAppLink(message), "_blank", "noopener,noreferrer");
  };

  const handleProductWhatsApp = (product: Product) => {
    const message = `Oi! Tenho interesse no ${product.name} (${product.price}). Quero mais detalhes sobre esse kit capilar.`;
    openWhatsApp(message);
  };

  const handleCartWhatsApp = () => {
    if (!cart.length) {
      toast.info("Adicione pelo menos um produto ao carrinho");
      return;
    }

    const itemsList = cart
      .map((item) => `- ${item.name} x${item.quantity} (${formatCurrency(item.priceValue)})`)
      .join("\n");

    const message =
      `Oi! Quero finalizar meu pedido com estes itens:\n\n${itemsList}\n\n` +
      `Total estimado: ${formatCurrency(cartTotal)}.`;

    openWhatsApp(message);
  };

  const handleBuy = (product: Product) => {
    if (!user) {
      toast.info("Entre na sua conta para continuar a compra");
      navigate({ to: "/auth" });
      return;
    }

    addToCart(product);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="container relative mx-auto grid gap-10 px-4 py-18 md:grid-cols-[1.2fr_0.8fr] md:py-24">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShoppingBag className="h-3.5 w-3.5" /> Loja de produtos capilares
            </span>
            <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Produtos que combinam com o seu <span className="text-gradient">cronograma</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Monte uma rotina mais completa com kits para hidratação, nutrição e reconstrução,
              pensados para realçar brilho, reduzir frizz e recuperar os fios.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to={user ? "/cronograma" : "/auth"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-7 py-3.5 font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105"
              >
                {user ? "Voltar ao meu cronograma" : "Entrar para comprar"}{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full border border-border bg-card/60 px-7 py-3.5 font-bold transition-smooth hover:bg-card"
              >
                Ver página inicial
              </Link>
              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="inline-flex items-center justify-center gap-2 rounded-full border-border bg-card/60 px-7 py-3.5 font-bold"
                  >
                    <ShoppingCart className="h-4 w-4" /> Carrinho
                    {cartItemsCount > 0 && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {cartItemsCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-lg">
                  <SheetHeader>
                    <SheetTitle>Seu carrinho</SheetTitle>
                    <SheetDescription>
                      Revise os itens da sua loja capilar e finalize pelo WhatsApp.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 flex h-[calc(100%-10rem)] flex-col">
                    {cart.length ? (
                      <>
                        <div className="space-y-4 overflow-y-auto pr-2">
                          {cart.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-border bg-card/50 p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h3 className="font-bold">{item.name}</h3>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {formatCurrency(item.priceValue)} por unidade
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.id)}
                                  className="rounded-full border border-border p-2 text-muted-foreground transition-smooth hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCartItemQuantity(item.id, item.quantity - 1)
                                    }
                                    className="rounded-full border border-border p-2 transition-smooth hover:border-primary hover:text-primary"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="min-w-8 text-center text-sm font-bold">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCartItemQuantity(item.id, item.quantity + 1)
                                    }
                                    className="rounded-full border border-border p-2 transition-smooth hover:border-primary hover:text-primary"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Subtotal
                                  </p>
                                  <p className="font-black">
                                    {formatCurrency(item.priceValue * item.quantity)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <SheetFooter className="mt-6 border-t border-border pt-6">
                          <div className="w-full space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Total estimado</span>
                              <span className="text-2xl font-black">
                                {formatCurrency(cartTotal)}
                              </span>
                            </div>
                            <div className="grid gap-3">
                              <Button
                                type="button"
                                onClick={handleCartWhatsApp}
                                className="h-11 rounded-full font-bold"
                              >
                                <MessageCircle className="h-4 w-4" /> Finalizar pelo WhatsApp
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCart([])}
                                className="h-11 rounded-full font-bold"
                              >
                                Limpar carrinho
                              </Button>
                            </div>
                          </div>
                        </SheetFooter>
                      </>
                    ) : (
                      <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-border text-center">
                        <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-bold">Seu carrinho está vazio</h3>
                        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                          Adicione seus kits favoritos e finalize o pedido pelo WhatsApp.
                        </p>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-gradient-card p-6 shadow-elegant">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Stars className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="mt-5 text-2xl font-black">
              {user ? `Olá, ${userName}!` : "Sua vitrine capilar"}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {user
                ? "Escolhemos uma seleção pensada para complementar sua rotina e deixar seus fios ainda mais lindos."
                : "Entre na sua conta para salvar interesses e, em breve, finalizar suas compras aqui."}
            </p>
            <ul className="mt-6 space-y-3">
              {reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-4xl font-black md:text-5xl">
            Escolha o <span className="text-gradient">kit ideal</span> para seu cabelo
          </h2>
          <p className="mt-4 text-muted-foreground">
            Produtos organizados por objetivo para facilitar sua compra e sua rotina.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.name}
              className="rounded-3xl border border-border bg-gradient-card p-7 transition-smooth hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                    {product.badge}
                  </span>
                  <h3 className="mt-4 text-2xl font-black">{product.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{product.subtitle}</p>
                </div>
                <div
                  className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r ${product.accent} shadow-glow`}
                >
                  <product.icon className="h-6 w-6 text-white" />
                </div>
              </div>

              <div className="mt-6 text-4xl font-black">{product.price}</div>

              <ul className="mt-6 space-y-3">
                {product.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleBuy(product)}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3 font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105"
              >
                Adicionar ao carrinho <ShoppingCart className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => handleProductWhatsApp(product)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background/70 px-6 py-3 font-bold transition-smooth hover:border-primary hover:text-primary"
              >
                Pedir pelo WhatsApp <MessageCircle className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
