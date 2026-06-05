-- Table Tennis Tracker — Supabase Schema
-- Run this in your new Supabase project's SQL Editor

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rating integer not null default 1000,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now()
);

create table games (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null references players(id),
  player2_id uuid not null references players(id),
  score1 integer not null,
  score2 integer not null,
  game_to integer not null,
  winner_id uuid not null references players(id),
  played_at timestamptz not null default now()
);

create table rating_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  game_id uuid not null references games(id),
  points_change integer not null,
  rating_after integer not null,
  created_at timestamptz not null default now()
);

-- Allow public read/write (no auth required)
alter table players enable row level security;
alter table games enable row level security;
alter table rating_history enable row level security;

create policy "Public read players" on players for select using (true);
create policy "Public insert players" on players for insert with check (true);
create policy "Public update players" on players for update using (true);

create policy "Public read games" on games for select using (true);
create policy "Public insert games" on games for insert with check (true);

create policy "Public read rating_history" on rating_history for select using (true);
create policy "Public insert rating_history" on rating_history for insert with check (true);
