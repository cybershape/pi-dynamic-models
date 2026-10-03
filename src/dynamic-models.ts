import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

interface Config {
  baseUrl: string;
  apiKey?: string;
  providerId?: string;
  providerName?: string;
  defaultContextWindow?: number;
  defaultMaxTokens?: number;
}

interface RemoteModelItem {
  id: string;
  name?: string;
  context_window?: number;
  context_length?: number;
  reasoning_efforts?: Array<{ value: string }>;
  supported_in_api?: boolean;
  /** Backend used by the upstream gateway, e.g. "responses" or "chat_completions". */
  api_backend?: string;
}

/**
 * Load configuration from ~/.pi/agent/dynamic-models/config.json or ~/.pi/agents/dynamic-models/config.json
 */
function loadConfig(): Config | null {
  const possiblePaths = [
    path.join(os.homedir(), ".pi", "agent", "dynamic-models", "config.json"),
    path.join(os.homedir(), ".pi", "agents", "dynamic-models", "config.json"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw) as Config;
      } catch (err: any) {
        console.error(`[dynamic-models] Failed to parse config file (${p}): ${err?.message}`);
        return null;
      }
    }
  }

  console.warn(`[dynamic-models] Config file not found: ${possiblePaths[0]}`);
  return null;
}

/**
 * Fetch and register models from remote /models endpoint
 */
async function syncModels(pi: ExtensionAPI): Promise<number> {
  const config = loadConfig();
  if (!config?.baseUrl) return 0;

  const providerId = config.providerId || "dynamic-models";
  const providerName = config.providerName || "Dynamic Models";
  const apiKey = config.apiKey || "dummy-key";
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/models`;
  const defaultContextWindow = config.defaultContextWindow || 400000;
  const defaultMaxTokens = config.defaultMaxTokens || 8192;

  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const payload = (await res.json()) as { data?: RemoteModelItem[] };
    const rawList = Array.isArray(payload?.data) ? payload.data : [];

    const models = rawList
      .filter((m) => m.supported_in_api !== false)
      .map((m) => {
        const contextWindow = m.context_window || m.context_length || defaultContextWindow;
        const useResponsesApi = (m.api_backend || "").toLowerCase() === "responses";

        return {
          id: m.id,
          name: m.name || m.id,
          reasoning: true,
          // Model-level override: upstream gateways that are backed by the Responses API
          // must be called via /responses instead of /chat/completions.
          ...(useResponsesApi && { api: "openai-responses" }),
          thinkingLevelMap: {
            xhigh: "xhigh",
            max: "max",
          },
          input: ["text", "image"] as ("text" | "image")[],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow,
          maxTokens: Math.min(contextWindow, defaultMaxTokens),
          // compat must be placed on each model: registerProvider provider-level config has no compat field,
          // and applyExtension does not merge provider-level configs into models.
          // Without this, reasoning models may send system prompts with developer role and be rejected upstream.
          compat: {
            supportsDeveloperRole: false,
          },
        };
      });

    if (models.length > 0) {
      pi.registerProvider(providerId, {
        name: providerName,
        baseUrl: config.baseUrl,
        apiKey: apiKey,
        api: "openai-completions",
        models,
      });
    }

    return models.length;
  } catch (err: any) {
    console.warn(`[dynamic-models] Failed to sync models: ${err?.message}`);
    return 0;
  }
}

export default async function (pi: ExtensionAPI) {
  // Automatically fetch and register models at startup
  await syncModels(pi);

  // Register slash command for runtime manual refresh
  pi.registerCommand("refresh-models", {
    description: "Re-sync models from ~/.pi/agent/dynamic-models/config.json",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Fetching latest models...", "info");
      const count = await syncModels(pi);
      if (count > 0) {
        ctx.ui.notify(`Sync successful! Registered ${count} model(s).`, "info");
      } else {
        ctx.ui.notify("Failed to fetch models or no valid models found. Please check configuration and network.", "warning");
      }
    },
  });
}
