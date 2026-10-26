const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "http://localhost:5173";

export function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Vary": "Origin",
    },
    body: JSON.stringify(body),
  };
}

export function authenticatedUserId(event) {
  // The REST API's Cognito authorizer validates the token. Never accept userId
  // from a request body, query string, or client-controlled header.
  const claims = event.requestContext?.authorizer?.claims;
  const userId = claims?.sub;
  if (typeof userId !== "string" || userId.length === 0) {
    const error = new Error("Authentication is required.");
    error.statusCode = 401;
    throw error;
  }
  return userId;
}

export function parseJsonBody(event) {
  if (!event.body) return {};
  if (event.body.length > 150_000) {
    const error = new Error("Request body is too large.");
    error.statusCode = 413;
    throw error;
  }
  try {
    return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}
