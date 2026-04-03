import { describe, it, expect } from "vitest";
import {
  safeDate,
  calcInclusiveDays,
  buildCidAnalyticsMetrics,
  CID_ANALYTICS_DEFAULT_POLICY,
} from "../afastamentos-cid-analytics";

describe("safeDate", () => {
  it("parses ISO date-only strings as UTC date", () => {
    const d = safeDate("2026-04-03");
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2026);
    expect(d!.getUTCMonth() + 1).toBe(4);
    expect(d!.getUTCDate()).toBe(3);
  });

  it("returns null for empty or invalid inputs", () => {
    expect(safeDate("")).toBeNull();
    expect(safeDate("invalid-date")).toBeNull();
    expect(safeDate(null)).toBeNull();
  });
});

describe("calcInclusiveDays", () => {
  it("computes inclusive days between two dates", () => {
    expect(calcInclusiveDays("2026-04-01", "2026-04-03")).toBe(3);
    expect(calcInclusiveDays("2026-04-01", "2026-04-01")).toBe(1);
    expect(calcInclusiveDays("2026-04-03", "2026-04-01")).toBe(0);
    expect(calcInclusiveDays(null, null)).toBe(0);
  });
});

describe("buildCidAnalyticsMetrics (core scenarios)", () => {
  it("computes magnitude metrics with cidOccurrences present", () => {
    const events: any[] = [
      {
        event: {
          afastamentoId: 1,
          servidorCpf: "00000000000",
          eventKey: "1-000",
          startDate: "2026-04-01",
          endDate: "2026-04-03",
          daysAway: 3,
          situacao: "OK",
          status: "active",
          createdAt: "2026-04-01",
          updatedAt: "2026-04-03",
        },
        clinical: {
          tipoAfastamento: "AUX. DOENCA",
          isAcidenteTrabalho: false,
          cidCode: "A00",
          cidDesc: "Desc A",
          cidChapter: "I",
        },
        occupational: {
          secretaria: "S1",
          cargo: "C1",
          naturezaCargo: "N1",
          contrato: "X",
          matricula: "M1",
        },
        temporal: { competency: "2026-04" },
        recurrence: {
          isRecurrentPrimary: false,
          isRecurrent90: false,
          isRecurrent180: false,
          isRecurrent365: false,
          episodeNumber: 1,
          daysSincePreviousEpisode: null,
          cumulativeDaysByServidor: 3,
        },
        cidCountInEvent: 1,
      },
    ];

    const cidOccurrences: any[] = [
      {
        eventId: 1,
        servidorCpf: "00000000000",
        cidCode: "A00",
        cidDesc: "Desc A",
        cidChapter: "I",
        occurrenceWeight: 1,
        allocatedDays: 3,
        startDate: "2026-04-01",
        endDate: "2026-04-03",
        daysAway: 3,
        secretaria: "S1",
        cargo: "C1",
        naturezaCargo: "N1",
        tipoAfastamento: "AUX. DOENCA",
        isAcidenteTrabalho: false,
        competency: "2026-04",
      },
    ];

    const metrics = buildCidAnalyticsMetrics(
      events as any,
      cidOccurrences as any,
      CID_ANALYTICS_DEFAULT_POLICY,
    );

    expect(metrics.magnitude.totalAfastamentos).toBe(1);
    expect(metrics.magnitude.totalServidoresAfastados).toBe(1);
    expect(metrics.magnitude.totalDiasPerdidos).toBe(3);
    expect(metrics.magnitude.duracaoMedia).toBe(3);
    expect(metrics.magnitude.duracaoMediana).toBe(3);
    expect(metrics.persistence.totalEventosRecorrentesPrimaryWindow).toBe(0);
  });

  it("falls back to event.daysAway when cidOccurrences is empty", () => {
    const events: any[] = [
      {
        event: {
          afastamentoId: 2,
          servidorCpf: "111",
          daysAway: 5,
          startDate: "2026-01-01",
          endDate: "2026-01-05",
          eventKey: "2-111",
          situacao: "OK",
          status: "active",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-05",
        },
        clinical: {
          tipoAfastamento: "AUX. DOENCA",
          isAcidenteTrabalho: false,
          cidCode: "SEM CID",
          cidDesc: "DESCRICAO NAO INFORMADA",
          cidChapter: "CAPITULO NAO INFORMADO",
        },
        occupational: {
          secretaria: "S1",
          cargo: "C1",
          naturezaCargo: "N1",
          contrato: "X",
          matricula: "M2",
        },
        temporal: { competency: "2026-01" },
        recurrence: {
          isRecurrentPrimary: false,
          isRecurrent90: false,
          isRecurrent180: false,
          isRecurrent365: false,
          episodeNumber: 1,
          daysSincePreviousEpisode: null,
          cumulativeDaysByServidor: 5,
        },
        cidCountInEvent: 0,
      },
    ];

    const metrics = buildCidAnalyticsMetrics(
      events as any,
      [],
      CID_ANALYTICS_DEFAULT_POLICY,
    );
    expect(metrics.magnitude.totalAfastamentos).toBe(1);
    expect(metrics.magnitude.totalDiasPerdidos).toBe(5);
  });
});
