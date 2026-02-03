import { describe, expect, it, vi } from "vitest";

vi.mock("../pi-model-discovery.js", () => ({
  discoverAuthStorage: vi.fn(() => ({ mocked: true })),
  discoverModels: vi.fn(() => ({ find: vi.fn(() => null) })),
}));

import type { OpenClawConfig } from "../../config/config.js";
import { buildInlineProviderModels, resolveModel } from "./model.js";

const makeModel = (id: string) => ({
  id,
  name: id,
  reasoning: false,
  input: ["text"] as const,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 1,
  maxTokens: 1,
});

describe("buildInlineProviderModels", () => {
  it("attaches provider ids to inline models", () => {
    const providers = {
      " alpha ": { baseUrl: "http://alpha.local", models: [makeModel("alpha-model")] },
      beta: { baseUrl: "http://beta.local", models: [makeModel("beta-model")] },
    };

    const result = buildInlineProviderModels(providers);

    expect(result).toEqual([
      {
        ...makeModel("alpha-model"),
        provider: "alpha",
        baseUrl: "http://alpha.local",
        api: undefined,
      },
      {
        ...makeModel("beta-model"),
        provider: "beta",
        baseUrl: "http://beta.local",
        api: undefined,
      },
    ]);
  });

  it("inherits baseUrl from provider when model does not specify it", () => {
    const providers = {
      custom: {
        baseUrl: "http://localhost:8000",
        models: [makeModel("custom-model")],
      },
    };

    const result = buildInlineProviderModels(providers);

    expect(result).toHaveLength(1);
    expect(result[0].baseUrl).toBe("http://localhost:8000");
  });

  it("inherits api from provider when model does not specify it", () => {
    const providers = {
      custom: {
        baseUrl: "http://localhost:8000",
        api: "anthropic-messages",
        models: [makeModel("custom-model")],
      },
    };

    const result = buildInlineProviderModels(providers);

    expect(result).toHaveLength(1);
    expect(result[0].api).toBe("anthropic-messages");
  });

  it("model-level api takes precedence over provider-level api", () => {
    const providers = {
      custom: {
        baseUrl: "http://localhost:8000",
        api: "openai-responses",
        models: [{ ...makeModel("custom-model"), api: "anthropic-messages" as const }],
      },
    };

    const result = buildInlineProviderModels(providers);

    expect(result).toHaveLength(1);
    expect(result[0].api).toBe("anthropic-messages");
  });

  it("inherits both baseUrl and api from provider config", () => {
    const providers = {
      custom: {
        baseUrl: "http://localhost:10000",
        api: "anthropic-messages",
        models: [makeModel("claude-opus-4.5")],
      },
    };

    const result = buildInlineProviderModels(providers);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      provider: "custom",
      baseUrl: "http://localhost:10000",
      api: "anthropic-messages",
      name: "claude-opus-4.5",
    });
  });
});

describe("resolveModel", () => {
  it("includes provider baseUrl in fallback model", () => {
    const cfg = {
      models: {
        providers: {
          custom: {
            baseUrl: "http://localhost:9000",
            models: [],
          },
        },
      },
    } as OpenClawConfig;

    const result = resolveModel("custom", "missing-model", "/tmp/agent", cfg);

    expect(result.model?.baseUrl).toBe("http://localhost:9000");
    expect(result.model?.provider).toBe("custom");
    expect(result.model?.id).toBe("missing-model");
  });

  it("defaults azure-openai provider to azure-openai-responses api", () => {
    const cfg = {
      models: {
        providers: {
          "azure-openai": {
            baseUrl: "https://myresource.openai.azure.com",
            models: [],
          },
        },
      },
    } as OpenClawConfig;

    const result = resolveModel("azure-openai", "gpt-4o", "/tmp/agent", cfg);

    expect(result.model?.api).toBe("azure-openai-responses");
    expect(result.model?.baseUrl).toBe("https://myresource.openai.azure.com");
    expect(result.model?.provider).toBe("azure-openai");
  });

  it("includes azure-specific fields in fallback model", () => {
    const cfg = {
      models: {
        providers: {
          "azure-openai": {
            baseUrl: "https://myresource.openai.azure.com",
            azureDeploymentName: "my-gpt4o-deployment",
            azureApiVersion: "2024-02-15-preview",
            models: [],
          },
        },
      },
    } as OpenClawConfig;

    const result = resolveModel("azure-openai", "gpt-4o", "/tmp/agent", cfg);

    expect(result.model?.api).toBe("azure-openai-responses");
    expect((result.model as Record<string, unknown>)?.azureDeploymentName).toBe(
      "my-gpt4o-deployment",
    );
    expect((result.model as Record<string, unknown>)?.azureApiVersion).toBe("2024-02-15-preview");
  });
});

describe("buildInlineProviderModels - Azure support", () => {
  it("inherits azure-specific fields from provider config", () => {
    const providers = {
      "azure-openai": {
        baseUrl: "https://myresource.openai.azure.com",
        api: "azure-openai-responses",
        azureDeploymentName: "my-deployment",
        azureApiVersion: "2024-02-15-preview",
        models: [makeModel("gpt-4o")],
      },
    };

    const result = buildInlineProviderModels(providers as never);

    expect(result).toHaveLength(1);
    expect(result[0].azureDeploymentName).toBe("my-deployment");
    expect(result[0].azureApiVersion).toBe("2024-02-15-preview");
  });

  it("model-level azureDeploymentName takes precedence over provider-level", () => {
    const providers = {
      "azure-openai": {
        baseUrl: "https://myresource.openai.azure.com",
        api: "azure-openai-responses",
        azureDeploymentName: "provider-deployment",
        azureApiVersion: "2024-02-15-preview",
        models: [{ ...makeModel("gpt-4o"), azureDeploymentName: "model-deployment" }],
      },
    };

    const result = buildInlineProviderModels(providers as never);

    expect(result).toHaveLength(1);
    expect(result[0].azureDeploymentName).toBe("model-deployment");
    expect(result[0].azureApiVersion).toBe("2024-02-15-preview");
  });
});
