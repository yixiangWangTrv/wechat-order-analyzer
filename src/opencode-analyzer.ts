import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AnalysisResult } from "./types";

const execFileAsync = promisify(execFile);

const PROMPT = `你是一个软件外包需求分析助手。根据以下微信群消息内容，只输出严格 JSON（不要任何其他文字、不要 code block）。

字段：
- summary: string, 一句话需求摘要
- tech_stack: string[], 可选值: 前端/后端/小程序/App/数据库/其他
- infrastructure: string[], 可选值: 服务器/域名/OSS/数据库/第三方API/SSL证书/其他
- estimated_days: number|null, 预估人天，信息不足则为 null
- budget: number|null, 预算金额（元），未提及则为 null
- difficulty: "简单"|"中等"|"复杂"|"待确认"

信息不足时 difficulty 设为"待确认"，estimated_days 设为 null。

消息内容：`;

export async function analyzeWithOpencode(content: string): Promise<AnalysisResult> {
  const fullPrompt = PROMPT + content;

  const { stdout } = await execFileAsync("opencode", ["--print", fullPrompt], {
    timeout: 60000,
    env: { ...process.env },
  });

  // Parse the output - strip any markdown code blocks if present
  let cleaned = stdout.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Try to find JSON in the output
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in opencode output");
  }

  return JSON.parse(jsonMatch[0]) as AnalysisResult;
}
