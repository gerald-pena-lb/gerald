-- Supabase schema for UP Alpha Sigma Alumni Database
-- Run this in the Supabase SQL Editor to create all tables

CREATE TABLE members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
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

CREATE TABLE annual_dues (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  date_paid TEXT NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, year)
);

CREATE TABLE donations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date_given TEXT NOT NULL,
  remarks TEXT,
  transaction_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  type TEXT DEFAULT 'event' CHECK (type IN ('event', 'project')),
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  goals TEXT,
  due_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE meeting_minutes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE goals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  minute_id BIGINT REFERENCES meeting_minutes(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE expenditures (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TEXT NOT NULL,
  event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- App users for authentication
CREATE TABLE app_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed admin user
INSERT INTO app_users (username, password, display_name, role)
VALUES ('Gerald', 'ubag1964', 'Gerald', 'admin');

-- Project sections (like Asana sections)
CREATE TABLE project_sections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Project tasks (within sections)
CREATE TABLE project_tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  section_id BIGINT NOT NULL REFERENCES project_sections(id) ON DELETE CASCADE,
  project_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date TEXT,
  remarks TEXT,
  notes TEXT,
  assigned_to TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
