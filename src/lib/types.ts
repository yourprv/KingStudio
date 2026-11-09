export type FileKind = "file" | "folder";

export type FileOp = {
  action: "created" | "updated" | "deleted" | "unchanged";
  path: string;
  language?: string;
};

export type MessageMeta = {
  plan?: string[];
  files?: FileOp[];
  provider?: string;
  model?: string;
  tokens?: number;
  durationMs?: number;
  note?: string;
  pendingBuild?: {
    name: string;
    summary: string;
    stack: string;
    manifest: Array<{ path: string; language: string; purpose: string }>;
    remaining: Array<{ path: string; language: string; purpose: string }>;
  };
};

export type WorkspaceFile = {
  id: string;
  path: string;
  name: string;
  kind: FileKind;
  language: string;
  content: string;
  storagePath: string | null;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  kind: "text" | "plan" | "files";
  meta: MessageMeta | null;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  prompt: string;
  summary: string;
  stack: string;
  status: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
};

export type ProjectDetail = {
  project: Project;
  files: WorkspaceFile[];
  messages: ChatMessage[];
};

export type EngineConfig = {
  provider: "opal" | "local-engine";
  configured: boolean;
  model: string;
  rpm: number;
  tpm: number;
  rpd: number;
  storage: {
    provider: "supabase" | "postgres";
    bucket: string;
    configured: boolean;
  };
  hint: string;
};

export type RateSnapshot = {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number;
};

export type QuotaSnapshot = {
  rate: RateSnapshot;
  daily: RateSnapshot;
  tokens: RateSnapshot;
};

export type CreditSnapshot = {
  granted: number;
  balance: number;
  used: number;
  requestsUsed: number;
  requestCost: number;
};

export type GeneratedFile = {
  path: string;
  content: string;
  language: string;
};

export type AgentRunResult = {
  reply: string;
  plan: string[];
  files: GeneratedFile[];
  stack: string;
  summary: string;
  name: string;
  projectName?: string;
};
