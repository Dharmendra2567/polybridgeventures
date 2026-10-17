/**
 * Standard error response envelope.
 * Excludes stack traces and internal exceptions to prevent information disclosure.
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    timestamp: string;
    details?: Array<{
      field?: string;
      message: string;
    }>;
  };
}

/**
 * Standard API success response envelope.
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    correlationId: string;
    timestamp: string;
  };
}

/**
 * Standard pagination query parameters.
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Standard paginated list response.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  meta: {
    correlationId: string;
    timestamp: string;
  };
}
