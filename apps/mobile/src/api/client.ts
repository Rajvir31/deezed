export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
const API_URL = API_BASE_URL;

// Render free tier can take up to 2 minutes to wake from sleep
const REQUEST_TIMEOUT_MS = 120_000;

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new ApiError(
        data.error || "Request failed",
        response.status,
        data,
      );
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (controller.signal.aborted) {
      throw new Error("Request timed out — the server may be waking up. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
