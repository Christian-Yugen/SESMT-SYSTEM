import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { capitalizeName } from "./portaria-utils";

export interface AfastamentoReportItem {
  servidor_nome: string;
  servidor_cpf: string;
  servidor_matricula: string;
  servidor_secretaria: string;
  tipo_afastamento: string;
  data_inicio: string;
  data_fim: string;
  dias_afastado: number | null;
  situacao: string;
  is_acidente_trabalho?: boolean;
  afastamento_cids?: { cid_codigo: string }[];
}

export function generateAfastamentosListPDF(
  records: AfastamentoReportItem[],
  options: {
    orientation: "p" | "l";
    filtersDesc?: string;
    userName?: string;
  },
) {
  const doc = new jsPDF({
    orientation: options.orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 10;

  // === CABEÇALHO SUPERIOR (LOGO E TEXTO INSTITUCIONAL) ===
  try {
    // Usa o logo fixo da prefeitura
    doc.addImage("/images/logo.png", "PNG", 10, y, 40, 20);
  } catch (e) {
    console.warn("Logo não pôde ser carregada no PDF:", e);
  }

  // Linha vertical separadora
  doc.setDrawColor(200);
  doc.line(55, y, 55, y + 20);

  // Texto Institucional (Centro-Esquerda)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("PREFEITURA TRÊS LAGOAS", 58, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("SESMT - SAÚDE OCUPACIONAL", 58, y + 12);

  // Título do Relatório (Direita)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(26, 51, 81); // Azul SESMT
  doc.text("RELATÓRIO GERENCIAL DE AFASTAMENTOS", pageWidth - 10, y + 8, {
    align: "right",
  });

  // Metadata (Direita, abaixo do título)
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  const now = new Date().toLocaleString("pt-BR");
  doc.text(
    `OP: ${options.userName?.toUpperCase() || "SISTEMA"} | ${now}`,
    pageWidth - 10,
    y + 12,
    { align: "right" },
  );

  y += 25;

  // Linhas de separação duplas conforme Imagem 2
  doc.setDrawColor(220);
  doc.line(10, y, pageWidth - 10, y);
  y += 1;
  doc.line(10, y, pageWidth - 10, y);
  y += 6;

  // === BARRA DE REGISTROS E FILTROS ===
  // "REGISTROS" com barra vermelha vertical
  doc.setFillColor(227, 30, 36);
  doc.rect(10, y - 4, 1.2, 5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(26, 51, 81);
  doc.text(`REGISTROS: `, 13, y);
  doc.setTextColor(227, 30, 36);
  doc.text(`${records.length}`, 35, y);

  // FILTROS (Direita)
  if (options.filtersDesc) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(
      `FILTROS: ${options.filtersDesc.toUpperCase()}`,
      pageWidth - 10,
      y,
      { align: "right", maxWidth: 140 },
    );
  }

  y += 5;
  doc.setDrawColor(240);
  doc.line(10, y, pageWidth - 10, y);
  y += 5;

  // === TABELA ===
  const isLandscape = options.orientation === "l";
  const head = isLandscape
    ? [
        [
          "SERVIDOR",
          "MATRÍCULA",
          "SECRETARIA",
          "TIPO",
          "INÍCIO",
          "TÉRMINO",
          "DIAS",
          "CID",
          "STATUS",
        ],
      ]
    : [["SERVIDOR", "SECRETARIA", "TIPO", "INÍCIO", "TÉRMINO", "STATUS"]];

  const body = records.map((r) => {
    const cids =
      r.afastamento_cids?.map((c) => c.cid_codigo).join(", ") || "---";
    const start = new Date(r.data_inicio + "T00:00:00").toLocaleDateString(
      "pt-BR",
    );
    const end = r.data_fim
      ? new Date(r.data_fim + "T00:00:00").toLocaleDateString("pt-BR")
      : "---";

    const typeStr = r.is_acidente_trabalho
      ? `${r.tipo_afastamento.toUpperCase()} (AT)`
      : r.tipo_afastamento.toUpperCase();

    if (isLandscape) {
      return [
        capitalizeName(r.servidor_nome),
        r.servidor_matricula,
        r.servidor_secretaria || "---",
        typeStr,
        start,
        end,
        r.dias_afastado?.toString() || "---",
        cids,
        r.situacao === "FINALIZADO" ? "FINALIZADO" : "ATIVO",
      ];
    } else {
      return [
        capitalizeName(r.servidor_nome),
        r.servidor_secretaria || "---",
        typeStr,
        start,
        end,
        r.situacao === "FINALIZADO" ? "FINALIZADO" : "ATIVO",
      ];
    }
  });

  autoTable(doc, {
    startY: y,
    head: head,
    body: body,
    theme: "grid",
    headStyles: {
      fillColor: [26, 51, 81],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: isLandscape ? 7 : 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: isLandscape ? 6.5 : 7.5,
      textColor: [60, 60, 60],
    },
    columnStyles: isLandscape
      ? {
          0: { cellWidth: 45 },
          1: { cellWidth: 15 },
          2: { cellWidth: 40 },
          4: { cellWidth: 18 },
          5: { cellWidth: 18 },
          6: { halign: "center", cellWidth: 10 },
          7: { cellWidth: 20 },
          8: { halign: "center", cellWidth: 20 },
        }
      : {
          0: { cellWidth: 50 },
          1: { cellWidth: 45 },
          2: { cellWidth: 35 },
          5: { halign: "center", cellWidth: 20 },
        },
    margin: { left: 10, right: 10 },
    styles: { overflow: "linebreak", cellPadding: 2 },
  });

  // === RODAPÉ ===
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(200);
    doc.text(
      `PÁGINA ${i} DE ${pageCount} | Gerado em ${new Date().toLocaleString("pt-BR")} via SESMT SYSTEM - Powered by UXBRAS®`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
