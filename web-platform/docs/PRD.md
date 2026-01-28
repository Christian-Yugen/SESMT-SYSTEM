# Product Requirement Document (PRD)

## 1. Visão Geral

Plataforma de estudos web focada na jornada de aprendizado para três perfis: **Iniciante**, **Acompanhante** e **Mestre**. O sistema gerencia o acesso a 7 cursos prioritários, validação de progresso e emissão de certificados com verificação via QR Code.

## 2. Mapa de Navegação

```mermaid
graph TD
    A[Public Home / Login] -->|Auth Success| B[Dashboard]
    B -->|Role: Admin| C[Admin Panel]
    B -->|Role: Student| D[Meus Cursos]
    D --> E[Detalhe do Curso]
    E --> F[Aula / Conteúdo]
    E --> G[Prova / Validação]
    G -->|Pass| H[Certificado (PDF + QR)]
    C --> I[Gestão de Usuários]
    C --> J[Gestão de Cursos]
    C --> K[Audit Logs]
```

## 3. Wireframes Textuais

### 3.1 Tela de Login

- **Header**: Logo da Instituição (Centralizado).
- **Body**:
  - Input: Email ou CIM (Identificação).
  - Input: Senha.
  - Button: "Entrar" (Primary).
  - Link: "Esqueci minha senha".
- **Footer**: Links de suporte e política de privacidade.

### 3.2 Dashboard (Por Role)

- **Header**: Avatar do usuário, Saudação ("Bem-vindo, Ir. [Nome]"), Menu Hambúrguer.
- **Body**:
  - **Iniciante/Acompanhante**: Card de "Próximo Passo/Curso Atual". Barra de progresso geral. Lista de "Cursos Disponíveis".
  - **Mestre**: Visão geral de pupilos (se aplicável) ou acesso irrestrito aos estudos avançados.
  - **Admin**: Cards de métricas (Novos usuários, Certificados emitidos hoje).

### 3.3 Detalhe do Curso

- **Topo**: Título do Curso, Instrutor/Autor, Duração estimada.
- **Conteúdo**: Accordion com módulos/aulas. Ícones indicando status (Cadeado: Bloqueado, Check: Concluído, Play: Em andamento).
- **Ação**: Botão "Continuar de onde parou" ou "Emitir Certificado" (se 100%).

### 3.4 Certificado

- Layout formal.
- Elementos: Nome do Estudante, Grau, Data, Código de Verificação, QR Code validador.
- Botão: "Baixar PDF".

## 4. Microcopy (pt-BR)

| Elemento | Texto (pt-BR) | Contexto |
| :--- | :--- | :--- |
| **Botão Login** | Entrar na Plataforma | Tela de Login |
| **Erro Login** | Credenciais inválidas. Verifique seu CIM/Email. | Feedback de erro |
| **Curso Bloqueado** | Complete o pré-requisito para desbloquear. | Lista de Cursos |
| **Sucesso Certificado** | Parabéns! Seu certificado foi gerado com sucesso. | Pós-conclusão |
| **Botão Download** | Baixar Certificado (PDF) | Tela de Certificado |
| **Empty State** | Nenhum curso iniciado ainda. Comece agora! | Dashboard |
