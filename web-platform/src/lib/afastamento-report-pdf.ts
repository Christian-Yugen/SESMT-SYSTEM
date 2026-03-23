import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { capitalizeName } from './portaria-utils';

export interface ServantBond {
    matricula: string;
    cargo: string;
    contrato: string;
    natureza: string;
    secretaria?: string;
}

export interface ReportRecord {
    id: number;
    tipo_afastamento: string;
    data_inicio: string;
    data_fim: string;
    dias_afastado: number | null;
    status: string;
    is_acidente_trabalho?: boolean;
    servidor_matricula: string;
    servidor_contrato: string;
    natureza_cargo: string;
    servidor_cargo?: string;
    afastamento_cids?: { 
        cid_codigo: string; 
        cid_descricao: string; 
        cid_capitulo: string; 
    }[];
}

export function generateServidorReportPDF(
    servidor: { nome: string; cpf: string },
    records: ReportRecord[],
    bonds: ServantBond[]
) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // === CABEÇALHO INSTITUCIONAL ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PREFEITURA MUNICIPAL DE TRÊS LAGOAS', pageWidth / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(11);
    doc.text('Secretaria Municipal de Gestão de Pessoas', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text('SESMT - Serviço Especializado em Engenharia de Segurança e Medicina do Trabalho', pageWidth / 2, y, { align: 'center' });
    y += 12;

    doc.setFontSize(14);
    doc.text('RELATÓRIO DE HISTÓRICO DE AFASTAMENTOS', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // === DADOS DO SERVIDOR E VÍNCULOS ===
    // Calcular altura do bloco dinamicamente (Base: 20mm + 6mm por vínculo)
    const blockHeight = 20 + (bonds.length * 6.5);
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y, pageWidth - 30, blockHeight, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, y, pageWidth - 30, blockHeight);

    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVIDOR:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(capitalizeName(servidor.nome), 45, y);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('CPF:', 20, y);
    doc.setFont('helvetica', 'normal');
    const cpfFormatado = servidor.cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    doc.text(cpfFormatado, 45, y);

    // Listar Vínculos no cabeçalho
    bonds.forEach((bond, index) => {
        y += 6.5;
        doc.setFont('helvetica', 'bold');
        doc.text(`VÍNCULO ${index + 1}:`, 20, y);
        doc.setFont('helvetica', 'normal');
        const bondText = `Matr.: ${bond.matricula} | Contrato: ${bond.contrato} | Cargo: ${capitalizeName(bond.cargo || bond.natureza)} (${bond.natureza})`;
        doc.text(bondText, 45, y, { maxWidth: pageWidth - 65 });
    });
    
    y += 15;

    // === TABELA DE HISTÓRICO ===
    const sortedRecords = [...records].sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime());
    
    const tableData = sortedRecords.map(r => {
        const cidsInfo = r.afastamento_cids?.map(c => `[${c.cid_codigo}] ${c.cid_descricao}\n${c.cid_capitulo}`).join('\n\n') || '---';
        
        return [
            r.is_acidente_trabalho ? `${r.tipo_afastamento} (AT)` : r.tipo_afastamento,
            new Date(r.data_inicio).toLocaleDateString('pt-BR'),
            r.data_fim ? new Date(r.data_fim).toLocaleDateString('pt-BR') : '---',
            r.dias_afastado?.toString() || '---',
            r.servidor_matricula,
            cidsInfo,
            r.status === 'ATIVO' ? 'ATIVO' : 'FINALIZADO'
        ];
    });

    autoTable(doc, {
        startY: y,
        head: [['Tipo de Afastamento', 'Início', 'Término', 'Dias', 'Matr.', 'Detalhes do Diagnóstico (CID-10)', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [26, 51, 81], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7, textColor: [50, 50, 50] },
        columnStyles: {
            0: { cellWidth: 35 },
            3: { halign: 'center', cellWidth: 12 },
            4: { halign: 'center', cellWidth: 15 },
            5: { cellWidth: 65 },
            6: { halign: 'center', cellWidth: 18 }
        },
        margin: { left: 15, right: 15 },
        styles: { overflow: 'linebreak', cellPadding: 2 }
    });

    // === RODAPÉ ===
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(150);
        doc.text(
            `Página ${i} de ${pageCount} | Gerado em ${new Date().toLocaleString('pt-BR')} via SESMT SYSTEM - Powered by UXBRAS®`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }

    // === OUTPUT ===
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}
