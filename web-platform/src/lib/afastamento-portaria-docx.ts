import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  BorderStyle,
  Header,
  HeightRule,
  TableLayoutType,
} from "docx";
import { saveAs } from "file-saver";
import { capitalizeName, getLotadoGrammar } from "./portaria-utils";
import type { AfastamentoPortariaData } from "./afastamento-portaria-pdf";

function formatDateExtended(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const day = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10) - 1;
  const year = Number.parseInt(parts[2], 10);

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

export async function generateAfastamentoDOCX(data: AfastamentoPortariaData) {
  const nomeFormatado = capitalizeName(data.servidor_nome || "");

  // decidir gênero conforme informação no banco
  const sexoRaw = data.sexo ?? data.servidor_sexo ?? data.servidor_genero;
  const genero = sexoRaw ? String(sexoRaw).toUpperCase() : "M";

  let art1Body: string;
  // Construir texto de lotação com fallback quando não houver informação
  const generoIsF = genero === "F" || genero === "FEMININO";
  const lotadoGrammar = getLotadoGrammar(generoIsF ? "F" : "M", data.servidor_lotacao || "");
  const lotacaoText = data.servidor_lotacao && data.servidor_lotacao.trim()
    ? `${lotadoGrammar} ${data.servidor_lotacao}`
    : `${lotadoGrammar} Secretária Municipal de Gestão de Pessoas`;

  if (generoIsF) {
    art1Body = `Fica concedido o benefício auxílio doença a Servidora Pública Municipal, a Sra. ${nomeFormatado}, matrícula ${data.servidor_matricula} ${lotacaoText}, pelo período de ${data.data_inicio} até o dia ${data.data_fim}, conforme avaliação médica.`;
  } else {
    art1Body = `Fica concedido o benefício auxílio doença ao Servidor Público Municipal, o Sr. ${nomeFormatado}, matrícula ${data.servidor_matricula} ${lotacaoText}, pelo período de ${data.data_inicio} até o dia ${data.data_fim}, conforme avaliação médica.`;
  }

  const art2 = `Esta Portaria entra em vigor na data de sua publicação, retroagindo seus efeitos a partir de ${data.data_inicio}, revogadas as disposições em contrário.`;

  const titulo = `PORTARIA Nº ${String(data.numero).padStart(4, "0")}/DSSQV/SEGP/${data.ano}`;
  const subtitle = '"Dispõe sobre a concessão do benefício AUXÍLIO DOENÇA."';

  // Função utilitária para carregar imagem pública como Uint8Array
  // Retorna também o tipo (png, jpeg, svg, gif) quando possível — necessário para ImageRun
  async function fetchImageAsUint8WithType(
    url: string,
  ): Promise<{ data: Uint8Array; type: string | null } | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") || "";
      const ctMatch = contentType.match(/image\/(png|jpe?g|gif|svg\+xml)/i);
      const fromHeader = ctMatch ? ctMatch[1].toLowerCase() : null;

      const extMatch =
        url.split("?")[0].split(".").pop()?.toLowerCase() || null;
      let extType: string | null = null;
      if (extMatch === "png") extType = "png";
      else if (extMatch === "jpg" || extMatch === "jpeg") extType = "jpeg";
      else if (extMatch === "gif") extType = "gif";
      else if (extMatch === "svg") extType = "svg";

      const ab = await res.arrayBuffer();
      return { data: new Uint8Array(ab), type: fromHeader || extType };
    } catch {
      return null;
    }
  }

  const brazaoCandidates = [
    "/imagens/BRASAO TL - AZUL.png",
    "/images/BRASAO TL - AZUL.png",
  ];
  const logoCandidates = ["/imagens/logo.png", "/images/logo.png"];

  let brazaoData: { data: Uint8Array; type: string | null } | null = null;
  let logoData: { data: Uint8Array; type: string | null } | null = null;
  for (const c of brazaoCandidates) {
    const d = await fetchImageAsUint8WithType(c);
    if (d) {
      brazaoData = d;
      break;
    }
  }
  for (const c of logoCandidates) {
    const d = await fetchImageAsUint8WithType(c);
    if (d) {
      logoData = d;
      break;
    }
  }

  // cor do cabeçalho em hex
  const headerHex = "4472A9"; // RGB(68,114,169)
  const bodyFont = "Times New Roman";
  const bodySize = 24; // 12pt -> docx size is half-points (24)
  const lineSpacing = 240; // simple spacing
  const bodyColumnIndent = 1110; // aproxima o bodyStartX do PDF
  const authorityLeftIndent = 3960; // aproxima o bloco do preâmbulo do PDF
  const articleFirstLineIndent = 709; // 1.25cm

  // montar cabeçalho como tabela (brasão | textos centrais | logo)
  const headerTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        height: { value: 900, rule: HeightRule.EXACT },
        cantSplit: true,
        tableHeader: true,
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: brazaoData
                  ? [
                      new ImageRun({
                        data: brazaoData!.data,
                        type: (brazaoData!.type as any) || 'png',
                        transformation: { width: 106, height: 64 },
                      }),
                    ]
                  : [new TextRun({ text: "" })],
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 0, line: 240 },
              }),
            ],
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: ('center' as any),
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: headerHex },
              bottom: { style: BorderStyle.NONE, size: 0, color: headerHex },
              left: { style: BorderStyle.NONE, size: 0, color: headerHex },
              right: { style: BorderStyle.NONE, size: 0, color: headerHex },
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "PREFEITURA MUNICIPAL DE TRÊS LAGOAS",
                    bold: true,
                    size: 26,
                    font: bodyFont,
                    color: headerHex,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0, line: 240 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "ESTADO DE MATO GROSSO DO SUL",
                    bold: true,
                    size: 26,
                    font: bodyFont,
                    color: headerHex,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0, line: 240 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "SECRETARIA MUNICIPAL DE GESTÃO DE PESSOAS",
                    size: 20,
                    font: bodyFont,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0, line: 240 },
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            verticalAlign: ('center' as any),
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: headerHex },
              bottom: { style: BorderStyle.NONE, size: 0, color: headerHex },
              left: { style: BorderStyle.NONE, size: 0, color: headerHex },
              right: { style: BorderStyle.NONE, size: 0, color: headerHex },
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: logoData
                  ? [
                      new ImageRun({
                        data: logoData!.data,
                        type: (logoData!.type as any) || 'png',
                        transformation: { width: 128, height: 64 },
                      }),
                    ]
                  : [new TextRun({ text: "" })],
                alignment: AlignmentType.RIGHT,
                spacing: { before: 0, after: 0, line: 240 },
              }),
            ],
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: ('center' as any),
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: headerHex },
              bottom: { style: BorderStyle.NONE, size: 0, color: headerHex },
              left: { style: BorderStyle.NONE, size: 0, color: headerHex },
              right: { style: BorderStyle.NONE, size: 0, color: headerHex },
            },
          }),
        ],
      }),
      new TableRow({
        height: { value: 120, rule: HeightRule.EXACT },
        children: [
          new TableCell({
            children: [new Paragraph({ text: "", spacing: { before: 0, after: 0, line: 240 } })],
            columnSpan: 3,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 8, color: headerHex },
              bottom: { style: BorderStyle.NONE, size: 0, color: headerHex },
              left: { style: BorderStyle.NONE, size: 0, color: headerHex },
              right: { style: BorderStyle.NONE, size: 0, color: headerHex },
            },
          }),
        ],
      }),
    ],
  });

  // Usar header real do documento para garantir posicionamento consistente
  const header = new Header({ children: [headerTable] });

  const doc = new Document({
    sections: [
      {
        // colocar o cabeçalho real do Word para garantir posicionamento
        headers: { default: header },
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 360 } },
        },
        children: [
          // Título da Portaria
          new Paragraph({
            children: [
              new TextRun({ text: titulo, bold: true, size: 26, font: bodyFont }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120, line: 240 },
          }),

          // Ementa / resumo
          new Paragraph({
            children: [new TextRun({ text: subtitle, size: bodySize, font: bodyFont })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 240, line: 240 },
          }),

          // Autoridade (deve vir antes do RESOLVE:)
          new Paragraph({
            children: [
              new TextRun({
                text: `VANESSA DOS SANTOS SÊNA, Secretária Municipal de Gestão de Pessoas da Prefeitura Municipal de Três Lagoas/MS, no uso da competência que lhe confere o Decreto nº 1512/2025.`,
                size: bodySize,
                font: bodyFont,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 0, after: 240, line: lineSpacing },
            indent: { left: authorityLeftIndent },
          }),

          // RESOLVE:
          new Paragraph({
            children: [new TextRun({ text: "RESOLVE:", bold: true, size: bodySize, font: bodyFont })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 0, after: 240, line: lineSpacing },
            indent: { left: bodyColumnIndent },
          }),

          // Artigo 1
          new Paragraph({
            children: [
              new TextRun({ text: "Art. 1º - ", bold: true, size: bodySize, font: bodyFont }),
              new TextRun({ text: art1Body, size: bodySize, font: bodyFont }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 0, after: 0, line: lineSpacing },
            indent: { firstLine: articleFirstLineIndent, left: 0, right: 0 },
          }),

          // Artigo 2
          new Paragraph({
            children: [
              new TextRun({ text: "Art. 2º - ", bold: true, size: bodySize, font: bodyFont }),
              new TextRun({ text: art2, size: bodySize, font: bodyFont }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 0, after: 240, line: lineSpacing },
            indent: { firstLine: articleFirstLineIndent, left: 0, right: 0 },
          }),

          // Fechamento / Publique-se
          new Paragraph({
            children: [new TextRun({ text: "Registre-se, Publique-se.", size: bodySize, font: bodyFont })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 0, after: 240, line: lineSpacing },
            indent: { left: bodyColumnIndent },
          }),

          // Data
          new Paragraph({
            children: [
              new TextRun({ text: `Três Lagoas, ao ${formatDateExtended(data.data_portaria)}.`, size: bodySize, font: bodyFont }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 0, after: 720, line: lineSpacing },
            indent: { left: bodyColumnIndent },
          }),

          // Assinatura
          new Paragraph({
            children: [new TextRun({ text: "VANESSA DOS SANTOS SÊNA", bold: true, size: bodySize, font: bodyFont })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Secretária Municipal de Gestão de Pessoas", size: bodySize, font: bodyFont })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
          }),
        ],
      },
    ],
  });

  const fileName = `Portaria_Afastamento_${String(data.numero).padStart(4, "0")}_${data.ano}.docx`;

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}

export default generateAfastamentoDOCX;
