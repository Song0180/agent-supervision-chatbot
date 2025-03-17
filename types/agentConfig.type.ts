export interface APIConfig {
  domain: string;
  urlParams: Record<string, string>;
}

export interface ToolConfig {
  target: string;
  type: 'API';
  api: APIConfig;
  name: string;
  description: string;
  schema: {
    type: string;
    properties: Record<string, { type: string; description: string }>;
  };
}

export interface AIConfig {
  llmProvider: string;
  model: string;
  temperature: number;
  baseUrl: string;
}

export interface WorkerConfig extends AIConfig {
  name: string;
  systemMessage: string;
  tools: string[];
}

export interface OrchestrationConfig {
  supervisor: AIConfig;
  workers: WorkerConfig[];
  customTools: ToolConfig[];
}
