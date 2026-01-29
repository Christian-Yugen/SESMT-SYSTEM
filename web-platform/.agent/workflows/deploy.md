---
description: Como realizar o deploy do SESMT SYSTEM (Frontend e Backend)
---

# Guia de Deploy - SESMT SYSTEM

Este guia descreve como colocar o sistema online para que outros usuários da prefeitura possam acessar.

## 1. Frontend (Next.js) - Hospedagem no Vercel

O Vercel é a melhor plataforma para o Next.js. É rápido, seguro e gratuito para projetos pequenos/médios.

### Passos:
1. **GitHub**: Suba o código da pasta `web-platform` para um repositório no seu GitHub.
2. **Vercel**: Acesse [vercel.com](https://vercel.com), faça login com seu GitHub e clique em **"Add New Project"**.
3. **Configuração**:
   - Selecione o repositório do projeto.
   - Em **Environment Variables**, adicione as chaves do seu `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_API_URL` (Aqui você colocará o link do seu backend público).
4. **Deploy**: Clique em Deploy. O Vercel gerará um link (ex: `sesmt-system.vercel.app`).

---

## 2. Backend (Python/FastAPI) - Acesso Público

Como o backend utiliza automação do Excel (Windows), ele precisa rodar em uma máquina Windows.

### Opção A: Servidor Local com Túnel (Ngrok) - Recomendado para Início
Esta opção permite que seu computador local funcione como o servidor.
1. Baixe o **ngrok** em [ngrok.com](https://ngrok.com).
2. Rode o seu `server.py` normalmente.
3. No terminal, execute: `ngrok http 8000`.
4. O ngrok fornecerá um link público (ex: `https://abcd-123.ngrok-free.app`).
5. Copie este link e coloque-o na variável `NEXT_PUBLIC_API_URL` lá no Vercel.

### Opção B: Servidor Windows Dedicado (Produção)
Para um ambiente profissional e estável:
1. Contrate um servidor VPS com **Windows Server**.
2. Instale o Python e o **Microsoft Excel** (necessário para a geração de PDFs).
3. Clone o backend, instale o `requirements.txt` e rode com `uvicorn`.
4. Aponte um domínio ou IP fixo para este servidor.

---

## 3. Segurança (CORS)

No arquivo `server.py`, já configuramos o CORS para permitir acessos de qualquer origem (`allow_origins=["*"]`). Isso é necessário para que o link do Vercel consiga "conversar" com seu backend público.

---

### Dica Importante:
Sempre que você atualizar o código e fizer o `git push`, o Vercel atualizará o link automaticamente!
