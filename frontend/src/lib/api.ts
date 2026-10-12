const PRODUCTION_API_BASE = "https://btech-buddy-backend.onrender.com";

/**
 * Normalise a configured API base. Returns `null` when the value is empty or
 * is not an absolute http(s) URL (e.g. a key accidentally pasted into
 * VITE_API_URL) so callers can fall back instead of building a broken
 * request URL like `https://<jwt>/api/...`.
 */
function normalizeApiBase(value: string | undefined): string | null {
  const trimmed = (value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function resolveApiBase(): string {
  const fromEnv = normalizeApiBase(
    import.meta.env.VITE_API_URL as string | undefined
  );
  if (fromEnv) return fromEnv;
  // Local dev without env: keep relative URLs so the Vite proxy handles /api.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "";
  }
  // Production fallback: Vercel builds without a usable VITE_API_URL would
  // otherwise call the frontend origin itself (which serves index.html for
  // /api/* due to the SPA rewrite) and `resp.json()` would resolve to null.
  return PRODUCTION_API_BASE;
}

export const API_BASE = resolveApiBase();

export const isApiBaseFallback =
  normalizeApiBase(import.meta.env.VITE_API_URL as string | undefined) === null;

if (isApiBaseFallback && typeof window !== "undefined") {
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    console.warn(
      `BTech Buddy: VITE_API_URL is missing or not an absolute http(s) URL at build time, falling back to ${PRODUCTION_API_BASE}. Set VITE_API_URL in Vercel env to silence this.`
    );
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Map HTTP statuses to user-facing messages. Never leak internals. */
function messageForStatus(status: number, detail?: string): string {
  if (status === 401 || status === 403) return "Session expired — sign in again.";
  if (status === 404) return "The requested resource was not found.";
  if (status === 413) return "File is too large. Maximum size is 50 MB.";
  if (status === 400 || status === 422)
    return detail || "Validation failed. Please check your inputs.";
  if (status === 502 || status === 503 || status === 504)
    return "Backend temporarily unavailable. Please try again in a moment.";
  if (status >= 500) return "Server error. Please try again later.";
  return detail || `Request failed (${status})`;
}

const TRANSPORT_MESSAGE =
  "Cannot reach the server. It may be temporarily unavailable — please check your connection and try again.";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = sessionStorage.getItem("btechbuddy_admin_token");
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, TRANSPORT_MESSAGE);
  }

  if (resp.status === 204) return undefined as T;

  const contentType = resp.headers.get("content-type") || "";
  let body: any = null;
  try {
    // Some hosts (e.g. a misconfigured SPA fallback) return HTML with a
    // 200 status for /api/* — guard so callers never receive `null`
    // and crash on `.data`.
    if (contentType.includes("application/json")) {
      body = await resp.json();
    } else {
      const text = await resp.text();
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      if (body === null) {
        throw new ApiError(
          resp.status,
          resp.ok
            ? "Unexpected response from server (expected JSON). Please try again."
            : `Request failed (${resp.status})`
        );
      }
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    body = null;
  }

  if (body === null || body === undefined) {
    throw new ApiError(
      resp.status,
      resp.ok
        ? "Unexpected empty response from server. Please try again."
        : `Request failed (${resp.status})`
    );
  }

  if (!resp.ok) {
    const message = messageForStatus(resp.status, body?.detail || body?.message);
    throw new ApiError(resp.status, message);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Upload a file with progress reporting via XMLHttpRequest. */
export function uploadWithProgress(
  path: string,
  formData: FormData,
  token: string | null,
  onProgress: (percent: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}${path}`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.timeout = 120000; // large PDFs can take a while
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (body === null || body === undefined) {
          reject(
            new ApiError(xhr.status, "Unexpected empty response from server. Please try again.")
          );
          return;
        }
        resolve(body);
      } else {
        reject(
          new ApiError(
            xhr.status,
            messageForStatus(xhr.status, body?.detail || body?.message)
          )
        );
      }
    };
    xhr.onerror = () => reject(new ApiError(0, TRANSPORT_MESSAGE));
    xhr.ontimeout = () =>
      reject(new ApiError(0, "Request timed out. Please try again."));
    xhr.send(formData);
  });
}

export function setAdminToken(token: string | null) {
  if (token) sessionStorage.setItem("btechbuddy_admin_token", token);
  else sessionStorage.removeItem("btechbuddy_admin_token");
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem("btechbuddy_admin_token");
}
