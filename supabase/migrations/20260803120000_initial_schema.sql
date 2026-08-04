-- Jomar Tecidos e Enxovais — schema inicial
-- Implementa jomar-database-spec.md (projeto de design "Jomar Tecidos design system").
-- Convenção de migrations: uma por tabela/alteração daqui pra frente (ver spec) — esta é a baseline.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists moddatetime schema extensions;

-- ============================================================================
-- ENUMS
-- Tipos nativos do Postgres (não check constraints) para bater 1:1 com os
-- union types já usados no frontend (src/features/*/types.ts) e para que
-- `supabase gen types typescript` gere esses mesmos union types automaticamente.
-- ============================================================================

create type public.user_role as enum ('customer', 'admin', 'vendas', 'estoque', 'marketing', 'suporte');
create type public.user_status as enum ('active', 'inactive');
create type public.product_status as enum ('active', 'low_stock', 'out_of_stock', 'draft');
create type public.order_status as enum ('pending', 'paid', 'shipping', 'delivered', 'cancelled');
create type public.payment_method as enum ('credit_card', 'pix', 'boleto');
create type public.delivery_status as enum ('awaiting_pickup', 'in_transit', 'delivered', 'delayed');
create type public.coupon_type as enum ('percentage', 'fixed', 'free_shipping');
create type public.coupon_status as enum ('active', 'scheduled', 'expired', 'depleted');
create type public.campaign_channel as enum ('instagram_ads', 'google_ads', 'email', 'whatsapp');
create type public.campaign_status as enum ('active', 'scheduled', 'ended');

-- ============================================================================
-- USERS
-- auth.users é a fonte de verdade pra login/senha. public.users guarda só
-- dados extras (nome, telefone, role, status) — id = mesmo uuid de auth.users.id.
-- ============================================================================

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  role public.user_role not null default 'customer',
  status public.user_status not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.users is 'Perfil do usuário. Senha/login ficam em auth.users — password_hash da spec não é replicado aqui, é responsabilidade do Supabase Auth.';

-- Popula public.users automaticamente a cada novo cadastro em auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper usado pelas policies de escrita restrita a staff.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- ============================================================================
-- ADDRESSES
-- ============================================================================

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  label text not null,
  street text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index addresses_user_id_idx on public.addresses (user_id);

-- ============================================================================
-- COMPOSITIONS
-- Categorias de fibra/material (ex: Linhos, Algodões, Poliéster, Nylon...).
-- Tabela pequena, essencialmente de referência.
-- ============================================================================

create table public.compositions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- ============================================================================
-- PRODUCTS
-- ============================================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text not null default '',
  price_per_meter numeric(10, 2) not null check (price_per_meter >= 0),
  width_m numeric(10, 3) not null check (width_m > 0),
  stock_meters numeric(10, 2) not null default 0 check (stock_meters >= 0),
  min_sale_meters numeric(10, 2) not null default 0.5 check (min_sale_meters > 0),
  status public.product_status not null default 'draft',
  tag text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_handle_updated_at
  before update on public.products
  for each row execute procedure extensions.moddatetime (updated_at);

-- ============================================================================
-- PRODUCT_COMPOSITIONS (N:N produto ↔ composição, com percentual)
-- ============================================================================

create table public.product_compositions (
  product_id uuid not null references public.products (id) on delete cascade,
  composition_id uuid not null references public.compositions (id) on delete restrict,
  percentage int not null check (percentage > 0 and percentage <= 100),
  primary key (product_id, composition_id)
);

-- ============================================================================
-- PRODUCT_COLORS
-- ============================================================================

create table public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null,
  hex text not null
);

create index product_colors_product_id_idx on public.product_colors (product_id);

-- ============================================================================
-- PRODUCT_IMAGES
-- ============================================================================

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);

create index product_images_product_id_idx on public.product_images (product_id);

-- ============================================================================
-- REVIEWS
-- ============================================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  text text not null default '',
  created_at timestamptz not null default now()
);

create index reviews_product_id_idx on public.reviews (product_id);

-- ============================================================================
-- WISHLISTS
-- ============================================================================

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  unique (user_id, product_id)
);

-- ============================================================================
-- CARTS / CART_ITEMS
-- user_id nullable pra suportar carrinho de sessão anônima — usar Supabase
-- Anonymous Sign-in (auth.uid() válido mesmo sem login) pra manter o RLS
-- simples abaixo funcionando também pra visitantes, em vez de um session_id
-- solto fora do sistema de auth.
-- ============================================================================

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  color_id uuid references public.product_colors (id) on delete set null,
  meters numeric(10, 2) not null check (meters > 0)
);

create index cart_items_cart_id_idx on public.cart_items (cart_id);

-- ============================================================================
-- COUPONS
-- ============================================================================

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type public.coupon_type not null,
  value numeric(10, 2) not null check (value >= 0),
  max_uses int check (max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  status public.coupon_status not null default 'active'
);

-- ============================================================================
-- ORDERS
-- ============================================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.users (id) on delete restrict,
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  shipping_cost numeric(10, 2) not null default 0 check (shipping_cost >= 0),
  discount_total numeric(10, 2) not null default 0 check (discount_total >= 0),
  total numeric(10, 2) not null check (total >= 0),
  coupon_id uuid references public.coupons (id) on delete set null,
  shipping_address_id uuid not null references public.addresses (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id);

-- ============================================================================
-- ORDER_ITEMS
-- ============================================================================

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  color_id uuid references public.product_colors (id) on delete set null,
  meters numeric(10, 2) not null check (meters > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  total numeric(10, 2) not null check (total >= 0)
);

create index order_items_order_id_idx on public.order_items (order_id);

-- ============================================================================
-- DELIVERIES
-- ============================================================================

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  carrier text not null,
  tracking_code text not null,
  status public.delivery_status not null default 'awaiting_pickup',
  eta_date date not null
);

-- ============================================================================
-- MARKETING_CAMPAIGNS (admin-only, painel Jomar Admin)
-- ============================================================================

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel public.campaign_channel not null,
  start_date date not null,
  end_date date,
  status public.campaign_status not null default 'scheduled',
  reach int not null default 0,
  conversions int not null default 0
);

-- ============================================================================
-- ACTIVITY_LOGS (admin-only, painel Jomar Admin)
-- ============================================================================

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);

create index activity_logs_user_id_idx on public.activity_logs (user_id);

-- ============================================================================
-- SITE_SETTINGS (admin-only, painel Jomar Admin)
-- ============================================================================

create table public.site_settings (
  key text primary key,
  value text not null
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.users enable row level security;
alter table public.addresses enable row level security;
alter table public.compositions enable row level security;
alter table public.products enable row level security;
alter table public.product_compositions enable row level security;
alter table public.product_colors enable row level security;
alter table public.product_images enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.deliveries enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.activity_logs enable row level security;
alter table public.site_settings enable row level security;

-- Leitura pública: products, compositions, product_colors, product_images, reviews, coupons.
-- (coupons é público na LEITURA pra checkout validar código — a spec só marca
-- a ESCRITA de coupons como admin-only, é o que as policies abaixo refletem.)
create policy "products_public_read" on public.products for select using (true);
create policy "compositions_public_read" on public.compositions for select using (true);
create policy "product_compositions_public_read" on public.product_compositions for select using (true);
create policy "product_colors_public_read" on public.product_colors for select using (true);
create policy "product_images_public_read" on public.product_images for select using (true);
create policy "reviews_public_read" on public.reviews for select using (true);
create policy "coupons_public_read" on public.coupons for select using (true);

-- Reviews: qualquer usuário autenticado pode criar avaliação em seu próprio nome.
create policy "reviews_insert_own" on public.reviews for insert
  with check (auth.uid() = user_id);

-- Escrita em products/compositions/product_colors/product_images: só staff.
create policy "products_write_staff" on public.products for insert
  with check (public.current_user_role() in ('admin', 'vendas', 'estoque'));
create policy "products_update_staff" on public.products for update
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'))
  with check (public.current_user_role() in ('admin', 'vendas', 'estoque'));
create policy "products_delete_staff" on public.products for delete
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'));

create policy "compositions_write_staff" on public.compositions for all
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'))
  with check (public.current_user_role() in ('admin', 'vendas', 'estoque'));
create policy "product_compositions_write_staff" on public.product_compositions for all
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'))
  with check (public.current_user_role() in ('admin', 'vendas', 'estoque'));
create policy "product_colors_write_staff" on public.product_colors for all
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'))
  with check (public.current_user_role() in ('admin', 'vendas', 'estoque'));
create policy "product_images_write_staff" on public.product_images for all
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'))
  with check (public.current_user_role() in ('admin', 'vendas', 'estoque'));

-- users / addresses / wishlists / carts / cart_items / order_items:
-- select/insert/update restrito a auth.uid() = user_id (ou dono via join).
create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_update_own" on public.users for update
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "addresses_select_own" on public.addresses for select using (auth.uid() = user_id);
create policy "addresses_insert_own" on public.addresses for insert with check (auth.uid() = user_id);
create policy "addresses_update_own" on public.addresses for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "addresses_delete_own" on public.addresses for delete using (auth.uid() = user_id);

create policy "wishlists_all_own" on public.wishlists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "carts_all_own" on public.carts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cart_items_all_own" on public.cart_items for all
  using (exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()))
  with check (exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()));

-- orders: cliente cria e lê os próprios pedidos. Alteração de status é
-- responsabilidade de staff (ou de uma function/RPC dedicada de cancelamento
-- pro cliente) — não expor UPDATE livre de pedido pro dono aqui de propósito,
-- pra não abrir brecha de alterar total/itens de um pedido já criado.
create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id);
create policy "orders_insert_own" on public.orders for insert with check (auth.uid() = user_id);
create policy "orders_update_staff" on public.orders for update
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'))
  with check (public.current_user_role() in ('admin', 'vendas', 'estoque'));

create policy "order_items_select_own" on public.order_items for select
  using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "order_items_insert_own" on public.order_items for insert
  with check (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));

-- deliveries: spec não define select explicitamente; liberado pro dono do
-- pedido acompanhar o rastreio (é o que a tela "Meus Pedidos" do site mostra).
-- Escrita fica só com staff, como a spec pede.
create policy "deliveries_select_own" on public.deliveries for select
  using (exists (select 1 from public.orders where orders.id = deliveries.order_id and orders.user_id = auth.uid()));
create policy "deliveries_write_staff" on public.deliveries for insert
  with check (public.current_user_role() in ('admin', 'vendas', 'estoque'));
create policy "deliveries_update_staff" on public.deliveries for update
  using (public.current_user_role() in ('admin', 'vendas', 'estoque'))
  with check (public.current_user_role() in ('admin', 'vendas', 'estoque'));

-- coupons: escrita admin-only (leitura pública já criada acima).
create policy "coupons_write_admin" on public.coupons for insert
  with check (public.current_user_role() = 'admin');
create policy "coupons_update_admin" on public.coupons for update
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "coupons_delete_admin" on public.coupons for delete
  using (public.current_user_role() = 'admin');

-- Tabelas admin-only (painel Jomar Admin): marketing_campaigns, activity_logs, site_settings.
create policy "marketing_campaigns_admin_only" on public.marketing_campaigns for all
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "activity_logs_admin_only" on public.activity_logs for all
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "site_settings_read_staff" on public.site_settings for select
  using (public.current_user_role() in ('admin', 'vendas', 'estoque', 'marketing', 'suporte'));
create policy "site_settings_write_admin" on public.site_settings for insert
  with check (public.current_user_role() = 'admin');
create policy "site_settings_update_admin" on public.site_settings for update
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
