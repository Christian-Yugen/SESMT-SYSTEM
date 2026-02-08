import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Servidor, Funcao, ExameData } from '@/types';

const formatBirthInfo = (dateStr?: string) => {
    if (!dateStr) return "---";
    const cleanDate = dateStr.split(' ')[0].split('T')[0];
    const parts = cleanDate.includes('-') ? cleanDate.split('-') : cleanDate.split('/');
    let day, month, year;
    if (cleanDate.includes('-')) { [year, month, day] = parts; } else { [day, month, year] = parts; }
    if (!day || !month || !year) return dateStr;
    const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} (${age} anos)`;
};

// Extend jsPDF with autotable types
interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDF;
}

export const generateASOPDF = (
    servidor: Servidor,
    exames: ExameData,
    asoType: string,
    examDates: string[]
) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const today = new Date().toLocaleDateString('pt-BR');

    // Design System (following the app's vibe)
    const colors = {
        primary: [26, 51, 81], // #1A3351
        secondary: [227, 30, 36], // #E31E24
        text: [30, 30, 30],
        gray: [150, 150, 150]
    };

    // Header
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, 210, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ATESTADO DE SAÚDE OCUPACIONAL - ASO', 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`TIPO: EXAME ${asoType.toUpperCase()}`, 105, 22, { align: 'center' });

    // Body
    let y = 40;
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

    // Section: Servidor
    doc.setFontSize(9);
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text('IDENTIFICAÇÃO DO SERVIDOR', 14, y);
    y += 5;

    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(14, y, 196, y);
    y += 7;

    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`NOME: ${servidor.Nome}`, 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text(`CPF: ${servidor["CPF."] || servidor.CPF}`, 14, y);
    doc.text(`MATRÍCULA: ${servidor.Matrícula}`, 100, y);
    y += 6;

    doc.text(`DT. NASC.: ${formatBirthInfo(servidor["Dt.Nascimento"] || servidor.nascimento)}`, 14, y);
    doc.text(`CARGO: ${servidor.Cargo}`, 100, y);
    y += 6;

    doc.text(`SECRETARIA: ${servidor.Secretaria}`, 14, y);
    y += 10;

    // Section: Riscos
    doc.setFontSize(9);
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text('RISCOS OCUPACIONAIS', 14, y);
    y += 5;
    doc.line(14, y, 196, y);
    y += 7;

    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFontSize(10);
    const riscosText = exames.riscos || "NÃO CONSTA";
    const riesgosSplit = doc.splitTextToSize(riscosText, 180);
    doc.text(riesgosSplit, 14, y);
    y += (riesgosSplit.length * 5) + 5;

    // Section: Exames
    doc.setFontSize(9);
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    doc.text('EXAMES REALIZADOS', 14, y);
    y += 5;
    doc.line(14, y, 196, y);
    y += 5;

    const examesRows = exames.exames.map((ex, i) => [ex, examDates[i] || today]);

    autoTable(doc, {
        startY: y,
        head: [['EXAME', 'DATA']],
        body: examesRows,
        theme: 'grid',
        headStyles: { fillColor: colors.primary },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 1: { cellWidth: 40, halign: 'center' } }
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Conclusion
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const conclusionText = `O servidor acima foi examinado e considerado APTO para exercer as atividades inerentes ao cargo/função.`;
    const conclusionSplit = doc.splitTextToSize(conclusionText, 180);
    doc.text(conclusionSplit, 14, y);
    y += 20;

    // Signatures
    doc.line(14, y, 90, y);
    doc.line(120, y, 196, y);
    y += 5;
    doc.setFontSize(8);
    doc.text('Assinatura do Servidor', 52, y, { align: 'center' });
    doc.text('Assinatura e Carimbo Médico', 158, y, { align: 'center' });

    // LGPD Footer
    y = 280;
    doc.setFontSize(7);
    doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
    const lgpd = "As informações deste documento são usadas exclusivamente para fins administrativos e protegidas pela LGPD (Lei 13.709/2018).";
    doc.text(lgpd, 105, y, { align: 'center' });

    // Open in new tab
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};

export const generateReferralPDF = (
    servidor: Servidor,
    exames: ExameData,
    asoType: string,
    examDates: string[]
) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const today = new Date().toLocaleDateString('pt-BR');

    const colors = {
        primary: [26, 51, 81],
        secondary: [227, 30, 36]
    };

    // Header
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ENCAMINHAMENTO DE EXAMES', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`SOLICITAÇÃO PARA EXAME ${asoType.toUpperCase()}`, 105, 22, { align: 'center' });

    let y = 45;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ao Laboratório / Clínica Especializada,`, 14, y);
    y += 10;
    doc.text(`Solicitamos a realização do(s) exame(s) abaixo relacionado(s) para o servidor:`, 14, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.text(`NOME: ${servidor.Nome}`, 14, y);
    y += 6;
    doc.text(`CPF: ${servidor["CPF."] || servidor.CPF}`, 14, y);
    y += 10;

    // Exams Table
    autoTable(doc, {
        startY: y,
        head: [['EXAME SOLICITADO']],
        body: exames.exames.map(ex => [ex]),
        theme: 'striped',
        headStyles: { fillColor: colors.primary },
        styles: { fontSize: 10, cellPadding: 3 }
    });

    y = (doc as any).lastAutoTable.finalY + 20;

    doc.setFont('helvetica', 'normal');
    doc.text(`Três Lagoas/MS, ${today}`, 105, y, { align: 'center' });
    y += 30;

    doc.line(60, y, 150, y);
    y += 5;
    doc.setFontSize(9);
    doc.text('Departamento de Saúde Ocupacional (SESMT)', 105, y, { align: 'center' });

    // Open in new tab
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};
