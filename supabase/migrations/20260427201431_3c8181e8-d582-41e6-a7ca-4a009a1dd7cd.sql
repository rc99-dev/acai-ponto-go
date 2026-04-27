-- 1. Fix handle_new_user trigger: never trust raw_user_meta_data for role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)));

  -- Always default to 'atendente'. Role elevation must be done explicitly
  -- by gerencia via the criar-atendente edge function or the equipe UI.
  insert into public.user_roles (user_id, role) values (new.id, 'atendente');

  return new;
end;
$function$;

-- 2. Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated.
-- These are only meant to be called from RLS policies / triggers (definer context).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- 3. Server-side recompute of vendas.total and venda_itens.subtotal
-- Prevents an authenticated atendente from inserting falsified totals.
CREATE OR REPLACE FUNCTION public.venda_itens_recompute_subtotal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_preco numeric;
  v_nome text;
begin
  if NEW.quantidade is null or NEW.quantidade <= 0 then
    raise exception 'quantidade inválida';
  end if;

  select preco, nome into v_preco, v_nome
  from public.produtos
  where id = NEW.produto_id and ativo = true;

  if v_preco is null then
    raise exception 'produto inválido ou inativo';
  end if;

  -- Force authoritative price/name/subtotal from server
  NEW.preco_unitario := v_preco;
  NEW.nome_produto := v_nome;
  NEW.subtotal := v_preco * NEW.quantidade;

  return NEW;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.venda_itens_recompute_subtotal() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_venda_itens_recompute ON public.venda_itens;
CREATE TRIGGER trg_venda_itens_recompute
BEFORE INSERT ON public.venda_itens
FOR EACH ROW
EXECUTE FUNCTION public.venda_itens_recompute_subtotal();

-- Recompute vendas.total from venda_itens after items inserted/changed
CREATE OR REPLACE FUNCTION public.vendas_recompute_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_venda_id uuid;
  v_total numeric;
begin
  v_venda_id := coalesce(NEW.venda_id, OLD.venda_id);
  select coalesce(sum(subtotal), 0) into v_total
  from public.venda_itens where venda_id = v_venda_id;
  update public.vendas set total = v_total where id = v_venda_id;
  return null;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.vendas_recompute_total() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_vendas_recompute_total ON public.venda_itens;
CREATE TRIGGER trg_vendas_recompute_total
AFTER INSERT OR UPDATE OR DELETE ON public.venda_itens
FOR EACH ROW
EXECUTE FUNCTION public.vendas_recompute_total();

-- Initial total guard: client-supplied total on vendas insert is overwritten to 0;
-- it gets recomputed once items are inserted.
CREATE OR REPLACE FUNCTION public.vendas_zero_total_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  NEW.total := 0;
  return NEW;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.vendas_zero_total_on_insert() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_vendas_zero_total ON public.vendas;
CREATE TRIGGER trg_vendas_zero_total
BEFORE INSERT ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.vendas_zero_total_on_insert();

-- Add minimum integrity constraints
ALTER TABLE public.venda_itens
  DROP CONSTRAINT IF EXISTS venda_itens_qtd_positive,
  ADD CONSTRAINT venda_itens_qtd_positive CHECK (quantidade > 0);

ALTER TABLE public.venda_itens
  DROP CONSTRAINT IF EXISTS venda_itens_subtotal_nonneg,
  ADD CONSTRAINT venda_itens_subtotal_nonneg CHECK (subtotal >= 0);

ALTER TABLE public.vendas
  DROP CONSTRAINT IF EXISTS vendas_total_nonneg,
  ADD CONSTRAINT vendas_total_nonneg CHECK (total >= 0);