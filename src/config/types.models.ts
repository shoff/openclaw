export type ModelApi =
  | "openai-completions"
  | "openai-responses"
  | "azure-openai-responses"
  | "anthropic-messages"
  | "google-generative-ai"
  | "github-copilot"
  | "bedrock-converse-stream";

export type ModelCompatConfig = {
  supportsStore?: boolean;
  supportsDeveloperRole?: boolean;
  supportsReasoningEffort?: boolean;
  maxTokensField?: "max_completion_tokens" | "max_tokens";
};

export type ModelProviderAuthMode = "api-key" | "aws-sdk" | "oauth" | "token";

export type ModelDefinitionConfig = {
  id: string;
  name: string;
  api?: ModelApi;
  reasoning: boolean;
  input: Array<"text" | "image">;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  contextWindow: number;
  maxTokens: number;
  headers?: Record<string, string>;
  compat?: ModelCompatConfig;
  /** Azure OpenAI deployment name for this specific model. */
  azureDeploymentName?: string;
};

export type ModelProviderConfig = {
  baseUrl: string;
  apiKey?: string;
  auth?: ModelProviderAuthMode;
  api?: ModelApi;
  headers?: Record<string, string>;
  authHeader?: boolean;
  /** Azure OpenAI deployment name (maps model ID to deployment). */
  azureDeploymentName?: string;
  /** Azure OpenAI API version (e.g., "2024-02-15-preview"). */
  azureApiVersion?: string;
  models: ModelDefinitionConfig[];
};

export type BedrockDiscoveryConfig = {
  enabled?: boolean;
  region?: string;
  providerFilter?: string[];
  refreshInterval?: number;
  defaultContextWindow?: number;
  defaultMaxTokens?: number;
};

export type ModelsConfig = {
  mode?: "merge" | "replace";
  providers?: Record<string, ModelProviderConfig>;
  bedrockDiscovery?: BedrockDiscoveryConfig;
};
