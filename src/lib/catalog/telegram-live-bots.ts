export type TelegramLiveBot = {
  id: string;
  /** Display name in admin */
  label: string;
  /** Without @ */
  botUsername: string;
  botToken: string;
  /** Telegram chat that receives new booking notices */
  chatId: string;
  /** The one bot that receives booking notices */
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TelegramLiveBotsConfig = {
  bots: TelegramLiveBot[];
};
