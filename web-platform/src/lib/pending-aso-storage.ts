import { PendingSyncRecord } from "@/types";
import { ensureISO } from "@/lib/utils";

const STORAGE_KEY = "pending_aso_history";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

function parseJsonSafe(str: string | null): any[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toIsoDatetime(value: unknown): string | null {
  if (!value) return null;
  try {
    const s = String(value);
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString();
    const isoDate = ensureISO(s);
    if (isoDate) return new Date(`${isoDate}T00:00:00.000Z`).toISOString();
    return null;
  } catch {
    return null;
  }
}

function normalizeRecord(orig: any): PendingSyncRecord | null {
  if (!orig || typeof orig !== "object") return null;

  const generated_at_raw =
    orig.generated_at ?? orig.generatedAt ?? orig.created_at ?? orig.createdAt;
  const genIso = toIsoDatetime(generated_at_raw);
  if (!genIso) return null; // tratar como inválido se não tiver generated_at válido

  const servidor_cpf =
    orig.servidor_cpf ?? orig.cpf ?? orig["CPF"] ?? orig["CPF."] ?? null;
  const servidor_nome = orig.servidor_nome ?? orig.nome ?? orig.Nome ?? null;
  const aso_type = orig.aso_type ?? orig.asoType ?? null;

  if (!servidor_cpf || !servidor_nome || !aso_type) return null;

  const servidor_nascimento =
    ensureISO(
      orig.servidor_nascimento ?? orig["Dt.Nascimento"] ?? orig.Nascimento,
    ) ?? null;

  const rawExams = Array.isArray(orig.exams_json)
    ? orig.exams_json
    : Array.isArray(orig.exams)
      ? orig.exams
      : [];

  // Normaliza cada exame: aceita formatos mistos e converte datas para ISO completa.
  const exams_json = rawExams
    .map((e: any) => {
      if (!e || typeof e !== "object") return null;
      const name = e.name ?? e.Nome ?? e.nome ?? null;
      if (!name || typeof name !== "string") return null;

      const rawDate = e.date ?? e.data ?? null;
      if (!rawDate) {
        return { name };
      }

      const iso = ensureISO(rawDate);
      if (!iso) {
        // data inválida: omitir o campo date para não quebrar a validação do servidor
        return { name };
      }

      try {
        const fullIso = new Date(`${iso}T00:00:00.000Z`).toISOString();
        return { name, date: fullIso };
      } catch {
        return { name };
      }
    })
    .filter((x) => x !== null) as Array<{ name: string; date?: string }>;

  const normalized: PendingSyncRecord & { [key: string]: any } = {
    servidor_cpf,
    servidor_nome,
    servidor_nascimento,
    aso_type,
    contrato: orig.contrato ?? null,
    cargo: orig.cargo ?? null,
    secretaria: orig.secretaria ?? null,
    ghe_conj: orig.ghe_conj ?? null,
    function_name: orig.function_name ?? null,
    risks: orig.risks ?? null,
    exams_json,
    generated_at: genIso,
  };

  return normalized;
}

function isExpired(item: PendingSyncRecord): boolean {
  try {
    const dt = new Date((item as any).generated_at);
    if (isNaN(dt.getTime())) return true;
    return Date.now() - dt.getTime() > TTL_MS;
  } catch {
    return true;
  }
}

export function loadPendingAsoHistory(): PendingSyncRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  const arr = parseJsonSafe(raw);
  const cleaned: PendingSyncRecord[] = [];
  let changed = false;

  for (const o of arr) {
    const n = normalizeRecord(o);
    if (!n) {
      changed = true;
      continue;
    }
    if (isExpired(n)) {
      changed = true;
      continue;
    }
    cleaned.push(n);
  }

  if (changed) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch {
      // ignore
    }
  }

  return cleaned;
}

export function savePendingAsoHistory(items: any[]): void {
  if (typeof window === "undefined") return;
  const out: PendingSyncRecord[] = [];
  for (const it of items) {
    const n = normalizeRecord(it);
    if (!n) continue;
    if (isExpired(n)) continue;
    out.push(n);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch {
    // ignore
  }
}

export function appendPendingAsoHistory(item: any): void {
  if (typeof window === "undefined") return;
  const current = loadPendingAsoHistory();
  const n = normalizeRecord(item);
  if (!n) return;
  current.push(n);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}
