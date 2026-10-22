/// <reference lib="dom" />
export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** Accounts are optional. Pages never sends private API calls to another site. */
export function accountsAvailable(location?: Pick<Location, "hostname">): boolean {
  if (process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH) return false;
  return !location?.hostname.endsWith(".github.io");
}

export async function api<T>(path: string, options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  if (!path.startsWith("/api/") || path.startsWith("//") || path.includes("..")) throw new Error("Invalid API path");
  if (!accountsAvailable(typeof window === "undefined" ? undefined : window.location)) throw new ApiError(0, "unavailable", "Accounts are available on german.learnilabs.com. Your local learning still works here.");
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", ...(options.body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "unavailable", "The account service is unavailable. Your local learning still works offline.");
  }
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new ApiError(0, "unavailable", "The account service is unavailable at this address.");
  const data: unknown = await response.json();
  if (!response.ok) {
    const value = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const code = typeof value.error === "string" ? value.error : "request_failed";
    const message = typeof value.message === "string" ? value.message : ({ unauthorized: "Sign in to continue.", forbidden: "You do not have access to this page.", password_change_required: "Change your temporary password in Account before continuing.", invalid_credentials: "Wrong username or password.", rate_limited: "Too many attempts. Please wait before trying again." }[code] ?? "The request could not be completed. Check your details and try again.");
    throw new ApiError(response.status, code, message);
  }
  return data as T;
}

export function saveJson(value: unknown, filename: string): void {
  saveBlob(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }), filename);
}
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "The request could not be completed.";
}
