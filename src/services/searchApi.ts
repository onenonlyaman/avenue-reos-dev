import { ApiResponseEnvelope } from "./authApi";
import { SearchScope } from "@/lib/searchParser";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: "MODULE" | "RECORD" | "ACTION" | "AI_RESPONSE" | "HITL_APPROVAL";
  href?: string;
  detailPayload?: {
    entityType: string;
    entityName: string;
    status: string;
    metadata: Record<string, unknown>;
  };
}

const API_BASE = "/api/v1/search";

async function fetchEnvelope<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    "X-Tenant-ID": ACTIVE_TENANT_ID,
    "X-Request-ID": `req-${Date.now()}`,
    ...(options?.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const envelope: ApiResponseEnvelope<T> = await response.json();

  if (!envelope.success || envelope.error) {
    throw new Error(envelope.error?.message || `Search request failed with status ${envelope.status_code}`);
  }

  return envelope.data || ([] as unknown as T);
}

export const searchApi = {
  async executeSearch(query: string, scope: SearchScope, signal?: AbortSignal): Promise<SearchResultItem[]> {
    const encoded = encodeURIComponent(query);
    return fetchEnvelope<SearchResultItem[]>(`${API_BASE}?q=${encoded}&scope=${scope}`, { signal });
  },

  async executeAiPrompt(prompt: string, signal?: AbortSignal): Promise<SearchResultItem[]> {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return [];
    }

    const response = await fetch("/api/v1/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `ai-req-${Date.now()}`,
        method: "tools/call",
        params: {
          name: "mcp_search_ai_query",
          arguments: { prompt: trimmed },
        },
      }),
    });

    const json = await response.json();

    if (json.error && json.error.message && json.error.message.includes("HITL_APPROVAL_REQUIRED")) {
      return [
        {
          id: `hitl-${Date.now()}`,
          title: `Governance Safeguard: ${trimmed}`,
          subtitle: "Action requires executive director authorization before execution",
          category: "HITL_APPROVAL",
          detailPayload: {
            entityType: "Governance Safeguard",
            entityName: trimmed,
            status: "PENDING_APPROVAL",
            metadata: {
              requiresHitl: true,
              justification: "Autonomous prompt requires human confirmation",
            },
          },
        },
      ];
    }

    return [
      {
        id: `ai-${Date.now()}`,
        title: `AI Intelligence Advisory: "${trimmed}"`,
        subtitle: json.result?.output || "Processed prompt across connected microservices",
        category: "AI_RESPONSE",
        detailPayload: {
          entityType: "MCP Microservice Analysis",
          entityName: trimmed,
          status: "SUCCESS",
          metadata: {
            resultText: json.result?.output || "Analysis completed",
            timestamp: new Date().toISOString(),
          },
        },
      },
    ];
  },
};
