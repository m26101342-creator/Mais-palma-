
import { jsPDF } from "jspdf";
import { Transaction, PDFSettings } from "../types";

export interface PDFItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const COMPANY_INFO = {
  mainTitle: "MAIS PALMA",
  subTitle: "Lavagem e higienização a seco", 
  slogan1: "Limpeza de Residências, Escritórios e Estabelecimentos Comerciais.",
  slogan2: "Mais Palma – Qualidade, cuidado e confiança!",
  line1: "Via A1, por detrás da DSTV",
  nif: "5002306565",
  phones: "923 591 743 | 976 050 712",
  location: "Talatona, Luanda - Angola",
  email: "mp@maispalma.ao",
  
  // Bancários
  bankName: "BAI",
  iban: "AO06 0006 0000 1720 2092 301 42",
  express: "923 591 743",
  logoUrl: "https://i.postimg.cc/6q6K9xSV/Imagotipo_V_2.png" 
};

const COLORS = {
  navy: "#211D49",
  yellow: "#F3A421",
  white: "#FFFFFF",
  lightGray: "#F3F4F6",
  darkGray: "#374151",
  border: "#E5E7EB"
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val).replace(/\s/g, '.').replace(',', ',');
};

const formatCurrencyAOA = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

// Helper to load image as base64
const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject("Canvas context error");
      }
    };
    img.onerror = () => {
      console.warn("Could not load logo, generating PDF without it.");
      resolve(""); 
    };
  });
};

const generateCommercialDocument = async (
    docType: "PRÓ-FORMA" | "FACTURA/RECIBO",
    docNumber: string,
    clientName: string,
    clientPhone: string | undefined,
    clientAddress: string | undefined,
    items: PDFItem[],
    fileNamePrefix: string,
    settings?: PDFSettings,
    refQuote?: string // New optional parameter for invoices
): Promise<File> => {
  const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
  });

  const config = settings || {
      logoX: 10,
      logoY: 6, 
      logoWidth: 70, 
      logoHeight: 45 
  };

  const logoData = await loadImage(COMPANY_INFO.logoUrl);
  const today = new Date();
  const dateStr = today.toLocaleDateString('pt-AO');

  const drawSectionHeader = (text: string, x: number, y: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.navy);
      doc.text(text.toUpperCase(), x, y);
      doc.setDrawColor(COLORS.yellow);
      doc.setLineWidth(0.5);
      doc.line(x, y + 2, x + 10, y + 2); 
  };

  const leftX = config.logoX;
  const rightX = 200; 
  let currentY = config.logoY;

  // 1. LOGO & HEADER
  if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', leftX, currentY, config.logoWidth, config.logoHeight); 
      } catch (e) { console.error(e); }
  }

  // Título e Meta Dados (Direita)
  let headerRightY = currentY + 10; 
  const displayTitle = docType === "PRÓ-FORMA" ? "ORÇAMENTO" : "FACTURA/RECIBO";
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(COLORS.yellow);
  doc.text(displayTitle, rightX, headerRightY + 6, { align: "right" }); 
  
  headerRightY += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.navy);
  
  // Exibir Número do Documento
  doc.text(`${docNumber}`, rightX, headerRightY, { align: "right" });
  headerRightY += 5;

  // Se for Factura/Recibo, mostra a referência do orçamento
  if (docType === "FACTURA/RECIBO" && refQuote) {
    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(9);
    doc.setTextColor(COLORS.darkGray);
    // Explicitly showing the linked quote number
    doc.text(`Ref. Orçamento: ${refQuote}`, rightX, headerRightY, { align: "right" });
    headerRightY += 5;
  }
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.darkGray);
  doc.text(`Data: ${dateStr}`, rightX, headerRightY, { align: "right" });


  // 2. DETALHES EMPRESA E CLIENTE
  let leftContentY = config.logoY + config.logoHeight - 6;
  let rightContentY = headerRightY + 15;

  // -- Empresa --
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.navy); 
  doc.text(COMPANY_INFO.subTitle, leftX + 2, leftContentY);
  leftContentY += 5; 

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.darkGray);
  doc.text(COMPANY_INFO.line1, leftX + 2, leftContentY); leftContentY += 4;
  doc.text(`Nº de Contribuinte: ${COMPANY_INFO.nif}`, leftX + 2, leftContentY); leftContentY += 4;
  doc.text(`Tel. ${COMPANY_INFO.phones}`, leftX + 2, leftContentY); leftContentY += 4;
  doc.text(COMPANY_INFO.location, leftX + 2, leftContentY); leftContentY += 4;
  doc.text(`E-mail: ${COMPANY_INFO.email}`, leftX + 2, leftContentY);

  // -- Cliente --
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.navy);
  doc.text("DADOS DO CLIENTE", rightX, rightContentY, { align: "right" });
  doc.setDrawColor(COLORS.yellow);
  doc.setLineWidth(0.5);
  doc.line(rightX, rightContentY + 2, rightX - 10, rightContentY + 2); 
  
  rightContentY += 6;

  // Saudação atualizada
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.navy);
  doc.text("Exmo(a) Sr(a)", rightX, rightContentY, { align: "right" });
  rightContentY += 5;

  doc.setFontSize(11);
  doc.text(clientName.toUpperCase(), rightX, rightContentY, { align: "right" }); 
  rightContentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.darkGray);

  const phoneText = clientPhone ? clientPhone : "----------------";
  doc.text(`Tel: ${phoneText}`, rightX, rightContentY, { align: "right" });
  rightContentY += 4;

  const addressText = clientAddress ? clientAddress : "----------------";
  const addressLines = doc.splitTextToSize(addressText, 80); 
  doc.text(addressLines, rightX, rightContentY, { align: "right" });
  rightContentY += (addressLines.length * 4);

  doc.text("LUANDA - ANGOLA", rightX, rightContentY, { align: "right" });


  // 3. TABELA
  let tableY = Math.max(leftContentY, rightContentY) + 15;

  doc.setFillColor(COLORS.navy);
  doc.roundedRect(10, tableY, 190, 10, 2, 2, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.white);
  
  const colDesc = 15;
  const colPrice = 130;
  const colQty = 160;
  const colTotal = 195;

  doc.text("DESCRIÇÃO DO SERVIÇO", colDesc, tableY + 6.5);
  doc.text("PREÇO UNIT.", colPrice, tableY + 6.5, { align: "right" });
  doc.text("QTD", colQty, tableY + 6.5, { align: "center" });
  doc.text("TOTAL", colTotal, tableY + 6.5, { align: "right" });

  let pointerY = tableY + 15; 
  let totalLiquido = 0;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.darkGray);

  items.forEach((item, index) => {
      if (index % 2 === 0) {
          doc.setFillColor("#F9FAFB");
          doc.rect(10, pointerY - 5, 190, 8, 'F');
      }

      doc.text(item.description, colDesc, pointerY);
      doc.text(formatCurrencyAOA(item.unitPrice), colPrice, pointerY, { align: "right" });
      doc.text(item.quantity.toString(), colQty, pointerY, { align: "center" });
      doc.text(formatCurrencyAOA(item.total), colTotal, pointerY, { align: "right" });

      totalLiquido += item.total;
      pointerY += 8;
  });

  doc.setDrawColor(COLORS.border);
  doc.line(10, pointerY - 2, 200, pointerY - 2);

  // 4. RODAPÉ & TOTAIS
  const footerStart = pointerY + 10;
  const paymentY = footerStart;
  
  drawSectionHeader("Informações de Pagamento", 10, paymentY);
  
  const payBoxY = paymentY + 5;
  doc.setFillColor("#F9FAFB");
  doc.roundedRect(10, payBoxY, 110, 35, 2, 2, 'F'); 
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.darkGray);
  
  let infoPayY = payBoxY + 8;
  const lineHeight = 6;

  doc.setFont("helvetica", "bold");
  doc.text("Multicaixa Express:", 15, infoPayY);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_INFO.express.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'), 45, infoPayY); 
  
  infoPayY += lineHeight;
  doc.setFont("helvetica", "bold");
  doc.text("Pagamento em dinheiro", 15, infoPayY);
  
  infoPayY += lineHeight;
  doc.setFont("helvetica", "bold");
  doc.text("Transferência Bancária:", 15, infoPayY);
  
  infoPayY += 5; 
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9); 
  doc.setTextColor(COLORS.navy);
  doc.text(COMPANY_INFO.iban, 15, infoPayY); 
  
  const totalBoxX = 130;
  const totalBoxY = paymentY + 5;
  
  doc.setFillColor(COLORS.navy);
  doc.roundedRect(totalBoxX, totalBoxY + 15, 70, 18, 2, 2, 'F');
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLORS.darkGray);
  doc.text("Subtotal", 135, totalBoxY + 10);
  doc.text(formatCurrencyAOA(totalLiquido), 195, totalBoxY + 10, { align: "right" });

  doc.setTextColor(COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("TOTAL A PAGAR", 135, totalBoxY + 21); 

  doc.setFontSize(14);
  doc.text(formatCurrencyAOA(totalLiquido) + " Kz", 195, totalBoxY + 29, { align: "right" }); 

  // 5. ASSINATURA / RODAPÉ FINAL
  const pageBottom = 280;
  let footerY = pageBottom;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLORS.darkGray);
  doc.setDrawColor(COLORS.yellow);
  doc.setLineWidth(1);
  doc.line(10, footerY - 5, 200, footerY - 5);

  doc.text("Obrigado pela preferência!", 105, footerY, { align: "center" });
  footerY += 4;
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_INFO.slogan1, 105, footerY, { align: "center" });
  footerY += 4;
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.slogan2, 105, footerY, { align: "center" });
  footerY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Documento processado por computador.", 105, footerY, { align: "center" });

  const timestamp = Math.floor(Date.now() / 1000);
  const finalFileName = `${fileNamePrefix}_${clientName.replace(/\s+/g, '_')}_${timestamp}.pdf`;
  
  doc.save(finalFileName);
  const blob = doc.output('blob');
  return new File([blob], finalFileName, { type: 'application/pdf' });
};

// Takes specific document ID now
export const generateQuotePDF = async (clientName: string, clientPhone: string | undefined, clientAddress: string | undefined, items: PDFItem[], docId: string, settings?: PDFSettings): Promise<File> => {
    return await generateCommercialDocument("PRÓ-FORMA", docId, clientName, clientPhone, clientAddress, items, "Orcamento", settings);
};

// Takes specific document ID and reference Quote ID
export const generateInvoicePDF = async (clientName: string, clientPhone: string | undefined, clientAddress: string | undefined, items: PDFItem[], docId: string, refQuoteId: string | undefined, settings?: PDFSettings): Promise<File> => {
    return await generateCommercialDocument("FACTURA/RECIBO", docId, clientName, clientPhone, clientAddress, items, "Factura", settings, refQuoteId);
};

export const generateMonthlyReportPDF = async (
    monthName: string,
    summary: { revenue: number, expenses: number, netProfit: number, realProfit: number },
    transactions: Transaction[]
): Promise<File> => {
    const doc = new jsPDF();
    doc.setFont("helvetica");

    doc.setFillColor(COLORS.navy);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor("#FFFFFF");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO MENSAL", 105, 12, { align: "center" });
    
    doc.setTextColor(COLORS.navy);
    doc.setFontSize(10);
    doc.text(`Período: ${monthName.toUpperCase()}`, 15, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-AO')}`, 195, 30, { align: "right" });

    let y = 40;

    doc.setFillColor(COLORS.lightGray);
    doc.roundedRect(15, y, 180, 25, 2, 2, 'F');
    doc.setFontSize(10);
    doc.text("ENTRADAS", 30, y + 8);
    doc.text("SAÍDAS", 90, y + 8);
    doc.text("LUCRO LÍQ.", 150, y + 8);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor("#16A34A"); 
    doc.text(formatCurrency(summary.revenue), 30, y + 18);
    doc.setTextColor("#DC2626"); 
    doc.text(formatCurrency(summary.expenses), 90, y + 18);
    doc.setTextColor(COLORS.navy);
    doc.text(formatCurrency(summary.netProfit), 150, y + 18);

    y += 35;

    doc.setFillColor(COLORS.navy);
    doc.roundedRect(15, y, 180, 8, 2, 2, 'F');
    doc.setTextColor("#FFFFFF");
    doc.setFontSize(8);
    doc.text("DATA", 20, y + 5);
    doc.text("DESCRIÇÃO", 50, y + 5);
    doc.text("VALOR", 185, y + 5, { align: 'right' });

    y += 10;
    doc.setTextColor("#000000");
    doc.setFont("helvetica", "normal");

    transactions.forEach((t, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(COLORS.lightGray); doc.rect(15, y - 4, 180, 6, 'F'); }
        
        doc.text(new Date(t.date).toLocaleDateString('pt-AO'), 20, y);
        doc.text(t.description.substring(0, 50), 50, y);
        
        if (t.type === 'ENTRY') doc.setTextColor("#16A34A");
        else doc.setTextColor("#DC2626");
        
        doc.text(formatCurrency(t.amount), 185, y, { align: 'right' });
        doc.setTextColor("#000000");
        y += 6;
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const finalFileName = `Relatorio_${monthName}_${timestamp}.pdf`;
    doc.save(finalFileName);
    const blob = doc.output('blob');
    return new File([blob], finalFileName, { type: 'application/pdf' });
};
