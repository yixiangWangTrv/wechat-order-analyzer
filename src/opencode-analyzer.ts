import { AnalysisResult } from "./types";

const OPENCODE_PORT = process.env.OPENCODE_PORT || "63204";
const OPENCODE_PASSWORD = process.env.OPENCODE_SERVER_PASSWORD || "";
const OPENCODE_BASE = `http://127.0.0.1:${OPENCODE_PORT}`;

const PROMPT = `你是一个软件外包需求分析助手。根据以下微信群消息内容，只输出严格 JSON（不要任何其他文字、不要 code block、不要解释）。

字段：
- summary: string, 一句话需求摘要
- tech_stack: string[], 可选值: 前端/后端/小程序/App/数据库/其他
- infrastructure: string[], 可选值: 服务器/域名/OSS/数据库/第三方API/SSL证书/其他
- estimated_days: number|null, 预估人天，信息不足则为 null
- budget: number|null, 预算金额（元），未提及则为 null
- difficulty: "简单"|"中等"|"复杂"|"待确认"

信息不足时 difficulty 设为"待确认"，estimated_days 设为 null。

消息内容：`;

function authHeader(): string {
  return "Basic " + Buffer.from(`opencode:${OPENCODE_PASSWORD}`).toString("base64");
}

async function createSession(): Promise<string> {
  const res = await fetch(`${OPENCODE_BASE}/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  const data = (await res.json()) as any;
  return data.id;
}

async function sendMessage(sessionId: string, text: string): Promise<string> {
  const res = await fetch(`${OPENCODE_BASE}/session/${sessionId}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      parts: [{ type: "text", text }],
    }),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  const data = (await res.json()) as any;

  // Extract text from response
  if (data.info && data.parts) {
    const textParts = data.parts.filter((p: any) => p.type === "text");
    return textParts.map((p: any) => p.text).join("\n");
  }
  // Fallback: try to get raw text
  return JSON.stringify(data);
}

export async function analyzeWithOpencode(content: string): Promise<AnalysisResult> {
  const fullPrompt = PROMPT + content;

  const sessionId = await createSession();
  const reply = await sendMessage(sessionId, fullPrompt);

  // Parse the output - strip any markdown code blocks if present
  let cleaned = reply.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Try to find JSON in the output
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in opencode output: ${cleaned.slice(0, 200)}`);
  }

  return JSON.parse(jsonMatch[0]) as AnalysisResult;
}
