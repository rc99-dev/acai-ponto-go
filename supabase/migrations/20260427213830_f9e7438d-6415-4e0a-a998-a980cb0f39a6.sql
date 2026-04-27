
-- Attach missing triggers for sales authoritative pricing/totals

-- 1) On vendas insert: force total to 0 (will be recomputed by item triggers)
DROP TRIGGER IF EXISTS trg_vendas_zero_total ON public.vendas;
CREATE TRIGGER trg_vendas_zero_total
BEFORE INSERT ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.vendas_zero_total_on_insert();

-- 2) On venda_itens insert/update: recompute price/name/subtotal from produtos
DROP TRIGGER IF EXISTS trg_venda_itens_recompute_subtotal ON public.venda_itens;
CREATE TRIGGER trg_venda_itens_recompute_subtotal
BEFORE INSERT OR UPDATE ON public.venda_itens
FOR EACH ROW
EXECUTE FUNCTION public.venda_itens_recompute_subtotal();

-- 3) After venda_itens insert/update/delete: recompute the venda total
DROP TRIGGER IF EXISTS trg_vendas_recompute_total ON public.venda_itens;
CREATE TRIGGER trg_vendas_recompute_total
AFTER INSERT OR UPDATE OR DELETE ON public.venda_itens
FOR EACH ROW
EXECUTE FUNCTION public.vendas_recompute_total();
