import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  fetchStudioAgents,
  fetchAllStudioSessions,
  fetchStudioSession,
} from "@/lib/studio-api";

function mockResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("Studio API Client", () => {
  describe("Agents", () => {
    it("fetchStudioAgents returns agents list", async () => {
      const agents = [{ id: "alice", display_name: "Alice" }];
      mockResponse(agents);

      const result = await fetchStudioAgents();
      expect(result).toEqual(agents);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/studio/agents",
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    it("fetchStudioAgents with filters", async () => {
      mockResponse([]);

      await fetchStudioAgents({ status: "active", domain: "math" });
      expect(mockFetch.mock.calls[0][0]).toContain("status=active");
      expect(mockFetch.mock.calls[0][0]).toContain("domain=math");
    });
  });

  describe("Sessions", () => {
    it("fetchAllStudioSessions returns list", async () => {
      mockResponse([{ id: "s1", agent_id: "alice" }]);

      const result = await fetchAllStudioSessions();
      expect(result[0].agent_id).toBe("alice");
    });

    it("fetchStudioSession returns detail", async () => {
      mockResponse({ id: "s1", agent_id: "alice" });

      const result = await fetchStudioSession("s1");
      expect(result.id).toBe("s1");
      expect(mockFetch.mock.calls[0][0]).toBe("/api/studio/agents/sessions/s1");
    });
  });
});
