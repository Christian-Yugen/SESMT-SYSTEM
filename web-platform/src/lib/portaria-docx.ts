import { Document, Paragraph, TextRun, AlignmentType, Packer, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { PortariaData } from './portaria-pdf';
import { getLotadoGrammar } from './portaria-utils';

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
    const generoArtigo = data.servidor_genero === 'F' ? 'a servidora' : 'o servidor';
    const generoPublica = data.servidor_genero === 'F' ? 'Pública Municipal' : 'Público Municipal';
    const lotadoGrammar = getLotadoGrammar(data.servidor_genero, data.servidor_lotacao);
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
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 },
                    children: [
                        new TextRun({
                            text: `PORTARIA Nº ${data.numero}/SEGP/DGP/${data.ano}`,
                            bold: true,
                            size: 26,
                            font: 'Arial'
                        })
                    ]
                }),

                // Preâmbulo
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 200 },
                    indent: { left: 720 },
                    children: [
                        new TextRun({
                            text: 'VANESSA DOS SANTOS SÊNA, Secretária Municipal de Administração da Prefeitura Municipal de Três Lagoas/MS, no uso da Competência que lhe confere o Decreto nº 1512/2025.',
                            bold: true,
                            italics: true,
                            size: 22,
                            font: 'Arial'
                        })
                    ]
                }),

                // CONSIDERANDO
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 200 },
                    children: [
                        new TextRun({ text: 'CONSIDERANDO', bold: true, underline: { type: 'single' }, size: 22, font: 'Arial' }),
                        new TextRun({ text: ' os requisitos exigidos em lei e avaliação realizada pelo órgão de perícia (Sesmt);', size: 22, font: 'Arial' })
                    ]
                }),

                // RESOLVE
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 200 },
                    children: [
                        new TextRun({ text: 'RESOLVE:', bold: true, size: 22, font: 'Arial' })
                    ]
                }),

                // Art. 1
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 200 },
                    indent: { left: 720 },
                    children: [
                        new TextRun({ text: 'Art. 1º - ', bold: true, size: 22, font: 'Arial' }),
                        new TextRun({ text: 'Fica concedido pelo período de ', size: 22, font: 'Arial' }),
                        new TextRun({ text: `${data.periodo_inicio} a ${data.periodo_fim}`, bold: true, size: 22, font: 'Arial' }),
                        new TextRun({ text: ` o ABONO SALARIAL, conforme Lei Municipal nº 1.562/1999, com alterações dadas pela Lei nº 3.353/2017, ${generoArtigo} ${generoPublica} `, size: 22, font: 'Arial' }),
                        new TextRun({ text: `${data.servidor_nome},`, bold: true, size: 22, font: 'Arial' }),
                        new TextRun({ text: ` matrícula ${data.servidor_matricula}, no cargo de ${data.servidor_cargo}, ${lotadoGrammar} ${data.servidor_lotacao}.`, size: 22, font: 'Arial' })
                    ]
                }),

                // Art. 2
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 200 },
                    indent: { left: 720 },
                    children: [
                        new TextRun({ text: 'Art. 2º - ', bold: true, size: 22, font: 'Arial' }),
                        new TextRun({ text: 'Fará jus ao abono, o servidor municipal, estável ou ocupante de cargo efetivo, inativos e contratados, que comprovar anualmente os requisitos previstos na lei.', size: 22, font: 'Arial' })
                    ]
                }),

                // Art. 3
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 200 },
                    indent: { left: 720 },
                    children: [
                        new TextRun({ text: 'Art. 3°', bold: true, size: 22, font: 'Arial' }),
                        new TextRun({ text: 'O pagamento do Abono Salarial poderá ser revisto a qualquer momento, caso sejam constatados irregularidades, erro material, vício procedimental ou descumprimento dos requisitos legais, sendo adotadas as providências cabíveis para a correção da concessão, nos termos da Súmula nº 346 e Súmula nº 473 do Supremo Tribunal Federal (STF).', size: 22, font: 'Arial' })
                    ]
                }),

                // Art. 4
                new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 200 },
                    indent: { left: 720 },
                    children: [
                        new TextRun({ text: 'Art. 4º - ', bold: true, size: 22, font: 'Arial' }),
                        new TextRun({ text: 'Esta Portaria entrará em vigor na data de sua publicação.', size: 22, font: 'Arial' })
                    ]
                }),

                // Registre-se
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 200 },
                    children: [
                        new TextRun({ text: 'Registre-se, Divulgue-se.', size: 22, font: 'Arial' })
                    ]
                }),

                // Data
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 600 },
                    children: [
                        new TextRun({ text: `Paço Municipal de Três Lagoas, aos ${dataFormatada}.`, size: 22, font: 'Arial' })
                    ]
                }),

                // Assinatura
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 },
                    children: [
                        new TextRun({ text: 'VANESSA DOS SANTOS SÊNA', bold: true, size: 24, font: 'Arial' })
                    ]
                }),

                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: 'Secretária Municipal de Administração', size: 22, font: 'Arial' })
                    ]
                })
            ]
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Portaria_${data.numero}_${data.ano}.docx`);
}
