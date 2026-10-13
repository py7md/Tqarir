import { Ticket, AppConfig, CategoryKeywords } from '../types';
import { DEFAULT_KEYWORDS } from './messageExtractor';

const STORAGE_KEYS = {
  TICKETS: 'taqareer_tickets_v1',
  CONFIG: 'taqareer_config_v1',
  KEYWORDS: 'taqareer_keywords_v1',
};

export const DEFAULT_CONFIG: AppConfig = {
  networkName: 'شبكة الدحشة الحديثة',
  engineerName: 'م/عبدالمجيد',
  engineerPhone: '771141160',
  mergeIntervalSeconds: 120,
  modemBypassEnabled: true,
  autoExtractMikrotik: true,
  isMonitoringActive: true,
  playChimeSound: true,
  autoReplyTemplate: 'وصلنا بلاغك، وفريق الشبكة سيتابع معك قريبًا. شكرًا لثقتك.',
  darkMode: false,
  hasJoined: false,
};

// Initial realistic tickets to populate the system
const INITIAL_DEMO_TICKETS: Ticket[] = [
  {
    id: 'tkt-1710001001-101',
    senderName: 'أحمد الشميري (بقالة النور)',
    senderNumber: '771452390',
    messageText: 'السلام عليكم يا مهندس، الشبكة خاربه من الصبح وسلك البث طافي وما تفتح صفحة الشبكة خالص.',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    source: 'whatsapp',
    category: 'maintenance',
    status: 'new',
    extractedUsername: null,
    extractedPassword: null,
    mergedCount: 1,
  },
  {
    id: 'tkt-1710001002-102',
    senderName: 'محمد هزاع الكرت',
    senderNumber: '733918274',
    messageText: 'لو سمحت الكرت مايدخل يوزر 492015 باسورد 2233 ويكتب لي خطأ في تسجيل الدخول مع ان الرصيد جديد.',
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    source: 'whatsapp',
    category: 'cards',
    status: 'in_progress',
    extractedUsername: '492015',
    extractedPassword: '2233',
    engineerNotes: 'تم التحقق من سيرفر المايكروتك، اليوزر كان معلق وتم عمل ريست له.',
    assignedEngineer: 'م. فاروق الصبري',
    mergedCount: 2,
    lastMergedAt: new Date(Date.now() - 1000 * 60 * 105).toISOString(),
  },
  {
    id: 'tkt-1710001003-103',
    senderName: 'أبو ريان - استراحة السعادة',
    senderNumber: '711823901',
    messageText: 'اشتي مودم تيبلنك جديد مع التمديد والسلم، الصندوق القديم محروق وما يوصل باور للمحطة.',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    source: 'whatsapp_business',
    category: 'installations',
    status: 'pending',
    extractedUsername: null,
    extractedPassword: null,
    mergedCount: 1,
  },
  {
    id: 'tkt-1710001004-104',
    senderName: 'صيدلية الشفاء',
    senderNumber: '777654321',
    messageText: 'الكرت 7821943 معلق في النظام ما يكمل التحميل ويخرج فجأة.',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    source: 'sms',
    category: 'cards',
    status: 'completed',
    extractedUsername: '7821943',
    extractedPassword: null,
    engineerNotes: 'تم تفعيل كرت بديل وتحديث الماك أدرس.',
    mergedCount: 1,
  },
  {
    id: 'tkt-1710001005-105',
    senderName: 'حسام العديني',
    senderNumber: '773112233',
    messageText: 'السلك مقطوع بسبب شاحنة مرت من الحارة، والكيبل متدلي في الشارع وطافي النت تماماً.',
    timestamp: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    source: 'whatsapp',
    category: 'maintenance',
    status: 'in_progress',
    engineerNotes: 'تم خروج فني الصيانة ومعه بكرة سلك 60 متر وملاقط وصل.',
    assignedEngineer: 'م. فاروق الصبري',
    mergedCount: 1,
  }
];

export const StorageService = {
  getTickets(): Ticket[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TICKETS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(INITIAL_DEMO_TICKETS));
        return INITIAL_DEMO_TICKETS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_DEMO_TICKETS;
    }
  },

  saveTickets(tickets: Ticket[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
    } catch (e) {
      console.error('Failed to save tickets', e);
    }
  },

  addOrUpdateTicket(ticket: Ticket): Ticket[] {
    const tickets = this.getTickets();
    const index = tickets.findIndex((t) => t.id === ticket.id);
    let updated: Ticket[];
    if (index >= 0) {
      updated = [...tickets];
      updated[index] = ticket;
    } else {
      updated = [ticket, ...tickets];
    }
    this.saveTickets(updated);
    return updated;
  },

  deleteTicket(id: string): Ticket[] {
    const tickets = this.getTickets();
    const updated = tickets.filter((t) => t.id !== id);
    this.saveTickets(updated);
    return updated;
  },

  getConfig(): AppConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
        return DEFAULT_CONFIG;
      }
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
      return DEFAULT_CONFIG;
    }
  },

  saveConfig(config: AppConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save config', e);
    }
  },

  getKeywords(): CategoryKeywords {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.KEYWORDS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.KEYWORDS, JSON.stringify(DEFAULT_KEYWORDS));
        return DEFAULT_KEYWORDS;
      }
      const parsed = JSON.parse(data);
      const merged: CategoryKeywords = {
        maintenance: Array.from(new Set([...DEFAULT_KEYWORDS.maintenance, ...(parsed.maintenance || [])])),
        cards: Array.from(new Set([...DEFAULT_KEYWORDS.cards, ...(parsed.cards || [])])),
        installations: Array.from(new Set([...DEFAULT_KEYWORDS.installations, ...(parsed.installations || [])])),
        modemBypass: Array.from(new Set([...DEFAULT_KEYWORDS.modemBypass, ...(parsed.modemBypass || [])])),
      };
      return merged;
    } catch {
      return DEFAULT_KEYWORDS;
    }
  },

  saveKeywords(keywords: CategoryKeywords): void {
    try {
      localStorage.setItem(STORAGE_KEYS.KEYWORDS, JSON.stringify(keywords));
    } catch (e) {
      console.error('Failed to save keywords', e);
    }
  },

  exportBackup(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tickets: this.getTickets(),
      config: this.getConfig(),
      keywords: this.getKeywords(),
    };
    return JSON.stringify(data, null, 2);
  },

  importBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.tickets)) {
        this.saveTickets(parsed.tickets);
      }
      if (parsed.config && typeof parsed.config === 'object') {
        this.saveConfig({ ...DEFAULT_CONFIG, ...parsed.config });
      }
      if (parsed.keywords && typeof parsed.keywords === 'object') {
        this.saveKeywords(parsed.keywords);
      }
      return true;
    } catch (err) {
      console.error('Invalid backup JSON', err);
      return false;
    }
  },

  resetToDefault(): void {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(INITIAL_DEMO_TICKETS));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
    localStorage.setItem(STORAGE_KEYS.KEYWORDS, JSON.stringify(DEFAULT_KEYWORDS));
  }
};
