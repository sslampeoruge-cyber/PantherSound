-- PantherSound · Luz y Sonido
-- Dirección del evento, nombre libre del contratante y precios de fotos/video.
-- Ejecutar después de 0001_init.sql en el SQL Editor de Supabase.

-- ============================================================
-- Nuevas columnas del contrato
-- ============================================================
alter table public.contracts
  add column if not exists contractor_name text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists photos_price numeric(12, 2) not null default 0,
  add column if not exists filming_price numeric(12, 2) not null default 0;

do $$ begin
  alter table public.contracts
    add constraint contracts_photos_price_check check (photos_price >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.contracts
    add constraint contracts_filming_price_check check (filming_price >= 0);
exception when duplicate_object then null; end $$;
--uwu
-- Conserva el nombre de los contratos anteriores que sí tenían cliente.
update public.contracts c
set contractor_name = cl.name
from public.clients cl
where c.client_id = cl.id
  and c.contractor_name is null;

-- ============================================================
-- Vista con total (servicio + fotos + video)
-- ============================================================
drop view if exists public.contracts_with_totals;
create view public.contracts_with_totals
with (security_invoker = true)
as
select
  c.*,
  coalesce(c.contractor_name, cl.name) as client_name,
  cl.phone as client_phone,
  v.name as venue_name,
  sp.name as sound_name,
  ft.name as frame_name,
  (c.price + c.photos_price + c.filming_price)::numeric(12, 2) as total,
  coalesce(p.paid_total, 0)::numeric(12, 2) as paid_total,
  (c.price + c.photos_price + c.filming_price - coalesce(p.paid_total, 0))::numeric(12, 2) as remaining,
  case
    when c.cancelled_at is not null then 'cancelado'
    when coalesce(p.paid_total, 0) <= 0 then 'pendiente'
    when coalesce(p.paid_total, 0) < (c.price + c.photos_price + c.filming_price) then 'parcial'
    else 'pagado'
  end as status
from public.contracts c
left join public.clients cl on cl.id = c.client_id
left join public.venues v on v.id = c.venue_id
left join public.sound_packages sp on sp.id = c.sound_package_id
left join public.frame_types ft on ft.id = c.frame_type_id
left join (
  select contract_id, sum(amount) as paid_total
  from public.payments
  group by contract_id
) p on p.contract_id = c.id
where c.deleted_at is null;

grant select on public.contracts_with_totals to authenticated;
