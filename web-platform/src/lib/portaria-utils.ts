/**
 * Lógica gramatical para Portarias
 */

export const MASCULINE_WORKPLACE_PREFIXES = [
    'DEP', 'DEPTO', 'DEPART', 'DEPARTAMENTO', 'SETOR', 'CENTRO', 'CENT.',
    'CRAS', 'CREAS', 'CRAM', 'CEI', 'LABORATÓRIO', 'GABINETE',
    'CEMITÉRIO', 'CONSELHO', 'PROCON', 'SAMU', 'NUCL', 'NÚCLEO',
    'POSTO', 'PODER JUDICIÁRIO'
];

export const FEMININE_WORKPLACE_PREFIXES = [
    'SECRETARIA', 'SEC', 'SECRET.', 'DIRETORIA', 'DIVISÃO', 'DIVISAO',
    'COORDENAÇÃO', 'COORD', 'ESCOLA', 'E.M.T.I', 'E.M.', 'CLÍNICA',
    'UNIDADE', 'UPA', 'USF', 'ESF', 'PSF', 'ASSESSORIA', 'DEFESA CIVIL',
    'PERÍCIA MÉDICA', 'RESIDÊNCIA TERAPÊUTICA', 'JUNTA MILITAR',
    'CÂMARA MUNICIPAL', 'CHÁCARA', 'FARMÁCIA', 'ACADEMIA', 'OUVIDORIA', 'AUDITORIA'
];

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

    return text
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .map((word, index) => {
            if (index > 0 && exceptions.includes(word)) {
                return word;
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
