import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Ticket, AppConfig } from '../types';

export interface PDFExportOptions {
  networkName: string;
  engineerName: string;
  engineerPhone: string;
  tickets: Ticket[];
  title?: string;
}

export async function exportTicketsTableToPDF(options: PDFExportOptions): Promise<void> {
  const {
    networkName,
    engineerName,
    engineerPhone,
    tickets,
    title = 'جدول بلاغات وعمليات الشبكة',
  } = options;

  if (tickets.length === 0) {
    throw new Error('EMPTY_TICKETS');
  }

  // Create an off-screen container for crisp rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px'; // A4 width proportion
  container.style.background = '#ffffff';
  container.style.color = '#1e293b';
  container.style.fontFamily = "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif";
  container.style.direction = 'rtl';
  container.style.padding = '28px';
  container.style.boxSizing = 'border-box';

  const exportDate = new Date().toLocaleDateString('ar-YE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const exportTime = new Date().toLocaleTimeString('ar-YE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const maintenanceCount = tickets.filter((t) => t.category === 'maintenance').length;
  const cardsCount = tickets.filter((t) => t.category === 'cards').length;
  const installationsCount = tickets.filter((t) => t.category === 'installations').length;

  container.innerHTML = `
    <div style="border-bottom: 2px solid #202b45; padding-bottom: 14px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #202b45;">${title}</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #64748b; font-weight: 600;">${networkName}</p>
        </div>
        <div style="text-align: left; font-size: 11px; color: #64748b; line-height: 1.5;">
          <div><strong>التاريخ:</strong> ${exportDate}</div>
          <div><strong>الوقت:</strong> ${exportTime}</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 11px;">
        <div>
          <strong>المهندس المختص:</strong> ${engineerName} 
          <span style="direction: ltr; display: inline-block; margin-right: 6px; color: #0284c7; font-weight: bold;">(${engineerPhone})</span>
        </div>
        <div>
          <span>الإجمالي: <strong style="color: #202b45;">${tickets.length}</strong></span>
          <span style="margin: 0 6px; color: #cbd5e1;">|</span>
          <span>صيانة: <strong style="color: #4f7dec;">${maintenanceCount}</strong></span>
          <span style="margin: 0 6px; color: #cbd5e1;">|</span>
          <span>كروت: <strong style="color: #dc9a39;">${cardsCount}</strong></span>
          <span style="margin: 0 6px; color: #cbd5e1;">|</span>
          <span>تركيبات: <strong style="color: #34a77c;">${installationsCount}</strong></span>
        </div>
      </div>
    </div>

    <!-- The Requested Table of Tickets -->
    <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: right;">
      <thead>
        <tr style="background: #202b45; color: #ffffff;">
          <th style="padding: 9px 8px; border: 1px solid #1e293b; width: 34px; text-align: center;">م</th>
          <th style="padding: 9px 10px; border: 1px solid #1e293b; width: 140px;">اسم العميل</th>
          <th style="padding: 9px 10px; border: 1px solid #1e293b; width: 95px; text-align: center;">رقم الهاتف</th>
          <th style="padding: 9px 10px; border: 1px solid #1e293b;">نص الرسالة / البلاغ</th>
          <th style="padding: 9px 8px; border: 1px solid #1e293b; width: 68px; text-align: center;">النوع</th>
          <th style="padding: 9px 8px; border: 1px solid #1e293b; width: 68px; text-align: center;">الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${tickets
          .map((t, idx) => {
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            const catLabel =
              t.category === 'maintenance'
                ? 'صيانة'
                : t.category === 'cards'
                ? 'كروت'
                : 'تركيبات';

            const catColor =
              t.category === 'maintenance'
                ? '#4f7dec'
                : t.category === 'cards'
                ? '#d97706'
                : '#059669';

            const statusLabel =
              t.status === 'completed'
                ? 'منجز'
                : t.status === 'in_progress'
                ? 'قيد المعالجة'
                : t.status === 'pending'
                ? 'معلق'
                : 'جديد';

            const statusBg =
              t.status === 'completed'
                ? '#ecfdf5'
                : t.status === 'in_progress'
                ? '#eff6ff'
                : '#fff1f2';

            const statusColor =
              t.status === 'completed'
                ? '#047857'
                : t.status === 'in_progress'
                ? '#1d4ed8'
                : '#be123c';

            const cardInfo =
              t.extractedUsername || t.extractedPassword
                ? `<div style="margin-top: 4px; padding: 2px 6px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 4px; font-size: 9.5px; color: #92400e; font-family: monospace;">
                     يوزر: <b>${t.extractedUsername || '-'}</b> ${
                    t.extractedPassword ? `| باسورد: <b>${t.extractedPassword}</b>` : ''
                  }
                   </div>`
                : '';

            const notesInfo = t.engineerNotes
              ? `<div style="margin-top: 4px; font-size: 9.5px; color: #dc2626;">
                   <b>ملاحظة:</b> ${t.engineerNotes}
                 </div>`
              : '';

            return `
              <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #64748b;">
                  ${idx + 1}
                </td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #1e293b;">
                  ${t.senderName}
                </td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace; direction: ltr; color: #334155;">
                  ${t.senderNumber}
                </td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; line-height: 1.5; color: #334155;">
                  <div>${t.messageText}</div>
                  ${cardInfo}
                  ${notesInfo}
                </td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
                  <span style="display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9.5px; font-weight: bold; color: ${catColor}; background: ${catColor}18;">
                    ${catLabel}
                  </span>
                </td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
                  <span style="display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9.5px; font-weight: bold; color: ${statusColor}; background: ${statusBg};">
                    ${statusLabel}
                  </span>
                </td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>

    <div style="margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9.5px; color: #94a3b8;">
      <span>تم استخراج هذا التقرير آلياً بواسطة تطبيق تقارير شبكتك</span>
      <span>الصفحة 1 من 1</span>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Handle multi-page if content is long
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const safeFilename = `جدول_بلاغات_${networkName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Check if running inside native Android WebView bridge
    try {
      const bridge = (window as unknown as { AndroidBridge?: { exportFile?: (base64: string, name: string, mime: string) => void } }).AndroidBridge;
      if (bridge && typeof bridge.exportFile === 'function') {
        const dataUri = pdf.output('datauristring');
        const base64Data = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
        bridge.exportFile(base64Data, safeFilename, 'application/pdf');
      } else {
        pdf.save(safeFilename);
      }
    } catch {
      pdf.save(safeFilename);
    }
  } finally {
    document.body.removeChild(container);
  }
}
