-- XP Blog complete Supabase schema and Row Level Security setup.
-- Run this file in the Supabase SQL Editor for a new XP Blog project.

create table if not exists public.categories (
  id bigserial primary key,
  name text not null,
  slug text not null unique,
  parent_id bigint references public.categories(id) on delete restrict,
  description text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id bigserial primary key,
  title text not null,
  content text not null,
  author_email text not null,
  category_id bigint references public.categories(id) on delete set null,
  images jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.posts
  add column if not exists category_id bigint references public.categories(id) on delete set null,
  add column if not exists images jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.categories
  add column if not exists description text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_visible boolean not null default true,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists categories_parent_sort_idx
  on public.categories(parent_id, sort_order, name);

create index if not exists categories_visible_idx
  on public.categories(is_visible);

create index if not exists posts_category_id_idx
  on public.posts(category_id);

create index if not exists posts_created_at_idx
  on public.posts(created_at desc);

create or replace function public.is_site_owner()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_admins
    where user_id = auth.uid()
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

-- Optional one-time migration from an older posts.category text column.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'category'
  ) then
    alter table public.posts alter column category drop not null;

    insert into public.categories (name, slug, sort_order, is_visible)
    select distinct
      trim(category) as name,
      trim(both '-' from lower(regexp_replace(trim(category), '[^[:alnum:]]+', '-', 'g'))) as slug,
      0 as sort_order,
      true as is_visible
    from public.posts
    where category is not null
      and trim(category) <> ''
      and trim(both '-' from lower(regexp_replace(trim(category), '[^[:alnum:]]+', '-', 'g'))) <> ''
    on conflict (slug) do nothing;

    update public.posts p
    set category_id = c.id
    from public.categories c
    where p.category_id is null
      and p.category is not null
      and trim(both '-' from lower(regexp_replace(trim(p.category), '[^[:alnum:]]+', '-', 'g'))) = c.slug;
  end if;
end;
$$;

alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.site_admins enable row level security;

drop policy if exists "categories readable by everyone" on public.categories;
create policy "categories readable by everyone"
on public.categories
for select
to anon, authenticated
using (
  is_visible = true
  or public.is_site_owner()
);

drop policy if exists "owner can insert categories" on public.categories;
create policy "owner can insert categories"
on public.categories
for insert
to authenticated
with check (
  public.is_site_owner()
);

drop policy if exists "owner can update categories" on public.categories;
create policy "owner can update categories"
on public.categories
for update
to authenticated
using (
  public.is_site_owner()
)
with check (
  public.is_site_owner()
);

drop policy if exists "owner can delete categories" on public.categories;
create policy "owner can delete categories"
on public.categories
for delete
to authenticated
using (
  public.is_site_owner()
);

drop policy if exists "posts readable by everyone" on public.posts;
create policy "posts readable by everyone"
on public.posts
for select
to anon, authenticated
using (
  public.is_site_owner()
  or category_id is null
  or exists (
    select 1
    from public.categories c
    where c.id = posts.category_id
      and c.is_visible = true
  )
);

drop policy if exists "Authenticated users can create posts" on public.posts;
drop policy if exists "owner can create posts" on public.posts;
create policy "owner can create posts"
on public.posts
for insert
to authenticated
with check (
  public.is_site_owner()
);

drop policy if exists "owner can update posts" on public.posts;
create policy "owner can update posts"
on public.posts
for update
to authenticated
using (
  public.is_site_owner()
)
with check (
  public.is_site_owner()
);

drop policy if exists "owner can delete posts" on public.posts;
create policy "owner can delete posts"
on public.posts
for delete
to authenticated
using (
  public.is_site_owner()
);

grant usage on schema public to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.posts to authenticated;
grant execute on function public.is_site_owner() to anon, authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- After creating the owner account in Supabase Auth, run this with that
-- user's auth.users.id value:
--
-- insert into public.site_admins (user_id)
-- values ('OWNER_USER_UUID_HERE')
-- on conflict do nothing;
