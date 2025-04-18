import { Request, Response, NextFunction } from "express";

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
  res.json = function (body: any): Response {
    // Determine if this is an error response based on status code or body structure
    const isError =
      currentStatusCode >= 400 ||
      (body &&
        (body.error || body.message) &&
        (Object.keys(body).length === 1 ||
          (Object.keys(body).length === 2 && body.stack)));

    // Format the response according to the standard structure
    let formattedBody;

    if (isError) {
      formattedBody = {
        data: null,
        error: body && body.error ? body.error : body,
      };
    } else {
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
