import { Request, Response, NextFunction } from "express";
import { responseTypeGuards } from "../utils/response-helpers";
import type { ApiResponse } from "../types/responses";

export const responseFormatter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Store reference to the original res.json method
  const originalJson = res.json;
  const originalStatus = res.status;
  let currentStatusCode = 200;

  // Override the status method to track the current status code
  res.status = function (code: number): Response {
    currentStatusCode = code;
    return originalStatus.call(this, code);
  };

  // Override the json method
  res.json = function (body: unknown): Response {
    // Determine if this is an error response
    const isError = responseTypeGuards.isError(body, currentStatusCode);

    // Check if the response is already structured with data property
    const isStructured = responseTypeGuards.isStructuredResponse(body);

    // Format the response according to the standard structure
    let formattedBody: ApiResponse;

    if (isError) {
      // Handle error responses
      formattedBody = {
        data: null,
        error: (body && typeof body === 'object' && 'error' in body) 
          ? String(body.error) 
          : String(body),
      };
    } else if (isStructured) {
      // For structured responses (paginated, filtered, etc.), preserve structure and add error field
      formattedBody = {
        ...body,
        error: null,
      } as ApiResponse;
    } else {
      // For simple data responses
      formattedBody = {
        data: body,
        error: null,
      };
    }

    // Call the original json method with our formatted body
    return originalJson.call(this, formattedBody);
  };

  // Continue to the next middleware/route handler
  next();
};
