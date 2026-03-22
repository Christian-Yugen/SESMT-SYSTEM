import { Document, Paragraph, TextRun, AlignmentType, Packer, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { PortariaData } from './portaria-pdf';
import { getLotadoGrammar, capitalizeName, fixOrthography } from './portaria-utils';

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

export async function generatePortariaDOCX(data: PortariaData) {
    const nomeFormatado = capitalizeName(data.servidor_nome);
    const cargoFormatado = capitalizeName(data.servidor_cargo);
    const lotacaoFormatada = capitalizeName(data.servidor_lotacao);

    const generoArtigo = data.servidor_genero === 'F' ? 'a servidora' : 'o servidor';
    const generoPublica = data.servidor_genero === 'F' ? 'Pública Municipal' : 'Público Municipal';
    const lotadoGrammar = getLotadoGrammar(data.servidor_genero, lotacaoFormatada);
    const dataFormatada = formatDateExtended(data.data_portaria);

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
                }
            },
            children: [
                // Título
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 300 },
                    children: [
                        new TextRun({
                            text: `PORTARIA Nº ${data.numero.toString().padStart(4, '0')}/SEGP/DGP/${data.ano}`,
                            bold: true,
                            size: 26,
                            font: 'Times New Roman'
                        })
                    ]
                }),
                new Paragraph({ children: [] }), // Espaçamento

                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { line: 276 }, // 1.15 spacing
                    indent: { left: 4000 },
                    children: [
                        new TextRun({
                            text: `VANESSA DOS SANTOS SÊNA, Secretária Municipal de Gestão de Pessoas da Prefeitura Municipal de Três Lagoas/MS, no uso da Competência que lhe confere o Decreto nº 1512/2025.`,
                            bold: true,
                            italics: true,
                            size: 22,
                            font: 'Times New Roman'
                        })
                    ]
                }),
                new Paragraph({ children: [] }), // Espaçamento 1
                new Paragraph({ children: [] }), // Espaçamento 2

                // CONSIDERANDO (ponto 9)
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 200 },
                    children: [
                        new TextRun({ text: 'CONSIDERANDO', bold: true, size: 24, font: 'Times New Roman' }),
                        new TextRun({ text: ' os requisitos exigidos em lei e avaliação realizada pelo órgão de Perícia (SESMT);', size: 24, font: 'Times New Roman' })
                    ]
                }),
                new Paragraph({ children: [] }), // Espaçamento

                // RESOLVE
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 200 },
                    children: [
                        new TextRun({ text: 'RESOLVE:', bold: true, size: 24, font: 'Times New Roman' })
                    ]
                }),
                new Paragraph({ children: [] }), // Espaçamento

                // Art. 1 (pontos 5, 10, 11)
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { before: 200, after: 300, line: 360 }, // 1.5 spacing
                    children: [
                        new TextRun({ text: 'Art. 1º - ', bold: true, size: 24, font: 'Times New Roman' }),
                        new TextRun({ text: 'Fica concedido pelo período de ', size: 24, font: 'Times New Roman' }),
                        new TextRun({ text: `${data.periodo_inicio} a ${data.periodo_fim}`, bold: true, size: 24, font: 'Times New Roman' }),
                        new TextRun({ text: ` o ABONO SALARIAL, conforme Lei Municipal nº 1.562/1999, com alterações dadas pela Lei nº 3.353/2017, ${generoArtigo} ${generoPublica} `, size: 24, font: 'Times New Roman' }),
                        new TextRun({ text: `${nomeFormatado}, `, bold: true, size: 24, font: 'Times New Roman' }),
                        new TextRun({ text: `matrícula ${data.servidor_matricula}${data.servidor_contrato ? ` (CONTRATO ${data.servidor_contrato})` : ""}, no cargo de ${cargoFormatado}, ${lotadoGrammar} ${lotacaoFormatada}.`, size: 24, font: 'Times New Roman' })
                    ]
                }),

                // Art. 2
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { before: 200, after: 300, line: 360 }, // 1.5 spacing
                    children: [
                        new TextRun({ text: 'Art. 2º - ', bold: true, size: 24, font: 'Times New Roman' }),
                        new TextRun({ text: 'Fará jus ao abono, o servidor municipal, estável ou ocupante de cargo efetivo, inativos e contratados, que comprovar anualmente os requisitos previstos na lei.', size: 24, font: 'Times New Roman' })
                    ]
                }),

                // Art. 3
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { before: 200, after: 300, line: 360 }, // 1.5 spacing
                    children: [
                        new TextRun({ text: 'Art. 3º - ', bold: true, size: 24, font: 'Times New Roman' }),
                        new TextRun({ text: 'O pagamento do Abono Salarial poderá ser revisto a qualquer momento, caso sejam constatados irregularidades, erro material, vício procedimental ou descumprimento dos requisitos legais, sendo adotadas as providências cabíveis para a correção da concessão, nos termos da Súmula nº 346 e Súmula nº 473 do Supremo Tribunal Federal (STF).', size: 24, font: 'Times New Roman' })
                    ]
                }),

                // Art. 4
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { before: 200, after: 300, line: 360 }, // 1.5 spacing (1.5 * 240 = 360)
                    children: [
                        new TextRun({ text: 'Art. 4º - ', bold: true, size: 24, font: 'Times New Roman' }),
                        new TextRun({ text: 'Esta Portaria entrará em vigor na data de sua publicação.', size: 24, font: 'Times New Roman' })
                    ]
                }),

                // Registre-se
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 400, after: 300 }, // Aumentado
                    children: [
                        new TextRun({ text: 'Registre-se, Divulgue-se.', size: 24, font: 'Times New Roman' })
                    ]
                }),

                // Data (ponto 6)
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 600 },
                    children: [
                        new TextRun({ text: `Três Lagoas, ao ${dataFormatada}.`, size: 24, font: 'Times New Roman' })
                    ]
                }),
                new Paragraph({ children: [] }), // Espaçamento
                new Paragraph({ children: [] }), // Espaçamento adicional para assinatura

                // Assinatura
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 },
                    children: [
                        new TextRun({ text: 'VANESSA DOS SANTOS SÊNA', bold: true, size: 24, font: 'Times New Roman' })
                    ]
                }),

                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: 'Secretária Municipal de Gestão de Pessoas', size: 22, font: 'Times New Roman' })
                    ]
                })
            ]
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Portaria_${data.numero}_${data.ano}.docx`);
}
