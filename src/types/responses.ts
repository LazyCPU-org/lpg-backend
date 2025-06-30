/**
 * Standard API Response Types
 * 
 * These interfaces define the structure for all API responses
 * to ensure consistency across the application.
 */

// Base response structure
export interface BaseResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

// Pagination metadata
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

// Filter metadata (for orders and other filtered endpoints)
export interface FilterInfo {
  [key: string]: unknown;
}

// Success response types
export interface StandardResponse<T = unknown> extends BaseResponse<T> {
  data: T;
  error: null;
}

export interface PaginatedResponse<T = unknown> extends BaseResponse<T[]> {
  data: T[];
  error: null;
  pagination: PaginationInfo;
}

export interface FilteredResponse<T = unknown> extends BaseResponse<T[]> {
  data: T[];
  error: null;
  filters: FilterInfo;
}

export interface PaginatedFilteredResponse<T = unknown> extends BaseResponse<T[]> {
  data: T[];
  error: null;
  pagination: PaginationInfo;
  filters: FilterInfo;
}

// Error response type
export interface ErrorResponse extends BaseResponse<null> {
  data: null;
  error: string;
}

// Union type for all possible responses
export type ApiResponse<T = unknown> = 
  | StandardResponse<T>
  | PaginatedResponse<T>
  | FilteredResponse<T>
  | PaginatedFilteredResponse<T>
  | ErrorResponse;

// Response body types (what controllers return before middleware formatting)
export interface PaginatedResponseBody<T = unknown> {
  data: T[];
  pagination: PaginationInfo;
}

export interface FilteredResponseBody<T = unknown> {
  data: T[];
  filters: FilterInfo;
}

export interface PaginatedFilteredResponseBody<T = unknown> {
  data: T[];
  pagination: PaginationInfo;
  filters: FilterInfo;
}

// Utility type to detect structured responses
export interface StructuredResponseBody {
  data: unknown;
  pagination?: PaginationInfo;
  filters?: FilterInfo;
  [key: string]: unknown;
}