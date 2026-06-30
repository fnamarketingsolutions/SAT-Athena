/**
 * Studio Agent Registry API client.
 * All calls go through Next.js API routes which proxy to the agents backend.
 */

import type {
  StudioAgent,
  StudioSessionDetail,
  StudioSessionSummary,
} from "@/types/studio";

const BASE = "/api/studio/agents";

async function studioFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Studio API error: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function fetchStudioAgents(params?: {
  status?: string;
  domain?: string;
}): Promise<StudioAgent[]> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.domain) sp.set("domain", params.domain);
  const qs = sp.toString();
  return studioFetch<StudioAgent[]>(`${BASE}${qs ? `?${qs}` : ""}`);
}

export async function fetchAllStudioSessions(params?: { limit?: number; offset?: number }): Promise<StudioSessionSummary[]> {
  const sp = new URLSearchParams();
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return studioFetch<StudioSessionSummary[]>(`/api/studio/sessions${qs ? `?${qs}` : ""}`);
}

export async function fetchStudioSession(sessionId: string): Promise<StudioSessionDetail> {
  return studioFetch<StudioSessionDetail>(`${BASE}/sessions/${sessionId}`);
}
