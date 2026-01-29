# Plano de Migração: SESMT-ASO Desktop para Plataforma Web

Sim, é perfeitamente possível e altamente recomendado migrar este sistema para a web. Isso eliminará problemas de instalação, dependência do Microsoft Excel local e permitirá o acesso de qualquer computador ou tablet.

## 1. Arquitetura Proposta

*   **Frontend**: Next.js (React) - Interface moderna, rápida e responsiva.
*   **Backend**: Supabase - Para autenticação de usuários e banco de dados relacional.
*   **Banco de Dados**: PostgreSQL (Supabase) - Substituiremos os arquivos Excel de consulta (`BancoDados.xlsx`, `GHE.xlsx`) por tabelas no banco de dados.
*   **Processamento de PDF**: Geraremos os PDFs diretamente via código (usando bibliotecas como `React-PDF` ou `Puppeteer`), removendo a necessidade do `ASO.xlsx` como template físico.
*   **Hospedagem**: Vercel ou Netlify - Deploy automatizado e seguro.

---

## 2. Etapas de Implementação

### Fase 1: Configuração e Banco de Dados (Semana 1)
1.  **Criação do Projeto**: Iniciar Next.js com Tailwind CSS.
2.  **Migração de Dados**: Criar um script Python/Node para ler seus arquivos Excel atuais e "subir" os dados para o Supabase:
    *   Tabela `servidores` (Matrícula, CPF, Nome, Nasc, etc).
    *   Tabela `funcoes_ghe` (Função, GHE, GHE_CONJ).
    *   Tabela `riscos_exames` (GHE, Riscos, Exames Admit/Dem/Period).

### Fase 2: Desenvolvimento da Interface (Semana 1-2)
1.  **Página de Busca**: Recriar a busca por CPF com filtros inteligentes.
2.  **Página de Emissão**:
    *   Seleção de Função com "Auto-complete" (mesmo comportamento do desktop).
    *   Seleção de Tipo de ASO (Admissional, etc).
    *   Input de datas dos exames.
    *   Área de visualização de riscos e exames necessários.

### Fase 3: Motor de PDF (Semana 2)
1.  **Template Digital**: Reconstruir o layout visual do `ASO.xlsx` e `Encaminhamento de Exames.xlsx` usando HTML/CSS.
2.  **Geração Dinâmica**: O sistema preencherá o template com os dados do servidor e gerará um PDF que abre direto no navegador.
3.  **Impressão**: Utilizar a função `window.print()` configurada para gerar 2 páginas ou abrir o diálogo de impressão do navegador.

### Fase 4: Deploy e Testes (Semana 2-3)
1.  **Hospedagem**: Conectar o repositório GitHub ao Vercel.
2.  **Segurança**: Implementar login para que apenas funcionários autorizados acessem os dados.
3.  **Validação**: Testar a geração de PDFs comparando com os modelos atuais.

---

## 3. Benefícios da Mudança

| Funcionalidade | Desktop (Atual) | Web (Planejado) |
| :--- | :--- | :--- |
| **Instalação** | Precisa instalar o .exe em cada PC | URL única (acesso instantâneo) |
| **Banco de Dados** | Excel local (pode corromper/desalinhado) | Banco na nuvem (centralizado e seguro) |
| **Impressão** | Envio direto (requer Excel instalado) | Padrão Web (funciona em qualquer impressora) |
| **Atualizações** | Precisa baixar nova versão do app | Atualiza automaticamente para todos usuários |
| **Segurança** | Arquivos soltos na pasta `dados` | Dados protegidos por senha e Níveis de Acesso |

---

## Próximos Passos Sugeridos

Você gostaria que eu começasse a criar a estrutura básica deste projeto na pasta `web-platform` usando **Next.js**? 

Podemos começar importando apenas uma tabela (ex: GHE) para você ver como funciona na web.
