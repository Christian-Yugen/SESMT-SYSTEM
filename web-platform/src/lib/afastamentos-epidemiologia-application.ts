import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildEpidemiologyConsumptionContract,
  type EpidemiologyConsumptionContract,
  type EpidemiologyConsumptionContractOptions,
} from "@/lib/afastamentos-epidemiologia-contrato";
import type {
  EpidemiologyCidRow,
  EpidemiologyDataset,
  EpidemiologyEventRow,
  EpidemiologyPeriod,
  EpidemiologyServidorRow,
  EpidemiologySnapshotRow,
  EpidemiologyVinculoRow,
} from "@/lib/afastamentos-epidemiologia";

export interface EpidemiologyApplicationRepository {
  loadDataset(): Promise<EpidemiologyDataset>;
}

export interface BuildEpidemiologyContractInput {
  period: EpidemiologyPeriod;
  options?: EpidemiologyConsumptionContractOptions;
}

export class EpidemiologyApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EpidemiologyApplicationError";
  }
}

type PageQueryFn<T> = (
  from: number,
  to: number,
) => PromiseLike<{
  data: T[] | null;
  error: { message: string; code?: string; details?: string } | null;
}>;

// O Supabase (PostgREST) impõe db-max-rows=1000 no servidor, o que ignora
// qualquer .limit() enviado pelo cliente. A única solução confiável é
// a paginação manual usando .range(from, to) em páginas de 1000 linhas.
const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  queryFn: PageQueryFn<T>,
  sourceName: string,
): Promise<T[]> {
  const results: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryFn(from, to);
    if (error) {
      const codeTag = error.code ? ` [${error.code}]` : "";
      throw new EpidemiologyApplicationError(
        `Falha ao carregar ${sourceName}${codeTag}: ${error.message}`,
      );
    }
    const rows = data ?? [];
    results.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return results;
}

export function createSupabaseEpidemiologyRepository(
  client: SupabaseClient,
): EpidemiologyApplicationRepository {
  return {
    async loadDataset(): Promise<EpidemiologyDataset> {
      const [events, cids, servidores, vinculos, snapshots] = await Promise.all(
        [
          fetchAllPages<EpidemiologyEventRow>(
            (from, to) =>
              client
                .schema("abs_intel")
                .from("abs_fact_afastamento_evento")
                .select(
                  "afastamento_id, servidor_id, vinculo_id, data_inicio, data_fim, dias_afastado",
                )
                .range(from, to),
            "eventos epidemiologicos",
          ),

          fetchAllPages<EpidemiologyCidRow>(
            (from, to) =>
              client
                .schema("abs_intel")
                .from("abs_fact_afastamento_cid")
                .select(
                  "afastamento_id, cid_capitulo, occurrence_weight, allocated_days",
                )
                .range(from, to),
            "recortes por capitulo CID",
          ),

          fetchAllPages<EpidemiologyServidorRow>(
            (from, to) =>
              client
                .schema("abs_intel")
                .from("abs_dim_servidor")
                .select("servidor_id, sexo, data_nascimento")
                .range(from, to),
            "dimensao de servidores",
          ),

          fetchAllPages<EpidemiologyVinculoRow>(
            (from, to) =>
              client
                .schema("abs_intel")
                .from("abs_dim_vinculo_servidor")
                .select(
                  "vinculo_id, secretaria, cargo, natureza_cargo, local_trabalho, data_admissao",
                )
                .range(from, to),
            "dimensao de vinculos",
          ),

          fetchAllPages<EpidemiologySnapshotRow>(
            (from, to) =>
              client
                .schema("abs_intel")
                .from("abs_fact_population_snapshot")
                .select(
                  "competencia_yyyymm, secretaria, local_trabalho, natureza_cargo, sexo, faixa_etaria, faixa_tempo_servico, qtd_populacao_ativa",
                )
                .range(from, to),
            "snapshots populacionais",
          ),
        ],
      );

      return {
        events,
        cids,
        servidores,
        vinculos,
        snapshots,
      };
    },
  };
}

export async function buildEpidemiologyContractFromRepository(
  repository: EpidemiologyApplicationRepository,
  input: BuildEpidemiologyContractInput,
): Promise<EpidemiologyConsumptionContract> {
  const dataset = await repository.loadDataset();
  return buildEpidemiologyConsumptionContract(
    dataset,
    input.period,
    input.options,
  );
}

export async function buildEpidemiologyContractFromSupabase(
  client: SupabaseClient,
  input: BuildEpidemiologyContractInput,
): Promise<EpidemiologyConsumptionContract> {
  const repository = createSupabaseEpidemiologyRepository(client);
  return buildEpidemiologyContractFromRepository(repository, input);
}
