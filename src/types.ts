export type Role = 'user' | 'admin';
export type MatchStatus = 'open' | 'betting_closed' | 'finished';
export type BetStatus = 'confirmed' | 'pending';
export type TransactionType = 'deposit' | 'withdrawal' | 'bet' | 'prize';
export type TransactionStatus = 'pending' | 'confirmed' | 'rejected';

export interface UserProfile {
  id: string; // Document ID
  email: string;
  name: string;
  phone?: string; // Optional per Firebase blueprint
  pix_key?: string; // Optional
  balance: number;
  role: Role;
  createdAt: string;
}

export interface Match {
  id: string; // Document ID
  team1: string;
  team2: string;
  flag1: string;
  flag2: string;
  date: string;
  status: MatchStatus;
  result1?: number;
  result2?: number;
  poolTotal: number;
}

export interface Bet {
  id: string;
  userId: string;
  userName: string;
  matchId: string;
  predicted1: number;
  predicted2: number;
  amount: number;
  status: BetStatus;
  createdAt: string;
  is_winner?: boolean;
  prize_collected?: number;
  points?: number; // 5, 3, 1, or 0 based on results
  paid?: boolean; // Track if the bet value has been deducted
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  timestamp: string;
}
