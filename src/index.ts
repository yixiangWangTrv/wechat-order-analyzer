import { Env, IncomingMessage } from "./types";
import { shouldProcess } from "./filter";
import { analyzeMessage } from "./analyzer";
import { writeToFeishu } from "./feishu";

export function validateRequest(
  token: string | null,
  expected: string
): boolean {
  return token === expected;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const authToken = request.headers.get("X-Webhook-Token");
    if (!validateRequest(authToken, env.WEBHOOK_TOKEN)) {
      return new Response("Unauthorized", { status: 401 });
    }

    let message: IncomingMessage;
    try {
      message = (await request.json()) as IncomingMessage;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!message.content || !message.group || !message.time) {
      return new Response("Missing fields", { status: 400 });
    }

    if (!shouldProcess(message.content)) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const analysis = await analyzeMessage(message.content, env.LLM_API_KEY);

      await writeToFeishu(message, analysis, {
        appId: env.FEISHU_APP_ID,
        appSecret: env.FEISHU_APP_SECRET,
        appToken: env.FEISHU_BITABLE_APP_TOKEN,
        tableId: env.FEISHU_BITABLE_TABLE_ID,
      });

      return new Response(JSON.stringify({ ok: true, analysis }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
