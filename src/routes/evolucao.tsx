import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Camera,
  Trash2,
  ImageIcon,
  Sparkles,
  Calendar as CalendarIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ACCEPT_ATTR,
  BUCKET,
  MAX_FILE_BYTES,
  buildStoragePath,
  ensureActiveSession,
  formatBytes,
  friendlyUploadError,
  pathFromPublicUrl,
  validateImage,
} from "@/lib/photo-upload";

export const Route = createFileRoute("/evolucao")({
  head: () => ({
    meta: [
      { title: "Evolução Capilar — Meu Cronograma" },
      {
        name: "description",
        content: "Acompanhe a evolução dos seus cabelos com fotos e anotações ao longo do tempo.",
      },
      { property: "og:title", content: "Evolução Capilar — Meu Cronograma" },
      {
        property: "og:description",
        content: "Registre fotos semanais e veja o progresso dos seus fios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvolucaoPage,
});

type Photo = {
  id: string;
  image_url: string;
  storage_path: string | null;
  note: string | null;
  taken_at: string;
};

function EvolucaoPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAuthFailure = useCallback(
    (err: unknown) => {
      const message = friendlyUploadError(err);
      const expired = message.includes("sessão expirou") || message.includes("acesso ao envio");
      toast.error(message);
      if (expired) {
        navigate({ to: "/auth" });
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const loadPhotos = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setLoadError(null);
    let activeUserId = user.id;
    try {
      const session = await ensureActiveSession();
      activeUserId = session.user.id;
    } catch (err) {
      const message = friendlyUploadError(err);
      setLoadError(message);
      if (message.includes("sessão expirou") || message.includes("acesso ao envio")) {
        navigate({ to: "/auth" });
      }
      setFetching(false);
      return;
    }
    const { data, error } = await supabase
      .from("evolution_photos")
      .select("id, image_url, storage_path, note, taken_at")
      .eq("user_id", activeUserId)
      .order("taken_at", { ascending: false });
    if (error) {
      setLoadError(friendlyUploadError(error));
    } else {
      setPhotos((data ?? []) as Photo[]);
    }
    setFetching(false);
  }, [navigate, user]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const resetInput = () => {
      if (fileRef.current) fileRef.current.value = "";
    };
    if (!file) return resetInput();
    if (!user) {
      toast.error("Entre na sua conta para enviar fotos.");
      return resetInput();
    }

    const invalid = validateImage(file);
    if (invalid) {
      toast.error(invalid);
      return resetInput();
    }

    setBusy(true);
    try {
      const session = await ensureActiveSession();
      const activeUserId = session.user.id;
      const path = buildStoragePath(activeUserId, file);

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { data, error } = await supabase
        .from("evolution_photos")
        .insert({
          user_id: activeUserId,
          image_url: pub.publicUrl,
          storage_path: path,
          note: note.trim().slice(0, 200) || null,
        })
        .select("id, image_url, storage_path, note, taken_at")
        .single();

      if (error) {
        // rollback: don't leave an orphan file in storage
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }

      setPhotos((p) => [data as Photo, ...p]);
      setNote("");
      toast.success("Foto adicionada!");
    } catch (err) {
      handleAuthFailure(err);
    } finally {
      setBusy(false);
      resetInput();
    }
  };

  const remove = async (photo: Photo) => {
    if (!confirm("Remover esta foto? Esta ação não pode ser desfeita.")) return;
    setDeletingId(photo.id);
    try {
      await ensureActiveSession();
      const { error } = await supabase.from("evolution_photos").delete().eq("id", photo.id);
      if (error) throw error;
      const path = photo.storage_path ?? pathFromPublicUrl(photo.image_url);
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      setPhotos((p) => p.filter((x) => x.id !== photo.id));
      toast.success("Foto removida");
    } catch (err) {
      handleAuthFailure(err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-3xl border border-border bg-gradient-card p-8 text-center shadow-elegant">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 text-2xl font-black">Carregando sua evolucao</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos preparando sua linha do tempo e validando o acesso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Sua jornada capilar
          </span>
          <h1 className="mt-5 text-4xl md:text-5xl font-black leading-tight">
            <span className="text-gradient">Evolução</span> em fotos
          </h1>
          <p className="mt-3 text-muted-foreground">
            Tire uma foto a cada semana para ver de perto o brilho, o volume e o crescimento dos
            seus fios.
          </p>
        </div>

        {/* Upload card */}
        <div className="mt-10 rounded-3xl bg-gradient-card border border-border p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Camera className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold">Adicionar nova foto</div>
              <div className="text-xs text-muted-foreground">
                Máx. {formatBytes(MAX_FILE_BYTES)} · JPG, PNG, WEBP ou HEIC
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Observação opcional (ex: pós hidratação)"
              className="w-full rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm focus:outline-none focus:border-primary transition-smooth"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {busy ? "Enviando..." : "Tirar / escolher foto"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_ATTR}
              capture="environment"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Gallery */}
        <div className="mt-10">
          {fetching ? (
            <div className="flex items-center justify-center gap-2 rounded-3xl border border-border p-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando suas fotos...
            </div>
          ) : loadError ? (
            <div className="rounded-3xl border border-destructive/40 bg-destructive/5 p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="mt-3 text-sm text-muted-foreground">{loadError}</p>
              <button
                onClick={() => void loadPhotos()}
                className="mt-4 rounded-2xl border border-primary/40 px-5 py-2 text-sm font-bold text-primary transition-smooth hover:bg-primary/10"
              >
                Tentar novamente
              </button>
            </div>
          ) : photos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-10 text-center">
              <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">
                Nenhuma foto ainda. Adicione a primeira para começar sua linha do tempo.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="group rounded-3xl bg-gradient-card border border-border overflow-hidden transition-smooth hover:border-primary/50"
                >
                  <div className="aspect-square overflow-hidden bg-card">
                    <img
                      src={p.image_url}
                      alt={p.note || "Registro da evolução capilar"}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                      }}
                      className="h-full w-full object-cover transition-smooth group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-xs text-primary font-bold">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {new Date(p.taken_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    {p.note && <p className="mt-2 text-sm text-foreground/90">{p.note}</p>}
                    <button
                      onClick={() => remove(p)}
                      disabled={deletingId === p.id}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-smooth disabled:opacity-50"
                    >
                      {deletingId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      {deletingId === p.id ? "Removendo..." : "Remover"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
