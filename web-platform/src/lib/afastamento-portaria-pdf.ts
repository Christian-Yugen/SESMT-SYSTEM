import jsPDF from "jspdf";
import { capitalizeName, getLotadoGrammar } from "./portaria-utils";

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
  servidor_genero?: "M" | "F";
  servidor_sexo?: "M" | "F";
  sexo?: "M" | "F";
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

export async function generateAfastamentoPDF(
  data: AfastamentoPortariaData,
  action: "view" | "download" = "view",
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const nomeFormatado = capitalizeName(data.servidor_nome);
  const lotacaoFormatada = capitalizeName(data.servidor_lotacao);

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 25;
  const marginRight = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // --- Cabeçalho institucional ---
  // Nota: Arial não está embutida no bundle por questões de licença.
  // Usamos Helvetica (substituta PDF nativa) aqui; se desejar Arial
  // exato, será necessário providenciar a fonte TTF e registrá-la.
  const headerColor = [68, 114, 169];
  let y = 30;

  // Tenta carregar imagens do diretório público (client-side).
  const loadImageDataUrl = (src: string) =>
    new Promise<{ dataUrl: string; width: number; height: number }>((resolve, reject) => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas context unavailable"));
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL("image/png");
            resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error("Image load error"));
        img.src = encodeURI(src);
      } catch (e) {
        reject(e);
      }
    });

  // Só executa o cabeçalho de imagens em ambiente cliente (browser)
  if (typeof globalThis !== "undefined" && globalThis.document) {
    try {
      // caminhos corretos no projeto (pasta pública 'images')
        // caminhos candidatas (prioriza /imagens, fallback para /images)
        const brazaoCandidates = [
          "/imagens/BRASAO TL - AZUL.png",
          "/images/BRASAO TL - AZUL.png",
        ];
        const logoCandidates = ["/imagens/logo.png", "/images/logo.png"];

      // carregar imagens (await abaixo) — função pode ser chamada sem await externamente
      // para evitar regressão, encapsulamos em IIFE assíncrona sincronizada abaixo
      await (async () => {
        try {
            // tenta carregar primeiro candidato válido para cada imagem
            const loadFirst = async (candidates: string[]) => {
              for (const c of candidates) {
                try {
                  const res = await loadImageDataUrl(c);
                  if (res?.dataUrl) return res;
                } catch (e) {
                  // tentar próximo
                }
              }
              return null as null | { dataUrl: string; width: number; height: number };
            };

            const brazaoRes = await loadFirst(brazaoCandidates);
            const logoRes = await loadFirst(logoCandidates);

          const headerTop = 12; // mm
            // margens laterais específicas do cabeçalho (ajustadas conforme solicitado)
            const headerMarginLeft = 15; // mm (menor que marginLeft geral)
            const headerMarginRight = 15; // mm
            // dimensões das caixas do brasão e do logo (intermediárias: um pouco menores que o original)
            const brazaoBoxW = 28; // mm
            const brazaoBoxH = 17; // mm
            const logoBoxW = 34; // mm
            const logoBoxH = 17; // mm

          // desenha brasao à esquerda
          if (brazaoRes) {
            try {
                const imgAspect = brazaoRes.width / brazaoRes.height;
                const boxAspect = brazaoBoxW / brazaoBoxH;
                let drawW = brazaoBoxW;
                let drawH = brazaoBoxH;
                if (imgAspect > boxAspect) {
                  // imagem mais larga que caixa -> largura igual, ajustar altura
                  drawW = brazaoBoxW;
                  drawH = brazaoBoxW / imgAspect;
                } else {
                  // imagem mais alta que caixa -> altura igual, ajustar largura
                  drawH = brazaoBoxH;
                  drawW = brazaoBoxH * imgAspect;
                }
                const offsetX = headerMarginLeft + (brazaoBoxW - drawW) / 2;
                const offsetY = headerTop + (brazaoBoxH - drawH) / 2;
                doc.addImage(brazaoRes.dataUrl, "PNG", offsetX, offsetY, drawW, drawH);
            } catch (e) {
              console.warn("Falha ao inserir brasao no PDF:", e);
            }
          }

          // desenha logo à direita
          if (logoRes) {
            try {
                const imgAspect = logoRes.width / logoRes.height;
                const boxAspect = logoBoxW / logoBoxH;
                let drawW = logoBoxW;
                let drawH = logoBoxH;
                if (imgAspect > boxAspect) {
                  drawW = logoBoxW;
                  drawH = logoBoxW / imgAspect;
                } else {
                  drawH = logoBoxH;
                  drawW = logoBoxH * imgAspect;
                }
                const offsetX = pageWidth - headerMarginRight - logoBoxW + (logoBoxW - drawW) / 2;
                const offsetY = headerTop + (logoBoxH - drawH) / 2;
                doc.addImage(logoRes.dataUrl, "PNG", offsetX, offsetY, drawW, drawH);
            } catch (e) {
              console.warn("Falha ao inserir logo no PDF:", e);
            }
          }

          // blocos centrais de título (centralizados verticalmente em relação às caixas de imagem)
          const centerX = pageWidth / 2;
          const headerCenterY = headerTop + Math.max(brazaoBoxH, logoBoxH) / 2;
          doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          // posicionamento relativo ao centro do cabeçalho
          doc.text("PREFEITURA MUNICIPAL DE TRÊS LAGOAS", centerX, headerCenterY - 4, {
            align: "center",
          });
          doc.text("ESTADO DE MATO GROSSO DO SUL", centerX, headerCenterY + 2, {
            align: "center",
          });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text("SECRETARIA MUNICIPAL DE GESTÃO DE PESSOAS", centerX, headerCenterY + 8, {
            align: "center",
          });

          // linha separadora (alinha com as novas margens do cabeçalho, espaçamento reduzido em 50% em relação ao pedido anterior)
          const yLine = headerTop + Math.max(brazaoBoxH, logoBoxH) + 4;
          doc.setDrawColor(headerColor[0], headerColor[1], headerColor[2]);
          doc.setLineWidth(0.7);
          doc.line(headerMarginLeft, yLine, pageWidth - headerMarginRight, yLine);

          // ajustar posição inicial do conteúdo
          y = yLine + 10;
          // após desenhar o cabeçalho, volta a cor do texto para preto para o restante do documento
          doc.setTextColor(0, 0, 0);
        } catch (e) {
          console.warn("Erro ao configurar cabeçalho do PDF:", e);
          y = 30;
        }
      })();
    } catch (e) {
      console.warn("Erro ao iniciar rotina de cabeçalho do PDF:", e);
      y = 30;
    }
  }

  // === TÍTULO ===
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  const titulo = `PORTARIA Nº ${data.numero.toString().padStart(4, "0")}/DSSQV/SEGP/${data.ano}`;
  const centerX = pageWidth / 2;
  doc.text(titulo, centerX, y, { align: "center" });
  y += 14;

  // linha fixa centralizada entre título e preâmbulo (com aspas e espaçamento aumentado)
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  const subtitle = '"Dispõe sobre a concessão do benefício AUXÍLIO DOENÇA."';
  doc.text(subtitle, centerX, y, { align: "center" });
  // aumentar padding vertical entre esta linha e o preâmbulo
  y += 16;

  // === Configurações tipográficas do CORPO da portaria ===
  // usar Times (substituto técnico disponível para Times New Roman), 12pt e espaçamento 1.5
  // Observação: embedding de Times New Roman (.ttf) não está sendo realizado aqui;
  // usamos a fonte interna 'times' do jsPDF como alternativa mais fiel.
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  const _fontSizePt = 12;
  const _mmPerPt = 25.4 / 72; // mm por ponto
  const lineHeight = _fontSizePt * _mmPerPt * 1.5; // altura da linha em mm (1.5x)
  // garantir que o renderer interno do jsPDF use 1.5 como line-height factor por padrão
  if (typeof doc.setLineHeightFactor === "function") doc.setLineHeightFactor(1.5);
  const bodyStartX = marginLeft + 20; // coluna inicial do texto corrido do corpo (alinhamento comum)
  const bodyMaxWidth = pageWidth - bodyStartX - marginRight;

  // === PREÂMBULO ===
  doc.setFont("times");
  // manter estilo em bolditalic, mas usar tamanho 12 conforme especificação do corpo
  doc.setFontSize(12);
  const preambulo = `VANESSA DOS SANTOS SÊNA, Secretária Municipal de Gestão de Pessoas da Prefeitura Municipal de Três Lagoas/MS, no uso da Competência que lhe confere o Decreto nº 1512/2025.`;
  const preambuloIndent = 70;
  const preambuloWidth = pageWidth - marginLeft - marginRight - preambuloIndent;
  const preambuloLines = doc.splitTextToSize(preambulo, preambuloWidth);
  doc.text(preambuloLines, marginLeft + preambuloIndent, y, {
    align: "justify",
    maxWidth: preambuloWidth,
  });
  y += preambuloLines.length * lineHeight + lineHeight;

  /* // === CONSIDERANDO ===
  doc.setFont("times", "bold");
  doc.text("CONSIDERANDO ", marginLeft, y);
  doc.setFont("times", "normal");
  const considerando = `o Laudo Médico Pericial realizado por ${data.perito_nome || "Perito Oficial"} (CRM: ${data.perito_crm || "---"}), que atesta a necessidade de afastamento de atividades laborais.`;
  const considerandoLines = doc.splitTextToSize(
    considerando,
    contentWidth - 35,
  );
  doc.text(considerandoLines, marginLeft + 35, y, {
    align: "justify",
    maxWidth: contentWidth - 35,
  });
  y += considerandoLines.length * lineHeight + lineHeight;*/

  // === RESOLVE ===
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  // alinhar RESOLVE com a coluna do corpo (início do texto corrido)
  doc.text("RESOLVE:", bodyStartX, y);
  // adicionar parágrafo em branco entre 'RESOLVE' e o início do Art.1
  y += lineHeight * 2;

  // === ARTIGO 1 ===
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("Art. 1º - ", marginLeft, y);
  doc.setFont("times", "normal");
  // decidir gênero conforme informação no banco (coluna `sexo` ou variantes)
  const sexoRaw2 = data.sexo ?? data.servidor_sexo ?? data.servidor_genero;
  // Forçar uso estrito: 'F' => feminino, tudo o mais => masculino (evita formas neutras ambíguas)
  const genero2 = sexoRaw2 ? String(sexoRaw2).toUpperCase() : "M";
  if (!sexoRaw2) console.warn("Aviso: sexo do servidor não informado; assumindo masculino por padrão.");
  let art1Body: string;
  if (genero2 === "F" || genero2 === "FEMININO") {
    const lotadoGrammar = getLotadoGrammar("F", data.servidor_lotacao || "");
    art1Body = `Fica concedido o benefício auxílio doença a Servidora Pública Municipal, a Sra. ${nomeFormatado}, matrícula ${data.servidor_matricula} ${lotadoGrammar} ${lotacaoFormatada}, pelo período de ${data.data_inicio} até o dia ${data.data_fim}, conforme avaliação médica.`;
  } else {
    const lotadoGrammar = getLotadoGrammar("M", data.servidor_lotacao || "");
    art1Body = `Fica concedido o benefício auxílio doença ao Servidor Público Municipal, o Sr. ${nomeFormatado}, matrícula ${data.servidor_matricula} ${lotadoGrammar} ${lotacaoFormatada}, pelo período de ${data.data_inicio} até o dia ${data.data_fim}, conforme avaliação médica.`;
  }
  const art1Lines = doc.splitTextToSize(art1Body, bodyMaxWidth);
  // aumentar espaçamento interno das linhas apenas para os artigos (visual mais arejado)
  const articleLineFactor = 1.8;
  const articleLineHeight = _fontSizePt * _mmPerPt * articleLineFactor;
  if (typeof doc.setLineHeightFactor === "function") doc.setLineHeightFactor(articleLineFactor);
  doc.text(art1Lines, bodyStartX, y, { align: "justify", maxWidth: bodyMaxWidth });
  y += art1Lines.length * articleLineHeight + articleLineHeight;
  // restaurar fator padrão do corpo
  if (typeof doc.setLineHeightFactor === "function") doc.setLineHeightFactor(1.5);

  // === ARTIGO 2 ===
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("Art. 2º - ", marginLeft, y);
  doc.setFont("times", "normal");
  const art2 = `Esta Portaria entra em vigor na data de sua publicação, retroagindo seus efeitos a partir de ${data.data_inicio}, revogadas as disposições em contrário.`;
  const art2Lines = doc.splitTextToSize(art2, bodyMaxWidth);
  if (typeof doc.setLineHeightFactor === "function") doc.setLineHeightFactor(articleLineFactor);
  doc.text(art2Lines, bodyStartX, y, { align: "justify", maxWidth: bodyMaxWidth });
  // aplicar espaçamento aumentado para Art.2 (mesma lógica do Art.1)
  y += art2Lines.length * articleLineHeight + articleLineHeight;
  // restaurar fator padrão do corpo
  if (typeof doc.setLineHeightFactor === "function") doc.setLineHeightFactor(1.5);
  // texto fixo entre Art.2 e Local/Data (alinhado com coluna do corpo)
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text("Registre-se, Publique-se.", bodyStartX, y);
  // manter o mesmo espaçamento entre 'Registre-se' e o local/data que existe entre Art.2 e 'Registre-se'
  y += articleLineHeight * 2;

  // === Local e Data ===
  const dataFormatadaExtended = formatDateExtended(data.data_portaria);
  doc.text(`Três Lagoas, ao ${dataFormatadaExtended}.`, bodyStartX, y);
  y += lineHeight * 5;

  // === Assinatura ===
  doc.setFont("times");
  doc.text("VANESSA DOS SANTOS SÊNA", pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(11);
  doc.text("Secretária Municipal de Gestão de Pessoas", pageWidth / 2, y, {
    align: "center",
  });

  /*// === Rodapé Padrão (inclui aviso LGPD) ===
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
  );*/

  // === Output ===
  if (action === "download") {
    doc.save(`Portaria_Afastamento_${data.numero}_${data.ano}.pdf`);
  } else {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }
}
