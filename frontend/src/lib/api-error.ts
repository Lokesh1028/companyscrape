/** Normalized client error for failed API calls. */

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly rawBody?: string;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; rawBody?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options?.code;
    this.rawBody = options?.rawBody;
  }
}

function detailToMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          const loc = "loc" in item ? String((item as { loc?: unknown[] }).loc?.join(".")) : "";
          const msg = String((item as { msg: string }).msg);
          return loc ? `${loc}: ${msg}` : msg;
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return "Request failed";
}

export async function parseApiErrorResponse(res: Response): Promise<ApiError> {
  const raw = await res.text();
  try {
    const j = JSON.parse(raw) as {
      detail?: unknown;
      code?: string;
    };
    const msg = detailToMessage(j.detail ?? raw);
    return new ApiError(res.status, msg || res.statusText, {
      code: j.code,
      rawBody: raw,
    });
  } catch {
    return new ApiError(res.status, raw || res.statusText, { rawBody: raw });
  }
}
