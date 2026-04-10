import jsPDF from "jspdf";
import { capitalizeName } from "./portaria-utils";

export interface AfastamentoPortariaData {
  numero: number;
  ano: number;
  servidor_nome: string;
  servidor_matricula: string;
  servidor_cargo: string;
  servidor_lotacao: string;
  tipo_afastamento: string;
  data_inicio: string; // DD/MM/YYYY
  data_fim: string; // DD/MM/YYYY
  data_portaria: string; // DD/MM/YYYY
  servidor_contrato?: string;
  perito_nome?: string;
  perito_crm?: string;
}

function formatDateExtended(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);

  const meses = [
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

  return `${day} de ${meses[month]} de ${year}`;
}

export function generateAfastamentoPDF(
  data: AfastamentoPortariaData,
  action: "view" | "download" = "view",
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const nomeFormatado = capitalizeName(data.servidor_nome);
  const cargoFormatado = capitalizeName(data.servidor_cargo);
  const lotacaoFormatada = capitalizeName(data.servidor_lotacao);

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 25;
  const marginRight = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 30;

  // === TÍTULO ===
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  const titulo = `PORTARIA (AFASTAMENTO) Nº ${data.numero.toString().padStart(4, "0")}/SEGP/DGP/${data.ano}`;
  doc.text(titulo, marginLeft, y);
  y += 14;

  // === PREÂMBULO ===
  doc.setFont("times", "bolditalic");
  doc.setFontSize(11);
  const preambulo = `VANESSA DOS SANTOS SÊNA, Secretária Municipal de Gestão de Pessoas da Prefeitura Municipal de Três Lagoas/MS, no uso da Competência que lhe confere o Decreto nº 1512/2025.`;
  const preambuloIndent = 70;
  const preambuloWidth = pageWidth - marginLeft - marginRight - preambuloIndent;
  const preambuloLines = doc.splitTextToSize(preambulo, preambuloWidth);
  doc.text(preambuloLines, marginLeft + preambuloIndent, y, {
    align: "justify",
    maxWidth: preambuloWidth,
  });
  y += preambuloLines.length * 6 + 10;

  // === CONSIDERANDO ===
  doc.setFont("times", "bold");
  doc.text("CONSIDERANDO ", marginLeft, y);
  doc.setFont("times", "normal");
  const considerando = `o Laudo Médico Pericial realizado por ${data.perito_nome || "Perito Oficial"} (CRM: ${data.perito_crm || "---"}), que atesta a necessidade de afastamento de suas atividades laborais.`;
  const considerandoLines = doc.splitTextToSize(
    considerando,
    contentWidth - 35,
  );
  doc.text(considerandoLines, marginLeft + 35, y, {
    align: "justify",
    maxWidth: contentWidth - 35,
  });
  y += considerandoLines.length * 6 + 10;

  // === RESOLVE ===
  doc.setFont("times", "bold");
  doc.text("RESOLVE:", marginLeft, y);
  y += 10;

  // === ARTIGO 1 ===
  doc.setFont("times", "bold");
  doc.text("Art. 1º - ", marginLeft, y);
  doc.setFont("times", "normal");
  const art1 = `Conceder o afastamento do tipo ${data.tipo_afastamento} pelo período de ${data.data_inicio} a ${data.data_fim} ao(à) servidor(a) ${nomeFormatado}, ocupante do cargo de ${cargoFormatado}, lotado(a) em ${lotacaoFormatada}.`;
  const art1Lines = doc.splitTextToSize(art1, contentWidth - 20);
  doc.text(art1Lines, marginLeft + 20, y, {
    align: "justify",
    maxWidth: contentWidth - 20,
  });
  y += art1Lines.length * 6 + 6;

  // === ARTIGO 2 ===
  doc.setFont("times", "bold");
  doc.text("Art. 2º - ", marginLeft, y);
  doc.setFont("times", "normal");
  const art2 = `Esta Portaria entra em vigor na data de sua publicação, retroagindo seus efeitos a ${data.data_inicio}.`;
  const art2Lines = doc.splitTextToSize(art2, contentWidth - 20);
  doc.text(art2Lines, marginLeft + 20, y, {
    align: "justify",
    maxWidth: contentWidth - 20,
  });
  y += 20;

  // === Local e Data ===
  const dataFormatadaExtended = formatDateExtended(data.data_portaria);
  doc.text(`Três Lagoas, ao ${dataFormatadaExtended}.`, marginLeft, y);
  y += 30;

  // === Assinatura ===
  doc.setFont("times", "bold");
  doc.text("VANESSA DOS SANTOS SÊNA", pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(11);
  doc.text("Secretária Municipal de Gestão de Pessoas", pageWidth / 2, y, {
    align: "center",
  });

  // === Rodapé Padrão (inclui aviso LGPD) ===
  doc.setFontSize(7);
  doc.setFont("times", "normal");
  doc.setTextColor(120);
  doc.text(
    "IMPORTANTE: Privacidade e Proteção de Dados (LGPD) — Uso restrito à gestão estratégica do SESMT.",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 14,
    { align: "center" },
  );
  doc.setFontSize(7.5);
  doc.setTextColor(150);
  doc.text(
    "Gerado via SESMT SYSTEM - Powered by UXBRAS®",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" },
  );

  // === Output ===
  if (action === "download") {
    doc.save(`Portaria_Afastamento_${data.numero}_${data.ano}.pdf`);
  } else {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }
}
