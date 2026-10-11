const PRODUCTION_API_BASE = "https://btech-buddy-backend.onrender.com";

function resolveApiBase(): string {
  const raw = (
    (import.meta.env.VITE_API_URL as string | undefined) || ""
  ).trim();
  if (raw) return raw.replace(/\/+$/, "");
  // Local dev without env: keep relative URLs so the Vite proxy handles /api.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "";
  }
  // Production fallback: Vercel builds without VITE_API_URL would otherwise
  // call the frontend origin itself (which serves index.html for /api/* due
  // to the SPA rewrite) and `resp.json()` would resolve to null.
  return PRODUCTION_API_BASE;
}

export const API_BASE = resolveApiBase();

export const isApiBaseFallback = !(
  (import.meta.env.VITE_API_URL as string | undefined)?.trim?.() || ""
);

if (isApiBaseFallback && typeof window !== "undefined") {
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    console.warn(
      `BTech Buddy: VITE_API_URL is missing at build time, falling back to ${PRODUCTION_API_BASE}. Set VITE_API_URL in Vercel env to silence this.`
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
    throw new ApiError(0, "Network error. Please check your connection.");
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
    const message =
      body?.detail || body?.message || `Request failed (${resp.status})`;
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
        resolve(body);
      } else {
        reject(
          new ApiError(
            xhr.status,
            body?.detail || body?.message || "Upload failed"
          )
        );
      }
    };
    xhr.onerror = () =>
      reject(new ApiError(0, "Network error. Please check your connection."));
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
