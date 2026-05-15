# PR: Corrige fluxo de portarias de afastamento e habilita saneamento manual

## Resumo
Este PR reorganiza o fluxo de portarias de afastamento para impedir conflitos de numeração futura, corrigir a navegação e permitir saneamento seguro dos registros históricos que foram numerados automaticamente de forma incorreta.

## Problemas atacados
- A nova portaria precisava aceitar numeração manual obrigatória e validar disponibilidade antes de gravar.
- O texto institucional da portaria precisava respeitar sexo do servidor em PDF e DOCX.
- O DOCX precisava deixar de ser reconstruído de forma aproximada e passar a usar um template Word fiel ao modelo oficial.
- A listagem de portarias de afastamento existia, mas não estava navegável pelo menu do sistema.
- A rota de listagem quebrava quando havia join nulo com afastamentos.
- As portarias históricas foram renumeradas automaticamente de forma errada; o sistema precisava permitir correção manual e reset seguro desses registros.
- O módulo de arquivo médico tratava incorretamente o número da pasta como se fosse único isoladamente.

## O que foi alterado

### Portarias de afastamento
- Número manual da portaria tornou-se obrigatório no fluxo de novo afastamento.
- Pré-checagem de disponibilidade via RPC `check_portaria_availability` antes de inserir registros.
- Inserção de portarias com melhor tratamento de conflito e condição de corrida.
- Inclusão de `servidor_sexo` no fluxo para geração correta do texto institucional.
- Correção do PDF e do DOCX para concordância por sexo do servidor.
- Migração do DOCX para geração baseada em template Word oficial.
- Nova listagem de portarias em `/afastamentos/portarias` com filtros por nome, número e ano.
- Inclusão da rota no menu lateral oficial.
- Correção da listagem para não quebrar quando houver join nulo com `afastamentos`.
- Criação de tela de edição manual de portarias históricas em `/afastamentos/portarias/edit/[id]`.

### Banco e auditoria
- Auditoria de `portarias_afastamento` com trigger e políticas RLS compatíveis.
- RPC de verificação de disponibilidade de número/ano.
- Função SQL para reencaixe seguro de números incorretos em lacunas abaixo de um limite válido.
- Migration de reset controlado das portarias de afastamento, com backup antes da exclusão dos registros ativos.

### Arquivo médico
- Correção da validação de localização física da pasta para usar `armario + gaveta + pasta`.
- Migration defensiva para remover unicidade indevida de `pasta` isolada e garantir unicidade apenas da localização completa.

## Arquivos principais
- [web-platform/src/app/afastamentos/new/page.tsx](web-platform/src/app/afastamentos/new/page.tsx)
- [web-platform/src/app/afastamentos/portarias/page.tsx](web-platform/src/app/afastamentos/portarias/page.tsx)
- [web-platform/src/app/afastamentos/portarias/edit/[id]/page.tsx](web-platform/src/app/afastamentos/portarias/edit/[id]/page.tsx)
- [web-platform/src/lib/afastamento-portaria-pdf.ts](web-platform/src/lib/afastamento-portaria-pdf.ts)
- [web-platform/src/lib/afastamento-portaria-docx.ts](web-platform/src/lib/afastamento-portaria-docx.ts)
- [web-platform/src/lib/portaria-utils.ts](web-platform/src/lib/portaria-utils.ts)
- [web-platform/src/components/layout/Sidebar.tsx](web-platform/src/components/layout/Sidebar.tsx)
- [web-platform/src/lib/menu-config.ts](web-platform/src/lib/menu-config.ts)
- [web-platform/src/app/archive/page.tsx](web-platform/src/app/archive/page.tsx)

## Migrations incluídas
- [web-platform/migrations/2026_05_14_add_servidor_sexo_and_backfill.sql](web-platform/migrations/2026_05_14_add_servidor_sexo_and_backfill.sql)
- [web-platform/migrations/add_portarias_audit_and_rpc.sql](web-platform/migrations/add_portarias_audit_and_rpc.sql)
- [web-platform/migrations/2026_05_15_prepare_historical_portarias_afastamento_fix.sql](web-platform/migrations/2026_05_15_prepare_historical_portarias_afastamento_fix.sql)
- [web-platform/migrations/2026_05_15_reset_existing_portarias_afastamento.sql](web-platform/migrations/2026_05_15_reset_existing_portarias_afastamento.sql)
- [database/migrations/014_fix_medical_folder_location_uniqueness.sql](database/migrations/014_fix_medical_folder_location_uniqueness.sql)
- [supabase/migrations/20260515153000_fix_medical_folder_location_uniqueness.sql](supabase/migrations/20260515153000_fix_medical_folder_location_uniqueness.sql)
- [supabase/migrations/20260515180000_reset_existing_portarias_afastamento.sql](supabase/migrations/20260515180000_reset_existing_portarias_afastamento.sql)

## Validações executadas
- `npx tsc --noEmit`
- `npm run build`
- Testes manuais de navegação da rota `/afastamentos/portarias`
- Execução manual no Supabase do reset de portarias:
	- `total_portarias_ativas = 0`
	- `total_backup_portarias = 264`
	- `total_backup_auditoria = 15`

## Observações operacionais
- As portarias de afastamento ativas foram zeradas de forma intencional para reconstrução manual.
- Os dados antigos foram preservados em tabelas de backup.
- A partir deste ponto, a numeração correta deve ser relançada manualmente conforme a referência operacional válida.
- O saneamento automático de histórico antigo não foi forçado onde o sistema não consegue inferir o número oficial correto.

## Checklist
- [x] Fluxo de nova portaria exige número manual
- [x] Disponibilidade de número/ano validada antes da gravação
- [x] PDF e DOCX ajustados ao texto oficial
- [x] Rota `/afastamentos/portarias` listada no menu lateral
- [x] Edição manual de portaria histórica disponível
- [x] Reset de portarias executado com backup preservado
- [x] Correção da lógica de localização do arquivo médico

## Título sugerido
Corrige portarias de afastamento e prepara saneamento manual
