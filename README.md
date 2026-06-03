# 微信接单群智能分析

本地运行的微信接单群消息分析工具。通过 iOS 快捷指令接收消息，opencode 本地分析，结果写入飞书多维表格。

## 架构

```
iOS 快捷指令 → Cloudflare Tunnel → 本地 HTTP 服务 → opencode 分析 → 飞书多维表格
```

## 安装

```bash
npm install
cp .env.example .env
# 编辑 .env 填入你的配置
```

## 运行

```bash
npm start
```

## 公网暴露（用 Cloudflare Tunnel）

```bash
# 安装 cloudflared
brew install cloudflared

# 快速隧道（临时 URL，每次不同）
cloudflared tunnel --url http://localhost:3721

# 或固定域名（需要登录 cloudflare）
cloudflared tunnel login
cloudflared tunnel create wechat-analyzer
cloudflared tunnel route dns wechat-analyzer your-subdomain.your-domain.com
cloudflared tunnel run wechat-analyzer
```

## iOS 快捷指令配置

1. 打开 **快捷指令** App → **自动化** → **创建个人自动化**
2. 触发条件：选择 **通知** → App 选 **微信** → 勾选"包含"，填入接单群名关键词
3. 添加动作：
   - **获取通知的内容**（标题 = 群名，正文 = 消息内容）
   - **获取当前日期** → 格式化为 ISO 8601
   - **URL**: `你的tunnel地址`
   - **获取 URL 的内容**：
     - 方法: POST
     - Headers: `X-Webhook-Token: 你的token`
     - Body (JSON):
       ```json
       {
         "group": "通知标题",
         "content": "通知正文",
         "time": "格式化日期"
       }
       ```
4. 关闭"运行前询问"

## 飞书多维表格配置

创建多维表格，包含以下字段：

| 字段名 | 类型 |
|--------|------|
| 需求摘要 | 文本 |
| 技术栈 | 多选 |
| 基础设施 | 多选 |
| 预估工作量 | 数字 |
| 预算 | 数字 |
| 难度评级 | 单选（简单/中等/复杂/待确认） |
| 原始消息 | 文本 |
| 消息时间 | 日期 |
| 来源群 | 文本 |

将飞书自建应用添加为表格协作者（编辑权限）。
