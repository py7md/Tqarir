export type TicketCategory = 'maintenance' | 'cards' | 'installations' | 'inquiry';

export type TicketStatus = 'new' | 'in_progress' | 'completed' | 'pending' | 'cancelled';

export type MessageSource = 'whatsapp' | 'whatsapp_business' | 'sms' | 'manual';

export interface Ticket {
  id: string;
  senderName: string;
  senderNumber: string;
  messageText: string;
  timestamp: string; // ISO String
  source: MessageSource;
  category: TicketCategory;
  status: TicketStatus;
  extractedUsername?: string | null;
  extractedPassword?: string | null;
  engineerNotes?: string;
  assignedEngineer?: string;
  mergedCount: number;
  lastMergedAt?: string;
}

export interface AppConfig {
  networkName: string;
  engineerName: string;
  engineerPhone: string;
  mergeIntervalSeconds: number;
  modemBypassEnabled: boolean;
  autoExtractMikrotik: boolean;
  isMonitoringActive: boolean;
  playChimeSound: boolean;
  autoReplyTemplate: string;
  darkMode: boolean;
  hasJoined?: boolean;
}

export interface CategoryKeywords {
  maintenance: string[];
  cards: string[];
  installations: string[];
  modemBypass: string[];
}

export interface ReportFilterOptions {
  dateRange: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  categories: TicketCategory[];
  statuses: TicketStatus[];
  searchQuery?: string;
}
