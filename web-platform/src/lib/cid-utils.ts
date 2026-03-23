import cidData from './cid10-data.json';
import { supabase } from './supabase';

export interface CIDChapter {
    capitulo: string;
    descricao: string;
    range: string;
}

export interface CIDDetails {
    code: string;
    desc: string;
    chapter: string;
    chapter_desc: string;
}

export const CID_CHAPTERS: CIDChapter[] = cidData.chapters;

export function getCIDChapter(code: string): CIDChapter | null {
    if (!code) return null;
    const firstChar = code.charAt(0).toUpperCase();
    const numPartStr = code.substring(1, 3);
    const numPart = parseInt(numPartStr);
    
    if (isNaN(numPart)) return null;

    for (const chapter of CID_CHAPTERS) {
        const ranges = chapter.range.split(',');
        for (const range of ranges) {
            const parts = range.trim().split('-');
            if (parts.length !== 2) continue;
            const [start, end] = parts;
            const startStr = start.trim();
            const endStr = end.trim();
            
            const startLetter = startStr.charAt(0);
            const startNum = parseInt(startStr.substring(1));
            const endLetter = endStr.charAt(0);
            const endNum = parseInt(endStr.substring(1));

            if (firstChar >= startLetter && firstChar <= endLetter) {
                if (firstChar === startLetter && numPart < startNum) continue;
                if (firstChar === endLetter && numPart > endNum) continue;
                return chapter;
            }
        }
    }
    return null;
}

export function getCIDDetails(code: string): CIDDetails {
    const upperCode = code.toUpperCase().trim();
    // Try exact match in categories
    const category = (cidData.categories as any)[upperCode];
    if (category) {
        return {
            code: upperCode,
            desc: category.desc,
            chapter: category.cap,
            chapter_desc: category.cap_desc
        };
    }

    // Fallback to chapter detection
    const chapter = getCIDChapter(upperCode);
    return {
        code: upperCode,
        desc: "Descrição não encontrada na lista simplificada",
        chapter: chapter?.capitulo || "N/A",
        chapter_desc: chapter?.descricao || "Capítulo não identificado"
    };
}

/**
 * Busca detalhada no banco de dados para sugestões em tempo real ou recuperação de descrições precisas.
 */
export async function searchCIDs(query: string): Promise<CIDDetails[]> {
    const q = query.trim().toUpperCase();
    if (!q || q.length < 1) return [];

    // Prioridade para busca por código exato ou similar
    const { data, error } = await supabase
        .from('cid10')
        .select('*')
        .or(`codigo.ilike.${q}%,descricao.ilike.%${q}%`)
        .order('codigo')
        .limit(25);

    if (error || !data) return [];

    return data.map(item => {
        const chapter = getCIDChapter(item.codigo);
        return {
            code: item.codigo,
            desc: item.descricao,
            chapter: chapter?.capitulo || "N/A",
            chapter_desc: chapter?.descricao || "Capítulo não identificado"
        };
    });
}

/**
 * Recupera os detalhes de um CID específico do banco de dados (async).
 * Implementa lógica inteligente para lidar com códigos incompletos (ex: I42 -> I42.0).
 */
export async function getCIDDetailsFromDB(code: string): Promise<CIDDetails> {
    const upperCode = code.toUpperCase().trim();
    if (!upperCode) return getCIDDetails("");
    
    // 1. Tenta correspondência exata
    let { data, error } = await supabase
        .from('cid10')
        .select('codigo, descricao')
        .eq('codigo', upperCode)
        .maybeSingle();
    
    let finalCode = upperCode;
    let finalDesc = data?.descricao;

    // 2. Lógica Inteligente: Se não encontrou e o código não tem ponto (ex: I42), tenta variações
    if (!data && !upperCode.includes('.')) {
        // Tenta adicionar .0 (padrão comum)
        const codeWithZero = `${upperCode}.0`;
        const { data: dataZero } = await supabase
            .from('cid10')
            .select('codigo, descricao')
            .eq('codigo', codeWithZero)
            .maybeSingle();
        
        if (dataZero) {
            data = dataZero;
            finalCode = dataZero.codigo;
            finalDesc = dataZero.descricao;
        } else {
            // Tenta qualquer subitem que comece com o código + ponto (ex: I42.1, I42.2...)
            const { data: dataAny } = await supabase
                .from('cid10')
                .select('codigo, descricao')
                .ilike('codigo', `${upperCode}.%`)
                .order('codigo')
                .limit(1)
                .maybeSingle();
            
            if (dataAny) {
                data = dataAny;
                finalCode = dataAny.codigo;
                finalDesc = dataAny.descricao;
            }
        }
    }
    
    const chapter = getCIDChapter(finalCode);

    if (data && !error) {
        return {
            code: finalCode,
            desc: finalDesc || "Descrição não encontrada",
            chapter: chapter?.capitulo || "N/A",
            chapter_desc: chapter?.descricao || "Capítulo não identificado"
        };
    }

    return getCIDDetails(code);
}
