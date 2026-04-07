import { describe, it } from "node:test";
import assert from "node:assert";
const expect = (val: any) => ({
  toBe: (expected: any) => assert.strictEqual(val, expected),
  not: { toBeNull: () => assert.notStrictEqual(val, null) },
  toBeNull: () => assert.strictEqual(val, null),
  toBeGreaterThan: (expected: number) => assert.ok(val > expected),
  toBeLessThan: (expected: number) => assert.ok(val < expected),
  toEqual: (expected: any) => assert.deepStrictEqual(val, expected),
  toHaveLength: (expected: number) => assert.strictEqual(val.length, expected),
});
import { buildCidAnalyticsDataset } from "../afastamentos-cid-analytics";

function filterByStartDate(events: any[], startDate: string, endDate: string) {
  return events.filter((event) => {
    if (startDate && event.event.startDate < startDate) return false;
    if (endDate && event.event.startDate > endDate) return false;
    return true;
  });
}

describe("Contrato temporal — inclusão por startDate (comportamento atual)", () => {
  const periodStart = "2026-04-01";
  const periodEnd = "2026-04-30";

  it("afastamento totalmente dentro do intervalo => incluído", () => {
    const record = {
      id: 1,
      servidor_cpf: "00000000000",
      data_inicio: "2026-04-05T08:00:00",
      data_fim: "2026-04-07T17:00:00",
      criado_em: "2026-04-05T08:00:00",
      atualizado_em: "2026-04-07T17:00:00",
      dias_afastado: 3,
      tipo_afastamento: "AUX. DOENCA",
      situacao: "OK",
      status: "active",
      servidor_secretaria: "S1",
      servidor_cargo: "C1",
      natureza_cargo: "N1",
      afastamento_cids: [
        { cid_codigo: "A00", cid_descricao: "Desc A", cid_capitulo: "I" },
      ],
    } as any;

    const ds = buildCidAnalyticsDataset([record]);
    const included = filterByStartDate(ds.events, periodStart, periodEnd);
    expect(included.length).toBe(1);
  });

  it("afastamento iniciado dentro e encerrado depois => incluído", () => {
    const record = {
      id: 2,
      servidor_cpf: "11111111111",
      data_inicio: "2026-04-30T09:00:00",
      data_fim: "2026-05-05T09:00:00",
      criado_em: "2026-04-30T09:00:00",
      atualizado_em: "2026-05-05T09:00:00",
      dias_afastado: 6,
      tipo_afastamento: "AUX. DOENCA",
      situacao: "OK",
      status: "active",
      servidor_secretaria: "S1",
      servidor_cargo: "C1",
      natureza_cargo: "N1",
      afastamento_cids: [
        { cid_codigo: "B00", cid_descricao: "Desc B", cid_capitulo: "II" },
      ],
    } as any;

    const ds = buildCidAnalyticsDataset([record]);
    const included = filterByStartDate(ds.events, periodStart, periodEnd);
    expect(included.length).toBe(1);
  });

  it("afastamento iniciado antes e encerrado dentro => EXCLUÍDO pelo critério startDate", () => {
    const record = {
      id: 3,
      servidor_cpf: "22222222222",
      data_inicio: "2026-03-28T09:00:00",
      data_fim: "2026-04-05T09:00:00",
      criado_em: "2026-03-28T09:00:00",
      atualizado_em: "2026-04-05T09:00:00",
      dias_afastado: 9,
      tipo_afastamento: "AUX. DOENCA",
      situacao: "OK",
      status: "active",
      servidor_secretaria: "S1",
      servidor_cargo: "C1",
      natureza_cargo: "N1",
      afastamento_cids: [
        { cid_codigo: "C00", cid_descricao: "Desc C", cid_capitulo: "III" },
      ],
    } as any;

    const ds = buildCidAnalyticsDataset([record]);
    const included = filterByStartDate(ds.events, periodStart, periodEnd);
    expect(included.length).toBe(0);
  });

  it("afastamento iniciado antes e encerrado depois do intervalo => EXCLUÍDO pelo critério startDate", () => {
    const record = {
      id: 4,
      servidor_cpf: "33333333333",
      data_inicio: "2026-03-01T09:00:00",
      data_fim: "2026-05-10T09:00:00",
      criado_em: "2026-03-01T09:00:00",
      atualizado_em: "2026-05-10T09:00:00",
      dias_afastado: 71,
      tipo_afastamento: "AUX. DOENCA",
      situacao: "OK",
      status: "active",
      servidor_secretaria: "S1",
      servidor_cargo: "C1",
      natureza_cargo: "N1",
      afastamento_cids: [
        { cid_codigo: "D00", cid_descricao: "Desc D", cid_capitulo: "IV" },
      ],
    } as any;

    const ds = buildCidAnalyticsDataset([record]);
    const included = filterByStartDate(ds.events, periodStart, periodEnd);
    expect(included.length).toBe(0);
  });

  it("afastamento totalmente fora do intervalo => EXCLUÍDO", () => {
    const record = {
      id: 5,
      servidor_cpf: "44444444444",
      data_inicio: "2026-05-10T09:00:00",
      data_fim: "2026-05-12T09:00:00",
      criado_em: "2026-05-10T09:00:00",
      atualizado_em: "2026-05-12T09:00:00",
      dias_afastado: 3,
      tipo_afastamento: "AUX. DOENCA",
      situacao: "OK",
      status: "active",
      servidor_secretaria: "S1",
      servidor_cargo: "C1",
      natureza_cargo: "N1",
      afastamento_cids: [
        { cid_codigo: "E00", cid_descricao: "Desc E", cid_capitulo: "V" },
      ],
    } as any;

    const ds = buildCidAnalyticsDataset([record]);
    const included = filterByStartDate(ds.events, periodStart, periodEnd);
    expect(included.length).toBe(0);
  });

  it("datas inválidas ou ausentes => tratadas como excluídas quando filtro aplicado", () => {
    const record = {
      id: 6,
      servidor_cpf: "55555555555",
      data_inicio: null,
      data_fim: null,
      criado_em: null,
      atualizado_em: null,
      dias_afastado: null,
      tipo_afastamento: "AUX. DOENCA",
      situacao: "OK",
      status: "active",
      servidor_secretaria: "S1",
      servidor_cargo: "C1",
      natureza_cargo: "N1",
      afastamento_cids: [
        {
          cid_codigo: "SEM CID",
          cid_descricao: "DESCRICAO NAO INFORMADA",
          cid_capitulo: "CAPITULO NAO INFORMADO",
        },
      ],
    } as any;

    const ds = buildCidAnalyticsDataset([record]);
    // startDate no evento será "" (vazio) e, com filtro aplicado, é excluído
    const included = filterByStartDate(ds.events, periodStart, periodEnd);
    expect(included.length).toBe(0);
  });
});
