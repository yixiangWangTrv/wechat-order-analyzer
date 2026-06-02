const REJECT_PATTERNS = [
  /^你撤回了一条消息$/,
  /^\[图片\]$/,
  /^\[动画表情\]$/,
  /^\[表情\]$/,
  /^\[视频\]$/,
  /^\[语音\]$/,
  /^\[有\d+条新消息\]$/,
  /^——.*加入了群聊$/,
  /^".*"邀请".*"加入了群聊$/,
];

export function shouldProcess(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  return !REJECT_PATTERNS.some((pattern) => pattern.test(trimmed));
}
