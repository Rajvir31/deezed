export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
const API_URL = API_BASE_URL;

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

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
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
}
