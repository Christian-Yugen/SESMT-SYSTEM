import jsPDF from 'jspdf';
import { getLotadoGrammar } from './portaria-utils';

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

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 25;
    const marginRight = 25;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let y = 30;

    // === TÍTULO ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const titulo = `PORTARIA Nº ${data.numero}/SEGP/DGP/${data.ano}`;
    doc.text(titulo, pageWidth / 2, y, { align: 'center' });
    y += 14;

    // === PREÂMBULO (itálico) ===
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(10.5);
    const preambulo = 'VANESSA DOS SANTOS SÊNA, Secretária Municipal de Administração da Prefeitura Municipal de Três Lagoas/MS, no uso da Competência que lhe confere o Decreto nº 1512/2025.';
    const preambuloLines = doc.splitTextToSize(preambulo, contentWidth);
    doc.text(preambuloLines, marginLeft, y);
    y += preambuloLines.length * 5.5 + 8;

    // === CONSIDERANDO ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('CONSIDERANDO', marginLeft, y);
    doc.setFont('helvetica', 'normal');
    const considerandoResto = ' os requisitos exigidos em lei e avaliação realizada pelo órgão de perícia (Sesmt);';
    const considerandoWidth = doc.getTextWidth('CONSIDERANDO');
    doc.text(considerandoResto, marginLeft + considerandoWidth, y);
    y += 10;

    // === RESOLVE ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('RESOLVE:', marginLeft, y);
    y += 10;

    // === ARTIGO 1 ===
    const indentLeft = marginLeft + 12;
    const indentWidth = contentWidth - 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Art. 1º - ', indentLeft, y);
    const art1LabelWidth = doc.getTextWidth('Art. 1º - ');

    doc.setFont('helvetica', 'normal');

    const generoArtigo = data.servidor_genero === 'F' ? 'a servidora' : 'o servidor';
    const generoPublica = data.servidor_genero === 'F' ? 'Pública Municipal' : 'Público Municipal';
    const lotadoGrammar = getLotadoGrammar(data.servidor_genero, data.servidor_lotacao);

    const art1Text = `Fica concedido pelo período de ${data.periodo_inicio} a ${data.periodo_fim} o ABONO SALARIAL, conforme Lei Municipal nº 1.562/1999, com alterações dadas pela Lei nº 3.353/2017, ${generoArtigo} ${generoPublica} ${data.servidor_nome}, matrícula ${data.servidor_matricula}, no cargo de ${data.servidor_cargo}, ${lotadoGrammar} ${data.servidor_lotacao}.`;

    // First line starts after "Art. 1º - "
    const firstLineWidth = indentWidth - art1LabelWidth;
    const firstLineWords = art1Text.split(' ');
    let firstLine = '';
    let remainingText = '';
    let usedFirstLine = false;

    for (let i = 0; i < firstLineWords.length; i++) {
        const testLine = firstLine ? firstLine + ' ' + firstLineWords[i] : firstLineWords[i];
        if (doc.getTextWidth(testLine) <= firstLineWidth && !usedFirstLine) {
            firstLine = testLine;
        } else {
            if (!usedFirstLine) {
                usedFirstLine = true;
                remainingText = firstLineWords.slice(i).join(' ');
                break;
            }
        }
    }

    if (!usedFirstLine) {
        firstLine = art1Text;
        remainingText = '';
    }

    // Draw first line with bold parts inline
    doc.setFont('helvetica', 'normal');
    doc.text(firstLine, indentLeft + art1LabelWidth, y);
    y += 5.5;

    if (remainingText) {
        // Now handle remaining text with bold parts
        const remainingLines = doc.splitTextToSize(remainingText, indentWidth);

        for (const line of remainingLines) {
            // Check if this line contains bold parts (dates or name)
            let currentX = indentLeft;
            const boldParts = [
                data.periodo_inicio,
                data.periodo_fim,
                data.servidor_nome + ','
            ];

            let lineText = line;
            let segments: { text: string; bold: boolean }[] = [];

            // Simple approach: render whole line, then overlay bold parts
            let tempLine = lineText;
            let foundBold = false;

            for (const bp of boldParts) {
                const idx = tempLine.indexOf(bp);
                if (idx >= 0) {
                    foundBold = true;
                    if (idx > 0) {
                        segments.push({ text: tempLine.substring(0, idx), bold: false });
                    }
                    segments.push({ text: bp, bold: true });
                    tempLine = tempLine.substring(idx + bp.length);
                }
            }

            if (foundBold && tempLine.length > 0) {
                segments.push({ text: tempLine, bold: false });
            }

            if (foundBold && segments.length > 0) {
                for (const seg of segments) {
                    doc.setFont('helvetica', seg.bold ? 'bold' : 'normal');
                    doc.text(seg.text, currentX, y);
                    currentX += doc.getTextWidth(seg.text);
                }
            } else {
                doc.setFont('helvetica', 'normal');
                doc.text(lineText, indentLeft, y);
            }
            y += 5.5;
        }
    }

    y += 6;

    // === ARTIGO 2 ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Art. 2º - ', indentLeft, y);
    const art2LabelWidth = doc.getTextWidth('Art. 2º - ');
    doc.setFont('helvetica', 'normal');
    const art2Text = 'Fará jus ao abono, o servidor municipal, estável ou ocupante de cargo efetivo, inativos e contratados, que comprovar anualmente os requisitos previstos na lei.';
    const art2Lines = doc.splitTextToSize(art2Text, indentWidth - art2LabelWidth);

    // First line
    doc.text(art2Lines[0], indentLeft + art2LabelWidth, y);
    y += 5.5;
    // Remaining lines
    for (let i = 1; i < art2Lines.length; i++) {
        doc.text(art2Lines[i], indentLeft, y);
        y += 5.5;
    }
    y += 6;

    // === ARTIGO 3 ===
    doc.setFont('helvetica', 'bold');
    doc.text('Art. 3°', indentLeft, y);
    const art3LabelWidth = doc.getTextWidth('Art. 3°');
    doc.setFont('helvetica', 'normal');
    const art3Text = 'O pagamento do Abono Salarial poderá ser revisto a qualquer momento, caso sejam constatados irregularidades, erro material, vício procedimental ou descumprimento dos requisitos legais, sendo adotadas as providências cabíveis para a correção da concessão, nos termos da Súmula nº 346 e Súmula nº 473 do Supremo Tribunal Federal (STF).';
    const art3Lines = doc.splitTextToSize(art3Text, indentWidth - art3LabelWidth);

    doc.text(art3Lines[0], indentLeft + art3LabelWidth, y);
    y += 5.5;
    for (let i = 1; i < art3Lines.length; i++) {
        doc.text(art3Lines[i], indentLeft, y);
        y += 5.5;
    }
    y += 6;

    // === ARTIGO 4 ===
    doc.setFont('helvetica', 'bold');
    doc.text('Art. 4º - ', indentLeft, y);
    const art4LabelWidth = doc.getTextWidth('Art. 4º - ');
    doc.setFont('helvetica', 'normal');
    doc.text('Esta Portaria entrará em vigor na data de sua publicação.', indentLeft + art4LabelWidth, y);
    y += 12;

    // === Registre-se ===
    doc.setFont('helvetica', 'normal');
    doc.text('Registre-se, Divulgue-se.', marginLeft, y);
    y += 10;

    // === Local e Data ===
    const dataFormatada = formatDateExtended(data.data_portaria);
    doc.text(`Paço Municipal de Três Lagoas, aos ${dataFormatada}.`, marginLeft, y);
    y += 25;

    // === Assinatura ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('VANESSA DOS SANTOS SÊNA', pageWidth / 2, y, { align: 'center' });
    y += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Secretária Municipal de Administração', pageWidth / 2, y, { align: 'center' });

    // === Output ===
    if (action === 'download') {
        doc.save(`Portaria_${data.numero}_${data.ano}.pdf`);
    } else {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }
}
