export interface IncomingMessage {
  group: string;
  content: string;
  time: string;
}

export interface AnalysisResult {
  summary: string;
  tech_stack: string[];
  infrastructure: string[];
  estimated_days: number | null;
  budget: number | null;
  difficulty: "简单" | "中等" | "复杂" | "待确认";
}

export interface Env {
  WEBHOOK_TOKEN: string;
  LLM_API_KEY: string;
  FEISHU_APP_ID: string;
  FEISHU_APP_SECRET: string;
  FEISHU_BITABLE_APP_TOKEN: string;
  FEISHU_BITABLE_TABLE_ID: string;
}
