import { saveAs } from "file-saver";
import PizZip from "pizzip";
import { capitalizeName, getLotadoGrammar } from "./portaria-utils";
import type { AfastamentoPortariaData } from "./afastamento-portaria-pdf";

const TEMPLATE_PATH = "/templates/afastamento-portaria-template.docx";
const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

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

function getDescendantsByLocalName(
  root: Document | Element,
  localName: string,
): Element[] {
  const descendants = Array.from(root.getElementsByTagName("*")) as Element[];
  return descendants.filter((node) => node.localName === localName);
}

function getDirectChildrenByLocalName(
  root: Element,
  localName: string,
): Element[] {
  const children = Array.from(root.childNodes) as ChildNode[];
  return children.filter(
    (node): node is Element =>
      node.nodeType === Node.ELEMENT_NODE &&
      (node as Element).localName === localName,
  );
}

function getParagraphText(paragraph: Element): string {
  return getDescendantsByLocalName(paragraph, "t")
    .map((node) => node.textContent ?? "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureTextNode(run: Element): Element {
  const textNodes = getDescendantsByLocalName(run, "t");
  if (textNodes[0]) return textNodes[0];

  const textNode = run.ownerDocument.createElementNS(WORD_NS, "w:t");
  textNode.setAttributeNS(
    "http://www.w3.org/XML/1998/namespace",
    "xml:space",
    "preserve",
  );
  run.appendChild(textNode);
  return textNode;
}

function normalizeRunText(run: Element, text: string): void {
  const textNodes = getDescendantsByLocalName(run, "t");
  const target = textNodes[0] ?? ensureTextNode(run);
  target.textContent = text;

  if (text.startsWith(" ") || text.endsWith(" ")) {
    target.setAttributeNS(
      "http://www.w3.org/XML/1998/namespace",
      "xml:space",
      "preserve",
    );
  }

  for (const extra of textNodes.slice(1)) {
    extra.parentNode?.removeChild(extra);
  }
}

function setParagraphRuns(paragraph: Element, texts: string[]): void {
  const paragraphProperties =
    getDirectChildrenByLocalName(paragraph, "pPr")[0] ?? null;
  const existingRuns = getDirectChildrenByLocalName(paragraph, "r");

  for (const child of [
    ...getDirectChildrenByLocalName(paragraph, "r"),
    ...getDirectChildrenByLocalName(paragraph, "hyperlink"),
  ]) {
    paragraph.removeChild(child);
  }

  const fallbackRun = paragraph.ownerDocument.createElementNS(WORD_NS, "w:r");
  const templates = existingRuns.length > 0 ? existingRuns : [fallbackRun];
  const insertBeforeNode = paragraphProperties?.nextSibling ?? null;

  texts.forEach((text, index) => {
    const template = templates[Math.min(index, templates.length - 1)];
    const run = template.cloneNode(true) as Element;
    normalizeRunText(run, text);
    paragraph.insertBefore(run, insertBeforeNode);
  });
}

function findFirstParagraph(
  paragraphs: Element[],
  predicate: (text: string) => boolean,
): Element {
  const paragraph = paragraphs.find((candidate) =>
    predicate(getParagraphText(candidate)),
  );

  if (!paragraph) {
    throw new Error(
      "Nao foi possivel localizar um bloco esperado no template DOCX.",
    );
  }

  return paragraph;
}

function findParagraphAfter(
  paragraphs: Element[],
  startIndex: number,
  predicate: (text: string) => boolean,
): { paragraph: Element; index: number } {
  for (let index = startIndex; index < paragraphs.length; index += 1) {
    const text = getParagraphText(paragraphs[index]);
    if (predicate(text)) {
      return { paragraph: paragraphs[index], index };
    }
  }

  throw new Error(
    "Nao foi possivel localizar um bloco sequencial esperado no template DOCX.",
  );
}

function buildPortariaContent(data: AfastamentoPortariaData) {
  const nomeFormatado = capitalizeName(data.servidor_nome || "");
  const lotacaoFormatada = capitalizeName(data.servidor_lotacao || "");
  const sexoRaw = data.sexo ?? data.servidor_sexo ?? data.servidor_genero;
  const genero = sexoRaw ? String(sexoRaw).toUpperCase() : "M";
  const generoIsF = genero === "F" || genero === "FEMININO";
  const lotadoGrammar = getLotadoGrammar(
    generoIsF ? "F" : "M",
    lotacaoFormatada,
  );
  const lotacaoText = lotacaoFormatada
    ? `${lotadoGrammar} ${lotacaoFormatada}`
    : `${lotadoGrammar} Secretária Municipal de Gestão de Pessoas`;

  const art1Body = generoIsF
    ? `Fica concedido o benefício auxílio doença a Servidora Pública Municipal, a Sra. ${nomeFormatado}, matrícula ${data.servidor_matricula} ${lotacaoText}, pelo período de ${data.data_inicio} até o dia ${data.data_fim}, conforme avaliação médica.`
    : `Fica concedido o benefício auxílio doença ao Servidor Público Municipal, o Sr. ${nomeFormatado}, matrícula ${data.servidor_matricula} ${lotacaoText}, pelo período de ${data.data_inicio} até o dia ${data.data_fim}, conforme avaliação médica.`;

  return {
    titulo: `PORTARIA Nº ${String(data.numero).padStart(4, "0")}/DSSQV/SEGP/${data.ano}`,
    ementa: '"Dispõe sobre a concessão do benefício AUXÍLIO DOENÇA."',
    autoridade:
      "VANESSA DOS SANTOS SÊNA, Secretária Municipal de Gestão de Pessoas da Prefeitura Municipal de Três Lagoas/MS, no uso da Competência que lhe confere o Decreto nº 1512/2025.",
    resolve: "RESOLVE:",
    art1Label: "Art. 1º - ",
    art1Body,
    art2Label: "Art. 2º - ",
    art2Body: `Esta Portaria entra em vigor na data de sua publicação, retroagindo seus efeitos a partir de ${data.data_inicio}, revogadas as disposições em contrário.`,
    fechamento: "Registre-se, Publique-se.",
    dataCidade: `Três Lagoas, ao ${formatDateExtended(data.data_portaria)}.`,
    assinaturaNome: "VANESSA DOS SANTOS SÊNA",
    assinaturaCargo: "Secretária Municipal de Gestão de Pessoas",
  };
}

function applyTemplateContent(
  documentXml: string,
  content: ReturnType<typeof buildPortariaContent>,
): string {
  const xmlDocument = new DOMParser().parseFromString(
    documentXml,
    "application/xml",
  );
  const parserError = xmlDocument.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new Error("Falha ao interpretar o XML do template DOCX.");
  }

  const paragraphs = getDescendantsByLocalName(xmlDocument, "p");

  setParagraphRuns(
    findFirstParagraph(paragraphs, (text) => text.startsWith("PORTARIA")),
    [content.titulo],
  );
  setParagraphRuns(
    findFirstParagraph(paragraphs, (text) =>
      text.includes("Dispõe sobre a concessão do benefício"),
    ),
    [content.ementa],
  );

  const authorityMatch = findParagraphAfter(paragraphs, 0, (text) =>
    text.startsWith(
      "VANESSA DOS SANTOS SÊNA, Secretária Municipal de Gestão de Pessoas",
    ),
  );
  setParagraphRuns(authorityMatch.paragraph, [content.autoridade]);

  const resolveMatch = findParagraphAfter(
    paragraphs,
    authorityMatch.index + 1,
    (text) => text === "RESOLVE:",
  );
  setParagraphRuns(resolveMatch.paragraph, [content.resolve]);

  const art1Match = findParagraphAfter(
    paragraphs,
    resolveMatch.index + 1,
    (text) => text.startsWith("Art. 1º"),
  );
  setParagraphRuns(art1Match.paragraph, [content.art1Label, content.art1Body]);

  const art2Match = findParagraphAfter(
    paragraphs,
    art1Match.index + 1,
    (text) => text.startsWith("Art. 2º"),
  );
  setParagraphRuns(art2Match.paragraph, [content.art2Label, content.art2Body]);

  const fechamentoMatch = findParagraphAfter(
    paragraphs,
    art2Match.index + 1,
    (text) => text.includes("Registre-se, Publique-se."),
  );
  setParagraphRuns(fechamentoMatch.paragraph, [content.fechamento]);

  const dataMatch = findParagraphAfter(
    paragraphs,
    fechamentoMatch.index + 1,
    (text) => text.startsWith("Três Lagoas, ao"),
  );
  setParagraphRuns(dataMatch.paragraph, [content.dataCidade]);

  const assinaturaNomeMatch = findParagraphAfter(
    paragraphs,
    dataMatch.index + 1,
    (text) => text === "VANESSA DOS SANTOS SÊNA",
  );
  setParagraphRuns(assinaturaNomeMatch.paragraph, [content.assinaturaNome]);

  const assinaturaCargoMatch = findParagraphAfter(
    paragraphs,
    assinaturaNomeMatch.index + 1,
    (text) => text.includes("Secretária Municipal de Gestão de Pessoas"),
  );
  setParagraphRuns(assinaturaCargoMatch.paragraph, [content.assinaturaCargo]);

  return new XMLSerializer().serializeToString(xmlDocument);
}

export async function generateAfastamentoDOCX(data: AfastamentoPortariaData) {
  const response = await fetch(TEMPLATE_PATH);
  if (!response.ok) {
    throw new Error("Nao foi possivel carregar o template DOCX da portaria.");
  }

  const templateBuffer = await response.arrayBuffer();
  const zip = new PizZip(templateBuffer);
  const documentFile = zip.file("word/document.xml");

  if (!documentFile) {
    throw new Error(
      "Template DOCX invalido: word/document.xml nao encontrado.",
    );
  }

  const updatedDocumentXml = applyTemplateContent(
    documentFile.asText(),
    buildPortariaContent(data),
  );

  zip.file("word/document.xml", updatedDocumentXml);

  const blob = zip.generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const fileName = `Portaria_Afastamento_${String(data.numero).padStart(4, "0")}_${data.ano}.docx`;
  saveAs(blob, fileName);
}

export default generateAfastamentoDOCX;
