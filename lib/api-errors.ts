export type ApiError = {
  status: number;
  title: string;
  message: string;
};

export function getErrorTitle(status: number): string {
  switch (status) {
    case 409:
      return "Not enough stock (409 Conflict)";
    case 410:
      return "Reservation expired (410 Gone)";
    case 404:
      return "Not found (404)";
    default:
      return `Request failed (${status})`;
  }
}

/** Parse a failed fetch Response into a user-visible ApiError. */
export async function parseApiError(
  response: Response,
  fallbackMessage: string
): Promise<ApiError> {
  let message = fallbackMessage;

  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      message = data.error;
    }
  } catch {
    // Non-JSON body — keep fallback
  }

  return {
    status: response.status,
    title: getErrorTitle(response.status),
    message,
  };
}
