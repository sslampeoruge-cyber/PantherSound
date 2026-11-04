-- PantherSound · Luz y Sonido
-- Esquema, permisos (RLS), triggers, storage y datos iniciales.
-- Ejecutar completo en el SQL Editor de Supabase.

create extension if not exists pgcrypto;

-- ============================================================
-- Tipos
-- ============================================================
do $$ begin
  create type public.user_role as enum ('admin', 'vendedor', 'consulta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('efectivo', 'transferencia', 'tarjeta', 'otro');
exception when duplicate_object then null; end $$;

-- ============================================================
-- Utilidades
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- Perfiles y roles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  role public.user_role not null default 'consulta',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
revoke insert, delete, update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

create or replace function public.app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.app_role() = 'admin', false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.app_role() in ('admin', 'vendedor'), false);
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active = true);
$$;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- Catálogos y clientes
-- ============================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sound_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  base_price numeric(12, 2) not null default 0 check (base_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.frame_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12, 2) not null default 0 check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.clauses (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 1,
  text text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Contratos, pagos y adjuntos
-- ============================================================
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  client_id uuid references public.clients(id) on delete set null,
  venue_id uuid references public.venues(id) on delete set null,
  event_date date not null,
  start_time time,
  end_time time,
  event_type text,
  honoree_name text,
  sound_package_id uuid references public.sound_packages(id) on delete set null,
  sound_notes text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  photos boolean not null default false,
  frame_type_id uuid references public.frame_types(id) on delete set null,
  filming boolean not null default false,
  recording_location text,
  observations text,
  representative_name text,
  signed_at date,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists contracts_event_date_idx on public.contracts (event_date);
create index if not exists contracts_created_by_idx on public.contracts (created_by);
create index if not exists contracts_client_id_idx on public.contracts (client_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  method public.payment_method not null default 'efectivo',
  reference text,
  receipt_path text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payments_contract_id_idx on public.payments (contract_id);
create index if not exists payments_paid_at_idx on public.payments (paid_at);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  storage_path text not null,
  kind text not null default 'foto',
  file_name text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists attachments_contract_id_idx on public.attachments (contract_id);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  table_name text not null,
  record_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Vista con totales y estado derivado
-- ============================================================
drop view if exists public.contracts_with_totals;
create view public.contracts_with_totals
with (security_invoker = true)
as
select
  c.*,
  cl.name as client_name,
  cl.phone as client_phone,
  v.name as venue_name,
  sp.name as sound_name,
  ft.name as frame_name,
  coalesce(p.paid_total, 0)::numeric(12, 2) as paid_total,
  (c.price - coalesce(p.paid_total, 0))::numeric(12, 2) as remaining,
  case
    when c.cancelled_at is not null then 'cancelado'
    when coalesce(p.paid_total, 0) <= 0 then 'pendiente'
    when coalesce(p.paid_total, 0) < c.price then 'parcial'
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

-- ============================================================
-- RLS: clientes y catálogos
-- ============================================================
alter table public.clients enable row level security;
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated using (public.is_active_user());
drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert to authenticated with check (public.is_staff());
drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());
drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
  for delete to authenticated using (public.is_admin());

alter table public.venues enable row level security;
alter table public.sound_packages enable row level security;
alter table public.frame_types enable row level security;
alter table public.clauses enable row level security;

drop policy if exists venues_select on public.venues;
create policy venues_select on public.venues
  for select to authenticated using (public.is_active_user());
drop policy if exists venues_admin on public.venues;
create policy venues_admin on public.venues
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists sound_packages_select on public.sound_packages;
create policy sound_packages_select on public.sound_packages
  for select to authenticated using (public.is_active_user());
drop policy if exists sound_packages_admin on public.sound_packages;
create policy sound_packages_admin on public.sound_packages
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists frame_types_select on public.frame_types;
create policy frame_types_select on public.frame_types
  for select to authenticated using (public.is_active_user());
drop policy if exists frame_types_admin on public.frame_types;
create policy frame_types_admin on public.frame_types
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists clauses_select on public.clauses;
create policy clauses_select on public.clauses
  for select to authenticated using (public.is_active_user());
drop policy if exists clauses_admin on public.clauses;
create policy clauses_admin on public.clauses
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- RLS: contratos
-- ============================================================
alter table public.contracts enable row level security;

drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts
  for select to authenticated using (
    public.is_admin()
    or public.app_role() = 'consulta'
    or (public.app_role() = 'vendedor' and created_by = auth.uid())
  );

drop policy if exists contracts_insert on public.contracts;
create policy contracts_insert on public.contracts
  for insert to authenticated with check (
    public.is_staff() and created_by = auth.uid()
  );

drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts
  for update to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'vendedor' and created_by = auth.uid())
  )
  with check (
    public.is_admin()
    or (public.app_role() = 'vendedor' and created_by = auth.uid())
  );

drop policy if exists contracts_delete on public.contracts;
create policy contracts_delete on public.contracts
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- RLS: pagos
-- ============================================================
alter table public.payments enable row level security;

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated using (
    public.is_admin()
    or public.app_role() = 'consulta'
    or (
      public.app_role() = 'vendedor'
      and exists (
        select 1 from public.contracts c
        where c.id = payments.contract_id and c.created_by = auth.uid()
      )
    )
  );

drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments
  for insert to authenticated with check (
    public.is_staff()
    and created_by = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.contracts c
        where c.id = contract_id and c.created_by = auth.uid()
      )
    )
  );

drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- RLS: adjuntos y auditoría
-- ============================================================
alter table public.attachments enable row level security;

drop policy if exists attachments_select on public.attachments;
create policy attachments_select on public.attachments
  for select to authenticated using (
    public.is_admin()
    or public.app_role() = 'consulta'
    or (
      public.app_role() = 'vendedor'
      and exists (
        select 1 from public.contracts c
        where c.id = attachments.contract_id and c.created_by = auth.uid()
      )
    )
  );

drop policy if exists attachments_insert on public.attachments;
create policy attachments_insert on public.attachments
  for insert to authenticated with check (
    public.is_staff()
    and uploaded_by = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.contracts c
        where c.id = contract_id and c.created_by = auth.uid()
      )
    )
  );

drop policy if exists attachments_delete on public.attachments;
create policy attachments_delete on public.attachments
  for delete to authenticated using (public.is_admin());

alter table public.audit_log enable row level security;
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated using (public.is_admin());

-- ============================================================
-- Triggers de negocio
-- ============================================================
create sequence if not exists public.contract_folio_seq start with 1;

create or replace function public.set_contract_folio()
returns trigger
language plpgsql
as $$
begin
  if new.folio is null or btrim(new.folio) = '' then
    new.folio := 'LS-' || to_char(coalesce(new.event_date, current_date), 'YYYY')
      || '-' || lpad(nextval('public.contract_folio_seq')::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists contracts_set_folio on public.contracts;
create trigger contracts_set_folio
  before insert on public.contracts
  for each row execute function public.set_contract_folio();

create or replace function public.protect_contract_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.deleted_at is distinct from old.deleted_at then
      raise exception 'Solo un administrador puede eliminar contratos.';
    end if;
    if new.created_by is distinct from old.created_by then
      raise exception 'No puedes cambiar el propietario del contrato.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists contracts_protect_update on public.contracts;
create trigger contracts_protect_update
  before update on public.contracts
  for each row execute function public.protect_contract_update();

create or replace function public.protect_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and new.deleted_at is distinct from old.deleted_at then
    raise exception 'Solo un administrador puede eliminar clientes.';
  end if;
  return new;
end $$;

drop trigger if exists clients_protect_update on public.clients;
create trigger clients_protect_update
  before update on public.clients
  for each row execute function public.protect_client_update();

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id text;
begin
  if tg_op = 'DELETE' then
    v_record_id := old.id::text;
  else
    v_record_id := new.id::text;
  end if;

  insert into public.audit_log (user_id, action, table_name, record_id, before, after)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    v_record_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end $$;

drop trigger if exists contracts_audit on public.contracts;
create trigger contracts_audit
  after insert or update or delete on public.contracts
  for each row execute function public.audit_row();

drop trigger if exists payments_audit on public.payments;
create trigger payments_audit
  after insert or update or delete on public.payments
  for each row execute function public.audit_row();

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row();

drop trigger if exists clients_audit on public.clients;
create trigger clients_audit
  after insert or update or delete on public.clients
  for each row execute function public.audit_row();

-- updated_at
drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists contracts_set_updated_at on public.contracts;
create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- ============================================================
-- Storage
-- ============================================================
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

drop policy if exists contracts_storage_read on storage.objects;
create policy contracts_storage_read on storage.objects
  for select to authenticated using (
    bucket_id = 'contracts'
    and (
      public.is_admin()
      or public.app_role() = 'consulta'
      or (
        public.app_role() = 'vendedor'
        and exists (
          select 1 from public.contracts c
          where c.id::text = (storage.foldername(name))[1]
            and c.created_by = auth.uid()
        )
      )
    )
  );

drop policy if exists contracts_storage_insert on storage.objects;
create policy contracts_storage_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'contracts'
    and public.is_staff()
    and (
      public.is_admin()
      or exists (
        select 1 from public.contracts c
        where c.id::text = (storage.foldername(name))[1]
          and c.created_by = auth.uid()
      )
    )
  );

drop policy if exists contracts_storage_delete on storage.objects;
create policy contracts_storage_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'contracts' and public.is_admin()
  );

-- ============================================================
-- Keep-alive (evita la pausa por inactividad del plan Free)
-- ============================================================
create or replace function public.keepalive()
returns boolean
language sql
security definer
set search_path = public
as $$
  select count(*) >= 0 from public.profiles;
$$;

grant execute on function public.keepalive() to anon, authenticated;

-- ============================================================
-- Bootstrap del primer administrador
-- Uso (SQL Editor, después de crear el usuario en Authentication):
--   select public.bootstrap_admin('cervantesbv@gmail.com');
-- ============================================================
create or replace function public.bootstrap_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
    set role = 'admin', active = true
    where lower(email) = lower(p_email);

  if not found then
    raise exception 'No existe un perfil con el correo %. Crea primero el usuario en Authentication.', p_email;
  end if;
end $$;

revoke all on function public.bootstrap_admin(text) from public, anon, authenticated;

-- ============================================================
-- Datos iniciales
-- ============================================================
insert into public.venues (name)
select name from (values ('Salón Casa'), ('Salón de eventos'), ('Otros')) as t(name)
where not exists (select 1 from public.venues);

insert into public.sound_packages (name, description, base_price)
select name, description, 0
from (values
  ('Básico', 'Equipo de sonido básico'),
  ('Mediano', 'Equipo de sonido mediano'),
  ('Grande', 'Equipo de sonido grande'),
  ('Premium', 'Equipo de sonido premium')
) as t(name, description)
where not exists (select 1 from public.sound_packages);

insert into public.frame_types (name, price)
select name, 0
from (values ('Digital'), ('Impreso'), ('Álbum'), ('Ninguno')) as t(name)
where not exists (select 1 from public.frame_types);

insert into public.clauses (position, text)
select position, text
from (values
  (1, 'En caso de que no trabaje el sonido por causas imputables al contratante (entre ellas lluvia intensa, cortes de energía, etc.), el tiempo sigue corriendo.'),
  (2, 'El contratante se hará cargo de los pagos estatales, municipales, sindicales y de cualquier otro tipo que se generen.'),
  (3, 'Quedando en común acuerdo en ambas partes, se procede a firmar el presente contrato.'),
  (4, 'Cualquier cambio de fecha o lugar deberá notificarse con al menos 7 días de anticipación.')
) as t(position, text)
where not exists (select 1 from public.clauses);
