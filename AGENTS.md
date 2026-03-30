# AGENTS.md

## Instrucoes gerais

Este arquivo define diretrizes institucionais para qualquer agente que trabalhe no SESMT-SYSTEM.

## Governanca visual obrigatoria

Antes de qualquer proposta, analise, implementacao, refactor, correcao ou revisao visual, estrutural, responsiva ou de composicao de interface no SESMT-SYSTEM, e obrigatorio ler integralmente o documento canonico:

- web-platform/DESIGN_SYSTEM_SESMT_GOVERNANCA_VISUAL_UNIFICADA.md

Esta obrigatoriedade se aplica a qualquer trabalho envolvendo:

- layout
- desenho visual
- organizacao de blocos
- headers
- filtros
- cards
- listagens
- grids
- responsividade
- hierarquia visual
- componentes reutilizaveis de interface
- novas paginas ou modulos administrativos
- qualquer proposta estrutural de UI/UX

## Precedencia documental para UI/UX

Para decisoes visuais, estruturais, responsivas e de composicao de interface, a autoridade principal e:

1. web-platform/DESIGN_SYSTEM_SESMT_GOVERNANCA_VISUAL_UNIFICADA.md
2. Componentes reais ja implementados e aderentes ao documento canonico
3. Documentos anteriores de governanca, apenas como complemento historico ou detalhamento especifico

Documentos anteriores nao deixam de existir, mas passam a ser complementares. Em caso de conflito, prevalece sempre o documento canonico unificado.

Depois da leitura do documento canonico, o agente deve reaproveitar componentes e padroes reais ja existentes antes de criar qualquer nova solucao visual.

## Proibicoes explicitas

Nenhum agente deve:

- inventar padrao paralelo de interface
- criar nova familia visual sem necessidade tecnica real
- reintroduzir estruturas visuais ja superadas
- duplicar responsabilidades entre header, cards, filtros e listagens
- ignorar decisoes ja formalizadas no documento canonico
- propor solucao visual fora da familia oficial do sistema sem ausencia comprovada de padrao existente

## Fluxo obrigatorio de trabalho para UI

Quando o trabalho envolver UI, UX, layout, responsividade ou estrutura visual, o agente deve seguir este fluxo sem excecao:

1. Ler este AGENTS.md.
2. Ler web-platform/DESIGN_SYSTEM_SESMT_GOVERNANCA_VISUAL_UNIFICADA.md.
3. Localizar os componentes e padroes reais ja existentes no projeto.
4. Adaptar a solucao dentro da governanca oficial.
5. Reutilizar o que ja existe.
6. So criar algo novo quando nao houver padrao consolidado reutilizavel.

## Regra de resposta dos agentes em trabalhos visuais

Sempre que a tarefa envolver UI/UX, layout, responsividade ou composicao visual, o agente deve informar no inicio do trabalho que analisou:

- AGENTS.md
- web-platform/DESIGN_SYSTEM_SESMT_GOVERNANCA_VISUAL_UNIFICADA.md
- componentes e padroes existentes relevantes para a tarefa

## Regra de consistencia

O documento canonico unificado e a referencia principal e obrigatoria para:

- linguagem visual oficial
- regras de consistencia
- governanca de header e filtros
- governanca de cards
- regra responsiva oficial
- arquitetura de responsabilidade UX para listagens
- antipadroes proibidos
- processo de mudanca e checklist minimo

Qualquer agente futuro deve tratar essa governanca como vinculante para todo trabalho visual no SESMT-SYSTEM.