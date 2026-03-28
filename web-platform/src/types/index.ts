import { ReactNode } from "react";

export interface Servidor {
  Nome?: string;
  CPF?: string;
  "CPF."?: string;
  "CPF com mascara"?: string;
  Matrícula?: string;
  Cargo?: string;
  Secretaria?: string;
  natureza_cargo?: string;
  "Dt.Nascimento"?: string;
  contrato?: string;
  [key: string]: string | undefined;
}

export interface Funcao {
  Cod: string;
  FUNÇÃO?: string;
  Nome?: string;
  GHE: string;
  "GHE CONJ"?: string;
}

export interface ExameData {
  exames: string[];
  riscos: string;
  detalhes: string;
}

export interface ExamesMap {
  admissional: Record<string, ExameData>;
  demissional: Record<string, ExameData>;
}

export interface AbonoRecord {
  servidor_contrato: ReactNode;
  servidor_matricula: ReactNode;
  id: number;
  cpf: string;
  nome: string;
  secretaria?: string;
  portaria?: string;
  assomasul_numero?: string;
  assomasul_data?: string;
  inicio?: string;
  quant?: number;
  observacoes?: string;
  motivo_alteracao?: string;
  alterado_por?: string;
  beneficiario_nome?: string;
  natureza_cargo?: string;
  status_manual?: string;
  renovado_por_id?: number | null;
  created_at: string;
  updated_at: string;
}

/** Item de exame no formulário de edição de ASO 2.0. */
export interface ExamEntry {
  name: string;
  date: string;
}

/** Registro de afastamento médico. */
export interface AfastamentoRecord {
  id: number;
  servidor_cpf: string;
  servidor_nome: string;
  servidor_matricula: string;
  servidor_contrato: string;
  servidor_secretaria: string;
  servidor_cargo: string;
  natureza_cargo: string;
  tipo_afastamento: string;
  data_inicio: string;
  data_fim: string;
  data_pericia: string;
  dias_afastado: number | null;
  perito_nome: string;
  perito_crm: string;
  situacao: "EM_ANDAMENTO" | "FINALIZADO" | "PRORROGADO";
  status: string;
  observacoes: string;
  renovado_por_id: number | null;
  criado_em: string;
  criado_por: string;
  hash_auditoria?: string;
  afastamento_cids?: {
    id?: number;
    afastamento_id?: number;
    cid_codigo: string;
    cid_descricao: string;
    cid_capitulo: string;
  }[];
  is_acidente_trabalho: boolean;
  portarias_afastamento?: {
    numero: number;
    ano: number;
    data_emissao: string;
  }[];
}
