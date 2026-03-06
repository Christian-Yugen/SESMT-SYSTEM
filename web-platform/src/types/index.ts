export interface Servidor {
    Nome?: string;
    CPF?: string;
    "CPF."?: string;
    "CPF com mascara"?: string;
    Matrícula?: string;
    Cargo?: string;
    Secretaria?: string;
    "Dt.Nascimento"?: string;
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
    id: number;
    cpf: string;
    nome: string;
    secretaria?: string;
    portaria?: string;
    assomasul_data?: string;
    inicio?: string;
    quant?: number;
    observacoes?: string;
    motivo_alteracao?: string;
    alterado_por?: string;
    beneficiario_nome?: string;
    status_manual?: string;
    renovado_por_id?: number | null;
    created_at: string;
    updated_at: string;
}
