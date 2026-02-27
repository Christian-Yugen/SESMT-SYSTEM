import jsPDF from 'jspdf';
import { getLotadoGrammar, capitalizeName } from './portaria-utils';

export interface PortariaData {
    numero: number;
    ano: number;
    servidor_nome: string;
    servidor_matricula: string;
    servidor_cargo: string;
    servidor_lotacao: string;
    servidor_genero: 'M' | 'F';
    periodo_inicio: string; // DD/MM/YYYY
    periodo_fim: string;    // DD/MM/YYYY
    data_portaria: string;  // DD/MM/YYYY
}

function formatDateExtended(dateStr: string): string {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);

    const meses = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    return `${day} de ${meses[month]} de ${year}`;
}

export function generatePortariaPDF(data: PortariaData, action: 'view' | 'download' = 'view') {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Formatação de dados para Title Case (ponto 1, 2, 3)
    const nomeFormatado = capitalizeName(data.servidor_nome);
    const cargoFormatado = capitalizeName(data.servidor_cargo);
    const lotacaoFormatada = capitalizeName(data.servidor_lotacao);

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 25;
    const marginRight = 25;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let y = 30;

    // === TÍTULO ===
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    const titulo = `PORTARIA Nº ${data.numero.toString().padStart(4, '0')}/SEGP/DGP/${data.ano}`;
    doc.text(titulo, pageWidth / 2, y, { align: 'center' });
    y += 14;

    // === PREÂMBULO (itálico e recuado à direita - ponto 7, 8) ===
    doc.setFont('times', 'bold');
    doc.setFontSize(11); // Aumentado levemente
    const preambulo = `VANESSA DOS SANTOS SÊNA, Secretária Municipal de Gestão de Pessoas da Prefeitura Municipal de Três Lagoas/MS, no uso da Competência que lhe confere o Decreto nº 1512/2025.`;

    // Recuo de 1/3 da página para a esquerda (ficando na direita)
    const preambuloIndent = 70;
    const preambuloWidth = pageWidth - marginLeft - marginRight - preambuloIndent; // Corrigido: adicionado marginRight
    const preambuloLines = doc.splitTextToSize(preambulo, preambuloWidth);

    doc.text(preambuloLines, marginLeft + preambuloIndent, y, { align: 'justify', maxWidth: preambuloWidth });
    y += preambuloLines.length * 6 + 10; // Aumentado espaçamento

    // === CONSIDERANDO (ponto 9) ===
    doc.setFont('times', 'bold');
    doc.setFontSize(12); // Aumentado para 12
    doc.text('CONSIDERANDO', marginLeft, y);
    doc.setFont('times', 'normal');
    const considerandoResto = ' os requisitos exigidos em lei e avaliação realizada pelo órgão de perícia (SESMT);';
    const considerandoWidth = doc.getTextWidth('CONSIDERANDO');
    doc.text(considerandoResto, marginLeft + considerandoWidth, y);
    y += 12; // Aumentado espaçamento

    // === RESOLVE ===
    doc.setFont('times', 'bold');
    doc.setFontSize(12); // Aumentado para 12
    doc.text('RESOLVE:', marginLeft, y);
    y += 12; // Aumentado espaçamento

    // === ARTIGO 1 (ponto 5, 10, 11) ===
    const indentLeft = marginLeft + 8;
    const indentWidth = contentWidth - 8;

    const generoArtigo = data.servidor_genero === 'F' ? 'a servidora' : 'o servidor';
    const generoPublica = data.servidor_genero === 'F' ? 'Pública Municipal' : 'Público Municipal';
    const lotadoGrammar = getLotadoGrammar(data.servidor_genero, lotacaoFormatada);

    doc.setFontSize(12); // Aumentado para 12pt
    doc.setFont('times', 'bold');
    doc.text('Art. 1º - ', indentLeft, y);
    const art1LabelWidth = doc.getTextWidth('Art. 1º - ');

    doc.setFont('times', 'normal');
    // Adicionado espaço após a vírgula (ponto 10)
    const art1Text = `Fica concedido pelo período de ${data.periodo_inicio} a ${data.periodo_fim} o ABONO SALARIAL, conforme Lei Municipal nº 1.562/1999, com alterações dadas pela Lei nº 3.353/2017, ${generoArtigo} ${generoPublica} ${nomeFormatado}, matrícula ${data.servidor_matricula}, no cargo de ${cargoFormatado}, ${lotadoGrammar} ${lotacaoFormatada}.`;

    // Reduzimos a largura para compensar a largura extra do negrito de forma mais segura
    const art1Lines = doc.splitTextToSize(art1Text, indentWidth - 4);

    // Função auxiliar para renderizar linhas justificadas com suporte a negrito
    const renderJustifiedWithBold = (lines: string[], startY: number, fullWidth: number, startX: number, labelWidth: number = 0, boldParts: string[] = []) => {
        let currentY = startY;
        doc.setFont('times', 'normal');
        const spaceWidthNormal = doc.getTextWidth(' ');

        lines.forEach((line, index) => {
            const isFirstLine = index === 0;
            const currentX = isFirstLine ? startX + labelWidth : startX;
            const activeWidth = isFirstLine ? fullWidth - labelWidth : fullWidth;
            const isLastLine = index === lines.length - 1;

            const words = line.trim().split(/\s+/);
            if (words.length <= 1 || isLastLine) {
                // Linha única ou última linha: alinhamento à esquerda
                let xOffset = currentX;
                words.forEach((word) => {
                    const isBold = boldParts.some(bp => word.includes(bp));
                    doc.setFont('times', isBold ? 'bold' : 'normal');
                    doc.text(word, xOffset, currentY);
                    xOffset += doc.getTextWidth(word) + spaceWidthNormal;
                });
            } else {
                // Justificar linha
                const totalWordsWidth = words.reduce((acc, word) => {
                    const isBold = boldParts.some(bp => word.includes(bp));
                    doc.setFont('times', isBold ? 'bold' : 'normal');
                    return acc + doc.getTextWidth(word);
                }, 0);

                const totalSpaceWidth = activeWidth - totalWordsWidth;
                const spaceWidth = totalSpaceWidth / (words.length - 1);

                let xOffset = currentX;
                words.forEach((word) => {
                    const isBold = boldParts.some(bp => word.includes(bp));
                    doc.setFont('times', isBold ? 'bold' : 'normal');
                    doc.text(word, xOffset, currentY);
                    xOffset += doc.getTextWidth(word) + spaceWidth;
                });
            }
            currentY += 6.5; // Espaçamento entre linhas ajustado para fonte 12
        });
        return currentY;
    };

    const ABONO_SALARIAL_LABEL = 'ABONO SALARIAL';
    const boldParts = [data.periodo_inicio, data.periodo_fim, ABONO_SALARIAL_LABEL, nomeFormatado];
    y = renderJustifiedWithBold(art1Lines, y, indentWidth, indentLeft, art1LabelWidth, boldParts);
    y += 4; // Espaço entre artigos

    // === ARTIGO 2 ===
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text('Art. 2º - ', indentLeft, y);
    const art2LabelWidth = doc.getTextWidth('Art. 2º - ');
    doc.setFont('times', 'normal');
    const art2Text = 'Fará jus ao abono, o servidor municipal, estável ou ocupante de cargo efetivo, inativos e contratados, que comprovar anualmente os requisitos previstos na lei.';
    const art2Lines = doc.splitTextToSize(art2Text, indentWidth - 4);
    y = renderJustifiedWithBold(art2Lines, y, indentWidth, indentLeft, art2LabelWidth, []);
    y += 4;

    // === ARTIGO 3 ===
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text('Art. 3º - ', indentLeft, y);
    const art3LabelWidth = doc.getTextWidth('Art. 3º - ');
    doc.setFont('times', 'normal');
    const art3Text = 'O pagamento do Abono Salarial poderá ser revisto a qualquer momento, caso sejam constatados irregularidades, erro material, vício procedimental ou descumprimento dos requisitos legais, sendo adotadas as providências cabíveis para a correção da concessão, nos termos da Súmula nº 346 e Súmula nº 473 do Supremo Tribunal Federal (STF).';
    const art3Lines = doc.splitTextToSize(art3Text, indentWidth - 4);
    y = renderJustifiedWithBold(art3Lines, y, indentWidth, indentLeft, art3LabelWidth, []);
    y += 4;

    // === ARTIGO 4 ===
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text('Art. 4º - ', indentLeft, y);
    const art4LabelWidth = doc.getTextWidth('Art. 4º - ');
    doc.setFont('times', 'normal');
    doc.text('Esta Portaria entrará em vigor na data de sua publicação.', indentLeft + art4LabelWidth, y);
    y += 14;

    // === Registre-se ===
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('Registre-se, Divulgue-se.', marginLeft, y);
    y += 10;

    // === Local e Data (ponto 6) ===
    const dataFormatadaExtended = formatDateExtended(data.data_portaria);
    doc.text(`Três Lagoas, ao ${dataFormatadaExtended}.`, marginLeft, y);
    y += 25;

    // === Assinatura ===
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('VANESSA DOS SANTOS SÊNA', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text('Secretária Municipal de Gestão de Pessoas', pageWidth / 2, y, { align: 'center' });

    // === Output ===
    if (action === 'download') {
        doc.save(`Portaria_${data.numero}_${data.ano}.pdf`);
    } else {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }
}
