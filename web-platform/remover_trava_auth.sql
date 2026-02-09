
-- REMOVER A DEPENDÊNCIA OBRIGATÓRIA DA TABELA AUTH.USERS
-- Isso permite criarmos perfis "pré-autorizados" que ainda não têm conta no Supabase Auth.

-- 1. Remover a restrição de chave estrangeira (Foreign Key)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. (OPCIONAL) Se você quiser manter a integridade mas permitir IDs manuais, 
-- o ideal é apenas remover a FK como feito acima. 
-- O sistema de sync que criamos cuidará de vincular o ID correto quando o usuário logar.

-- 3. Certifique-se de que as políticas de ADMIN continuam valendo
-- (Caso não tenha rodado o script anterior)
CREATE POLICY "Admins podem inserir perfis" 
ON public.profiles FOR INSERT 
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins podem atualizar perfis" 
ON public.profiles FOR UPDATE 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins podem deletar perfis" 
ON public.profiles FOR DELETE 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
