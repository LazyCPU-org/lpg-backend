/**
 * Response Helper Utilities
 * 
 * Clean, type-safe utilities for building API responses.
 * Designed to transition smoothly to builder pattern in the future.
 */

import type {
  StandardResponse,
  PaginatedResponse,
  FilteredResponse,
  PaginatedFilteredResponse,
  PaginationInfo,
  FilterInfo,
  PaginatedResponseBody,
  FilteredResponseBody,
  PaginatedFilteredResponseBody,
} from "../types/responses";

/**
 * Creates a standard success response
 */
export function standardResponse<T>(data: T): StandardResponse<T> {
  return {
    data,
    error: null,
  };
}

/**
 * Creates a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo
): PaginatedResponse<T> {
  return {
    data,
    error: null,
    pagination,
  };
}

/**
 * Creates a filtered response
 */
export function filteredResponse<T>(
  data: T[],
  filters: FilterInfo
): FilteredResponse<T> {
  return {
    data,
    error: null,
    filters,
  };
}

/**
 * Creates a paginated and filtered response
 */
export function paginatedFilteredResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  filters: FilterInfo
): PaginatedFilteredResponse<T> {
  return {
    data,
    error: null,
    pagination,
    filters,
  };
}

/**
 * Response body utilities (for controller returns before middleware processing)
 */
export const responseBody = {
  /**
   * Creates paginated response body
   */
  paginated<T>(data: T[], pagination: PaginationInfo): PaginatedResponseBody<T> {
    return { data, pagination };
  },

  /**
   * Creates filtered response body
   */
  filtered<T>(data: T[], filters: FilterInfo): FilteredResponseBody<T> {
    return { data, filters };
  },

  /**
   * Creates paginated and filtered response body
   */
  paginatedFiltered<T>(
    data: T[],
    pagination: PaginationInfo,
    filters: FilterInfo
  ): PaginatedFilteredResponseBody<T> {
    return { data, pagination, filters };
  },
};

/**
 * Pagination utilities
 */
export const paginationUtils = {
  /**
   * Creates pagination info with calculated fields
   */
  create(
    total: number,
    page: number,
    limit: number
  ): PaginationInfo {
    const totalPages = Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  },

  /**
   * Calculates offset from page and limit
   */
  getOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  },
};

/**
 * Type guards for response detection
 */
export const responseTypeGuards = {
  isStructuredResponse(body: unknown): body is { data: unknown; [key: string]: unknown } {
    return (
      body !== null &&
      typeof body === "object" &&
      body.hasOwnProperty("data")
    );
  },

  hasPagination(body: unknown): body is { pagination: PaginationInfo } {
    return (
      body !== null &&
      typeof body === "object" &&
      body.hasOwnProperty("pagination")
    );
  },

  hasFilters(body: unknown): body is { filters: FilterInfo } {
    return (
      body !== null &&
      typeof body === "object" &&
      body.hasOwnProperty("filters")
    );
  },

  isError(body: unknown, statusCode: number): boolean {
    return (
      statusCode >= 400 ||
      (body !== null &&
        typeof body === "object" &&
        (body.hasOwnProperty("error") || body.hasOwnProperty("message")))
    );
  },
};