import cidData from './cid10-data.json';

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
