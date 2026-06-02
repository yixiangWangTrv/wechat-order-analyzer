import { AnalysisResult, IncomingMessage } from "./types";

async function getTenantToken(
  appId: string,
  appSecret: string
): Promise<string> {
  const res = await fetch(
    "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
    }
  );
  const data = (await res.json()) as any;
  if (data.code !== 0) {
    throw new Error(`Feishu auth failed: ${data.msg}`);
  }
  return data.tenant_access_token;
}

export async function writeToFeishu(
  message: IncomingMessage,
  analysis: AnalysisResult,
  env: {
    appId: string;
    appSecret: string;
    appToken: string;
    tableId: string;
  }
): Promise<void> {
  const token = await getTenantToken(env.appId, env.appSecret);

  const fields: Record<string, any> = {
    需求摘要: analysis.summary,
    技术栈: analysis.tech_stack,
    基础设施: analysis.infrastructure,
    预估工作量: analysis.estimated_days,
    预算: analysis.budget,
    难度评级: analysis.difficulty,
    原始消息: message.content,
    消息时间: new Date(message.time).getTime(),
    来源群: message.group,
  };

  const res = await fetch(
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${env.appToken}/tables/${env.tableId}/records`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    }
  );

  const data = (await res.json()) as any;
  if (data.code !== 0) {
    throw new Error(`Feishu write failed: ${data.msg}`);
  }
}
