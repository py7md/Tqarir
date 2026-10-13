import { Ticket, TicketCategory, MessageSource, CategoryKeywords } from '../types';

export const DEFAULT_KEYWORDS: CategoryKeywords = {
  maintenance: [
    'الشبكه', 'خربان', 'خربانه', 'خربت', 'سلك', 'مقطوع', 'طافي', 'صلحوها', 'صلحها', 'سبروها',
    'ضعيفه', 'ضعيف', 'ضعيف قوي', 'معلق', 'تفصل', 'يفصل', 'تقطع', 'تقطوع', 'ما ترتبط', 'ماترتبط',
    'البث', 'المباشر', 'الانترنت', 'النت', 'بطيء', 'بنق', 'التغطية', 'الاشارة', 'محروق', 'الكيبل',
    'المحطة', 'لايتوفر', 'طافية', 'انقطع', 'فصلت', 'الموجه', 'الموجة', 'خاربه', 'خارب', 'خاربات'
  ],
  cards: [
    'كرت', 'كروت', 'يوزر', 'باسورد', 'الدخشه', 'الدحشه', 'رصيد', 'الكرت مايدخل',
    'تسجيل الدخول', 'صفحة الشبكة', 'يكمل', 'خلص', 'شحن', 'تعبئة', 'رقم الكرت', 'تجديد', 'كود'
  ],
  installations: [
    'اشتي مودم', 'ركبو لي مودم', 'ركبلي مودم', 'المودم', 'كميه', 'كمبه', 'سلم', 'صندوق',
    'ال جي', 'فايبر', 'فايكوم', 'تيبلينك', 'تيبلنك', 'انتهينا', 'انتينا', 'مايكروتك',
    'يوبيكويتي', 'مبرمج', 'تركيب', 'تمديد', 'مودمكم', 'شبكتكم', 'شبكتم'
  ],
  modemBypass: [
    'مودم', 'نقطة', 'بث', 'برج', 'الاستراحه', 'كافيه', 'صيدلية', 'محل'
  ]
};

// In-memory cache for the 120-second merge rule
interface CachedTicket {
  ticket: Ticket;
  lastMessageTime: number; // millisecond timestamp
}

const recentTicketsCache = new Map<string, CachedTicket>();

export class MessageExtractorService {
  private keywords: CategoryKeywords;
  private mergeIntervalSeconds: number;
  private modemBypassEnabled: boolean;
  private autoExtractMikrotik: boolean;

  constructor(
    keywords: CategoryKeywords = DEFAULT_KEYWORDS,
    mergeIntervalSeconds: number = 120,
    modemBypassEnabled: boolean = true,
    autoExtractMikrotik: boolean = true
  ) {
    this.keywords = keywords;
    this.mergeIntervalSeconds = mergeIntervalSeconds;
    this.modemBypassEnabled = modemBypassEnabled;
    this.autoExtractMikrotik = autoExtractMikrotik;
  }

  public updateConfig(
    keywords: CategoryKeywords,
    mergeIntervalSeconds: number,
    modemBypassEnabled: boolean,
    autoExtractMikrotik: boolean
  ) {
    this.keywords = keywords;
    this.mergeIntervalSeconds = mergeIntervalSeconds;
    this.modemBypassEnabled = modemBypassEnabled;
    this.autoExtractMikrotik = autoExtractMikrotik;
  }

  /**
   * 1. Modem Bypass check
   */
  public isModemBypass(senderName: string, text: string): boolean {
    if (!this.modemBypassEnabled) return false;
    const nameLower = senderName.toLowerCase();
    const textLower = text.toLowerCase();
    return this.keywords.modemBypass.some(
      (keyword) => nameLower.includes(keyword) || textLower.includes(keyword)
    );
  }

  /**
   * 2. Strict Filter check
   */
  public passesStrictFilter(message: string): boolean {
    const textLower = message.toLowerCase();
    const allKeywords = [
      ...this.keywords.maintenance,
      ...this.keywords.cards,
      ...this.keywords.installations
    ];
    return allKeywords.some((keyword) => textLower.includes(keyword.toLowerCase()));
  }

  /**
   * 3. Intelligent Classification
   */
  public classifyCategory(text: string, senderName: string = ''): TicketCategory {
    const combined = `${senderName} ${text}`.toLowerCase();

    // Check installations first (installations have very specific hardware triggers)
    for (const kw of this.keywords.installations) {
      if (combined.includes(kw.toLowerCase())) return 'installations';
    }

    // Check cards next
    for (const kw of this.keywords.cards) {
      if (combined.includes(kw.toLowerCase())) return 'cards';
    }

    // Check maintenance
    for (const kw of this.keywords.maintenance) {
      if (combined.includes(kw.toLowerCase())) return 'maintenance';
    }

    // Fallback if bypass was active
    if (this.isModemBypass(senderName, text)) {
      return 'installations';
    }

    return 'maintenance';
  }

  /**
   * 4. Mikrotik & Network Credential Extraction
   */
  public extractCredentials(text: string): { username: string | null; password: string | null } {
    if (!this.autoExtractMikrotik) {
      return { username: null, password: null };
    }

    let username: string | null = null;
    let password: string | null = null;

    // Regex for Username (Arabic & English labels)
    const userRegEx = /(?:يوزر|مستخدم|رقم الكرت|اسم المستخدم|user|usr)[:\s-]*([a-zA-Z0-9_-]+)/i;
    const userMatch = text.match(userRegEx);
    if (userMatch && userMatch[1]) {
      username = userMatch[1].trim();
    }

    // Regex for Password
    const passRegEx = /(?:باسورد|كلمة المرور|الرمز|سر|pass|password|pwd)[:\s-]*([a-zA-Z0-9@#_-]+)/i;
    const passMatch = text.match(passRegEx);
    if (passMatch && passMatch[1]) {
      password = passMatch[1].trim();
    }

    // Smart deduction: If message is standalone digits (6 to 10 digits typical for Mikrotik scratch cards)
    if (!username) {
      const pureDigitsMatch = text.trim().match(/^([0-9]{6,10})$/);
      if (pureDigitsMatch && pureDigitsMatch[1]) {
        username = pureDigitsMatch[1];
      }
    }

    return { username, password };
  }

  /**
   * 5. Core Incoming Message Processor with 120-Second Merge Rule
   */
  public processIncomingMessage(params: {
    senderName: string;
    senderNumber: string;
    message: string;
    source: MessageSource;
    existingTickets?: Ticket[];
  }): { ticket: Ticket; isMerged: boolean } | null {
    const { senderName, senderNumber, message, source, existingTickets = [] } = params;

    const trimmedMsg = message.trim();
    if (!trimmedMsg) return null;

    const isAccepted = this.isModemBypass(senderName, trimmedMsg) || this.passesStrictFilter(trimmedMsg);
    if (!isAccepted) {
      // Ignored silently as per requirements
      return null;
    }

    const now = Date.now();
    const cleanNumber = senderNumber.replace(/[^0-9]/g, '');

    // Check if recent ticket exists in memory cache OR in existingTickets from storage
    let cached = recentTicketsCache.get(cleanNumber);
    if (!cached) {
      const existing = existingTickets.find((t) => t.senderNumber.replace(/[^0-9]/g, '') === cleanNumber);
      if (existing) {
        const ticketTime = new Date(existing.timestamp).getTime();
        if (now - ticketTime <= this.mergeIntervalSeconds * 1000) {
          cached = { ticket: existing, lastMessageTime: ticketTime };
          recentTicketsCache.set(cleanNumber, cached);
        }
      }
    }

    // Apply the 120-Second Merge Rule
    if (cached) {
      const diffSeconds = (now - cached.lastMessageTime) / 1000;
      if (diffSeconds <= this.mergeIntervalSeconds) {
        // Merge with existing ticket
        const existingTicket = cached.ticket;
        existingTicket.messageText = `${existingTicket.messageText}\n${trimmedMsg}`;
        existingTicket.timestamp = new Date(now).toISOString();
        existingTicket.lastMergedAt = new Date(now).toISOString();
        existingTicket.mergedCount = (existingTicket.mergedCount || 1) + 1;

        // Re-classify and re-extract credentials from merged content
        const credentials = this.extractCredentials(existingTicket.messageText);
        if (credentials.username) existingTicket.extractedUsername = credentials.username;
        if (credentials.password) existingTicket.extractedPassword = credentials.password;

        const updatedCategory = this.classifyCategory(existingTicket.messageText, existingTicket.senderName);
        existingTicket.category = updatedCategory;

        cached.lastMessageTime = now;
        return { ticket: existingTicket, isMerged: true };
      }
    }

    // New Ticket creation
    const category = this.classifyCategory(trimmedMsg, senderName);
    const credentials = this.extractCredentials(trimmedMsg);

    const newTicket: Ticket = {
      id: `tkt-${now}-${Math.floor(Math.random() * 1000)}`,
      senderName: senderName || 'عميل غير مسجل',
      senderNumber: senderNumber,
      messageText: trimmedMsg,
      timestamp: new Date(now).toISOString(),
      source: source || 'whatsapp',
      category: category,
      status: 'new',
      extractedUsername: credentials.username,
      extractedPassword: credentials.password,
      mergedCount: 1,
    };

    // Cache the new ticket
    recentTicketsCache.set(cleanNumber, {
      ticket: newTicket,
      lastMessageTime: now,
    });

    // Cleanup stale cache entries (older than double the merge interval)
    recentTicketsCache.forEach((val, key) => {
      if ((now - val.lastMessageTime) / 1000 > this.mergeIntervalSeconds * 2) {
        recentTicketsCache.delete(key);
      }
    });

    return { ticket: newTicket, isMerged: false };
  }
}
