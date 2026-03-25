import { ApiError, parseApiErrorResponse } from "@/lib/api-error";
import { parseResearchResponse } from "@/lib/validate-report";
import type { ResearchHistoryItem, ResearchResponse } from "@/types/research";

const DEFAULT_BASE = "http://127.0.0.1:8000";

export function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) return DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

export function getHealthUrl(): string {
  return `${getApiBase()}/health`;
}

export async function postResearch(payload: {
  company_name: string;
  force_refresh?: boolean;
}): Promise<ResearchResponse> {
  const res = await fetch(`${getApiBase()}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_name: payload.company_name,
      force_refresh: payload.force_refresh ?? false,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw await parseApiErrorResponse(res);
  const json: unknown = await res.json();
  return parseResearchResponse(json);
}

export async function fetchResearchHistory(
  limit = 20,
): Promise<ResearchHistoryItem[]> {
  try {
    const res = await fetch(
      `${getApiBase()}/research/history/recent?limit=${limit}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const json: unknown = await res.json();
    if (!Array.isArray(json)) return [];
    return json as ResearchHistoryItem[];
  } catch {
    return [];
  }
}

export async function loadMockReport(): Promise<ResearchResponse> {
  const res = await fetch("/mock-research-response.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Mock report not found");
  const json: unknown = await res.json();
  return parseResearchResponse(json);
}

/**
 * Fetch a completed report from cache only (GET /research/{name}).
 * Returns null if none exists within the server TTL (404).
 */
export async function getCachedResearch(
  companyName: string,
): Promise<ResearchResponse | null> {
  const name = companyName.trim();
  if (!name) return null;
  const encoded = encodeURIComponent(name);
  const res = await fetch(`${getApiBase()}/research/${encoded}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw await parseApiErrorResponse(res);
  const json: unknown = await res.json();
  return parseResearchResponse(json);
}

/** Lightweight reachability check for the API (optional UI banner). */
export async function checkApiReachable(): Promise<boolean> {
  try {
    const res = await fetch(getHealthUrl(), { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export { ApiError };
