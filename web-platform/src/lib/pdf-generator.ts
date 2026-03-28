import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Servidor, Funcao, ExameData } from "@/types";

import { formatBirthInfo, formatDate } from "./utils";

export const generateASOPDF = (
  servidor: Servidor,
  examesConfig: ExameData,
  asoType: string,
  examDates: string[],
  operatorName: string = "USUARIO",
) => {
  const doc = new jsPDF();
  const today = new Date();
  const todayStr = today.toLocaleDateString("pt-BR");

  // Mudar fonte global para Times (que é a versão jsPDF para Times New Roman)
  doc.setFont("times", "normal");

  // 1. Header (Logo e Data)
  try {
    const logoUrl = window.location.origin + "/images/logo.png";
    doc.addImage(logoUrl, "PNG", 14, 10, 35, 15);
  } catch (e) {
    console.warn("Logo não carregado no PDF.");
  }

  doc.setFont("times", "bold");
  doc.setFontSize(11); // Aumentado
  doc.text(`Data: ${todayStr}`, 196, 18, { align: "right" });

  // 2. Títulos
  doc.setFontSize(14); // Aumentado
  doc.text("ASO - ATESTADO DE SAÚDE OCUPACIONAL", 105, 35, { align: "center" });
  doc.setFontSize(12); // Aumentado
  doc.text(`Exame ${asoType}`, 105, 41, { align: "center" });

  let y = 52;
  doc.setFontSize(12); // Alterado para 12 no bloco de identificação

  // 3. Dados de Identificação (Alinhamento em coluna para os valores)
  const valueStartX = 38; // Define um ponto fixo para o início dos valores (alinhamento vertical)

  const drawLabelValue = (
    label: string,
    value: string,
    x: number,
    currY: number,
  ) => {
    doc.setFont("times", "bold");
    doc.text(label, x, currY);
    doc.setFont("times", "normal");
    doc.text(value, valueStartX, currY); // Valores começam sempre na mesma posição X
  };

  drawLabelValue(
    "EMPRESA:",
    "PREFEITURA MUNICIPAL DE TRÊS LAGOAS - CNPJ: 03.184.041/0001-73",
    14,
    y,
  );
  y += 5.5; // Espaçamento vertical menor conforme solicitado
  drawLabelValue("NOME:", (servidor.Nome || "").toUpperCase(), 14, y);
  y += 5.5;

  // CPF, Nasc e Idade na mesma linha
  doc.setFont("times", "bold");
  doc.text("CPF:", 14, y);
  doc.setFont("times", "normal");
  const cpf = servidor["CPF."] || servidor.CPF || "";
  doc.text(cpf, valueStartX, y);

  const birthInfo = formatBirthInfo(
    servidor["Dt.Nascimento"] || servidor.nascimento,
  );
  const birthParts = birthInfo.split(" ");
  const birthDateStr = birthParts[0];
  const ageStr = birthInfo.split("(")[1]?.replace(")", "") || "";

  doc.setFont("times", "bold");
  doc.text("NASC.:", 75, y); // Ajustado para não colidir
  doc.setFont("times", "normal");
  doc.text(birthDateStr, 92, y);
  doc.text("|", 115, y);
  doc.text(ageStr, 122, y);
  y += 5.5;

  drawLabelValue("CARGO:", (servidor.Cargo || "").toUpperCase(), 14, y);
  y += 5.5;
  drawLabelValue("LOTACAO:", (servidor.Secretaria || "").toUpperCase(), 14, y);
  y += 8; // Texto NR-7 subindo para ficar mais próximo da Lotação

  // 4. Texto Legal (NR-7) - Justificado, Maior e com mais espaçamento entre linhas
  doc.setFontSize(11);
  doc.setFont("times", "normal");
  const nomeTerm = (servidor.Nome || "").toUpperCase();
  const cargoTerm = (servidor.Cargo || "").toUpperCase();
  const legalText = `Para cumprir a NR-7 aprovada pela Portaria nº 24 de 29/12/94 e alterada pela Portaria nº 8 de 08/05/96 do SST do Ministério do Trabalho e do disposto no Artigo 168 CLT atesto que o (a) Sr. (a) ${nomeTerm}, inscrito no CPF nº ${cpf}, foi por mim examinado, nesta data foi considerado para exercer a função de ${cargoTerm}:`;

  const legalLines = doc.splitTextToSize(legalText, 182);
  const lineHeight = 1.7; // Espaçamento entre linhas maior
  doc.text(legalLines, 14, y, {
    align: "justify",
    maxWidth: 182,
    lineHeightFactor: lineHeight,
  });

  // Altura aproximada do bloco texto e gap aumentado para o Apto/Inapto
  y += (legalLines.length - 1) * 6.0 + 10; // Dobrado de 7 para 14 para dar mais espaço

  // 5. Checkboxes de Aptidão
  const drawCheckbox = (x: number, currY: number, label: string) => {
    doc.rect(x, currY - 3.5, 4.5, 4.5);
    doc.setFont("times", "normal");
    doc.text(label, x + 7, currY);
  };

  drawCheckbox(14, y, "Apto");
  drawCheckbox(85, y, "Inapto (a)");
  y += 7; // Gap de 7mm

  doc.text(
    "Para executar as atividades de trabalho em altura e espaço confinado foi considerado:",
    14,
    y,
  );
  y += 8;

  drawCheckbox(14, y, "NR35 não aplicadas para essa função");
  drawCheckbox(85, y, "Apto NR 35");
  drawCheckbox(130, y, "Inapto(a) NR 35");
  y += 6;

  drawCheckbox(14, y, "NR33 não aplicadas para essa função");
  drawCheckbox(85, y, "Apto NR 33");
  drawCheckbox(130, y, "Inapto(a) NR 33");
  y += 7; // Gap reduzido para 7mm solicitado antes dos Riscos

  // 6. Riscos Ocupacionais (Usando detalhes em vez de tipos)
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("Riscos Ocupacionais da Atividade:", 14, y);
  y += 6;
  doc.setFont("times", "normal");
  doc.setFontSize(12); // Aumentado para 12 conforme solicitado
  const riscosDetalhes = examesConfig.detalhes || "NÃO CONSTA";
  const riscosLines = doc.splitTextToSize(riscosDetalhes, 182);
  doc.text(riscosLines, 14, y);
  y += riscosLines.length * 5 + 2; // Reduzido drasticamente para aproximar os blocos

  // 7. Exames submetidos
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text(
    "O funcionário conforme itens da Lei, se submeteu aos seguintes exames:",
    14,
    y,
  );
  y += 8;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  const exames = examesConfig.exames || [];
  const baseYExames = y;
  let maxSubY = y;

  for (let i = 0; i < exames.length; i++) {
    if (exames[i]) {
      const isSecondColumn = i >= 6;
      const colX = isSecondColumn ? 110 : 18; // Segunda coluna inicia em X=110
      const rowOffset = isSecondColumn ? i - 6 : i;
      const currentY = baseYExames + rowOffset * 6;

      doc.text(exames[i].toUpperCase(), colX, currentY);
      const date = examDates[i] || todayStr;
      doc.text(date, colX + 62, currentY); // Data ajustada relativamente à coluna

      if (currentY > maxSubY) maxSubY = currentY;
    }
  }
  y = maxSubY + 10;

  // 8. Mensagem LGPD e Declaração
  doc.setFontSize(10);
  const lgpdText =
    "As informações deste documento são usadas exclusivamente para fins administrativos, sendo tratadas com máxima confidencialidade e protegidas contra acessos não autorizados, em conformidade com todos os parâmetros da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).";
  const lgpdLines = doc.splitTextToSize(lgpdText, 182);
  doc.text(lgpdLines, 14, y, { align: "justify", maxWidth: 182 });
  y += lgpdLines.length * 5 + 2; // Espaçamento ainda menor para aproximar a declaração

  doc.text(
    "Declaro que estou ciente dos resultados dos exames acima, e que recebi a 2º via deste Atestado de Saúde Ocupacional",
    14,
    y,
  );
  y += 7; // Espaçamento reduzido e consistente

  // 9. Assinatura e Observações
  doc.text("Assinatura", 14, y);
  doc.line(35, y + 1, 196, y + 1);
  y += 8;
  doc.text("Observação:", 14, y);
  doc.line(38, y + 1, 196, y + 1); // 1ª Linha
  y += 6;
  doc.line(14, y + 1, 196, y + 1); // 2ª Linha
  y += 6;
  doc.line(14, y + 1, 196, y + 1); // 3ª Linha
  y += 6;
  doc.line(14, y + 1, 196, y + 1); // 4ª Linha
  y += 4; // Subindo ainda mais para ocupar o espaço da antiga 5ª linha

  // 10. Tabela Final (Bottom Box) - Agora dinâmica para não sobrepor
  let boxY = y;
  if (boxY > 257) boxY = 257;
  doc.setLineWidth(0.5);
  doc.setDrawColor(0);
  doc.rect(14, boxY, 182, 30); // Main box
  doc.line(105, boxY, 105, boxY + 30); // Vertical divider
  doc.line(14, boxY + 7, 196, boxY + 7); // First horizontal line (headers)

  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("COORDENADOR DO PCMSO", 59.5, boxY + 5, { align: "center" });
  doc.text("MÉDICO EXAMINADOR", 150.5, boxY + 5, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(12); // Aumentado para 12 conforme solicitado
  doc.text("Dr. Issam Fares Junior", 59.5, boxY + 16, { align: "center" });
  doc.text("CRM/MS 3744", 59.5, boxY + 22, { align: "center" });

  doc.line(105, boxY + 23, 196, boxY + 23); // Date horizontal line
  doc.setFontSize(12); // Aumentado para 12 conforme solicitado
  const months = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const fullDateText = `Três Lagoas/ MS ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}`;
  doc.text(fullDateText, 150.5, boxY + 28, { align: "center" });

  // 11. Rodapé Final SESMT System - Imediatamente após o bloco
  doc.setFontSize(7.5);
  doc.setFont("times", "normal");
  doc.setTextColor(119, 119, 119);
  doc.text(
    `Operador: ${operatorName} | Gerado via SESMT SYSTEM - Powered by UXBRAS®`,
    105,
    boxY + 34,
    { align: "center" },
  );

  window.open(doc.output("bloburl"), "_blank");
};

export const generateReferralPDF = (
  servidor: Servidor,
  examesConfig: ExameData,
  asoType: string,
  examDates: string[],
  operatorName: string = "USUARIO",
) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("pt-BR");
  const colors = {
    primary: [26, 51, 81] as [number, number, number], // #1A3351
    secondary: [227, 30, 36] as [number, number, number], // #E31E24
    headerBg: [245, 245, 245] as [number, number, number], // Cinza clarinho
  };

  // 1. Header com Logo e Textos Alinhados pelo Topo
  doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
  doc.rect(0, 0, 210, 32, "F");
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]); // Mudando linha para Azul
  doc.rect(0, 32, 210, 1.2, "F");

  try {
    const logoUrl = window.location.origin + "/images/logo.png";
    doc.addImage(logoUrl, "PNG", 14, 6, 45, 20);
  } catch (e) {
    console.warn("Logo não carregado no PDF.");
  }

  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("ESTADO DE MATO GROSSO DO SUL", 62, 8.5); // Alinhado com o topo do logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PREFEITURA MUNICIPAL DE TRÊS LAGOAS", 62, 13.5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("SECRETÁRIA MUNICIPAL DE GESTÃO DE PESSOAS", 62, 18);
  doc.text(
    "SESMT - SERVIÇOS ESPECIALIZADOS EM SEGURANÇA E MEDICINA DO TRABALHO",
    62,
    22.5,
  );

  // 2. Título do Documento
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.rect(14, 42, 182, 10);
  doc.text(`SOLICITAÇÃO DE EXAMES (${asoType.toUpperCase()})`, 105, 48.5, {
    align: "center",
  });

  let y = 60;
  doc.setFontSize(11); // Aumentado para 11
  doc.setFont("helvetica", "normal");
  doc.text("Ao Laboratório / Clínica Especializada,", 14, y);
  y += 12; // Pula o texto excluído e vai para o grid

  // Grid de Dados
  doc.setFont("helvetica", "bold");
  doc.text("NOME:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text((servidor.Nome || "").toUpperCase(), 35, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("CPF:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(servidor["CPF."] || servidor.CPF || "", 35, y);
  doc.setFont("helvetica", "bold");
  doc.text("DT. NASC:", 100, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    formatDate(servidor["Dt.Nascimento"] || servidor.nascimento),
    125,
    y,
  );
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("CARGO:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text((servidor.Cargo || "").toUpperCase(), 35, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("SETOR:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text((servidor.Secretaria || "").toUpperCase(), 35, y);
  y += 10;

  // Texto de Solicitação Médica
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const solicitacaoText = `Os exames abaixo são uma solicitação do médico coordenador do PCMSO Dr. Issam Fares Junior - CRM/MS 3744.`;
  doc.text(solicitacaoText, 14, y);
  y += 8;

  // Tabela de Exames (Removendo "Exame Clínico")
  const examesFiltrados = (examesConfig.exames || [])
    .filter((ex) => ex.toUpperCase().trim() !== "EXAME CLÍNICO")
    .map((ex) => [ex.toUpperCase().trim()]);

  autoTable(doc, {
    startY: y,
    head: [["EXAME SOLICITADO"]],
    body: examesFiltrados,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2, textColor: 0 },
    headStyles: { fillColor: colors.primary, textColor: 255 },
  });

  const autoTableState = doc as unknown as {
    lastAutoTable?: { finalY?: number };
  };
  y = (autoTableState.lastAutoTable?.finalY ?? y) + 15;

  // Assinatura
  doc.setDrawColor(200);
  doc.line(60, y, 150, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DPT. DE SEG. SAÚDE E QUALIDADE DE VIDA", 105, y, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.text("PREFEITURA MUNICIPAL DE TRÊS LAGOAS", 105, y + 4, {
    align: "center",
  });

  y += 20;

  y += 20;
  doc.setFontSize(11); // Diminuído para 11
  doc.text(`Três Lagoas/MS, ${today}`, 105, y, { align: "center" });

  // Rodapé
  doc.setDrawColor(200);
  doc.line(14, 278, 196, 278); // Linha divisória do rodapé

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  const footerLine1 = "R. Munir Thomé, 949, Centro, Três Lagoas - MS";
  doc.text(footerLine1, 105, 282, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Operador: ${operatorName} | Gerado via SESMT SYSTEM - Powered by UXBRAS®`,
    105,
    286,
    { align: "center" },
  );

  window.open(doc.output("bloburl"), "_blank");
};
