export function withApiErrorHandling<Args extends unknown[]>(
  operation: string,
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return Response.json(
          { ok: false, error: "Invalid request body" },
          { status: 400 },
        );
      }

      if (error instanceof Error && error.name === "BSONError") {
        return Response.json(
          { ok: false, error: "Invalid resource identifier" },
          { status: 400 },
        );
      }

      console.error(`${operation} failed:`, error);
      return Response.json(
        { ok: false, error: "An unexpected server error occurred" },
        { status: 500 },
      );
    }
  };
}
