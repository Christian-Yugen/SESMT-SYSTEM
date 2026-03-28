import cidData from "./cid10-data.json";
import { supabase } from "./supabase";

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

interface CIDCategoryEntry {
  desc: string;
  cap: string;
  cap_desc: string;
}

/**
 * Normaliza um código CID-10 para o formato padrão (Ex: Z763 -> Z76.3).
 */
export function normalizeCID(code: string): string {
  if (!code) return "";
  // Remove tudo que não é letra ou número e converte para maiúsculo
  const clean = code
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, "");

  // CID-10 padrão tem 3 caracteres (categoria) ou 4 (subcategoria)
  // Se tiver 4 caracteres, insere o ponto na 4ª posição (índice 3)
  if (clean.length === 4) {
    return `${clean.substring(0, 3)}.${clean.substring(3)}`;
  }

  return clean;
}

export const CID_CHAPTERS: CIDChapter[] = cidData.chapters;

export function getCIDChapter(code: string): CIDChapter | null {
  if (!code) return null;
  const firstChar = code.charAt(0).toUpperCase();
  const numPartStr = code.substring(1, 3);
  const numPart = parseInt(numPartStr);

  if (isNaN(numPart)) return null;

  for (const chapter of CID_CHAPTERS) {
    const ranges = chapter.range.split(",");
    for (const range of ranges) {
      const parts = range.trim().split("-");
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
  const categories = cidData.categories as Record<string, CIDCategoryEntry>;
  const category = categories[upperCode];
  if (category) {
    return {
      code: upperCode,
      desc: category.desc,
      chapter: category.cap,
      chapter_desc: category.cap_desc,
    };
  }

  // Fallback to chapter detection
  const chapter = getCIDChapter(upperCode);
  return {
    code: upperCode,
    desc: "Descrição não encontrada na lista simplificada",
    chapter: chapter?.capitulo || "N/A",
    chapter_desc: chapter?.descricao || "Capítulo não identificado",
  };
}

/**
 * Busca detalhada no banco de dados para sugestões em tempo real ou recuperação de descrições precisas.
 */
export async function searchCIDs(query: string): Promise<CIDDetails[]> {
  const q = query.trim().toUpperCase();
  if (!q || q.length < 1) return [];

  // Normaliza para busca (tira pontos se houver, ou coloca se for o caso)
  const normalized = normalizeCID(q);
  const clean = q.replace(/[^A-Z0-9]/g, "");

  // Busca por código (com ou sem ponto) ou descrição
  const { data, error } = await supabase
    .from("cid10")
    .select("*")
    .or(
      `codigo.ilike.${normalized}%,codigo.ilike.${clean}%,descricao.ilike.%${q}%`,
    )
    .order("codigo")
    .limit(25);

  if (error || !data) return [];

  return data.map((item) => {
    const chapter = getCIDChapter(item.codigo);
    return {
      code: item.codigo,
      desc: item.descricao,
      chapter: chapter?.capitulo || "N/A",
      chapter_desc: chapter?.descricao || "Capítulo não identificado",
    };
  });
}

/**
 * Recupera os detalhes de um CID específico do banco de dados (async).
 * Implementa lógica inteligente para lidar com códigos incompletos (ex: I42 -> I42.0).
 */
export async function getCIDDetailsFromDB(code: string): Promise<CIDDetails> {
  const normalizedCode = normalizeCID(code);
  if (!normalizedCode) return getCIDDetails("");

  // 1. Tenta correspondência exata com o código normalizado
  const { data, error } = await supabase
    .from("cid10")
    .select("codigo, descricao")
    .eq("codigo", normalizedCode)
    .maybeSingle();

  let finalCode = normalizedCode;
  let finalDesc = data?.descricao;

  // 2. Lógica Inteligente: Se não encontrou e o código não tem ponto (ex: I42), tenta variações
  if (!data && !normalizedCode.includes(".")) {
    // Tenta adicionar .0 (padrão comum)
    const codeWithZero = `${normalizedCode}.0`;
    const { data: dataZero } = await supabase
      .from("cid10")
      .select("codigo, descricao")
      .eq("codigo", codeWithZero)
      .maybeSingle();

    if (dataZero) {
      finalCode = dataZero.codigo;
      finalDesc = dataZero.descricao;
    } else {
      // Tenta qualquer subitem que comece com o código + ponto (ex: I42.1, I42.2...)
      const { data: dataAny } = await supabase
        .from("cid10")
        .select("codigo, descricao")
        .ilike("codigo", `${normalizedCode}.%`)
        .order("codigo")
        .limit(1)
        .maybeSingle();

      if (dataAny) {
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
      chapter_desc: chapter?.descricao || "Capítulo não identificado",
    };
  }

  return getCIDDetails(code);
}
