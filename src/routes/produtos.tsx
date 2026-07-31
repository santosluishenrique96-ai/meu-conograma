import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Droplets,
  ExternalLink,
  Leaf,
  Link2,
  Loader2,
  MessageCircle,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Stars,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
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
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export const Route = createFileRoute("/produtos")({
  validateSearch: (search: Record<string, unknown>) => {
    const focus = search.focus;

    return {
      focus:
        focus === "Hidratação" ||
        focus === "Nutrição" ||
        focus === "Reconstrução" ||
        focus === "Finalização"
          ? focus
          : undefined,
    };
  },
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

type ProductFocus = "Hidratação" | "Nutrição" | "Reconstrução" | "Finalização";
type ProductCtaMode = "carrinho" | "whatsapp" | "link";

type StoreProductRow = Tables<"products">;
type StoreProductInsert = TablesInsert<"products">;
type StoreSettingsRow = Tables<"store_settings">;

type Product = {
  id: string;
  name: string;
  subtitle: string;
  priceValue: number;
  badge: string;
  focus: ProductFocus;
  benefits: string[];
  imageUrl: string;
  externalUrl: string;
  ctaMode: ProductCtaMode;
  sortOrder: number;
};

type CartItem = {
  id: Product["id"];
  name: Product["name"];
  priceValue: Product["priceValue"];
  quantity: number;
};

const PRODUCT_FOCUS_META: Record<
  ProductFocus,
  {
    icon: typeof Droplets;
    accent: string;
  }
> = {
  Hidratação: {
    icon: Droplets,
    accent: "from-cyan-500 to-sky-400",
  },
  Nutrição: {
    icon: Leaf,
    accent: "from-emerald-500 to-lime-400",
  },
  Reconstrução: {
    icon: ShieldCheck,
    accent: "from-rose-500 to-orange-400",
  },
  Finalização: {
    icon: Sparkles,
    accent: "from-violet-500 to-fuchsia-400",
  },
};

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "hidratacao-gloss",
    name: "Kit Hidratação Gloss",
    subtitle: "Maciez intensa e brilho imediato",
    priceValue: 89.9,
    badge: "Mais vendido",
    focus: "Hidratação",
    benefits: [
      "Máscara hidratante de alta performance",
      "Leave-in com proteção térmica",
      "Fórmula leve para uso semanal",
    ],
    imageUrl:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20haircare%20product%20jar%20and%20bottle%20for%20hydration%20treatment%2C%20luxury%20beauty%20ecommerce%20packshot%2C%20soft%20cyan%20background%2C%20realistic%20studio%20lighting&image_size=portrait_4_3",
    externalUrl: "",
    ctaMode: "carrinho",
    sortOrder: 1,
  },
  {
    id: "nutricao-power-oils",
    name: "Kit Nutrição Power Oils",
    subtitle: "Controle de frizz e nutrição profunda",
    priceValue: 109.9,
    badge: "Favorito das cacheadas",
    focus: "Nutrição",
    benefits: [
      "Blend de óleos vegetais nutritivos",
      "Umectação com toque seco",
      "Ideal para fios ressecados e opacos",
    ],
    imageUrl:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=beauty%20haircare%20oil%20and%20mask%20kit%20for%20deep%20nutrition%2C%20premium%20ecommerce%20product%20photo%2C%20green%20background%2C%20realistic%20studio%20lighting&image_size=portrait_4_3",
    externalUrl: "",
    ctaMode: "carrinho",
    sortOrder: 2,
  },
  {
    id: "reconstrucao-expert",
    name: "Kit Reconstrução Expert",
    subtitle: "Força, elasticidade e reparo",
    priceValue: 129.9,
    badge: "Tratamento intensivo",
    focus: "Reconstrução",
    benefits: [
      "Queratina inteligente para reposição de massa",
      "Máscara de reconstrução sem pesar",
      "Recuperação para fios fragilizados",
    ],
    imageUrl:
      "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20reconstructive%20haircare%20kit%20with%20jar%20and%20treatment%20bottle%2C%20luxury%20beauty%20product%20packshot%2C%20rose%20background%2C%20realistic%20studio%20lighting&image_size=portrait_4_3",
    externalUrl: "",
    ctaMode: "carrinho",
    sortOrder: 3,
  },
];

const reasons = [
  "Produtos pensados para cada etapa do cronograma capilar",
  "Combinações fáceis para rotina diária, semanal e mensal",
  "Seleção ideal para cabelos lisos, ondulados, cacheados e crespos",
  "Resultados visíveis com constância e cuidado certo",
];

const CART_STORAGE_KEY = "meu-cronograma-cart";
const ENV_WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_NUMBER;
const STORE_ADMIN_EMAIL = "santosluishenrique96@gmail.com";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function buildWhatsAppLink(message: string, phoneNumber: string) {
  const normalizedPhone = phoneNumber.trim();
  const baseUrl = normalizedPhone ? `https://wa.me/${normalizedPhone}` : "https://wa.me/";
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).toString();
  } catch {
    try {
      return new URL(`https://${trimmed}`).toString();
    } catch {
      return "";
    }
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function createUniqueProductId(name: string, products: Product[]) {
  const base = slugify(name) || `produto-${Date.now()}`;
  let candidate = base;
  let index = 2;

  while (products.some((product) => product.id === candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

function getPrimaryActionLabel(product: Product) {
  if (product.ctaMode === "link") return "Abrir oferta";
  if (product.ctaMode === "whatsapp") return "Pedir no WhatsApp";
  return "Adicionar ao carrinho";
}

function mapRowToProduct(row: StoreProductRow): Product {
  const focus: ProductFocus =
    row.focus === "Hidratação" ||
    row.focus === "Nutrição" ||
    row.focus === "Reconstrução" ||
    row.focus === "Finalização"
      ? row.focus
      : "Hidratação";

  const ctaMode: ProductCtaMode =
    row.cta_mode === "carrinho" || row.cta_mode === "whatsapp" || row.cta_mode === "link"
      ? row.cta_mode
      : "carrinho";

  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle,
    priceValue: row.price_value,
    badge: row.badge,
    focus,
    benefits: row.benefits.length ? row.benefits : ["Benefício não informado"],
    imageUrl: row.image_url,
    externalUrl: row.external_url,
    ctaMode,
    sortOrder: row.sort_order,
  };
}

function mapProductToInsert(product: Product, userId: string): StoreProductInsert {
  return {
    id: product.id,
    name: product.name,
    subtitle: product.subtitle,
    price_value: product.priceValue,
    badge: product.badge,
    focus: product.focus,
    benefits: product.benefits,
    image_url: product.imageUrl,
    external_url: product.externalUrl,
    cta_mode: product.ctaMode,
    sort_order: product.sortOrder,
    created_by: userId,
    updated_by: userId,
  };
}

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}

function mapStoreSettingsPhone(row: StoreSettingsRow | null) {
  return normalizePhoneNumber(row?.whatsapp_number ?? "") || ENV_WHATSAPP_PHONE || "";
}

function createEmptyProduct(nextSortOrder: number): Product {
  return {
    id: "",
    name: "",
    subtitle: "",
    priceValue: 0,
    badge: "Novo",
    focus: "Hidratação",
    benefits: ["Descreva os benefícios do produto"],
    imageUrl: "",
    externalUrl: "",
    ctaMode: "carrinho",
    sortOrder: nextSortOrder,
  };
}

function ProdutosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "linda";
  const highlightedFocus = search.focus;

  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState(ENV_WHATSAPP_PHONE || "");
  const [whatsAppDraft, setWhatsAppDraft] = useState(ENV_WHATSAPP_PHONE || "");
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Product | null>(null);
  const [draftBenefitsText, setDraftBenefitsText] = useState("");
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!rawCart) return;

    try {
      setCart(JSON.parse(rawCart) as CartItem[]);
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError(null);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[produtos] erro ao carregar produtos", error);
        setProductsError(
          "Não foi possível carregar os produtos do banco agora. Mostrando o catálogo padrão temporariamente.",
        );
        setProducts(DEFAULT_PRODUCTS);
      } else if (data?.length) {
        setProducts(data.map(mapRowToProduct));
      } else {
        setProducts([]);
      }

      setProductsLoading(false);
    };

    void loadProducts();
  }, []);

  useEffect(() => {
    const loadStoreSettings = async () => {
      const { data, error } = await supabase.from("store_settings").select("*").maybeSingle();

      if (error) {
        console.error("[produtos] erro ao carregar configuracoes da loja", error);
        return;
      }

      const nextPhone = mapStoreSettingsPhone(data);
      setWhatsAppNumber(nextPhone);
      setWhatsAppDraft(nextPhone);
    };

    void loadStoreSettings();
  }, []);

  useEffect(() => {
    const loadAdminState = async () => {
      if (!user) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      setAdminLoading(true);

      const { data: isCurrentAdmin, error: adminError } =
        await supabase.rpc("current_user_is_store_admin");

      if (adminError) {
        console.error("[produtos] erro ao consultar admin atual", adminError);
      }

      const emailMatchesAdmin = user.email?.toLowerCase() === STORE_ADMIN_EMAIL;
      setIsAdmin(Boolean(isCurrentAdmin) || emailMatchesAdmin);
      setAdminLoading(false);
    };

    void loadAdminState();
  }, [user]);

  const cartItemsCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart],
  );
  const cartTotal = useMemo(
    () => cart.reduce((total, item) => total + item.priceValue * item.quantity, 0),
    [cart],
  );
  const displayedProducts = useMemo(() => {
    if (!highlightedFocus) return products;

    return [...products].sort((left, right) => {
      const leftMatch = left.focus === highlightedFocus ? 1 : 0;
      const rightMatch = right.focus === highlightedFocus ? 1 : 0;

      if (leftMatch !== rightMatch) return rightMatch - leftMatch;
      return left.sortOrder - right.sortOrder;
    });
  }, [highlightedFocus, products]);

  const openWhatsApp = (message: string) => {
    const phoneNumber = normalizePhoneNumber(whatsAppNumber || ENV_WHATSAPP_PHONE || "");

    if (!phoneNumber) {
      toast.error("Configure primeiro o número do WhatsApp da loja");
      return;
    }

    if (typeof window === "undefined") return;
    window.open(buildWhatsAppLink(message, phoneNumber), "_blank", "noopener,noreferrer");
  };

  const openExternalLink = (product: Product) => {
    const destination = normalizeUrl(product.externalUrl);

    if (!destination) {
      toast.error("Adicione um link válido para este produto");
      return;
    }

    if (typeof window === "undefined") return;
    window.open(destination, "_blank", "noopener,noreferrer");
  };

  const handleProductWhatsApp = (product: Product) => {
    const message = `Oi! Tenho interesse no ${product.name} (${formatCurrency(product.priceValue)}). Quero mais detalhes sobre esse produto capilar.`;
    openWhatsApp(message);
  };

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

  const handleBuy = (product: Product) => {
    if (!user) {
      toast.info("Entre na sua conta para continuar a compra");
      navigate({ to: "/auth" });
      return;
    }

    addToCart(product);
  };

  const handlePrimaryAction = (product: Product) => {
    if (product.ctaMode === "link") {
      openExternalLink(product);
      return;
    }

    if (product.ctaMode === "whatsapp") {
      handleProductWhatsApp(product);
      return;
    }

    handleBuy(product);
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

  const refreshProducts = async () => {
    setProductsLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[produtos] erro ao atualizar catálogo", error);
      toast.error("Não foi possível atualizar os produtos agora");
    } else {
      setProducts((data ?? []).map(mapRowToProduct));
    }

    setProductsLoading(false);
  };

  const saveWhatsAppNumber = async () => {
    if (!user || !isAdmin) return;

    const normalizedPhone = normalizePhoneNumber(whatsAppDraft);

    if (!normalizedPhone) {
      toast.error("Informe um número de WhatsApp válido");
      return;
    }

    setSavingWhatsApp(true);

    const { error } = await supabase.from("store_settings").upsert(
      {
        id: "main",
        whatsapp_number: normalizedPhone,
        updated_by: user.id,
      },
      { onConflict: "id" },
    );

    setSavingWhatsApp(false);

    if (error) {
      console.error("[produtos] erro ao salvar WhatsApp da loja", error);
      toast.error("Não foi possível salvar o WhatsApp da loja");
      return;
    }

    setWhatsAppNumber(normalizedPhone);
    setWhatsAppDraft(normalizedPhone);
    toast.success("WhatsApp da loja atualizado");
  };

  const openNewProductEditor = () => {
    const nextSortOrder =
      products.length > 0 ? Math.max(...products.map((product) => product.sortOrder)) + 1 : 1;
    const emptyProduct = createEmptyProduct(nextSortOrder);

    setDraft(emptyProduct);
    setDraftBenefitsText(emptyProduct.benefits.join("\n"));
    setIsNewProduct(true);
    setEditorOpen(true);
  };

  const openProductEditor = (product: Product) => {
    setDraft(product);
    setDraftBenefitsText(product.benefits.join("\n"));
    setIsNewProduct(false);
    setEditorOpen(true);
  };

  const updateDraftField = <K extends keyof Product>(field: K, value: Product[K]) => {
    setDraft((currentDraft) => (currentDraft ? { ...currentDraft, [field]: value } : currentDraft));
  };

  const saveDraft = async () => {
    if (!draft || !user) return;

    const cleanedBenefits = draftBenefitsText
      .split(/\r?\n/)
      .map((benefit) => benefit.trim())
      .filter(Boolean);

    const cleanedName = draft.name.trim();
    const cleanedSubtitle = draft.subtitle.trim();
    const cleanedBadge = draft.badge.trim() || "Destaque";
    const cleanedImageUrl = normalizeUrl(draft.imageUrl);
    const cleanedExternalUrl = normalizeUrl(draft.externalUrl);

    if (!cleanedName) {
      toast.error("Adicione um nome para o produto");
      return;
    }

    if (!cleanedSubtitle) {
      toast.error("Adicione uma descrição curta para o produto");
      return;
    }

    if (draft.priceValue < 0) {
      toast.error("O preço não pode ser negativo");
      return;
    }

    if (!cleanedImageUrl) {
      toast.error("Informe uma URL de imagem válida");
      return;
    }

    if (draft.ctaMode === "link" && !cleanedExternalUrl) {
      toast.error("Informe uma URL válida para usar link de afiliado");
      return;
    }

    const nextId =
      draft.id ||
      createUniqueProductId(
        cleanedName,
        isNewProduct ? products : products.filter((product) => product.id !== draft.id),
      );

    const nextProduct: Product = {
      ...draft,
      id: nextId,
      name: cleanedName,
      subtitle: cleanedSubtitle,
      badge: cleanedBadge,
      imageUrl: cleanedImageUrl,
      externalUrl: cleanedExternalUrl,
      benefits: cleanedBenefits.length ? cleanedBenefits : ["Benefício não informado"],
    };

    setSavingProduct(true);

    const payload = mapProductToInsert(nextProduct, user.id);
    const { error } = await supabase.from("products").upsert(payload, { onConflict: "id" });

    setSavingProduct(false);

    if (error) {
      console.error("[produtos] erro ao salvar produto", error);
      toast.error("Não foi possível salvar este produto agora");
      return;
    }

    setEditorOpen(false);
    setDraft(null);
    setDraftBenefitsText("");
    toast.success(isNewProduct ? "Produto criado com sucesso" : "Produto atualizado com sucesso");

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === nextProduct.id
          ? {
              ...item,
              name: nextProduct.name,
              priceValue: nextProduct.priceValue,
            }
          : item,
      ),
    );

    await refreshProducts();
  };

  const deleteProduct = async (product: Product) => {
    if (!isAdmin) return;

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Deseja excluir "${product.name}" da loja?`);
      if (!confirmed) return;
    }

    const { error } = await supabase.from("products").delete().eq("id", product.id);

    if (error) {
      console.error("[produtos] erro ao excluir produto", error);
      toast.error("Não foi possível excluir este produto agora");
      return;
    }

    setProducts((currentProducts) => currentProducts.filter((item) => item.id !== product.id));
    setCart((currentCart) => currentCart.filter((item) => item.id !== product.id));
    toast.success("Produto removido da loja");
  };

  const resetProducts = async () => {
    if (!user || !isAdmin) return;

    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Deseja restaurar o catálogo padrão da loja?");

    if (!confirmed) return;

    const payload = DEFAULT_PRODUCTS.map((product) => mapProductToInsert(product, user.id));

    const { error } = await supabase.from("products").upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("[produtos] erro ao restaurar catálogo", error);
      toast.error("Não foi possível restaurar o catálogo padrão");
      return;
    }

    toast.success("Catálogo padrão restaurado");
    await refreshProducts();
  };

  const showAdminPanel = Boolean(user) && (isAdmin || adminLoading);

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
              Monte sua rotina com kits pensados para hidratação, nutrição, reconstrução e
              finalização, com compra simples e atendimento direto pelo WhatsApp.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
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
                ? "Escolha seus kits favoritos, monte sua rotina e finalize o pedido pelo WhatsApp."
                : "Entre na sua conta para acompanhar seu cronograma e escolher os produtos ideais para o seu cabelo."}
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

      {showAdminPanel && (
        <section className="container mx-auto px-4 pt-2 pb-8">
          <div className="rounded-3xl border border-primary/20 bg-gradient-card p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Settings2 className="h-3.5 w-3.5" /> Gestão da loja
                </span>
                <h2 className="mt-4 text-3xl font-black md:text-4xl">Painel da administradora</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Aqui você controla os produtos da vitrine, os preços, os links e o número de
                  atendimento usado nos botões de WhatsApp da loja.
                </p>
              </div>

              {adminLoading ? (
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verificando acesso
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={openNewProductEditor}
                    className="rounded-full px-6 py-3 font-bold"
                  >
                    <Plus className="h-4 w-4" /> Novo produto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetProducts}
                    className="rounded-full px-6 py-3 font-bold"
                  >
                    <RotateCcw className="h-4 w-4" /> Restaurar catálogo
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-background/40 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <div className="font-bold">Direcionamento do WhatsApp da loja</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Esse número é usado nos botões de WhatsApp dos produtos e do carrinho.
                  </p>
                </div>
                <div className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
                  Número atual: {whatsAppNumber || "não configurado"}
                </div>
              </div>

              {!adminLoading && isAdmin && (
                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <input
                    value={whatsAppDraft}
                    onChange={(event) => setWhatsAppDraft(event.target.value)}
                    className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-smooth focus:border-primary"
                    placeholder="Ex: 5575982796869"
                  />
                  <Button
                    type="button"
                    onClick={saveWhatsAppNumber}
                    disabled={savingWhatsApp}
                    className="rounded-full px-6 py-3 font-bold"
                  >
                    {savingWhatsApp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Salvar WhatsApp
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-4xl font-black md:text-5xl">
            Escolha o <span className="text-gradient">kit ideal</span> para seu cabelo
          </h2>
          <p className="mt-4 text-muted-foreground">
            Produtos organizados por objetivo para facilitar sua compra e sua rotina.
          </p>
        </div>

        {highlightedFocus && (
          <div className="mb-8 rounded-3xl border border-primary/30 bg-primary/10 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-bold text-primary">Foco trazido do seu cronograma</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Destacamos primeiro os kits de{" "}
                  <strong className="text-foreground">{highlightedFocus}</strong> para você
                  encontrar mais rápido o tratamento indicado.
                </p>
              </div>
              <Link
                to="/produtos"
                search={{ focus: undefined }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-5 py-3 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
              >
                Ver vitrine completa <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {productsError && (
          <div className="mb-8 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {productsError}
          </div>
        )}

        {productsLoading ? (
          <div className="flex items-center justify-center rounded-3xl border border-border bg-gradient-card p-12">
            <div className="inline-flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando produtos da loja...
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-border bg-gradient-card p-12 text-center">
            <h3 className="text-2xl font-black">Nenhum produto cadastrado ainda</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              {isAdmin
                ? "Crie o primeiro produto da loja para começar a vender."
                : "A loja ainda não tem produtos publicados."}
            </p>
            {isAdmin && (
              <Button type="button" onClick={openNewProductEditor} className="mt-6 rounded-full">
                <Plus className="h-4 w-4" /> Criar primeiro produto
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {displayedProducts.map((product) => {
              const meta = PRODUCT_FOCUS_META[product.focus];
              const Icon = meta.icon;
              const isHighlighted = highlightedFocus === product.focus;

              return (
                <article
                  key={product.id}
                  className={`overflow-hidden rounded-3xl border bg-gradient-card transition-smooth hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow ${isHighlighted ? "border-primary shadow-glow ring-1 ring-primary/40" : "border-border"}`}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-64 w-full items-center justify-center bg-gradient-to-r ${meta.accent}`}
                    >
                      <Icon className="h-14 w-14 text-white" />
                    </div>
                  )}

                  <div className="p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                          {isHighlighted ? "Indicado para seu tratamento" : product.badge}
                        </span>
                        <h3 className="mt-4 text-2xl font-black">{product.name}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{product.subtitle}</p>
                      </div>
                      <div
                        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r ${meta.accent} shadow-glow`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    <div className="mt-6 text-4xl font-black">
                      {formatCurrency(product.priceValue)}
                    </div>

                    {product.externalUrl && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                        <Link2 className="h-3.5 w-3.5" /> Link externo configurado
                      </div>
                    )}

                    <ul className="mt-6 space-y-3">
                      {product.benefits.map((benefit) => (
                        <li
                          key={`${product.id}-${benefit}`}
                          className="flex items-start gap-3 text-sm"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handlePrimaryAction(product)}
                      className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3 font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105"
                    >
                      {getPrimaryActionLabel(product)}
                      {product.ctaMode === "link" ? (
                        <ExternalLink className="h-4 w-4" />
                      ) : product.ctaMode === "whatsapp" ? (
                        <MessageCircle className="h-4 w-4" />
                      ) : (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                    </button>

                    {product.ctaMode !== "whatsapp" && (
                      <button
                        type="button"
                        onClick={() => handleProductWhatsApp(product)}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background/70 px-6 py-3 font-bold transition-smooth hover:border-primary hover:text-primary"
                      >
                        Pedir pelo WhatsApp <MessageCircle className="h-4 w-4" />
                      </button>
                    )}

                    {product.externalUrl && product.ctaMode !== "link" && (
                      <button
                        type="button"
                        onClick={() => openExternalLink(product)}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background/70 px-6 py-3 font-bold transition-smooth hover:border-primary hover:text-primary"
                      >
                        Abrir link/afiliado <ExternalLink className="h-4 w-4" />
                      </button>
                    )}

                    {isAdmin && (
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => openProductEditor(product)}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold transition-smooth hover:border-primary hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(product)}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition-smooth hover:border-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Sheet
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setDraft(null);
            setDraftBenefitsText("");
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{isNewProduct ? "Novo produto" : "Editar produto"}</SheetTitle>
            <SheetDescription>
              Nesta versão a foto é salva por URL. Você pode editar preço, descrição, foco do
              produto e o destino do clique principal.
            </SheetDescription>
          </SheetHeader>

          {draft && (
            <div className="mt-6 space-y-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nome do produto
                  </label>
                  <input
                    value={draft.name}
                    onChange={(event) => updateDraftField("name", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-smooth focus:border-primary"
                    placeholder="Ex: Kit Hidratação Intensiva"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Selo
                  </label>
                  <input
                    value={draft.badge}
                    onChange={(event) => updateDraftField("badge", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-smooth focus:border-primary"
                    placeholder="Ex: Oferta do dia"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Descrição curta
                </label>
                <input
                  value={draft.subtitle}
                  onChange={(event) => updateDraftField("subtitle", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-smooth focus:border-primary"
                  placeholder="Ex: Brilho, maciez e tratamento rápido"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Preço
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.priceValue}
                    onChange={(event) =>
                      updateDraftField("priceValue", Number(event.target.value || 0))
                    }
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-smooth focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Categoria visual
                  </label>
                  <select
                    value={draft.focus}
                    onChange={(event) =>
                      updateDraftField("focus", event.target.value as ProductFocus)
                    }
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-smooth focus:border-primary"
                  >
                    {Object.keys(PRODUCT_FOCUS_META).map((focus) => (
                      <option key={focus} value={focus}>
                        {focus}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ação principal
                  </label>
                  <select
                    value={draft.ctaMode}
                    onChange={(event) =>
                      updateDraftField("ctaMode", event.target.value as ProductCtaMode)
                    }
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-smooth focus:border-primary"
                  >
                    <option value="carrinho">Carrinho</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="link">Link de afiliado</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    URL da imagem
                  </label>
                  <input
                    value={draft.imageUrl}
                    onChange={(event) => updateDraftField("imageUrl", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-smooth focus:border-primary"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Link externo ou afiliado
                  </label>
                  <input
                    value={draft.externalUrl}
                    onChange={(event) => updateDraftField("externalUrl", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-smooth focus:border-primary"
                    placeholder="https://seulink.com/produto"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-dashed border-border p-4">
                <div className="font-bold">Prévia da imagem</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cole uma URL de imagem pública para atualizar a foto do card.
                </p>
                {draft.imageUrl ? (
                  <img
                    src={draft.imageUrl}
                    alt={draft.name || "Prévia do produto"}
                    className="mt-4 h-56 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="mt-4 flex h-56 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                    A prévia da foto aparece aqui
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Benefícios (um por linha)
                </label>
                <textarea
                  value={draftBenefitsText}
                  onChange={(event) => setDraftBenefitsText(event.target.value)}
                  rows={6}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-smooth focus:border-primary"
                  placeholder={"Máscara de tratamento\nLeave-in de proteção\nResultado com brilho"}
                />
              </div>

              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                <strong className="text-foreground">Como funciona:</strong> se a ação principal for{" "}
                <span className="font-semibold text-foreground">Link de afiliado</span>, o botão do
                produto abre a URL informada. Nos outros modos, o link externo continua disponível
                como ação secundária, se você preencher esse campo.
              </div>
            </div>
          )}

          <SheetFooter className="border-t border-border pt-6">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={saveDraft} disabled={savingProduct}>
                {savingProduct ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Salvar produto
                  </>
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
