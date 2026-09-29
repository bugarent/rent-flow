export type TelegramLiveBot = {
  id: string;
  /** Display name in admin */
  label: string;
  /** Without @ */
  botUsername: string;
  botToken: string;
  /** Telegram chat/group that receives live-chat handoffs */
  chatId: string;
  /** Only one bot may be active for live-chat notifications */
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TelegramLiveBotsConfig = {
  bots: TelegramLiveBot[];
};
