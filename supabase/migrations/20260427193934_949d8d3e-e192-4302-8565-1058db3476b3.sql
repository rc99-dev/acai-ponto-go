-- Enum de cargos
create type public.app_role as enum ('atendente', 'gerencia');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

-- user_roles (separado por segurança)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Função security definer para checar role (evita recursão em RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.get_my_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid() limit 1
$$;

-- produtos
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nome text not null,
  preco numeric(10,2) not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- vendas
create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  atendente_id uuid not null references public.profiles(id) on delete restrict,
  total numeric(10,2) not null,
  observacoes text,
  created_at timestamptz not null default now()
);
create index idx_vendas_atendente on public.vendas(atendente_id);
create index idx_vendas_created_at on public.vendas(created_at desc);

-- venda_itens
create table public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome_produto text not null,
  preco_unitario numeric(10,2) not null,
  quantidade integer not null check (quantidade > 0),
  subtotal numeric(10,2) not null
);
create index idx_venda_itens_venda on public.venda_itens(venda_id);

-- Trigger para criar profile + role no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)));

  v_role := coalesce((new.raw_user_meta_data->>'role')::app_role, 'atendente');
  insert into public.user_roles (user_id, role) values (new.id, v_role);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;

-- profiles: usuário vê o próprio; gerência vê todos
create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'gerencia'));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid());

-- user_roles: usuário vê o próprio; ninguém pode alterar (apenas trigger)
create policy "user_roles_select_own" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'gerencia'));

-- produtos: todos autenticados leem ativos; gerência gerencia
create policy "produtos_select_all" on public.produtos for select to authenticated using (true);
create policy "produtos_insert_gerencia" on public.produtos for insert to authenticated
  with check (public.has_role(auth.uid(), 'gerencia'));
create policy "produtos_update_gerencia" on public.produtos for update to authenticated
  using (public.has_role(auth.uid(), 'gerencia'));
create policy "produtos_delete_gerencia" on public.produtos for delete to authenticated
  using (public.has_role(auth.uid(), 'gerencia'));

-- vendas: atendente vê e cria as próprias; gerência vê todas
create policy "vendas_select" on public.vendas for select to authenticated
  using (atendente_id = auth.uid() or public.has_role(auth.uid(), 'gerencia'));
create policy "vendas_insert_own" on public.vendas for insert to authenticated
  with check (atendente_id = auth.uid());

-- venda_itens: segue regras da venda pai
create policy "venda_itens_select" on public.venda_itens for select to authenticated
  using (exists (select 1 from public.vendas v where v.id = venda_id
    and (v.atendente_id = auth.uid() or public.has_role(auth.uid(), 'gerencia'))));
create policy "venda_itens_insert" on public.venda_itens for insert to authenticated
  with check (exists (select 1 from public.vendas v where v.id = venda_id and v.atendente_id = auth.uid()));

-- Seed produtos
insert into public.produtos (codigo, nome, preco) values
('627879','BACABA DOSE 1ML',60.00),
('627882','BACABA DOSE 500ML',30.00),
('627886','BACABA PONTO ACAI 1/2L',18.00),
('627890','BACABA PONTO ACAI 1L',35.00),
('627894','COPO DE MILKSHAKE 500ML',40.00),
('627897','COPO MILKSHAKE 300ML',25.00),
('627902','ACAI ESPECIAL CONGELADO 1/2L',35.00),
('627909','ACAI ESPECIAL CONGELADO 1L',80.00),
('627911','ACAI ESPECIAL DOSE 500ML',70.00),
('627915','ACAI ESPECIAL 1/2L',35.00),
('627920','ACAI ESPECIAL 1L',70.00),
('627927','ACAI MEDIO CONGELADO 1/2L',27.00),
('627933','ACAI MEDIO CONGELADO 1L',80.00),
('627887','ACAI MEDIO DOSE 500ML',46.00),
('627895','ACAI MEDIO DOSE 300ML',20.00),
('627898','ACAI MEDIO PONTO ACAI 1/2L',23.00),
('627901','ACAI MEDIO PONTO ACAI 1L',46.00),
('627912','ISCA DE PEIXE UND',35.00),
('627916','MIX BOLINHOS UND',35.00),
('627919','PASTEL DE MANICOBA UND',40.00),
('627922','PASTEL DE VATAPA UND',40.00),
('627924','BOLINHO DE PIRARUCU UND',30.00),
('627930','BOLINHO DE CHARQUE UND',45.00),
('627935','BOLINHO DE MANICOBA UND',30.00),
('627936','MOLHO DE PIMENTA COM TUCUPI UND',23.00),
('627939','MEL FLOR DE ACAI 240ML',46.00),
('627885','MIX REGIONAL UND',75.00),
('627896','CAMARAO UND',79.00),
('627900','CHARQUE UND',69.00),
('627904','FILE DE GO UND',65.00),
('627913','ISCA DE FILHOTE UND',65.00),
('627918','TACACA UND',38.00),
('627923','MINI MANICOBA UND',28.00),
('627926','VATAPA UND',46.00),
('627938','MINI VATAPA UND',28.00),
('627942','TAPIOCA PRIME 1L',15.00),
('627945','TAPIOCA COMUM 1L',7.00),
('627946','FARINHA BRAGANCA 1L',16.00),
('627948','FARINHA REGIONAL 1L',14.00);