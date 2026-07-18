export interface Template {
  name: string;
  country: string;
  language: string;
  template: string;
}

export interface EmailConfig {
  email: string;
  appPass: string;
  active: boolean;
  addedAt: string;
}

export interface AppealHistory {
  id: string;
  number: string;
  email: string;
  templateName: string;
  language: string;
  sentAt: string;
  status: 'pending' | 'sending' | 'delivered' | 'unbanned' | 'rejected' | 'failed';
  statusDetails?: string;
  logs: string[];
}

export interface PremiumKey {
  key: string;
  days: number;
  uses: number;
  usedCount: number;
  createdAt: string;
}

export interface ReferralStat {
  code: string;
  referredBy: string | null;
  referralCount: number;
  leaderboard: { username: string; count: number }[];
}

export interface UserStats {
  userId: string;
  username: string;
  isPremium: boolean;
  premiumExpiry: string | null;
  dailyUsed: number;
  freeLimit: number;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
}
