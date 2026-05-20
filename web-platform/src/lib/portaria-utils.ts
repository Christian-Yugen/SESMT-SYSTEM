/**
 * Lógica gramatical e ortográfica para Portarias
 */

const COMMON_ORTHOGRAPHY_CORRECTIONS: Record<string, string> = {
    'GESTAO': 'GESTÃO',
    'SAUDE': 'SAÚDE',
    'EDUCACAO': 'EDUCAÇÃO',
    'TRES LAGOAS': 'TRÊS LAGOAS',
    'MUNICIPIO': 'MUNICÍPIO',
    'SECRETARIO': 'SECRETÁRIO',
    'SECRETARIA': 'SECRETARIA',
    'SERVICO': 'SERVIÇO',
    'SERVICOS': 'SERVIÇOS',
    'PRODUCAO': 'PRODUÇÃO',
    'CONCEICAO': 'CONCEIÇÃO',
    'ATENCAO': 'ATENÇÃO',
    'TECNICO': 'TÉCNICO',
    'TECNICA': 'TÉCNICA',
    'MEDICO': 'MÉDICO',
    'MEDICA': 'MÉDICA',
    'PERICIA': 'PERÍCIA',
    'ASSISTENCIA': 'ASSISTÊNCIA',
    'ASSISTENCIAL': 'ASSISTENCIAL',
    'SOCIAIS': 'SOCIAIS',
    'SOCIAL': 'SOCIAL',
    'VIGILANCIA': 'VIGILÂNCIA',
    'SANITARIA': 'SANITÁRIA',
    'EPIDEMIOLOGICA': 'EPIDEMIOLÓGICA',
    'PREVENCAO': 'PREVENÇÃO',
    'MANUTENCAO': 'MANUTENÇÃO',
    'OPERACAO': 'OPERAÇÃO',
    'ADMINISTRACAO': 'ADMINISTRAÇÃO',
    'ADMINISTRATIVO': 'ADMINISTRATIVO',
    'DIRECAO': 'DIREÇÃO',
    'RECURSOS': 'RECURSOS',
    'HUMANOS': 'HUMANOS',
    'PESSOAS': 'PESSOAS',
    'FINANCAS': 'FINANÇAS',
    'PLANEJAMENTO': 'PLANEJAMENTO',
    'ORCAMENTO': 'ORÇAMENTO',
    'HABITACAO': 'HABITAÇÃO',
    'INFRAESTRUTURA': 'INFRAESTRUTURA',
    'TRANSITO': 'TRÂNSITO',
    'TRANSPORTE': 'TRANSPORTE',
    'MEIO': 'MEIO',
    'AMBIENTE': 'AMBIENTE',
    'AGRICULTURA': 'AGRICULTURA',
    'INDÚSTRIA': 'INDÚSTRIA',
    'INDUSTRIA': 'INDÚSTRIA',
    'COMERCIO': 'COMÉRCIO',
    'ESPORTE': 'ESPORTE',
    'LAZER': 'LAZER',
    'CULTURA': 'CULTURA',
    'TURISMO': 'TURISMO',
    'DESENVOLVIMENTO': 'DESENVOLVIMENTO',
    'ECONOMICO': 'ECONÔMICO',
    'CIENCIA': 'CIÊNCIA',
    'TECNOLOGIA': 'TECNOLOGIA',
    'INOVACAO': 'INOVAÇÃO',
    'COMUNICACAO': 'COMUNICAÇÃO',
    'GOVERNO': 'GOVERNO',
    'CASA': 'CASA',
    'CIVIL': 'CIVIL',
    'JURIDICA': 'JURÍDICA',
    'PATRIMONIO': 'PATRIMÔNIO',
    'ESTADO': 'ESTADO',
    'ESTADUAL': 'ESTADUAL',
    'FEDERAL': 'FEDERAL',
    'UNIAO': 'UNIÃO'
};

/**
 * Corrige problemas comuns de ortografia e acentuação (principalmente do banco de dados)
 */
export function fixOrthography(text: string): string {
    if (!text) return "";

    let corrected = text;

    // Substituições diretas para termos comuns (Case-insensitive)
    Object.entries(COMMON_ORTHOGRAPHY_CORRECTIONS).forEach(([wrong, right]) => {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        corrected = corrected.replace(regex, right);
    });

    return corrected;
}

export const MASCULINE_WORKPLACE_PREFIXES = [
    'DEP', 'DEPTO', 'DEPART', 'DEPARTAMENTO', 'SETOR', 'CENTRO', 'CENT.',
    'CRAS', 'CREAS', 'CRAM', 'CEI', 'LABORATÓRIO', 'GABINETE',
    'CEMITÉRIO', 'CONSELHO', 'PROCON', 'SAMU', 'NUCL', 'NÚCLEO',
    'POSTO', 'PODER JUDICIÁRIO', 'PSF'
];

export const FEMININE_WORKPLACE_PREFIXES = [
    'SECRETARIA', 'SEC', 'SECRET.', 'DIRETORIA', 'DIVISÃO', 'DIVISAO',
    'COORDENAÇÃO', 'COORD', 'ESCOLA', 'E.M.T.I', 'E.M.', 'CLÍNICA',
    'UNIDADE', 'UPA', 'USF', 'ESF', 'ASSESSORIA', 'DEFESA CIVIL',
    'PERÍCIA MÉDICA', 'RESIDÊNCIA TERAPÊUTICA', 'JUNTA MILITAR',
    'CÂMARA MUNICIPAL', 'CHÁCARA', 'FARMÁCIA', 'ACADEMIA', 'OUVIDORIA', 'AUDITORIA'
];

export const ACRONYMS = ['PSF', 'CEI', 'UPA', 'USF', 'ESF', 'CRAM', 'CRAS', 'CREAS', 'DGP', 'SEGP', 'SESMT', 'MS'];

export const STATUS_OR_CATEGORY = [
    'APOSENTADOS', 'PENSIONISTAS', 'CEDIDOS', 'Q EXCEDENTES DE TRABALHADORES', 'TRANSFERÊNCIA EDUCAÇÃO'
];

/**
 * Retorna o preposto correto (no, na, em) baseado no local de trabalho
 */
export function getWorkplacePreposition(workplace: string): string {
    if (!workplace) return 'na';

    const upperWorkplace = workplace.toUpperCase().trim();

    // Verificação de Status/Categoria (sem artigo) - "lotado em"
    if (STATUS_OR_CATEGORY.some(s => upperWorkplace.includes(s))) {
        return 'em';
    }

    // Verificação Masculino (NO)
    if (MASCULINE_WORKPLACE_PREFIXES.some(p => upperWorkplace.startsWith(p))) {
        return 'no';
    }

    // Verificação Feminino (NA) - Padrão se não for masculino
    if (FEMININE_WORKPLACE_PREFIXES.some(p => upperWorkplace.startsWith(p))) {
        return 'na';
    }

    // Fallback padrão administrativo
    return 'na';
}

/**
 * Formata um nome ou cargo para "Proper Case" (Cada Palavra Maiúscula)
 * com exceção de conjunções (de, da, do, dos, das) que ficam minúsculas.
 */
export function capitalizeName(text: string): string {
    if (!text) return "";
    const exceptions = ['de', 'da', 'do', 'dos', 'das', 'e'];

    return fixOrthography(text)
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .map((word, index) => {
            if (index > 0 && exceptions.includes(word)) {
                return word;
            }
            // Preservar siglas em maiúsculo
            const upperWord = word.toUpperCase();
            if (ACRONYMS.includes(upperWord)) {
                return upperWord;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

/**
 * Retorna a frase completa "lotado(a) no/na/em"
 */
export function getLotadoGrammar(genero: 'M' | 'F', workplace: string): string {
    const lotado = genero === 'F' ? 'lotada' : 'lotado';
    const preposition = getWorkplacePreposition(workplace);
    return `${lotado} ${preposition}`;
}
