export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || "";

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

  let body: any = null;
  try {
    body = await resp.json();
  } catch {
    body = null;
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
