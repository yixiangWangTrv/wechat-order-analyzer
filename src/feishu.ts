import { exec } from "node:child_process";
import { promisify } from "node:util";
import { AnalysisResult, IncomingMessage } from "./types";

const execAsync = promisify(exec);

function getBaseToken() { return process.env.FEISHU_BITABLE_APP_TOKEN || ""; }
function getTableId() { return process.env.FEISHU_BITABLE_TABLE_ID || ""; }

export async function writeToFeishu(
  message: IncomingMessage,
  analysis: AnalysisResult
): Promise<void> {
  const fields: Record<string, any> = {
    需求摘要: analysis.summary,
    技术栈: analysis.tech_stack,
    基础设施: analysis.infrastructure,
    预估人天: analysis.estimated_days,
    "预算(元)": analysis.budget,
    难度: analysis.difficulty,
    原始消息: message.content,
    消息时间: new Date(message.time).getTime(),
    来源群: message.group,
  };

  // Remove null/undefined values
  for (const key of Object.keys(fields)) {
    if (fields[key] == null) delete fields[key];
  }

  const json = JSON.stringify(fields);
  const escaped = json.replace(/'/g, "'\\''");

  const { stdout } = await execAsync(
    `lark-cli base +record-upsert --as bot --base-token '${getBaseToken()}' --table-id '${getTableId()}' --json '${escaped}'`,
    { timeout: 30000 }
  );

  const result = JSON.parse(stdout);
  if (!result.ok) {
    throw new Error(`Feishu write failed: ${JSON.stringify(result.error)}`);
  }
}
