# Fase 11: Relatórios Formais e Central de Inteligência

## A. Objetivo da Fase
Criar uma central unificada de relatórios executivos, técnicos e médicos para o domínio de absenteísmo ocupacional, consolidando os achados epidemiológicos, psicossociais e ergonômicos em documentos formais para suporte à decisão.

## B. Decisão de Produto e Arquitetura
A Fase 10 (Prevention Board) foi descontinuada como tela própria para evitar redundância com as telas analíticas existentes. O valor de integração de score (SPI) e priorização preventiva foi absorvido por esta fase (Fase 11) na forma de relatórios e indicadores transversais.

## C. Relatórios Planejados (Hub Central)
1. **Relatório Executivo Mensal:** Visão sintetizada para diretoria e alta gestão.
2. **Relatório Técnico SESMT:** Detalhamento metodológico e epidemiológico para a equipe técnica.
3. **Relatório Médico Ocupacional:** Foco em vigilância clínica e discussão de agravos/recorrência.
4. **Relatório NR-1 Psicossocial (Sentinela):** Achados cruzados entre CID F e inventários de exposição.
5. **Relatório NR-17 Ergonomia (Sentinela):** Achados cruzados entre CID M e análises ergonômicas (AET).

## D. Estrutura Visual da Central (`/afastamentos/reports`)
- **BLOCO A — Visão Geral:** Título institucional e hub de navegação.
- **BLOCO B — Catálogo de Relatórios:** Cards institucionais com status de disponibilidade e público-alvo.
- **BLOCO C — Filtros Globais:** Período, secretaria, cargo e local, consistentes com as telas analíticas.
- **BLOCO D — Preview e Geração:** Área de renderização estruturada dos templates de relatório.

## E. Origem dos Dados
A central consome os motores consolidados:
- `afastamentos-epidemiologia.ts` (TAD, IFL, DML, IG)
- `afastamentos-psychosocial.ts` (Score NR-1, Fatores LIPT-69)
- `afastamentos-ergonomia.ts` (Score NR-17, Achados AET)

## F. Garantias Metodológicas
- **Sinais Sentinela:** CID F e CID M nunca são tratados como prova de causalidade automática.
- **Isolamento de NRs:** Relatórios preservam a distinção semântica entre NR-1 e NR-17.
- **Privacidade (LGPD):** Relatórios de nível executivo e técnico utilizam dados agregados; apenas o médico (acesso restrito) permite discussão de casos específicos se necessário.

## H. Microfase F11.B — Relatório Executivo Mensal (CONCLUÍDA)
Implementação do primeiro template real da Central de Relatórios.

### 1. Estrutura do Documento (8 Blocos)
- **BLOCO A — Cabeçalho Institucional:** Identificação formal, período e protocolo.
- **BLOCO B — Síntese Executiva:** Leitura narrativa do cenário epidemiológico.
- **BLOCO C — Indicadores Principais:** TAD, IFL, Eventos e Dias Perdidos em formato premium.
- **BLOCO D — Grupos Prioritários:** Tabela de criticidade cruzando Dias Perdidos + Scores Psi/Ergo.
- **BLOCO E — Síntese Psicossocial (NR-1):** Destaque de sinais sentinela CID F e áreas críticas.
- **BLOCO F — Síntese Ergonômica (NR-17):** Destaque de sinais sentinela CID M e áreas críticas.
- **BLOCO G — Notas Metodológicas:** Salvaguardas de não-causalidade e sigilo.
- **BLOCO H — Fechamento Institucional:** Nota de confidencialidade e governança.

### 2. Origem e Fluxo de Dados
Os dados são orquestrados pela lib `src/lib/afastamentos-reporting.ts`, que consome os contratos consolidados das fases anteriores (Epi, Ergo, Psy) e os projeta em uma estrutura simplificada para gestão.

### 3. Garantias Metodológicas Aplicadas
- **Linguagem Prudente:** Uso de termos como "Sinais de Atenção" e "Tendência Dominante".
- **Blindagem Técnica:** Rodapé metodológico explícito sobre a natureza dos sinais sentinela.

## I. Próximos Passos Seguros
1. Implementar o **Relatório Técnico SESMT** (F11.C) com drill-down clínico e tabelas detalhadas por unidade/cargo.
2. Desenvolver os geradores de PDF reais (físicos) a partir do preview web.
3. Criar o fluxo de " snapshots históricos" para congelamento mensal de relatórios.
