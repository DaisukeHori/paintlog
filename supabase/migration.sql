-- PaintLog データベース初期マイグレーション
-- Supabase SQL Editor で実行

-- 1. paint_logs テーブル
create table public.paint_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  -- 環境条件
  painted_at timestamptz not null,
  ambient_temp numeric,
  ambient_humidity numeric,
  booth_temp numeric,
  workpiece_temp numeric,
  paint_temp numeric,
  -- 塗料情報
  paint_type text,
  paint_product text,
  dilution_ratio numeric,
  paint_lot text,
  -- ガン設定
  air_pressure numeric,
  throttle_turns numeric,
  needle_turns numeric,
  gun_type text,
  gun_distance numeric,
  -- 塗装工程
  coat_count integer,
  surface_prep text,
  drying_method text,
  film_thickness numeric,
  fan_power numeric,
  defects text[] default '{}',
  -- 記録
  photo_urls text[] default '{}',
  video_urls text[] default '{}',
  comment text,
  -- 拡張
  custom_fields jsonb default '{}'
);

-- RLS
alter table public.paint_logs enable row level security;
create policy "Users can manage own logs" on public.paint_logs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- updated_at 自動更新
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.paint_logs
  for each row execute function public.handle_updated_at();

-- インデックス
create index idx_paint_logs_user_painted on public.paint_logs(user_id, painted_at desc);
create index idx_paint_logs_paint_type on public.paint_logs(paint_type);

-- 2. user_defaults テーブル
create table public.user_defaults (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  pinned_fields jsonb default '{}',
  use_last_value boolean default true
);

alter table public.user_defaults enable row level security;
create policy "Users can manage own defaults" on public.user_defaults
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. text_suggestions テーブル (autocomplete用)
create table public.text_suggestions (
  id uuid default gen_random_uuid() primary key,
  field_name text not null,
  value text not null,
  use_count integer default 1,
  last_used_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  deleted boolean default false
);

alter table public.text_suggestions enable row level security;
create policy "Users can manage own suggestions" on public.text_suggestions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create unique index idx_text_suggestions_unique on public.text_suggestions(user_id, field_name, value);
create index idx_text_suggestions_lookup on public.text_suggestions(user_id, field_name, deleted, use_count desc);

-- 4. custom_field_definitions テーブル
create table public.custom_field_definitions (
  id uuid default gen_random_uuid() primary key,
  field_key text not null,
  field_label text not null,
  field_type text not null check (field_type in ('number', 'text', 'select')),
  options jsonb,
  display_order integer default 0,
  is_active boolean default true,
  user_id uuid references auth.users(id) on delete cascade not null
);

alter table public.custom_field_definitions enable row level security;
create policy "Users can manage own custom fields" on public.custom_field_definitions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create unique index idx_custom_field_key on public.custom_field_definitions(user_id, field_key);

-- 5. Storage bucket (R2を使うが、Supabase側にメタデータ不要)
