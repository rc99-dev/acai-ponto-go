-- Permitir que gerência atualize/insira/remova roles de outros usuários
CREATE POLICY "user_roles_insert_gerencia" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'gerencia'));

CREATE POLICY "user_roles_update_gerencia" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gerencia'));

CREATE POLICY "user_roles_delete_gerencia" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gerencia') AND user_id <> auth.uid());
