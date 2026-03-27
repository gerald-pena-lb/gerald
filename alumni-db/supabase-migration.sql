-- Supabase Migration: Alumni Database Tables
-- Run this in the Supabase SQL Editor if tables don't exist yet

CREATE TABLE IF NOT EXISTS members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  batch_name TEXT,
  batch_letter TEXT,
  year INTEGER,
  phone_number TEXT,
  current_company TEXT,
  title TEXT,
  industry TEXT,
  status TEXT DEFAULT 'alive' CHECK (status IN ('alive', 'deceased')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS annual_dues (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  date_paid TEXT NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (member_id, year)
);

CREATE TABLE IF NOT EXISTS donations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date_given TEXT NOT NULL,
  remarks TEXT,
  transaction_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  type TEXT DEFAULT 'event' CHECK (type IN ('event', 'project')),
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_minutes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  minute_id BIGINT REFERENCES meeting_minutes(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenditures (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (optional - disabled for now since we use service role key)
-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE annual_dues ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenditures ENABLE ROW LEVEL SECURITY;
