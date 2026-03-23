-- Run this in your Supabase SQL Editor to set up the tables

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  file_name text not null default '',
  prospect_name text not null default '',
  call_date text not null default '',
  outcome text not null default '',
  analysis jsonb,
  created_at timestamptz default now()
);

create index if not exists calls_agent_id_idx on calls(agent_id);

-- Migration: add columns to existing table (run if table already exists)
-- alter table calls add column if not exists prospect_name text not null default '';
-- alter table calls add column if not exists call_date text not null default '';
