# ABSENTEISMO_INTELIGENTE — FASE 4.1
## Implementacao do Motor Epidemiologico Classico

**Data de execucao:** 02 de Abril de 2026  
**Projeto:** SESMT-System  
**Ref Supabase:** wybzkkejyraadabznjqg (sa-east-1, PostgreSQL 17, ACTIVE_HEALTHY)  
**Branch:** feat/unified-absenteeism-intelligence-program  
**Escopo da microfase:** camada analitica do motor epidemiologico no dominio `abs_intel`, sem telas e sem religacao de frontend

---

## A. Objetivo da microfase

Implementar o motor epidemiologico classico do programa no dominio `abs_intel`, com indicadores formais auditaveis, recortes minimos obrigatorios, validacao metodologica e trilha de reconciliacao, sem alterar legado operacional e sem abrir interface.

## B. Formulas adotadas

### Indicadores formais implementados

1. **TAD (Taxa de Absenteismo-Doenca)**  
   `TAD = (dias_perdidos / (populacao_media * dias_do_periodo)) * 100`

2. **IFL (Indice de Frequencia de Licencas)**  
   `IFL = (numero_de_licencas / populacao_media) * 1000`

3. **DML/MDL (Duracao Media das Licencas Medicas)**  
   `DML = dias_perdidos / numero_de_licencas`

4. **IG (Indice de Gravidade)**  
   `IG = (dias_perdidos / populacao_media) * 1000`

### Escalas

- TAD em percentual (% de dias perdidos sobre dias potencialmente trabalhados no periodo)
- IFL por 1.000 trabalhadores equivalentes
- DML/MDL em dias por licenca
- IG em dias perdidos por 1.000 trabalhadores equivalentes

## C. Numeradores e denominadores

### Numeradores

- `numero_de_licencas`: quantidade de eventos em `abs_fact_afastamento_evento`
- `dias_perdidos`: soma de `dias_afastado` em `abs_fact_afastamento_evento`
- Em recorte por capitulo CID:
  - `numero_de_licencas`: soma de `occurrence_weight`
  - `dias_perdidos`: soma de `allocated_days`

### Denominadores

- `populacao_media`: media da populacao ativa por competencia, derivada de `abs_fact_population_snapshot`
- `dias_do_periodo`: diferenca inclusiva entre data minima e maxima do periodo analisado
- Denominadores por recorte: media por competencia no mesmo eixo (sexo, faixa etaria, faixa tempo, secretaria, cargo, local)

## D. Tabelas/fontes usadas

Fontes no schema `abs_intel`:

- `abs_fact_afastamento_evento`
- `abs_fact_afastamento_cid`
- `abs_fact_population_snapshot`
- `abs_dim_servidor`
- `abs_dim_vinculo_servidor`
- `abs_dim_tempo`

Implementacao de motor:

- `src/lib/afastamentos-epidemiologia.ts`

## E. Recortes implementados

Recortes minimos obrigatorios implementados no motor:

1. visao geral do periodo
2. por sexo
3. por faixa etaria
4. por faixa de tempo de servico
5. por secretaria
6. por cargo
7. por local de trabalho
8. por capitulo CID

## F. Validacoes metodologicas

### F.1 — Baseline global (reconciliada)

- total_licencas: 257
- total_dias_perdidos: 23929
- populacao_media: 5443
- dias_periodo: 366
- TAD: 1.201172
- IFL: 47.216608
- DML/MDL: 93.108949
- IG: 4396.288811

### F.2 — Coerencia global x recortes

Reconciliacao de numeradores por recorte:

- soma recortes sexo = global (eventos 257; dias 23929)
- soma recortes faixa etaria = global (eventos 257; dias 23929)
- soma recortes faixa tempo de servico = global (eventos 257; dias 23929)
- soma recortes secretaria = global (eventos 257; dias 23929)
- soma recortes cargo = global (eventos 257; dias 23929)
- soma recortes local = global (eventos 257; dias 23929)

Reconciliacao por capitulo CID (ponderada):

- soma licencas ponderadas: 256.999979 (delta residual de arredondamento: -0.000021)
- soma dias ponderados: 23928.9999 (delta residual de arredondamento: -0.0001)

Conclusao: consistencia preservada, com residuos residuais apenas de arredondamento numerico esperado.

### F.3 — Consistencia dos denominadores

Eventos sem denominador valido por recorte:

- sexo: 0
- faixa etaria: 0
- faixa tempo de servico: 0
- secretaria: 0
- cargo: 0
- local: 0

### F.4 — Reconciliacao manual por amostra

Amostra de maior impacto por secretaria:

- secretaria: SECRETARIA MUNICIPAL DE EDUCACAO
- numerador_licencas: 145
- numerador_dias: 12552
- denominador_pop_media_secretaria: 2383
- dias_periodo: 366

Indicadores da amostra:

- TAD_secretaria: 1.439156
- IFL_secretaria: 60.847671
- DML_secretaria: 86.565517
- IG_secretaria: 5267.310113

Resultado: formulas e denominadores aplicados de forma consistente no recorte auditado manualmente.

## G. Limitacoes conhecidas

1. O motor atual usa populacao media por competencia (snapshot) como denominador; nao utiliza carga horaria-homem individualizada.
2. Recorte por capitulo CID usa ponderacao (`occurrence_weight` e `allocated_days`), produzindo residuais minimos de arredondamento em reconciliao global.
3. A qualidade metodologica depende da manutencao da consistencia de `abs_fact_population_snapshot` e das chaves dimensionais de vinculo/servidor.
4. Esta microfase nao inclui publicacao visual, API de exposicao para telas, nem governanca de consumo no frontend.

## H. Exemplos de leitura dos indicadores

1. **TAD 1.201172**: no periodo analisado, cerca de 1,20% do total de dias potencialmente trabalhados foi perdido por licencas medicas.
2. **IFL 47.216608**: houve aproximadamente 47,22 licencas por 1.000 trabalhadores equivalentes no periodo.
3. **DML/MDL 93.108949**: cada licenca teve duracao media de 93,11 dias.
4. **IG 4396.288811**: perda de cerca de 4.396,29 dias por 1.000 trabalhadores equivalentes no periodo.

## I. Proximo passo seguro

Proxima microfase recomendada:

- **FASE 4.2 — Validacao de consumo e contrato analitico para exposicao controlada**

Regra de governanca:

- a abertura da FASE 4.2 nao ocorre automaticamente nesta 4.1
- frontend permanece fora de escopo nesta entrega

---

*Documento canonico da FASE 4.1 criado em 02/04/2026.*