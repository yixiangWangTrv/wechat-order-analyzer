import { AnalysisResult } from "./types";

const SYSTEM_PROMPT = `你是一个软件外包需求分析助手。根据微信群消息内容，分析并输出严格 JSON（不要包裹在 code block 中）。

字段说明：
- summary: string, 一句话需求摘要
- tech_stack: string[], 可选值: 前端/后端/小程序/App/数据库/其他
- infrastructure: string[], 可选值: 服务器/域名/OSS/数据库/第三方API/SSL证书/其他
- estimated_days: number|null, 预估人天，信息不足则为 null
- budget: number|null, 预算金额（元），未提及则为 null
- difficulty: "简单"|"中等"|"复杂"|"待确认"

信息不足时 difficulty 设为"待确认"，estimated_days 设为 null。`;

export function buildPrompt(content: string): string {
  return `分析以下微信群需求消息，输出包含 summary, tech_stack, infrastructure, estimated_days, budget, difficulty 字段的 JSON：\n\n${content}`;
}

export function parseAnalysisResponse(raw: string): AnalysisResult {
  let cleaned = raw.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  const parsed = JSON.parse(cleaned);
  return parsed as AnalysisResult;
}

export async function analyzeMessage(
  content: string,
  apiKey: string
): Promise<AnalysisResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(content) },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = (await response.json()) as any;
  const rawContent = data.choices[0].message.content;
  return parseAnalysisResponse(rawContent);
}
