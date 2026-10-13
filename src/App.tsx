import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wifi,
  Check,
  X,
  Network,
  LayoutDashboard,
  MessageSquareText,
  FileText,
  HelpCircle,
  Settings,
  Headphones,
  ArrowLeft,
  Ellipsis,
  Bell,
  ChevronDown,
  ChevronLeft,
  Smartphone,
  Zap,
  Wrench,
  Clock,
  CheckCircle2,
  PieChart,
  Radio,
  MessageCircle,
  ShieldCheck,
  SlidersHorizontal,
  Printer,
  Share2,
  Copy,
  Plus,
  Search,
  BookOpen,
  Layers,
  Phone,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Sun,
  Moon,
  Info,
  Send,
  AlertTriangle
} from 'lucide-react';

import { Ticket, TicketCategory, TicketStatus, AppConfig, CategoryKeywords, MessageSource } from './types';
import { StorageService } from './services/storage';
import { MessageExtractorService } from './services/messageExtractor';
import { SoundService } from './services/sound';
import { usePWA } from './hooks/usePWA';
import { exportTicketsTableToPDF } from './services/pdfExporter';

export default function App() {
  const { isOnline, canInstall, install } = usePWA();

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox' | 'reports' | 'guide' | 'settings'>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [reportViewMode, setReportViewMode] = useState<'document' | 'table'>('table');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // App core persistent state
  const [tickets, setTickets] = useState<Ticket[]>(() => StorageService.getTickets());
  const [config, setConfig] = useState<AppConfig>(() => StorageService.getConfig());
  const [keywords, setKeywords] = useState<CategoryKeywords>(() => StorageService.getKeywords());

  // Inbox filters
  const [inboxCategory, setInboxCategory] = useState<TicketCategory | 'all'>('all');
  const [inboxStatus, setInboxStatus] = useState<TicketStatus | 'all'>('all');
  const [inboxSource, setInboxSource] = useState<MessageSource | 'all'>('all');
  const [inboxSearch, setInboxSearch] = useState('');

  // Report Center options
  const [reportDateRange, setReportDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [reportCategory, setReportCategory] = useState<TicketCategory | 'all'>('all');
  const [reportStatus, setReportStatus] = useState<TicketStatus | 'all'>('all');
  const [reportOnlyDone, setReportOnlyDone] = useState(false);
  const [selectedReportTicketIds, setSelectedReportTicketIds] = useState<string[]>(() =>
    tickets.map((t) => t.id)
  );

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(() => !config.hasJoined);
  const [isConfirmingDeleteTicket, setIsConfirmingDeleteTicket] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Join Onboarding form state
  const [joinNetworkName, setJoinNetworkName] = useState<string>(config.networkName || 'شبكة الدحشة الحديثة');
  const [joinOwnerName, setJoinOwnerName] = useState<string>(config.engineerName || 'م/عبدالمجيد');
  const [joinOwnerPhone, setJoinOwnerPhone] = useState<string>(config.engineerPhone || '771141160');

  // Manual ticket form state
  const [manualName, setManualName] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [manualCategory, setManualCategory] = useState<TicketCategory>('maintenance');
  const [manualStatus, setManualStatus] = useState<TicketStatus>('new');
  const [manualAutoClassify, setManualAutoClassify] = useState(true);

  // Notification simulation form state
  const [simSenderName, setSimSenderName] = useState('احمد المنتصر');
  const [simSenderNumber, setSimSenderNumber] = useState('773086403');
  const [simMessage, setSimMessage] = useState('الشبكه خاربه يا باشمهندس وماترتبط، تفصل كل دقيقة');
  const [simSource, setSimSource] = useState<MessageSource>('whatsapp');
  const [simFeedback, setSimFeedback] = useState<{
    text: string;
    isAccepted: boolean;
    isMerged: boolean;
  } | null>(null);

  // Inline keyword adders in Settings
  const [inputKwMaintenance, setInputKwMaintenance] = useState('');
  const [inputKwCards, setInputKwCards] = useState('');
  const [inputKwInstallations, setInputKwInstallations] = useState('');

  // Copy toast state
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Instantiate extractor service
  const extractorService = useMemo(() => {
    return new MessageExtractorService(
      keywords,
      config.mergeIntervalSeconds,
      config.modemBypassEnabled,
      config.autoExtractMikrotik
    );
  }, [keywords, config.mergeIntervalSeconds, config.modemBypassEnabled, config.autoExtractMikrotik]);

  // Synchronize dark-mode class on body/html
  useEffect(() => {
    if (config.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [config.darkMode]);

  // Save updates helper
  const saveTickets = useCallback((updated: Ticket[]) => {
    setTickets(updated);
    StorageService.saveTickets(updated);
  }, []);

  const saveConfig = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig);
    StorageService.saveConfig(newConfig);
  }, []);

  const saveKeywords = useCallback((newKeywords: CategoryKeywords) => {
    setKeywords(newKeywords);
    StorageService.saveKeywords(newKeywords);
  }, []);

  // Process incoming simulated or real messages
  const processIncomingMessage = useCallback(
    (params: {
      senderName: string;
      senderNumber: string;
      message: string;
      source: MessageSource;
    }) => {
      const res = extractorService.processIncomingMessage({
        senderName: params.senderName,
        senderNumber: params.senderNumber,
        message: params.message,
        source: params.source,
        existingTickets: tickets,
      });

      if (!res) {
        return { isAccepted: false, isMerged: false };
      }

      const { ticket, isMerged } = res;
      const updated = StorageService.addOrUpdateTicket(ticket);
      setTickets(updated);

      if (config.playChimeSound) {
        SoundService.playNotificationChime();
      }

      return { isAccepted: true, isMerged };
    },
    [extractorService, tickets, config.playChimeSound]
  );

  // Quick stats
  const totalCount = tickets.length;
  const newCount = tickets.filter((t) => t.status === 'new').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const doneCount = tickets.filter((t) => t.status === 'completed').length;

  const maintenanceCount = tickets.filter((t) => t.category === 'maintenance').length;
  const cardsCount = tickets.filter((t) => t.category === 'cards').length;
  const installationCount = tickets.filter((t) => t.category === 'installations').length;

  const whatsappCount = tickets.filter((t) => t.source === 'whatsapp' || t.source === 'whatsapp_business').length;
  const smsCount = tickets.filter((t) => t.source === 'sms').length;

  // Filtered inbox tickets
  const filteredInboxTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (inboxCategory !== 'all' && t.category !== inboxCategory) return false;
      if (inboxStatus !== 'all' && t.status !== inboxStatus) return false;
      if (inboxSource !== 'all') {
        if (inboxSource === 'whatsapp' && t.source !== 'whatsapp' && t.source !== 'whatsapp_business') return false;
        if (inboxSource === 'sms' && t.source !== 'sms') return false;
      }
      if (inboxSearch.trim()) {
        const query = inboxSearch.toLowerCase().trim();
        const mName = t.senderName.toLowerCase().includes(query);
        const mNum = t.senderNumber.includes(query);
        const mText = t.messageText.toLowerCase().includes(query);
        const mUser = t.extractedUsername?.toLowerCase().includes(query);
        if (!mName && !mNum && !mText && !mUser) return false;
      }
      return true;
    });
  }, [tickets, inboxCategory, inboxStatus, inboxSource, inboxSearch]);

  // Filtered report tickets
  const filteredReportPool = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;
    const monthStart = todayStart - 30 * 86400000;

    return tickets.filter((t) => {
      const ticketTime = new Date(t.timestamp).getTime();
      if (reportDateRange === 'today' && ticketTime < todayStart) return false;
      if (reportDateRange === 'yesterday' && (ticketTime < yesterdayStart || ticketTime >= todayStart)) return false;
      if (reportDateRange === 'week' && ticketTime < weekStart) return false;
      if (reportDateRange === 'month' && ticketTime < monthStart) return false;

      if (reportCategory !== 'all' && t.category !== reportCategory) return false;
      if (reportStatus !== 'all' && t.status !== reportStatus) return false;
      if (reportOnlyDone && t.status !== 'completed') return false;

      return true;
    });
  }, [tickets, reportDateRange, reportCategory, reportStatus, reportOnlyDone]);

  // Tickets included in printable report
  const finalReportTickets = useMemo(() => {
    return filteredReportPool.filter((t) => selectedReportTicketIds.includes(t.id));
  }, [filteredReportPool, selectedReportTicketIds]);

  // Relative time helper
  const getRelativeTime = (iso: string) => {
    try {
      const diffM = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
      if (diffM < 1) return 'الآن';
      if (diffM < 60) return `منذ ${diffM} د`;
      const diffH = Math.floor(diffM / 60);
      if (diffH < 24) return `منذ ${diffH} س`;
      return new Date(iso).toLocaleDateString('ar-YE');
    } catch {
      return '';
    }
  };

  // Plain-text report generator
  const generateReportText = () => {
    const reportDate = new Date().toLocaleDateString('ar-YE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    let text = `📋 تقرير بلاغات ${config.networkName} 📋\n`;
    text += `👤 المهندس الفني: ${config.engineerName} (${config.engineerPhone})\n`;
    text += `📅 التاريخ: ${reportDate}\n`;
    text += `📊 إجمالي البلاغات المعتمدة: ${finalReportTickets.length}\n`;
    text += `===================================\n\n`;

    finalReportTickets.forEach((t, i) => {
      const catLabel = t.category === 'maintenance' ? 'صيانة' : t.category === 'cards' ? 'كروت' : 'تركيبات';
      text += `${i + 1}. [${catLabel}] ${t.senderName} - ${t.senderNumber}\n`;
      text += `   البلاغ: ${t.messageText.replace(/\n/g, ' ')}\n`;
      if (t.extractedUsername) {
        text += `   الكرت المستخرج: يوزر: ${t.extractedUsername}${t.extractedPassword ? ` | باسورد: ${t.extractedPassword}` : ''}\n`;
      }
      if (t.engineerNotes) {
        text += `   ملاحظة الفني: ${t.engineerNotes}\n`;
      }
      text += `   الحالة: ${t.status === 'completed' ? 'منجز' : 'قيد المتابعة'}\n\n`;
    });

    text += `تم توليد التقرير بواسطة تطبيق تقارير شبكتك.`;
    return text;
  };

  const handleShareReportWhatsApp = () => {
    const text = generateReportText();
    const cleanPhone = config.engineerPhone.replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyReport = () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text);
    setCopiedNotification('تم نسخ نص التقرير للحافظة');
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  const handleExportTicketsPDF = async (ticketsToExport: Ticket[], customTitle?: string) => {
    try {
      setIsExportingPDF(true);
      setCopiedNotification('جاري إنشاء وتصدير جدول البلاغات بصيغة PDF...');
      await exportTicketsTableToPDF({
        networkName: config.networkName,
        engineerName: config.engineerName,
        engineerPhone: config.engineerPhone,
        tickets: ticketsToExport,
        title: customTitle || 'جدول بلاغات وعمليات الشبكة',
      });
      if (config.playChimeSound) {
        SoundService.playSuccessChime();
      }
      setCopiedNotification('تم تحميل ملف الـ PDF بنجاح!');
      setTimeout(() => setCopiedNotification(null), 3000);
    } catch (error) {
      console.error('PDF export error:', error);
      if (error instanceof Error && error.message === 'EMPTY_TICKETS') {
        setCopiedNotification('لا توجد بلاغات محددة في القائمة لتصديرها.');
      } else {
        setCopiedNotification('تعذر تصدير ملف الـ PDF، يرجى المحاولة مرة أخرى.');
      }
      setTimeout(() => setCopiedNotification(null), 3500);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Add keyword helper
  const handleAddKeyword = (cat: 'maintenance' | 'cards' | 'installations', word: string, clear: () => void) => {
    const trimmed = word.trim();
    if (!trimmed || keywords[cat].includes(trimmed)) return;
    const updated = { ...keywords, [cat]: [trimmed, ...keywords[cat]] };
    saveKeywords(updated);
    clear();
  };

  const handleRemoveKeyword = (cat: 'maintenance' | 'cards' | 'installations', word: string) => {
    const updated = { ...keywords, [cat]: keywords[cat].filter((k) => k !== word) };
    saveKeywords(updated);
  };

  // Join Onboarding submit
  const handleJoinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalNet = joinNetworkName.trim() || 'شبكة الدحشة الحديثة';
    const finalOwner = joinOwnerName.trim() || 'م/عبدالمجيد';
    const finalPhone = joinOwnerPhone.trim() || '771141160';

    const updatedConfig: AppConfig = {
      ...config,
      networkName: finalNet,
      engineerName: finalOwner,
      engineerPhone: finalPhone,
      hasJoined: true,
    };

    saveConfig(updatedConfig);
    setIsJoinModalOpen(false);

    if (config.playChimeSound) {
      SoundService.playSuccessChime();
    }
    setCopiedNotification(`تم اعتماد "${finalNet}" لصاحبها ${finalOwner} (${finalPhone}) بنجاح!`);
    setTimeout(() => setCopiedNotification(null), 3500);
  };

  // Manual ticket form submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMessage.trim()) return;

    let finalCat: TicketCategory = manualCategory;
    let u: string | null = null;
    let p: string | null = null;

    if (manualAutoClassify) {
      finalCat = extractorService.classifyCategory(manualMessage, manualName);
      const creds = extractorService.extractCredentials(manualMessage);
      u = creds.username;
      p = creds.password;
    }

    const newT: Ticket = {
      id: `tkt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderName: manualName.trim() || 'عميل محلي',
      senderNumber: manualNumber.trim() || '770000000',
      messageText: manualMessage.trim(),
      timestamp: new Date().toISOString(),
      source: 'manual',
      category: finalCat,
      status: manualStatus,
      extractedUsername: u,
      extractedPassword: p,
      mergedCount: 1,
    };

    saveTickets([newT, ...tickets]);
    if (config.playChimeSound) SoundService.playSuccessChime();

    setManualName('');
    setManualNumber('');
    setManualMessage('');
    setIsManualModalOpen(false);
  };

  // Simulation run
  const handleRunSim = () => {
    if (!simMessage.trim()) return;
    const res = processIncomingMessage({
      senderName: simSenderName,
      senderNumber: simSenderNumber,
      message: simMessage,
      source: simSource,
    });
    if (!res.isAccepted) {
      setSimFeedback({
        text: 'تم تجاهل الرسالة بصمت (لا تطابق أي كلمات دلالية للشبكة).',
        isAccepted: false,
        isMerged: false,
      });
    } else if (res.isMerged) {
      setSimFeedback({
        text: 'تم دمج الرسالة مع التذكرة السابقة لنفس العميل (قاعدة الـ 120 ثانية)!',
        isAccepted: true,
        isMerged: true,
      });
    } else {
      setSimFeedback({
        text: 'تم استلام وتصنيف البلاغ بنجاح وإنشاء تذكرة جديدة!',
        isAccepted: true,
        isMerged: false,
      });
    }
  };

  // Current view title
  const currentViewTitle =
    activeTab === 'dashboard'
      ? 'اللوحة الرئيسية'
      : activeTab === 'inbox'
      ? 'صندوق البلاغات'
      : activeTab === 'reports'
      ? 'مركز التقارير'
      : activeTab === 'guide'
      ? 'دليل الاستخدام'
      : 'الإعدادات';

  const currentDateString = new Date().toLocaleDateString('ar-YE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={`network-app ${config.darkMode ? 'dark-mode' : ''}`} dir="rtl">
      {/* SIDEBAR (Desktop Fixed & Mobile Drawer) */}
      <aside className={`sidebar ${isMobileSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true" style={{ background: '#ffffff', padding: '3px' }}>
            <img src="/taqareer-icon.svg" alt="شعار تقارير شبكتك" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </span>
          <span>
            <strong>تقارير شبكتك</strong>
            <small>متابعة أذكى لشبكتك</small>
          </span>
          <button
            className="sidebar-close icon-button"
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="workspace-switch"
          onClick={() => {
            setJoinNetworkName(config.networkName);
            setJoinOwnerName(config.engineerName);
            setJoinOwnerPhone(config.engineerPhone);
            setIsJoinModalOpen(true);
          }}
          title="انقر لتعديل اسم الشبكة ورقم صاحبها"
          style={{ cursor: 'pointer' }}
        >
          <span className="workspace-avatar">
            <Network size={17} />
          </span>
          <span>
            <small>الشبكة المعتمدة</small>
            <strong>{config.networkName}</strong>
          </span>
          <ChevronDown size={15} />
        </div>

        <span className="nav-label">القائمة الرئيسية</span>
        <nav className="side-nav" aria-label="التنقل الرئيسي">
          <button
            className={activeTab === 'dashboard' ? 'selected' : ''}
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              setIsMobileSidebarOpen(false);
            }}
          >
            <LayoutDashboard size={18} />
            <span>الرئيسية</span>
          </button>

          <button
            className={activeTab === 'inbox' ? 'selected' : ''}
            type="button"
            onClick={() => {
              setActiveTab('inbox');
              setIsMobileSidebarOpen(false);
            }}
          >
            <MessageSquareText size={18} />
            <span>البلاغات</span>
            {newCount > 0 && <i className="nav-count">{newCount}</i>}
          </button>

          <button
            className={activeTab === 'reports' ? 'selected' : ''}
            type="button"
            onClick={() => {
              setActiveTab('reports');
              setIsMobileSidebarOpen(false);
            }}
          >
            <FileText size={18} />
            <span>التقارير</span>
          </button>

          <button
            className={activeTab === 'guide' ? 'selected' : ''}
            type="button"
            onClick={() => {
              setActiveTab('guide');
              setIsMobileSidebarOpen(false);
            }}
          >
            <HelpCircle size={18} />
            <span>الدليل</span>
          </button>

          <button
            className={activeTab === 'settings' ? 'selected' : ''}
            type="button"
            onClick={() => {
              setActiveTab('settings');
              setIsMobileSidebarOpen(false);
            }}
          >
            <Settings size={18} />
            <span>الإعدادات</span>
          </button>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-help">
          <span className="help-orb">
            <Headphones size={18} />
          </span>
          <strong>تحتاج مساعدة؟</strong>
          <span>راجع الدليل السريع للاستخدام.</span>
          <button
            type="button"
            onClick={() => {
              setActiveTab('guide');
              setIsMobileSidebarOpen(false);
            }}
          >
            افتح الدليل <ArrowLeft size={14} />
          </button>
        </div>

        <div
          className="sidebar-profile"
          onClick={() => {
            setJoinNetworkName(config.networkName);
            setJoinOwnerName(config.engineerName);
            setJoinOwnerPhone(config.engineerPhone);
            setIsJoinModalOpen(true);
          }}
          title="انقر لتعديل بيانات صاحب الشبكة"
          style={{ cursor: 'pointer' }}
        >
          <span className="profile-avatar">{config.engineerName.charAt(0) || 'أ'}</span>
          <span>
            <strong>{config.engineerName}</strong>
            <small>{config.networkName} • {config.engineerPhone}</small>
          </span>
          <Ellipsis size={19} />
        </div>
      </aside>

      {/* Mobile Drawer Scrim */}
      <div
        className="mobile-sidebar-scrim"
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* MAIN VIEW AREA */}
      <main className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu-button icon-button"
              type="button"
              aria-label="فتح القائمة"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <span className="menu-bars" />
            </button>
            <div>
              <span className="topbar-date">
                {currentDateString} <i /> شبكة:{' '}
                <strong
                  onClick={() => {
                    setJoinNetworkName(config.networkName);
                    setJoinOwnerName(config.engineerName);
                    setJoinOwnerPhone(config.engineerPhone);
                    setIsJoinModalOpen(true);
                  }}
                  style={{
                    color: 'var(--coral)',
                    cursor: 'pointer',
                    textDecoration: 'underline dotted',
                  }}
                  title="انقر لتعديل بيانات شبكتك"
                >
                  {config.networkName}
                </strong>
              </span>
              <h1>
                {currentViewTitle} — {config.networkName}
              </h1>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="button button-small button-outline"
              type="button"
              onClick={() => {
                setJoinNetworkName(config.networkName);
                setJoinOwnerName(config.engineerName);
                setJoinOwnerPhone(config.engineerPhone);
                setIsJoinModalOpen(true);
              }}
              title="تعديل بيانات الشبكة وصاحبها"
              style={{ fontWeight: 600 }}
            >
              <Network size={14} />
              <span>{config.networkName}</span>
            </button>

            {canInstall && (
              <button
                className="button button-small button-outline"
                type="button"
                onClick={install}
                title="تثبيت التطبيق على جهازك"
              >
                <Download size={14} />
                <span>تثبيت PWA</span>
              </button>
            )}

            <button
              className="top-icon-button"
              type="button"
              aria-label="محاكاة إشعار وارد"
              title="محاكاة وصول إشعار"
              onClick={() => setIsSimulatorOpen(true)}
            >
              <Bell size={18} />
              <i />
            </button>

            <span className="topbar-divider" />

            <span
              className="user-mini"
              onClick={() => {
                setJoinNetworkName(config.networkName);
                setJoinOwnerName(config.engineerName);
                setJoinOwnerPhone(config.engineerPhone);
                setIsJoinModalOpen(true);
              }}
              title="انقر لتعديل بيانات صاحب الشبكة"
              style={{ cursor: 'pointer' }}
            >
              <span className="profile-avatar">{config.engineerName.charAt(0) || 'أ'}</span>
              <span>
                <strong>{config.engineerName}</strong>
                <small>{config.networkName}</small>
              </span>
              <ChevronDown size={14} />
            </span>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="page-stack">
              {/* Welcome Hero Panel */}
              <section className="welcome-panel">
                <div className="welcome-content">
                  <div className="welcome-overline">
                    <span className="live-dot" />
                    <span>مساحة متابعة عملائك</span>
                    <span className="overline-separator">/</span>
                    <span>{config.networkName}</span>
                  </div>
                  <h2>
                    تقارير شبكتك — <em>كل بلاغ له متابعة</em>
                  </h2>
                  <p>
                    مساحة متابعة عملائك وبلاغات الشبكة أولاً بأول، مع فرز ذكي للأعطال والكروت والتركيبات وتوليد تقارير يومية للمهندس.
                  </p>

                  <div className="welcome-actions">
                    <button
                      className={`button monitor-button ${config.isMonitoringActive ? 'is-on' : ''}`}
                      type="button"
                      onClick={() =>
                        saveConfig({ ...config, isMonitoringActive: !config.isMonitoringActive })
                      }
                    >
                      <span className="switch-dot" />
                      <span>
                        مراقبة البلاغات: {config.isMonitoringActive ? 'مفعّلة' : 'متوقفة'}
                      </span>
                    </button>

                    <button
                      className="button button-coral"
                      type="button"
                      onClick={() => setActiveTab('reports')}
                    >
                      <FileText size={16} />
                      <span>إنشاء تقرير للمهندس</span>
                    </button>

                    <button
                      className="button button-primary"
                      type="button"
                      onClick={() => setIsManualModalOpen(true)}
                    >
                      <Plus size={16} />
                      <span>إضافة بلاغ جديد</span>
                    </button>
                  </div>

                  <div className="demo-hint">
                    <ShieldCheck size={14} />
                    <span>
                      محرك الفلترة يطبق قاعدة الـ 120 ثانية واستخراج كروت المايكروتك تلقائياً بنظام RegEx.
                    </span>
                  </div>
                </div>

                <div className="welcome-art" aria-hidden="true">
                  <span className="signal-ring ring-one" />
                  <span className="signal-ring ring-two" />
                  <span className="signal-ring ring-three" />
                  <div className="art-core">
                    <span className="brand-mark" style={{ background: '#ffffff', padding: '3px' }}>
                      <img src="/taqareer-icon.svg" alt="شعار تقارير شبكتك" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </span>
                  </div>
                  <span className="art-node node-one">
                    <Phone size={15} />
                  </span>
                  <span className="art-node node-two">
                    <Wrench size={15} />
                  </span>
                  <span className="art-node node-three">
                    <Wifi size={15} />
                  </span>
                </div>
              </section>

              {/* 4 Primary Stat Cards */}
              <div className="stat-grid">
                <div className="stat-card" onClick={() => setActiveTab('inbox')} style={{ cursor: 'pointer' }}>
                  <span className="stat-icon stat-blue">
                    <MessageSquareText size={20} />
                  </span>
                  <div className="stat-copy">
                    <span>إجمالي البلاغات</span>
                    <strong>{totalCount}</strong>
                  </div>
                  <span className="stat-delta">اليوم</span>
                </div>

                <div className="stat-card" onClick={() => { setInboxStatus('new'); setActiveTab('inbox'); }} style={{ cursor: 'pointer' }}>
                  <span className="stat-icon stat-coral">
                    <Clock size={20} />
                  </span>
                  <div className="stat-copy">
                    <span>بلاغات جديدة</span>
                    <strong>{newCount}</strong>
                  </div>
                  <span className="stat-delta">تحتاج متابعة</span>
                </div>

                <div className="stat-card" onClick={() => { setInboxStatus('in_progress'); setActiveTab('inbox'); }} style={{ cursor: 'pointer' }}>
                  <span className="stat-icon stat-violet">
                    <Wrench size={20} />
                  </span>
                  <div className="stat-copy">
                    <span>قيد المعالجة</span>
                    <strong>{inProgressCount}</strong>
                  </div>
                  <span className="stat-delta">مع الفني</span>
                </div>

                <div className="stat-card" onClick={() => { setInboxStatus('completed'); setActiveTab('inbox'); }} style={{ cursor: 'pointer' }}>
                  <span className="stat-icon stat-green">
                    <CheckCircle2 size={20} />
                  </span>
                  <div className="stat-copy">
                    <span>منجزة</span>
                    <strong>{doneCount}</strong>
                  </div>
                  <span className="stat-delta">تم الحل</span>
                </div>
              </div>

              {/* Dashboard 2-Column Grid */}
              <div className="dashboard-grid">
                {/* Recent Tickets List */}
                <section className="surface recent-panel">
                  <div className="section-heading">
                    <div>
                      <span className="section-kicker">الأحدث أولاً</span>
                      <h3>أحدث البلاغات</h3>
                    </div>
                    <button
                      className="text-link"
                      type="button"
                      onClick={() => setActiveTab('inbox')}
                    >
                      عرض كل البلاغات <ArrowLeft size={14} />
                    </button>
                  </div>

                  <div className="ticket-list compact-list">
                    {tickets.slice(0, 5).map((t) => {
                      const iconClass =
                        t.category === 'maintenance'
                          ? 'maintenance'
                          : t.category === 'cards'
                          ? 'cards'
                          : 'installation';

                      const statusClass =
                        t.status === 'new'
                          ? 'status-new'
                          : t.status === 'in_progress'
                          ? 'status-progress'
                          : t.status === 'pending'
                          ? 'status-scheduled'
                          : 'status-done';

                      const statusLabel =
                        t.status === 'new'
                          ? 'جديد'
                          : t.status === 'in_progress'
                          ? 'قيد المعالجة'
                          : t.status === 'pending'
                          ? 'معلق'
                          : 'منجز';

                      const catLabel =
                        t.category === 'maintenance'
                          ? 'صيانة'
                          : t.category === 'cards'
                          ? 'كروت'
                          : 'تركيبات';

                      return (
                        <div
                          key={t.id}
                          className="ticket-card"
                          onClick={() => setSelectedTicket(t)}
                        >
                          <span className={`ticket-icon ${iconClass}`}>
                            {t.category === 'maintenance' ? (
                              <Wrench size={19} />
                            ) : t.category === 'cards' ? (
                              <Zap size={19} />
                            ) : (
                              <Wifi size={19} />
                            )}
                          </span>

                          <div className="ticket-main">
                            <div className="ticket-topline">
                              <strong>{t.senderName}</strong>
                              <span className="ticket-time">
                                <Clock size={12} />
                                {getRelativeTime(t.timestamp)}
                              </span>
                            </div>

                            <span className="ticket-number">{t.senderNumber}</span>
                            <span className="ticket-message line-clamp-2">{t.messageText}</span>

                            <div className="ticket-meta">
                              <span className={`category-badge ${iconClass}`}>{catLabel}</span>
                              <span className={`status-badge ${statusClass}`}>
                                <i />
                                {statusLabel}
                              </span>
                              <span className={`source-badge ${t.source}`}>
                                {t.source === 'whatsapp'
                                  ? 'واتساب'
                                  : t.source === 'whatsapp_business'
                                  ? 'واتساب أعمال'
                                  : t.source === 'sms'
                                  ? 'SMS'
                                  : 'يدوي'}
                              </span>
                              {t.mergedCount > 1 && (
                                <span className="source-badge whatsapp">
                                  مدمج ({t.mergedCount})
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronLeft className="ticket-chevron" size={17} />
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Left Side Stack */}
                <div className="side-stack">
                  {/* Category Breakdown Panel */}
                  <section className="surface category-panel">
                    <div className="section-heading">
                      <div>
                        <span className="section-kicker">توزيع البلاغات</span>
                        <h3>توزيع الأنواع</h3>
                      </div>
                      <span className="heading-icon">
                        <PieChart size={16} />
                      </span>
                    </div>

                    <div className="category-bars">
                      <div>
                        <div className="category-bar-title">
                          <strong>صيانة وأعطال</strong>
                          <small>{maintenanceCount} بلاغ</small>
                        </div>
                        <div className="bar-track">
                          <span
                            className="bar-fill maintenance"
                            style={{
                              width: `${totalCount ? (maintenanceCount / totalCount) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="category-bar-title">
                          <strong>كروت وشحن</strong>
                          <small>{cardsCount} بلاغ</small>
                        </div>
                        <div className="bar-track">
                          <span
                            className="bar-fill cards"
                            style={{
                              width: `${totalCount ? (cardsCount / totalCount) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="category-bar-title">
                          <strong>تركيبات ومودم</strong>
                          <small>{installationCount} بلاغ</small>
                        </div>
                        <div className="bar-track">
                          <span
                            className="bar-fill installation"
                            style={{
                              width: `${totalCount ? (installationCount / totalCount) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      className="panel-bottom-link"
                      type="button"
                      onClick={() => setActiveTab('settings')}
                    >
                      <span>تعديل الكلمات الدلالية من الإعدادات</span>
                      <ArrowLeft size={13} />
                    </button>
                  </section>

                  {/* 24h Monitoring Banner Card */}
                  <div className="monitor-card">
                    <div className="monitor-card-top">
                      <span className="monitor-symbol active">
                        <Radio size={16} />
                      </span>
                      <span className="monitor-label active">
                        <i />
                        {config.isMonitoringActive ? 'مراقبة 24 ساعة نشطة' : 'المراقبة متوقفة'}
                      </span>
                    </div>
                    <strong>نظام الفلترة وقاعدة 120 ثانية</strong>
                    <p>
                      دمج الرسائل المتتالية لنفس العميل تلقائياً واستخراج كروت المايكروتك بنظام RegEx دون تكرار البلاغات.
                    </p>
                    <button
                      className="monitor-card-action"
                      type="button"
                      onClick={() => setIsSimulatorOpen(true)}
                    >
                      <span>تجربة محاكي الإشعارات</span>
                      <ArrowLeft size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Source Banner Strip */}
              <div className="source-strip">
                <span className="source-strip-icon">
                  <MessageCircle size={18} />
                </span>
                <div className="source-strip-copy">
                  <strong>مصادر التقاط البلاغات الذكية</strong>
                  <span>
                    يدعم التطبيق استقبال إشعارات واتساب، واتساب للأعمال، ورسائل SMS، أو الإدخال اليدوي، مع حفظ كامل أوفلاين.
                  </span>
                </div>
                <div className="source-count">
                  <span>واتساب: {whatsappCount}</span>
                  <i />
                  <span>SMS: {smsCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INBOX */}
          {activeTab === 'inbox' && (
            <div className="page-stack">
              <section className="inbox-summary surface">
                <div>
                  <span className="section-kicker">متابعة دقيقة</span>
                  <h2>صندوق البلاغات والشكاوى</h2>
                  <p>ابحث بالاسم أو الرقم أو نص الرسالة، وافرز حسب النوع والمصدر والحالة.</p>
                </div>
                <div className="inbox-summary-count">
                  <strong>{totalCount}</strong>
                  <span>إجمالي البلاغات</span>
                </div>
              </section>

              <section className="surface inbox-panel">
                <div className="section-heading inbox-heading">
                  <div>
                    <span className="section-kicker">تصفية سريعة</span>
                    <h3>قائمة البلاغات</h3>
                  </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="button button-coral desktop-add"
                        type="button"
                        disabled={isExportingPDF}
                        onClick={() =>
                          handleExportTicketsPDF(
                            filteredInboxTickets,
                            `جدول بلاغات وعمليات الشبكة - صندوق البلاغات`
                          )
                        }
                        title="تصدير البلاغات المعروضة كجدول PDF"
                      >
                        <Download size={14} />
                        <span>تصدير جدول PDF</span>
                      </button>

                      <button
                        className="button button-primary desktop-add"
                        type="button"
                        onClick={() => setIsManualModalOpen(true)}
                      >
                        <Plus size={15} />
                        <span>إضافة بلاغ يدوي</span>
                      </button>
                    </div>
                  </div>

                {/* Category Tabs */}
                <div className="category-tabs">
                  <button
                    className={inboxCategory === 'all' ? 'active' : ''}
                    type="button"
                    onClick={() => setInboxCategory('all')}
                  >
                    <span>{tickets.length}</span>
                    الكل
                  </button>
                  <button
                    className={inboxCategory === 'maintenance' ? 'active' : ''}
                    type="button"
                    onClick={() => setInboxCategory('maintenance')}
                  >
                    <span>{maintenanceCount}</span>
                    صيانة
                  </button>
                  <button
                    className={inboxCategory === 'cards' ? 'active' : ''}
                    type="button"
                    onClick={() => setInboxCategory('cards')}
                  >
                    <span>{cardsCount}</span>
                    كروت
                  </button>
                  <button
                    className={inboxCategory === 'installations' ? 'active' : ''}
                    type="button"
                    onClick={() => setInboxCategory('installations')}
                  >
                    <span>{installationCount}</span>
                    تركيبات
                  </button>
                </div>

                {/* Filter Toolbar */}
                <div className="filter-toolbar">
                  <div className="search-box">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="بحث بالاسم، الرقم، أو نص البلاغ..."
                      value={inboxSearch}
                      onChange={(e) => setInboxSearch(e.target.value)}
                    />
                    {inboxSearch && (
                      <button type="button" onClick={() => setInboxSearch('')}>
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <label className="select-filter">
                    <select
                      value={inboxStatus}
                      onChange={(e) => setInboxStatus(e.target.value as TicketStatus | 'all')}
                    >
                      <option value="all">كل الحالات</option>
                      <option value="new">جديد</option>
                      <option value="in_progress">قيد المعالجة</option>
                      <option value="pending">معلق</option>
                      <option value="completed">منجز</option>
                    </select>
                    <ChevronDown size={14} />
                  </label>
                </div>

                {/* Source Filter sub-bar */}
                <div className="source-filters">
                  <span>المصدر:</span>
                  <button
                    className={inboxSource === 'all' ? 'selected' : ''}
                    type="button"
                    onClick={() => setInboxSource('all')}
                  >
                    الكل
                  </button>
                  <button
                    className={inboxSource === 'whatsapp' ? 'selected' : ''}
                    type="button"
                    onClick={() => setInboxSource('whatsapp')}
                  >
                    واتساب
                  </button>
                  <button
                    className={inboxSource === 'sms' ? 'selected' : ''}
                    type="button"
                    onClick={() => setInboxSource('sms')}
                  >
                    رسائل SMS
                  </button>
                  <span className="result-count">{filteredInboxTickets.length} بلاغ</span>
                </div>

                {/* Tickets list */}
                <div className="ticket-list">
                  {filteredInboxTickets.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-art">
                        <MessageSquareText size={24} />
                      </span>
                      <strong>لا توجد بلاغات تطابق الفلتر</strong>
                      <span>جرب تعديل كلمات البحث أو اختيار فئة مختلفة.</span>
                    </div>
                  ) : (
                    filteredInboxTickets.map((t) => {
                      const iconClass =
                        t.category === 'maintenance'
                          ? 'maintenance'
                          : t.category === 'cards'
                          ? 'cards'
                          : 'installation';

                      const statusClass =
                        t.status === 'new'
                          ? 'status-new'
                          : t.status === 'in_progress'
                          ? 'status-progress'
                          : t.status === 'pending'
                          ? 'status-scheduled'
                          : 'status-done';

                      const statusLabel =
                        t.status === 'new'
                          ? 'جديد'
                          : t.status === 'in_progress'
                          ? 'قيد المعالجة'
                          : t.status === 'pending'
                          ? 'معلق'
                          : 'منجز';

                      const catLabel =
                        t.category === 'maintenance'
                          ? 'صيانة'
                          : t.category === 'cards'
                          ? 'كروت'
                          : 'تركيبات';

                      return (
                        <div
                          key={t.id}
                          className="ticket-card"
                          onClick={() => setSelectedTicket(t)}
                        >
                          <span className={`ticket-icon large ${iconClass}`}>
                            {t.category === 'maintenance' ? (
                              <Wrench size={22} />
                            ) : t.category === 'cards' ? (
                              <Zap size={22} />
                            ) : (
                              <Wifi size={22} />
                            )}
                          </span>

                          <div className="ticket-main">
                            <div className="ticket-topline">
                              <strong>{t.senderName}</strong>
                              <span className="ticket-time">
                                <Clock size={12} />
                                {getRelativeTime(t.timestamp)}
                              </span>
                            </div>

                            <span className="ticket-number">{t.senderNumber}</span>
                            <span className="ticket-message">{t.messageText}</span>

                            {/* MikroTik card preview if present */}
                            {(t.extractedUsername || t.extractedPassword) && (
                              <div style={{ marginTop: '5px' }}>
                                <span className="category-badge cards">
                                  يوزر: {t.extractedUsername || '-'}{' '}
                                  {t.extractedPassword ? `| باسورد: ${t.extractedPassword}` : ''}
                                </span>
                              </div>
                            )}

                            {t.engineerNotes && (
                              <div style={{ marginTop: '5px', fontSize: '11px', color: 'var(--coral)' }}>
                                ملاحظة: {t.engineerNotes}
                              </div>
                            )}

                            <div className="ticket-meta">
                              <span className={`category-badge ${iconClass}`}>{catLabel}</span>
                              <span className={`status-badge ${statusClass}`}>
                                <i />
                                {statusLabel}
                              </span>
                              <span className={`source-badge ${t.source}`}>
                                {t.source === 'whatsapp'
                                  ? 'واتساب'
                                  : t.source === 'whatsapp_business'
                                  ? 'واتساب أعمال'
                                  : t.source === 'sms'
                                  ? 'SMS'
                                  : 'يدوي'}
                              </span>
                              {t.mergedCount > 1 && (
                                <span className="source-badge whatsapp">
                                  مدمج ({t.mergedCount})
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronLeft className="ticket-chevron" size={18} />
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="demo-footnote">
                  <Info size={14} />
                  <span>
                    البيانات مخزنة محلياً على جهازك؛ اضغط على أي بلاغ لتعديل حالته أو إضافة ملاحظة الفني أو مراسلة العميل.
                  </span>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: REPORTS CENTER */}
          {activeTab === 'reports' && (
            <div className="page-stack">
              <section className="report-hero">
                <div className="report-hero-copy">
                  <div className="welcome-overline">
                    <span className="live-dot" />
                    <span>مركز التقارير الفنية / {config.networkName}</span>
                  </div>
                  <h2>
                    تقرير بلاغات الشبكة — <em>جاهز للطباعة والمشاركة</em>
                  </h2>
                  <p>
                    اختر الفترة الزمنية ونوع البلاغات لإنشاء تقرير فني منسق وقابل للطباعة أو الإرسال المباشر للمهندس عبر واتساب.
                  </p>
                </div>

                <div className="report-hero-icon" aria-hidden="true">
                  <FileText size={26} />
                  <span>A4 PDF</span>
                </div>
              </section>

              <div className="report-layout">
                {/* Options Column */}
                <div className="surface report-options">
                  <div className="section-heading">
                    <div>
                      <span className="section-kicker">خيارات الفرز</span>
                      <h3>تخصيص التقرير</h3>
                    </div>
                    <span className="heading-icon">
                      <SlidersHorizontal size={16} />
                    </span>
                  </div>

                  <label className="form-field">
                    <span className="field-label">الفترة الزمنية</span>
                    <select
                      value={reportDateRange}
                      onChange={(e) => setReportDateRange(e.target.value as typeof reportDateRange)}
                    >
                      <option value="today">اليوم</option>
                      <option value="yesterday">أمس</option>
                      <option value="week">آخر 7 أيام</option>
                      <option value="month">هذا الشهر</option>
                      <option value="all">كل الفترات</option>
                    </select>
                  </label>

                  <div className="form-row">
                    <label className="form-field">
                      <span className="field-label">نوع البلاغ</span>
                      <select
                        value={reportCategory}
                        onChange={(e) => setReportCategory(e.target.value as TicketCategory | 'all')}
                      >
                        <option value="all">كافة الأنواع</option>
                        <option value="maintenance">صيانة فقط</option>
                        <option value="cards">كروت فقط</option>
                        <option value="installations">تركيبات فقط</option>
                      </select>
                    </label>

                    <label className="form-field">
                      <span className="field-label">حالة البلاغ</span>
                      <select
                        value={reportStatus}
                        onChange={(e) => setReportStatus(e.target.value as TicketStatus | 'all')}
                      >
                        <option value="all">كافة الحالات</option>
                        <option value="completed">المنجزة فقط</option>
                        <option value="in_progress">قيد المعالجة فقط</option>
                        <option value="new">الجديدة فقط</option>
                      </select>
                    </label>
                  </div>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={reportOnlyDone}
                      onChange={(e) => setReportOnlyDone(e.target.checked)}
                    />
                    <span className={`check-box ${reportOnlyDone ? 'checked' : ''}`}>
                      {reportOnlyDone && <Check size={13} />}
                    </span>
                    <span>
                      <strong>تضمين البلاغات المنجزة فقط</strong>
                      <small>استثناء البلاغات الجديدة أو المعلقة</small>
                    </span>
                  </label>

                  {/* Individual Case Selector */}
                  <div className="report-selection">
                    <div className="selection-heading">
                      <strong>
                        تحديد البلاغات الفردية ({finalReportTickets.length}/{filteredReportPool.length})
                      </strong>
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedReportTicketIds(
                              Array.from(new Set([...selectedReportTicketIds, ...filteredReportPool.map((t) => t.id)]))
                            )
                          }
                        >
                          تحديد الكل
                        </button>
                        <i />
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedReportTicketIds(
                              selectedReportTicketIds.filter(
                                (id) => !filteredReportPool.some((t) => t.id === id)
                              )
                            )
                          }
                        >
                          إلغاء التحديد
                        </button>
                      </div>
                    </div>

                    <div className="report-case-list">
                      {filteredReportPool.length === 0 ? (
                        <span className="no-cases">لا توجد بلاغات في هذه الفترة</span>
                      ) : (
                        filteredReportPool.map((t) => {
                          const isSelected = selectedReportTicketIds.includes(t.id);
                          return (
                            <label key={t.id} className="report-case-choice">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedReportTicketIds([...selectedReportTicketIds, t.id]);
                                  } else {
                                    setSelectedReportTicketIds(
                                      selectedReportTicketIds.filter((id) => id !== t.id)
                                    );
                                  }
                                }}
                              />
                              <span className="case-check">
                                {isSelected && <Check size={11} />}
                              </span>
                              <span className="case-choice-copy">
                                <strong>{t.senderName}</strong>
                                <small>{t.senderNumber}</small>
                              </span>
                              <span className={`category-badge ${t.category}`}>
                                {t.category === 'maintenance'
                                  ? 'صيانة'
                                  : t.category === 'cards'
                                  ? 'كروت'
                                  : 'تركيب'}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="report-summary-line">
                    <span>البلاغات المعتمدة في التقرير:</span>
                    <strong>{finalReportTickets.length} بلاغ</strong>
                  </div>

                  <div className="report-action-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                    <button
                      className="button button-coral"
                      type="button"
                      disabled={isExportingPDF}
                      onClick={() =>
                        handleExportTicketsPDF(finalReportTickets, `تقرير بلاغات الشبكة - ${config.networkName}`)
                      }
                      title="تصدير جدول البلاغات كملف PDF"
                    >
                      <Download size={15} />
                      <span>{isExportingPDF ? 'جاري التصدير...' : 'تصدير جدول PDF'}</span>
                    </button>

                    <button
                      className="button button-primary"
                      type="button"
                      onClick={() => window.print()}
                      title="طباعة التقرير عبر المتصفح"
                    >
                      <Printer size={15} />
                      <span>طباعة A4</span>
                    </button>

                    <button
                      className="button button-outline"
                      type="button"
                      onClick={handleShareReportWhatsApp}
                      title="إرسال التقرير للمهندس في واتساب"
                    >
                      <Share2 size={15} />
                      <span>واتساب</span>
                    </button>
                  </div>

                  <button
                    className="button button-outline full-width"
                    type="button"
                    onClick={handleCopyReport}
                  >
                    <Copy size={15} />
                    <span>نسخ نص التقرير للحافظة</span>
                  </button>
                </div>

                {/* Preview Column */}
                <div className="surface report-preview">
                  <div className="preview-toolbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="preview-dot" />
                      <span>معاينة البلاغات</span>
                      <div style={{ display: 'inline-flex', gap: '4px', marginRight: '8px' }}>
                        <button
                          type="button"
                          className={`button button-small ${reportViewMode === 'table' ? 'button-primary' : 'button-ghost'}`}
                          style={{ minHeight: '28px', padding: '0 8px', fontSize: '10px' }}
                          onClick={() => setReportViewMode('table')}
                        >
                          عرض الجدول
                        </button>
                        <button
                          type="button"
                          className={`button button-small ${reportViewMode === 'document' ? 'button-primary' : 'button-ghost'}`}
                          style={{ minHeight: '28px', padding: '0 8px', fontSize: '10px' }}
                          onClick={() => setReportViewMode('document')}
                        >
                          عرض الوثيقة
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="button button-small button-coral"
                        type="button"
                        disabled={isExportingPDF}
                        onClick={() =>
                          handleExportTicketsPDF(finalReportTickets, `جدول بلاغات ${config.networkName}`)
                        }
                        title="تحميل كملف PDF"
                        style={{ minHeight: '30px', padding: '0 10px', fontSize: '10px' }}
                      >
                        <Download size={13} />
                        <span>تحميل PDF</span>
                      </button>

                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => window.print()}
                        title="طباعة"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </div>

                  {reportViewMode === 'table' ? (
                    /* Table View of Tickets */
                    <div style={{ padding: '16px', overflowX: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12px' }}>
                        <div>
                          <strong style={{ color: 'var(--navy)', fontSize: '14px' }}>جدول بلاغات وعمليات الشبكة</strong>
                          <div style={{ color: 'var(--app-muted)', fontSize: '10px', marginTop: '2px' }}>
                            {config.networkName} — المهندس: {config.engineerName}
                          </div>
                        </div>
                        <span className="source-badge">
                          إجمالي: {finalReportTickets.length} بلاغ
                        </span>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'right' }}>
                        <thead>
                          <tr style={{ background: 'var(--navy)', color: '#ffffff' }}>
                            <th style={{ padding: '9px 8px', width: '36px', textAlign: 'center', borderRadius: '0 8px 0 0' }}>م</th>
                            <th style={{ padding: '9px 10px', width: '130px' }}>اسم العميل</th>
                            <th style={{ padding: '9px 10px', width: '100px', textAlign: 'center' }}>رقم الهاتف</th>
                            <th style={{ padding: '9px 10px' }}>نص الرسالة / البلاغ</th>
                            <th style={{ padding: '9px 8px', width: '70px', textAlign: 'center' }}>النوع</th>
                            <th style={{ padding: '9px 8px', width: '70px', textAlign: 'center', borderRadius: '8px 0 0 0' }}>الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {finalReportTickets.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--app-muted)' }}>
                                لا توجد بلاغات محددة في التقرير.
                              </td>
                            </tr>
                          ) : (
                            finalReportTickets.map((t, idx) => {
                              const catClass =
                                t.category === 'maintenance'
                                  ? 'maintenance'
                                  : t.category === 'cards'
                                  ? 'cards'
                                  : 'installation';

                              const catLabel =
                                t.category === 'maintenance'
                                  ? 'صيانة'
                                  : t.category === 'cards'
                                  ? 'كروت'
                                  : 'تركيبات';

                              const statusClass =
                                t.status === 'completed'
                                  ? 'status-done'
                                  : t.status === 'in_progress'
                                  ? 'status-progress'
                                  : t.status === 'pending'
                                  ? 'status-scheduled'
                                  : 'status-new';

                              const statusLabel =
                                t.status === 'completed'
                                  ? 'منجز'
                                  : t.status === 'in_progress'
                                  ? 'قيد المعالجة'
                                  : t.status === 'pending'
                                  ? 'معلق'
                                  : 'جديد';

                              return (
                                <tr
                                  key={t.id}
                                  style={{
                                    borderBottom: '1px solid var(--app-line)',
                                    background: idx % 2 === 0 ? 'transparent' : 'var(--app-soft)',
                                  }}
                                >
                                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: 'var(--app-muted)' }}>
                                    {idx + 1}
                                  </td>
                                  <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--app-ink)' }}>
                                    {t.senderName}
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', direction: 'ltr', fontFamily: 'monospace', color: 'var(--app-muted)' }}>
                                    {t.senderNumber}
                                  </td>
                                  <td style={{ padding: '8px 10px', lineHeight: 1.5, color: 'var(--app-ink)' }}>
                                    <div>{t.messageText}</div>
                                    {(t.extractedUsername || t.extractedPassword) && (
                                      <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--amber)', fontFamily: 'monospace' }}>
                                        يوزر: <b>{t.extractedUsername || '-'}</b> {t.extractedPassword ? `| باسورد: ${t.extractedPassword}` : ''}
                                      </div>
                                    )}
                                    {t.engineerNotes && (
                                      <div style={{ marginTop: '3px', fontSize: '10px', color: 'var(--coral)' }}>
                                        ملاحظة: {t.engineerNotes}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <span className={`category-badge ${catClass}`}>
                                      {catLabel}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <span className={`status-badge ${statusClass}`}>
                                      {statusLabel}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Classic Document View */
                    <div className="print-document">
                      <div className="print-head">
                        <span className="brand-mark brand-mark-small" style={{ background: '#ffffff', padding: '2px' }}>
                          <img src="/taqareer-icon.svg" alt="شعار تقارير شبكتك" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </span>
                        <div>
                          <strong>{config.networkName}</strong>
                          <span>المهندس المعتمد: {config.engineerName} ({config.engineerPhone})</span>
                        </div>
                        <div className="print-period">
                          <span>{new Date().toLocaleDateString('ar-YE')}</span>
                          <br />
                          <small>{new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</small>
                        </div>
                      </div>

                      <div className="print-title">
                        <span>تقرير بلاغات وعمليات الشبكة</span>
                        <strong>{finalReportTickets.length} بلاغ</strong>
                      </div>

                      <div className="print-stats">
                        <span>
                          صيانة: <b>{finalReportTickets.filter((t) => t.category === 'maintenance').length}</b>
                        </span>
                        <span>
                          كروت: <b>{finalReportTickets.filter((t) => t.category === 'cards').length}</b>
                        </span>
                        <span>
                          تركيبات: <b>{finalReportTickets.filter((t) => t.category === 'installations').length}</b>
                        </span>
                      </div>

                      <div className="print-list">
                        {finalReportTickets.map((t, idx) => (
                          <div key={t.id} className="print-row">
                            <span className="print-index">{idx + 1}</span>
                            <div className="print-row-main">
                              <strong>
                                <span>{t.senderName}</span>
                                <small>{t.senderNumber}</small>
                              </strong>
                              <span>{t.messageText}</span>

                              {(t.extractedUsername || t.extractedPassword) && (
                                <div className="print-note">
                                  <strong>الكرت المستخرج:</strong> يوزر {t.extractedUsername || '-'}{' '}
                                  {t.extractedPassword ? `| باسورد: ${t.extractedPassword}` : ''}
                                </div>
                              )}

                              {t.engineerNotes && (
                                <div className="print-note">
                                  <strong>ملاحظة المهندس:</strong> {t.engineerNotes}
                                </div>
                              )}

                              <div>
                                <span className={`category-badge ${t.category}`}>
                                  {t.category === 'maintenance'
                                    ? 'صيانة'
                                    : t.category === 'cards'
                                    ? 'كروت'
                                    : 'تركيبات'}
                                </span>
                                <span className="status-badge">
                                  {t.status === 'completed' ? 'منجز' : 'قيد المتابعة'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="print-footer">
                        <span>تم استخراج هذا التقرير آلياً عبر نظام تقارير شبكتك.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GUIDE */}
          {activeTab === 'guide' && (
            <div className="guide-page page-stack">
              <section className="guide-hero">
                <span className="guide-hero-icon">
                  <BookOpen size={20} />
                </span>
                <h2>
                  دليل استخدام <em>تقارير شبكتك</em>
                </h2>
                <p>
                  تعرف على آلية تصفية الإشعارات، وقاعدة الـ 120 ثانية، وكيفية تصدير التقرير أو تشغيل تطبيق الأندرويد الأصلي على هاتفك.
                </p>
              </section>

              <div className="guide-steps">
                <div className="guide-step surface">
                  <span className="guide-step-icon guide-coral">
                    <Bell size={20} />
                  </span>
                  <span className="guide-step-number">01</span>
                  <h3>1. التقاط الرسائل والإشعارات</h3>
                  <p>
                    يقوم النظام بالاستماع لإشعارات واتساب وواتساب للأعمال والرسائل النصية SMS 24 ساعة، ويطابق النص مع القاموس الصارم المعتمد.
                  </p>
                </div>

                <div className="guide-step surface">
                  <span className="guide-step-icon guide-blue">
                    <Layers size={20} />
                  </span>
                  <span className="guide-step-number">02</span>
                  <h3>2. قاعدة الـ 120 ثانية والفرز</h3>
                  <p>
                    عند إرسال العميل لعدة رسائل متتالية خلال دقيقتين، يتم دمجها معاً في تذكرة واحدة وتحديث التوقيت واستخراج كروت المايكروتك تلقائياً.
                  </p>
                </div>

                <div className="guide-step surface">
                  <span className="guide-step-icon guide-green">
                    <Printer size={20} />
                  </span>
                  <span className="guide-step-number">03</span>
                  <h3>3. إصدار التقرير للمهندس</h3>
                  <p>
                    توليد تقرير يومي منسق وجاهز للطباعة A4 أو المشاركة المباشرة مع الفني عبر واتساب لمتابعة البلاغات في الميدان.
                  </p>
                </div>
              </div>

              <div className="surface" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                  تثبيت وتشغيل التطبيق على الهاتف (PWA أوفلاين 100%)
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--app-muted)', lineHeight: '1.7' }}>
                  يدعم هذا التطبيق تقنية Progressive Web App المتقدمة، ويمكنك تثبيته كأيقونة تطبيق مستقلة على شاشة هاتفك الرئيسية عبر خيار <strong>"إضافة إلى الشاشة الرئيسية"</strong> في متصفح الهاتف أو زر <strong>تثبيت التطبيق</strong> في الشريط العلوي. يعمل التطبيق بكامل طاقته بدون اتصال بالإنترنت مع حفظ فوري ودائم للبلاغات والإعدادات في ذاكرة الهاتف المحلية.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="page-stack settings-page">
              <section className="settings-intro">
                <div className="settings-intro-icon">
                  <Settings size={21} />
                </div>
                <div>
                  <span className="section-kicker">تحكّم بالطريقة التي تناسب فريقك</span>
                  <h2>إعدادات مساحة العمل</h2>
                  <p>خصص تدفق البلاغات، وقاموس الكلمات الذكية، والبيانات الفنية للشبكة.</p>
                </div>
              </section>

              <div className="settings-grid">
                {/* Main Settings Column */}
                <div className="settings-main">
                  {/* Sources & Monitoring Card */}
                  <section className="surface settings-card">
                    <div className="section-heading">
                      <div>
                        <span className="section-kicker">التقاط وفرز الرسائل</span>
                        <h3>مصادر البلاغات</h3>
                      </div>
                      <span className="heading-icon">
                        <Smartphone size={16} />
                      </span>
                    </div>

                    <label className="setting-row">
                      <span className="setting-description">
                        <strong>مراقبة البلاغات</strong>
                        <small>إظهار حالة التفعيل والالتقاط المستمر</small>
                      </span>
                      <span className={`toggle ${config.isMonitoringActive ? 'on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={config.isMonitoringActive}
                          onChange={(e) =>
                            saveConfig({ ...config, isMonitoringActive: e.target.checked })
                          }
                        />
                        <i />
                      </span>
                    </label>

                    <div className="settings-divider" />

                    <label className="setting-row">
                      <span className="setting-description">
                        <strong>نغمة التنبيه الصوتية</strong>
                        <small>تشغيل صوت إلكتروني خفيف عند التقاط بلاغ جديد (Web Audio أوفلاين)</small>
                      </span>
                      <span className={`toggle ${config.playChimeSound ? 'on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={config.playChimeSound}
                          onChange={(e) =>
                            saveConfig({ ...config, playChimeSound: e.target.checked })
                          }
                        />
                        <i />
                      </span>
                    </label>

                    <div className="settings-divider" />

                    <label className="setting-row">
                      <span className="setting-description">
                        <strong>استثناء المودم (Modem Bypass)</strong>
                        <small>اعتماد الرسالة إذا تضمن اسم جهة الاتصال كلمة مودم</small>
                      </span>
                      <span className={`toggle ${config.modemBypassEnabled ? 'on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={config.modemBypassEnabled}
                          onChange={(e) =>
                            saveConfig({ ...config, modemBypassEnabled: e.target.checked })
                          }
                        />
                        <i />
                      </span>
                    </label>

                    <label className="form-field">
                      <span className="field-label">نص الرد التلقائي للعملاء</span>
                      <textarea
                        rows={3}
                        value={config.autoReplyTemplate}
                        onChange={(e) =>
                          saveConfig({ ...config, autoReplyTemplate: e.target.value })
                        }
                      />
                    </label>

                    <div className="notice notice-soft">
                      <ShieldCheck size={15} />
                      <span>
                        يعمل التطبيق بشكل حقيقي ومستقل أوفلاين وأونلاين، مع حفظ فوري ومستمر لكافة البلاغات والإعدادات في ذاكرة الهاتف دون أي انقطاع.
                      </span>
                    </div>
                  </section>

                  {/* Keywords Editor Card */}
                  <section className="surface settings-card">
                    <div className="section-heading">
                      <div>
                        <span className="section-kicker">تصنيف يناسب عملك</span>
                        <h3>الكلمات الدلالية</h3>
                      </div>
                      <span className="heading-icon">
                        <Zap size={16} />
                      </span>
                    </div>

                    <p className="settings-lead">
                      اكتب الكلمات الشائعة عند عملائك ليسهل توجيه كل بلاغ للنوع المناسب تلقائياً.
                    </p>

                    {/* Maintenance Keywords */}
                    <div className="keyword-block">
                      <div className="keyword-head">
                        <span className="keyword-icon maintenance">
                          <Wrench size={16} />
                        </span>
                        <div>
                          <strong>صيانة</strong>
                          <small>{keywords.maintenance.length} كلمات مضافة</small>
                        </div>
                      </div>

                      <div className="keyword-chips">
                        {keywords.maintenance.map((kw) => (
                          <span key={kw} className="keyword-chip">
                            {kw}
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword('maintenance', kw)}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}

                        <label className="keyword-add">
                          <input
                            placeholder="أضف كلمة..."
                            value={inputKwMaintenance}
                            onChange={(e) => setInputKwMaintenance(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')
                                handleAddKeyword('maintenance', inputKwMaintenance, () =>
                                  setInputKwMaintenance('')
                                );
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleAddKeyword('maintenance', inputKwMaintenance, () =>
                                setInputKwMaintenance('')
                              )
                            }
                          >
                            <Plus size={14} />
                          </button>
                        </label>
                      </div>
                    </div>

                    {/* Cards Keywords */}
                    <div className="keyword-block">
                      <div className="keyword-head">
                        <span className="keyword-icon cards">
                          <Zap size={16} />
                        </span>
                        <div>
                          <strong>كروت</strong>
                          <small>{keywords.cards.length} كلمات مضافة</small>
                        </div>
                      </div>

                      <div className="keyword-chips">
                        {keywords.cards.map((kw) => (
                          <span key={kw} className="keyword-chip">
                            {kw}
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword('cards', kw)}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}

                        <label className="keyword-add">
                          <input
                            placeholder="أضف كلمة..."
                            value={inputKwCards}
                            onChange={(e) => setInputKwCards(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')
                                handleAddKeyword('cards', inputKwCards, () => setInputKwCards(''));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleAddKeyword('cards', inputKwCards, () => setInputKwCards(''))
                            }
                          >
                            <Plus size={14} />
                          </button>
                        </label>
                      </div>
                    </div>

                    {/* Installation Keywords */}
                    <div className="keyword-block">
                      <div className="keyword-head">
                        <span className="keyword-icon installation">
                          <Wifi size={16} />
                        </span>
                        <div>
                          <strong>تركيبات</strong>
                          <small>{keywords.installations.length} كلمات مضافة</small>
                        </div>
                      </div>

                      <div className="keyword-chips">
                        {keywords.installations.map((kw) => (
                          <span key={kw} className="keyword-chip">
                            {kw}
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword('installations', kw)}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}

                        <label className="keyword-add">
                          <input
                            placeholder="أضف كلمة..."
                            value={inputKwInstallations}
                            onChange={(e) => setInputKwInstallations(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')
                                handleAddKeyword('installations', inputKwInstallations, () =>
                                  setInputKwInstallations('')
                                );
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleAddKeyword('installations', inputKwInstallations, () =>
                                setInputKwInstallations('')
                              )
                            }
                          >
                            <Plus size={14} />
                          </button>
                        </label>
                      </div>
                    </div>

                    <div className="notice notice-soft">
                      <Zap size={15} />
                      <span>
                        الكلمات محفوظة محلياً في جهازك؛ اقتراح وتصنيف البلاغات يعمل أوفلاين 100%.
                      </span>
                    </div>
                  </section>
                </div>

                {/* Side Settings Column */}
                <div className="settings-side">
                  {/* Appearance Card */}
                  <section className="surface settings-card appearance-card">
                    <div className="section-heading">
                      <div>
                        <span className="section-kicker">المظهر</span>
                        <h3>راحة للعين</h3>
                      </div>
                      <span className="heading-icon">
                        <Sun size={16} />
                      </span>
                    </div>

                    <p className="settings-lead">اختر المظهر الذي يناسب وقتك وبيئة عملك.</p>

                    <div className="theme-choice">
                      <button
                        className={!config.darkMode ? 'chosen' : ''}
                        type="button"
                        onClick={() => saveConfig({ ...config, darkMode: false })}
                      >
                        <Sun size={16} /> فاتح
                      </button>
                      <button
                        className={config.darkMode ? 'chosen' : ''}
                        type="button"
                        onClick={() => saveConfig({ ...config, darkMode: true })}
                      >
                        <Moon size={16} /> داكن
                      </button>
                    </div>
                  </section>

                  {/* General Config Card */}
                  <section className="surface settings-card">
                    <div className="section-heading">
                      <div>
                        <span className="section-kicker">البيانات الفنية</span>
                        <h3>بيانات الشبكة</h3>
                      </div>
                    </div>

                    <label className="form-field">
                      <span className="field-label">اسم الشبكة</span>
                      <input
                        type="text"
                        placeholder="شبكة الدحشة الحديثة"
                        value={config.networkName}
                        onChange={(e) => saveConfig({ ...config, networkName: e.target.value })}
                      />
                    </label>

                    <label className="form-field">
                      <span className="field-label">اسم المهندس الفني / صاحب الشبكة</span>
                      <input
                        type="text"
                        placeholder="م/عبدالمجيد"
                        value={config.engineerName}
                        onChange={(e) => saveConfig({ ...config, engineerName: e.target.value })}
                      />
                    </label>

                    <label className="form-field">
                      <span className="field-label">رقم واتساب المهندس / صاحب الشبكة</span>
                      <input
                        type="text"
                        placeholder="771141160"
                        value={config.engineerPhone}
                        onChange={(e) => saveConfig({ ...config, engineerPhone: e.target.value })}
                      />
                    </label>
                  </section>

                  {/* Developer Card */}
                  <section className="developer-card">
                    <div className="developer-top">
                      <span className="developer-avatar">أم</span>
                      <span className="developer-verified">
                        <Check size={12} strokeWidth={2} />
                      </span>
                      <div>
                        <span>تطوير الواجهة</span>
                        <strong>أحمد المنتصر</strong>
                      </div>
                    </div>

                    <a href="tel:773086403" className="developer-phone" dir="ltr">
                      <Smartphone size={15} /> 773086403
                    </a>

                    <p>بُنيت لتكون متابعة الشبكة أقرب وأسهل.</p>

                    <div className="developer-app">
                      <span className="brand-mark brand-mark-small" style={{ background: '#ffffff', padding: '2px' }}>
                        <img src="/taqareer-icon.svg" alt="شعار تقارير شبكتك" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </span>
                      <span>تقارير شبكتك</span>
                      <small>نظام معتمد 100%</small>
                    </div>
                  </section>

                  {/* Backup and Reset */}
                  <section className="surface settings-card">
                    <div className="section-heading">
                      <div>
                        <span className="section-kicker">إدارة البيانات</span>
                        <h3>النسخ الاحتياطي</h3>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      <button
                        className="button button-outline"
                        type="button"
                        onClick={() => {
                          const json = StorageService.exportBackup();
                          const blob = new Blob([json], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `نسخة_تقارير_شبكتك_${new Date().toISOString().slice(0, 10)}.json`;
                          a.click();
                          setCopiedNotification('تم تصدير النسخة الاحتياطية بنجاح');
                          setTimeout(() => setCopiedNotification(null), 2500);
                        }}
                      >
                        <Download size={14} />
                        <span>تصدير نسخة احتياطية (JSON)</span>
                      </button>

                      <label className="button button-outline" style={{ cursor: 'pointer' }}>
                        <Upload size={14} />
                        <span>استعادة نسخة احتياطية</span>
                        <input
                          type="file"
                          accept=".json"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const text = ev.target?.result as string;
                                if (text && StorageService.importBackup(text)) {
                                  setTickets(StorageService.getTickets());
                                  setConfig(StorageService.getConfig());
                                  setKeywords(StorageService.getKeywords());
                                  if (config.playChimeSound) SoundService.playSuccessChime();
                                  setCopiedNotification('تمت استعادة النسخة الاحتياطية بنجاح!');
                                  setTimeout(() => setCopiedNotification(null), 3000);
                                } else {
                                  setCopiedNotification('تعذر استعادة الملف؛ يرجى التأكد من صحة النسخة الاحتياطية.');
                                  setTimeout(() => setCopiedNotification(null), 3500);
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                        />
                      </label>

                      {isConfirmingReset ? (
                        <div
                          style={{
                            padding: '10px',
                            background: '#fff1f2',
                            borderRadius: '8px',
                            border: '1px solid var(--coral)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <span style={{ fontSize: '11px', color: '#be123c', fontWeight: 600 }}>
                            هل أنت متأكد من إعادة ضبط البيانات ومسح التعديلات؟
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="button button-small"
                              type="button"
                              style={{ background: 'var(--coral)', color: '#fff', fontWeight: 600 }}
                              onClick={() => {
                                StorageService.resetToDefault();
                                setTickets(StorageService.getTickets());
                                setConfig(StorageService.getConfig());
                                setKeywords(StorageService.getKeywords());
                                setIsConfirmingReset(false);
                                setCopiedNotification('تمت إعادة ضبط البيانات الافتراضية بنجاح');
                                setTimeout(() => setCopiedNotification(null), 2500);
                              }}
                            >
                              نعم، إعادة التعيين
                            </button>
                            <button
                              className="button button-small button-outline"
                              type="button"
                              onClick={() => setIsConfirmingReset(false)}
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="button button-ghost"
                          type="button"
                          style={{ color: 'var(--coral)' }}
                          onClick={() => setIsConfirmingReset(true)}
                        >
                          <RotateCcw size={14} />
                          <span>إعادة تعيين البيانات الافتراضية</span>
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="app-footer">
          <span>
            تقارير شبكتك <i>·</i> مساحة متابعة العملاء
          </span>
          <span>
            <span className="live-dot" /> نظام حقيقي معتمد v2.0 - جاهز للعمل أوفلاين وأونلاين
          </span>
        </footer>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="mobile-bottom-nav" aria-label="التنقل السفلي">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={19} />
          <span>الرئيسية</span>
        </button>

        <button
          className={activeTab === 'inbox' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('inbox')}
        >
          <MessageSquareText size={19} />
          <span>البلاغات</span>
        </button>

        <button
          className="mobile-nav-add"
          type="button"
          aria-label="إضافة بلاغ"
          onClick={() => setIsManualModalOpen(true)}
        >
          <Plus size={21} />
        </button>

        <button
          className={activeTab === 'reports' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('reports')}
        >
          <FileText size={19} />
          <span>التقارير</span>
        </button>

        <button
          className={activeTab === 'settings' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={19} />
          <span>الإعدادات</span>
        </button>
      </nav>

      {/* Mobile Floating Action Button (FAB) */}
      <button
        className="mobile-add-fab"
        type="button"
        aria-label="إضافة بلاغ"
        onClick={() => setIsManualModalOpen(true)}
      >
        <Plus size={22} />
      </button>

      {/* MODAL 1: TICKET DETAIL & EDIT MODAL */}
      {selectedTicket && (
        <div className="overlay" onClick={() => { setSelectedTicket(null); setIsConfirmingDeleteTicket(false); }}>
          <div className="dialog-panel detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div>
                <span className="dialog-kicker">معاينة وتعديل البلاغ</span>
                <h2>تذكرة #{selectedTicket.id.slice(-6)}</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => { setSelectedTicket(null); setIsConfirmingDeleteTicket(false); }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-customer">
              <span className="profile-avatar">
                {selectedTicket.senderName.slice(0, 1)}
              </span>
              <div>
                <strong>{selectedTicket.senderName}</strong>
                <a href={`tel:${selectedTicket.senderNumber}`} dir="ltr">
                  {selectedTicket.senderNumber}
                </a>
              </div>
              <a
                href={`https://wa.me/${selectedTicket.senderNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="button button-small button-outline"
              >
                <MessageCircle size={14} />
                <span>واتساب</span>
              </a>
            </div>

            <div className="message-original">
              <div className="message-label">
                <span>نص الرسالة الملتقطة:</span>
                <time>{new Date(selectedTicket.timestamp).toLocaleString('ar-YE')}</time>
              </div>
              <p>{selectedTicket.messageText}</p>
            </div>

            {/* Extracted MikroTik credentials box if present */}
            {(selectedTicket.extractedUsername || selectedTicket.extractedPassword) && (
              <div style={{ marginTop: '10px', padding: '10px', background: 'var(--amber-bg)', borderRadius: '10px' }}>
                <strong style={{ color: 'var(--amber)', fontSize: '11px', display: 'block', marginBottom: '3px' }}>
                  بيانات كرت المايكروتك المستخرجة بنظام RegEx:
                </strong>
                <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                  يوزر: <b>{selectedTicket.extractedUsername || '-'}</b> | باسورد: <b>{selectedTicket.extractedPassword || '-'}</b>
                </span>
              </div>
            )}

            <div className="form-row" style={{ marginTop: '12px' }}>
              <label className="form-field">
                <span className="field-label">التصنيف</span>
                <select
                  value={selectedTicket.category}
                  onChange={(e) => {
                    const updated = {
                      ...selectedTicket,
                      category: e.target.value as TicketCategory,
                    };
                    setSelectedTicket(updated);
                  }}
                >
                  <option value="maintenance">صيانة وأعطال</option>
                  <option value="cards">كروت وشحن</option>
                  <option value="installations">تركيبات ومودم</option>
                  <option value="inquiry">استفسار عام</option>
                </select>
              </label>

              <label className="form-field">
                <span className="field-label">حالة البلاغ</span>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => {
                    const updated = {
                      ...selectedTicket,
                      status: e.target.value as TicketStatus,
                    };
                    setSelectedTicket(updated);
                  }}
                >
                  <option value="new">جديد</option>
                  <option value="in_progress">قيد المعالجة</option>
                  <option value="pending">معلق</option>
                  <option value="completed">منجز</option>
                </select>
              </label>
            </div>

            <label className="form-field" style={{ marginTop: '10px' }}>
              <span className="field-label">ملاحظات مهندس الصيانة والحل</span>
              <textarea
                rows={3}
                placeholder="اكتب الإجراءات المتخذة أو المواد المستهلكة..."
                value={selectedTicket.engineerNotes || ''}
                onChange={(e) => {
                  setSelectedTicket({
                    ...selectedTicket,
                    engineerNotes: e.target.value,
                  });
                }}
              />
            </label>

            <div className="dialog-actions" style={{ justifyContent: 'space-between', marginTop: '14px' }}>
              {isConfirmingDeleteTicket ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    className="button button-small"
                    type="button"
                    style={{ background: 'var(--coral)', color: '#fff', fontWeight: 600 }}
                    onClick={() => {
                      const updated = StorageService.deleteTicket(selectedTicket.id);
                      setTickets(updated);
                      setSelectedTicket(null);
                      setIsConfirmingDeleteTicket(false);
                      setCopiedNotification('تم حذف البلاغ بنجاح');
                      setTimeout(() => setCopiedNotification(null), 2500);
                    }}
                  >
                    تأكيد الحذف
                  </button>
                  <button
                    className="button button-small button-outline"
                    type="button"
                    onClick={() => setIsConfirmingDeleteTicket(false)}
                  >
                    تراجع
                  </button>
                </div>
              ) : (
                <button
                  className="button button-ghost"
                  type="button"
                  style={{ color: 'var(--coral)' }}
                  onClick={() => setIsConfirmingDeleteTicket(true)}
                >
                  <Trash2 size={15} />
                  <span>حذف البلاغ</span>
                </button>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => {
                    setSelectedTicket(null);
                    setIsConfirmingDeleteTicket(false);
                  }}
                >
                  إلغاء
                </button>
                <button
                  className="button button-coral"
                  type="button"
                  onClick={() => {
                    const updated = StorageService.addOrUpdateTicket(selectedTicket);
                    setTickets(updated);
                    setSelectedTicket(null);
                  }}
                >
                  حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL TICKET DIALOG */}
      {isManualModalOpen && (
        <div className="overlay" onClick={() => setIsManualModalOpen(false)}>
          <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div>
                <span className="dialog-kicker">إدخال يدوي</span>
                <h2>تسجيل بلاغ جديد</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setIsManualModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="dialog-copy">
              أدخل بيانات الشكوى أو طلب العميل ليتم إدراجها فوراً في قائمة البلاغات والتقارير.
            </p>

            <form className="dialog-form" onSubmit={handleManualSubmit}>
              <div className="form-row">
                <label className="form-field">
                  <span className="field-label">اسم العميل أو المهندس</span>
                  <input
                    type="text"
                    required
                    placeholder="احمد المنتصر"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span className="field-label">رقم الهاتف</span>
                  <input
                    type="text"
                    required
                    placeholder="773086403"
                    value={manualNumber}
                    onChange={(e) => setManualNumber(e.target.value)}
                  />
                </label>
              </div>

              <label className="form-field">
                <span className="field-label">نص الشكوى أو الطلب</span>
                <textarea
                  rows={3}
                  required
                  placeholder="اكتب تفاصيل المشكلة (مثال: السلك مقطوع عند العمود أو الكرت ما يدخل)..."
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                />
              </label>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={manualAutoClassify}
                  onChange={(e) => setManualAutoClassify(e.target.checked)}
                />
                <span className={`check-box ${manualAutoClassify ? 'checked' : ''}`}>
                  {manualAutoClassify && <Check size={13} />}
                </span>
                <span>
                  <strong>التصنيف الآلي الذكي</strong>
                  <small>السماح للنظام بتحديد الفئة واستخراج كروت المايكروتك تلقائياً</small>
                </span>
              </label>

              {!manualAutoClassify && (
                <div className="form-row">
                  <label className="form-field">
                    <span className="field-label">النوع اليدوي</span>
                    <select
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value as TicketCategory)}
                    >
                      <option value="maintenance">صيانة</option>
                      <option value="cards">كروت</option>
                      <option value="installations">تركيبات</option>
                      <option value="inquiry">استفسار</option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span className="field-label">الحالة الأولية</span>
                    <select
                      value={manualStatus}
                      onChange={(e) => setManualStatus(e.target.value as TicketStatus)}
                    >
                      <option value="new">جديد</option>
                      <option value="in_progress">قيد المعالجة</option>
                      <option value="completed">منجز</option>
                    </select>
                  </label>
                </div>
              )}

              <div className="dialog-actions">
                <button className="button button-coral" type="submit">
                  تسجيل البلاغ
                </button>
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NOTIFICATION SIMULATOR DIALOG */}
      {isSimulatorOpen && (
        <div className="overlay" onClick={() => setIsSimulatorOpen(false)}>
          <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div>
                <span className="dialog-kicker">محاكاة حية</span>
                <h2>محاكي التقاط الإشعارات</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setIsSimulatorOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="dialog-copy">
              اختبر وصول رسائل واتساب أو SMS في الوقت الحقيقي ولاحظ كيف يقوم المحرك بالفرز وتطبيق قاعدة الـ 120 ثانية.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              <button
                className="button button-small button-outline"
                type="button"
                onClick={() => {
                  setSimSenderName('أبو سالم - مودم البركة');
                  setSimSenderNumber('771445566');
                  setSimMessage('الشبكة خاربة والسلك مقطوع طافية الإشارة من الصبح');
                  setSimSource('whatsapp');
                  setSimFeedback(null);
                }}
              >
                عطل صيانة
              </button>

              <button
                className="button button-small button-outline"
                type="button"
                onClick={() => {
                  setSimSenderName('ماجد القاضي');
                  setSimSenderNumber('733123456');
                  setSimMessage('الكرت مايدخل يوزر 849201 باسورد 7711 خطأ بالرصيد');
                  setSimSource('whatsapp');
                  setSimFeedback(null);
                }}
              >
                كرت مايكروتك
              </button>

              <button
                className="button button-small button-outline"
                type="button"
                onClick={() => {
                  setSimSenderName('كافيه النخبة');
                  setSimSenderNumber('711998877');
                  setSimMessage('اشتي مودم تيبلنك جديد مع التمديد والصندوق والسلم');
                  setSimSource('whatsapp_business');
                  setSimFeedback(null);
                }}
              >
                طلب تركيب مودم
              </button>

              <button
                className="button button-small button-outline"
                type="button"
                onClick={() => {
                  setSimSenderName('ماجد القاضي');
                  setSimSenderNumber('733123456');
                  setSimMessage('ونسيت أقولك ان صفحة الشبكة ماتفتح خالص');
                  setSimSource('whatsapp');
                  setSimFeedback(null);
                }}
              >
                اختبار دمج 120ث
              </button>
            </div>

            <div className="dialog-form">
              <div className="form-row">
                <label className="form-field">
                  <span className="field-label">اسم المرسل</span>
                  <input
                    type="text"
                    placeholder="احمد المنتصر"
                    value={simSenderName}
                    onChange={(e) => setSimSenderName(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span className="field-label">رقم الهاتف</span>
                  <input
                    type="text"
                    placeholder="773086403"
                    value={simSenderNumber}
                    onChange={(e) => setSimSenderNumber(e.target.value)}
                  />
                </label>
              </div>

              <label className="form-field">
                <span className="field-label">مصدر الرسالة</span>
                <select
                  value={simSource}
                  onChange={(e) => setSimSource(e.target.value as MessageSource)}
                >
                  <option value="whatsapp">واتساب (WhatsApp)</option>
                  <option value="whatsapp_business">واتساب أعمال (WhatsApp Business)</option>
                  <option value="sms">رسالة نصية SMS</option>
                </select>
              </label>

              <label className="form-field">
                <span className="field-label">نص الرسالة الواردة</span>
                <textarea
                  rows={3}
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                />
              </label>

              {simFeedback && (
                <div
                  className={`notice ${
                    !simFeedback.isAccepted
                      ? 'notice-soft'
                      : simFeedback.isMerged
                      ? 'notice-warning'
                      : 'notice-soft'
                  }`}
                  style={{
                    background: simFeedback.isAccepted ? 'var(--mint-bg)' : undefined,
                    color: simFeedback.isAccepted ? 'var(--mint)' : undefined,
                  }}
                >
                  <Info size={15} />
                  <span>{simFeedback.text}</span>
                </div>
              )}

              <div className="dialog-actions">
                <button className="button button-coral" type="button" onClick={handleRunSim}>
                  <Send size={15} />
                  <span>محاكاة الإرسال الآن</span>
                </button>
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 0: JOIN / NETWORK ONBOARDING DIALOG */}
      {isJoinModalOpen && (
        <div className="overlay" style={{ zIndex: 9999, backdropFilter: 'blur(5px)' }}>
          <div
            className="dialog-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              border: '2px solid rgba(255, 106, 112, 0.35)',
              boxShadow: '0 25px 60px rgba(26, 34, 56, 0.4)',
            }}
          >
            <div className="dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="brand-mark" style={{ width: '42px', height: '42px', background: '#ffffff', padding: '3px' }}>
                  <img src="/taqareer-icon.svg" alt="شعار تقارير شبكتك" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </span>
                <div>
                  <span className="dialog-kicker">مرحباً بك في تقارير شبكتك</span>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                    إعداد الشبكة والانضمام
                  </h2>
                </div>
              </div>
              {config.hasJoined && (
                <button
                  className="icon-button"
                  type="button"
                  aria-label="إغلاق"
                  onClick={() => setIsJoinModalOpen(false)}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <p className="dialog-copy" style={{ marginTop: '10px', fontSize: '13px', lineHeight: 1.6 }}>
              أدخل اسم شبكتك ورقم صاحب الشبكة ليتم اعتمادها في كافة أرجاء التطبيق، من شريط المتابعة العلوي وصندوق البلاغات وحتى تقارير الواتساب والـ PDF.
            </p>

            <form className="dialog-form" onSubmit={handleJoinSubmit} style={{ marginTop: '12px' }}>
              <label className="form-field">
                <span className="field-label" style={{ fontWeight: 600 }}>اسم الشبكة</span>
                <input
                  type="text"
                  required
                  placeholder="شبكة الدحشة الحديثة"
                  value={joinNetworkName}
                  onChange={(e) => setJoinNetworkName(e.target.value)}
                  style={{ fontSize: '14px', padding: '10px 12px' }}
                />
              </label>

              <div className="form-row">
                <label className="form-field">
                  <span className="field-label" style={{ fontWeight: 600 }}>اسم المهندس / صاحب الشبكة</span>
                  <input
                    type="text"
                    required
                    placeholder="م/عبدالمجيد"
                    value={joinOwnerName}
                    onChange={(e) => setJoinOwnerName(e.target.value)}
                    style={{ fontSize: '14px', padding: '10px 12px' }}
                  />
                </label>

                <label className="form-field">
                  <span className="field-label" style={{ fontWeight: 600 }}>رقم صاحب الشبكة (واتساب)</span>
                  <input
                    type="text"
                    required
                    placeholder="771141160"
                    value={joinOwnerPhone}
                    onChange={(e) => setJoinOwnerPhone(e.target.value)}
                    style={{ fontSize: '14px', padding: '10px 12px', direction: 'ltr', textAlign: 'right' }}
                  />
                </label>
              </div>

              <div
                style={{
                  background: 'var(--blue-bg)',
                  border: '1px solid rgba(79, 125, 236, 0.2)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: 'var(--blue)',
                }}
              >
                <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                <span>
                  بمجرد النقر على <strong>انضمام</strong> سيتم اعتماد هذه البيانات محلياً وبشكل دائم حتى في وضع عدم الاتصال (Offline).
                </span>
              </div>

              <div className="dialog-actions" style={{ marginTop: '16px' }}>
                <button
                  className="button button-coral full-width"
                  type="submit"
                  style={{
                    padding: '12px 20px',
                    fontSize: '15px',
                    fontWeight: 700,
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Check size={18} />
                  <span>انضمام</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {copiedNotification && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--navy)',
            color: 'white',
            padding: '10px 18px',
            borderRadius: '12px',
            zIndex: 100,
            fontSize: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}
        >
          {copiedNotification}
        </div>
      )}
    </div>
  );
}
