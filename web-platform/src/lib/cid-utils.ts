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
  const upperRaw = (code || "").toUpperCase().trim();
  // Use normalized form (remove stray dots and non-alnum) for matching
  const upperCode = normalizeCID(upperRaw);

  const categories = cidData.categories as Record<string, CIDCategoryEntry>;

  // 1) Direct exact match
  const direct = categories[upperCode];
  if (direct) {
    return {
      code: upperCode,
      desc: direct.desc,
      chapter: direct.cap,
      chapter_desc: direct.cap_desc,
    };
  }

  // Helper: parse a CID like 'A15.3' or 'Z00' into { letter, major, minor }
  function parseParts(c: string) {
    const raw = (c || "")
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9\.]/g, "");
    const letter = raw.charAt(0) || "";
    const rest = raw.slice(1);
    const [majorStr, minorStr] = rest.split(".");
    const major = parseInt(majorStr || "0", 10) || 0;
    const minor =
      minorStr !== undefined && minorStr !== ""
        ? parseInt(minorStr, 10) || 0
        : null;
    return { letter, major, minor };
  }

  // Helper: check if code is inside the inclusive range start..end
  function isInRange(codeStr: string, startStr: string, endStr: string) {
    const c = parseParts(codeStr);
    const s = parseParts(startStr);
    const e = parseParts(endStr);

    if (!c.letter || !s.letter || !e.letter) return false;
    if (c.letter < s.letter || c.letter > e.letter) return false;

    if (s.letter === e.letter) {
      if (c.major < s.major || c.major > e.major) return false;
      if (
        c.major === s.major &&
        c.minor !== null &&
        s.minor !== null &&
        c.minor < s.minor
      )
        return false;
      if (
        c.major === e.major &&
        c.minor !== null &&
        e.minor !== null &&
        c.minor > e.minor
      )
        return false;
      return true;
    }

    // If start and end letters differ, allow any code letter between them
    if (c.letter > s.letter && c.letter < e.letter) return true;
    if (c.letter === s.letter) {
      if (c.major < s.major) return false;
      if (
        c.major === s.major &&
        s.minor !== null &&
        c.minor !== null &&
        c.minor < s.minor
      )
        return false;
      return true;
    }
    if (c.letter === e.letter) {
      if (c.major > e.major) return false;
      if (
        c.major === e.major &&
        e.minor !== null &&
        c.minor !== null &&
        c.minor > e.minor
      )
        return false;
      return true;
    }

    return false;
  }

  // 2) Try to match against category keys that may contain ranges or lists (ex: "Z00-Z13" or "Z20, Z22-Z29")
  for (const catKey of Object.keys(categories)) {
    const parts = catKey.split(",").map((p) => p.trim());
    for (const part of parts) {
      if (!part) continue;
      if (part.includes("-")) {
        const [start, end] = part.split("-").map((p) => p.trim());
        if (isInRange(upperCode, start, end)) {
          const cat = categories[catKey];
          return {
            code: upperCode,
            desc: cat.desc,
            chapter: cat.cap,
            chapter_desc: cat.cap_desc,
          };
        }
      } else {
        // exact single entry like "Z21" or possibly with dot
        const cleanedPart = part.replace(/[^A-Z0-9]/g, "");
        if (normalizeCID(cleanedPart) === upperCode) {
          const cat = categories[catKey];
          return {
            code: upperCode,
            desc: cat.desc,
            chapter: cat.cap,
            chapter_desc: cat.cap_desc,
          };
        }
      }
    }
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
  // 1. Primeiro tenta correspondência exata com o código normalizado
  const { data: exactData, error: exactErr } = await supabase
    .from("cid10")
    .select("codigo, descricao")
    .eq("codigo", normalizedCode)
    .maybeSingle();

  if (exactData && !exactErr) {
    const chapter = getCIDChapter(exactData.codigo);
    return {
      code: exactData.codigo,
      desc: exactData.descricao || "Descrição não encontrada",
      chapter: chapter?.capitulo || "N/A",
      chapter_desc: chapter?.descricao || "Capítulo não identificado",
    };
  }

  // 2. Se não encontrou, tenta correspondência por prefixo (captura 'A09.', 'A09.0', 'A09.1', etc.)
  try {
    const { data: prefData } = await supabase
      .from("cid10")
      .select("codigo, descricao")
      .ilike("codigo", `${normalizedCode}%`)
      .order("codigo")
      .limit(1);

    if (prefData && Array.isArray(prefData) && prefData.length > 0) {
      const d = prefData[0];
      const chapter = getCIDChapter(d.codigo);
      return {
        code: d.codigo,
        desc: d.descricao || "Descrição não encontrada",
        chapter: chapter?.capitulo || "N/A",
        chapter_desc: chapter?.descricao || "Capítulo não identificado",
      };
    }
  } catch (e) {
    // ignora e prossegue para heurísticas seguintes
  }

  // 3. Tenta variações comuns: com ".0" ou subitens (.1, .2...)
  if (!normalizedCode.includes(".")) {
    const codeWithZero = `${normalizedCode}.0`;
    const { data: dataZero } = await supabase
      .from("cid10")
      .select("codigo, descricao")
      .eq("codigo", codeWithZero)
      .maybeSingle();

    if (dataZero) {
      const chapter = getCIDChapter(dataZero.codigo);
      return {
        code: dataZero.codigo,
        desc: dataZero.descricao || "Descrição não encontrada",
        chapter: chapter?.capitulo || "N/A",
        chapter_desc: chapter?.descricao || "Capítulo não identificado",
      };
    }

    const { data: dataAny } = await supabase
      .from("cid10")
      .select("codigo, descricao")
      .ilike("codigo", `${normalizedCode}.%`)
      .order("codigo")
      .limit(1)
      .maybeSingle();

    if (dataAny) {
      const chapter = getCIDChapter(dataAny.codigo);
      return {
        code: dataAny.codigo,
        desc: dataAny.descricao || "Descrição não encontrada",
        chapter: chapter?.capitulo || "N/A",
        chapter_desc: chapter?.descricao || "Capítulo não identificado",
      };
    }
  }

  // 4. Se nada foi encontrado no banco, recorre ao catálogo local (json)
  return getCIDDetails(normalizedCode);
}
