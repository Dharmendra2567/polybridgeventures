import { ApiErrorResponse } from "@polybridge/contracts";
import { API_BASE } from "../utils/apiConfig.js";

export class ApiError extends Error {
  public readonly code: string;
  public readonly correlationId: string;
  public readonly timestamp: string;
  public readonly details?: Array<{ field?: string; message: string }>;
  public readonly statusCode: number;

  constructor(payload: ApiErrorResponse["error"], statusCode: number) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.correlationId = payload.correlationId;
    this.timestamp = payload.timestamp;
    this.details = payload.details;
    this.statusCode = statusCode;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  public async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { params, headers, ...restOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    // Generate client correlation ID trace
    const correlationId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "client-trace-" + Date.now();

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Correlation-ID": correlationId,
      ...(headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
      credentials: "include", // Guarantees HttpOnly session cookies are transmitted
    });

    if (!response.ok) {
      let errorData: ApiErrorResponse["error"];
      try {
        const json = await response.json();
        errorData = json.error || {
          code: "HTTP_ERROR_" + response.status,
          message: response.statusText || "An unexpected server error occurred",
          correlationId:
            response.headers.get("x-correlation-id") || correlationId,
          timestamp: new Date().toISOString(),
        };
      } catch {
        errorData = {
          code: "NETWORK_PARSE_ERROR",
          message: `Server returned status ${response.status}`,
          correlationId:
            response.headers.get("x-correlation-id") || correlationId,
          timestamp: new Date().toISOString(),
        };
      }

      throw new ApiError(errorData, response.status);
    }

    return response.json() as Promise<T>;
  }

  public get<T>(
    endpoint: string,
    params?: RequestOptions["params"],
    options?: Omit<RequestOptions, "params" | "method">,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET", params });
  }

  public post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method">,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

export const apiClient = new ApiClient(API_BASE);
