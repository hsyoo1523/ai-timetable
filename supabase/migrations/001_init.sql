-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

-- 신규 가입 시 자동으로 profiles 행 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── timetables ───────────────────────────────────────────────────────────────
create table if not exists public.timetables (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  semester      text,
  year_class    text,
  custom_fields jsonb not null default '[]',
  created_at    timestamptz not null default now()
);

-- ── schedule_slots ────────────────────────────────────────────────────────────
create table if not exists public.schedule_slots (
  id            uuid primary key default gen_random_uuid(),
  timetable_id  uuid not null references public.timetables(id) on delete cascade,
  subject_name  text not null,
  day           text not null check (day in ('월','화','수','목','금','토')),
  period        integer not null check (period between 1 and 12),
  room          text,
  professor     text,
  color         text not null default '#4F86F7',
  created_at    timestamptz not null default now(),
  unique (timetable_id, day, period)
);

-- ── curriculums ───────────────────────────────────────────────────────────────
create table if not exists public.curriculums (
  id           uuid primary key default gen_random_uuid(),
  filename     text not null,
  content      text not null,
  tables       jsonb,
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ── parsed_files ──────────────────────────────────────────────────────────────
create table if not exists public.parsed_files (
  id           uuid primary key default gen_random_uuid(),
  filename     text not null,
  file_type    text not null,
  content      text not null,
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ── RLS 활성화 ────────────────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.timetables     enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.curriculums    enable row level security;
alter table public.parsed_files   enable row level security;

-- profiles: 본인만 조회
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- timetables: 본인 행만
create policy "timetables_own" on public.timetables
  for all using (auth.uid() = owner_id);

-- schedule_slots: 본인 시간표 소속 슬롯만
create policy "slots_own" on public.schedule_slots
  for all using (
    exists (
      select 1 from public.timetables t
      where t.id = timetable_id and t.owner_id = auth.uid()
    )
  );

-- curriculums / parsed_files: 로그인 사용자 조회, 관리자만 삽입
-- (삽입은 service_role key 사용 API 라우트에서 처리하므로 RLS bypass)
create policy "curriculums_select" on public.curriculums
  for select using (auth.role() = 'authenticated');

create policy "parsed_files_select" on public.parsed_files
  for select using (auth.role() = 'authenticated');
