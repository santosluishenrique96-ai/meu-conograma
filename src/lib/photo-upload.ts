import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "evolution-photos";

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns an error message in pt-BR, or null when the file is valid. */
export function validateImage(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "O arquivo selecionado não é uma imagem.";
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Formato não suportado. Use JPG, PNG, WEBP ou HEIC.";
  }
  if (file.size === 0) {
    return "O arquivo está vazio ou corrompido.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `Imagem muito grande (${formatBytes(file.size)}). O limite é ${formatBytes(MAX_FILE_BYTES)}.`;
  }
  return null;
}

export function buildStoragePath(userId: string, file: File) {
  const ext = EXT_BY_TYPE[file.type] ?? (file.name.split(".").pop() || "jpg").toLowerCase();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${userId}/${Date.now()}-${rand}.${ext}`;
}

/**
 * Ensures the browser client has a valid auth session before touching Storage/DB.
 * This avoids stale tabs trying to upload with an expired access token.
 */
export async function ensureActiveSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  let session = data.session;
  const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
  const shouldRefresh = !session || (expiresAt > 0 && expiresAt - Date.now() < 60_000);

  if (shouldRefresh) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw refreshError;
    session = refreshed.session;
  }

  if (!session?.user) {
    throw new Error("AUTH_SESSION_EXPIRED");
  }

  return session;
}

/** Extracts the object path from a public storage URL (fallback for legacy rows). */
export function pathFromPublicUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = url.slice(i + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/** Maps raw storage/database errors to friendly pt-BR messages. */
export function friendlyUploadError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? "";
  const lower = msg.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Sem conexão com o servidor. Verifique sua internet e tente novamente.";
  }
  if (lower.includes("exceeded") || lower.includes("too large") || lower.includes("payload")) {
    return "A imagem excede o tamanho permitido.";
  }
  if (lower.includes("mime") || lower.includes("content type")) {
    return "Formato de imagem não aceito pelo servidor.";
  }
  if (lower.includes("already exists") || lower.includes("duplicate")) {
    return "Essa foto já foi enviada. Tente novamente.";
  }
  if (
    lower.includes("jwt expired") ||
    lower.includes("invalid jwt") ||
    lower.includes("refresh token") ||
    lower.includes("auth_session_expired") ||
    lower.includes("session_not_found")
  ) {
    return "Sua sessão expirou. Entre novamente para enviar fotos.";
  }
  if (lower.includes("row-level security") || lower.includes("permission") || lower.includes("unauthorized")) {
    return "Seu acesso ao envio de fotos foi recusado. Entre novamente e tente de novo.";
  }
  return msg || "Não foi possível enviar a foto. Tente novamente.";
}
