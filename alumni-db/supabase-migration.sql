-- Migration: Add authentication, project management tables, split name fields
-- Run this in the Supabase SQL Editor on existing databases

-- Add chapter column to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS chapter TEXT CHECK (chapter IN ('Manila', 'Los Banos', 'Diliman'));

-- Split full_name into last_name and first_name
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS first_name TEXT;
-- Migrate existing data: assume "first last" format
UPDATE members SET last_name = split_part(full_name, ' ', -1), first_name = regexp_replace(full_name, '\s+\S+$', '') WHERE last_name IS NULL AND full_name IS NOT NULL;
ALTER TABLE members ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE members ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE members DROP COLUMN IF EXISTS full_name;

-- Add new columns to events table for enhanced projects
ALTER TABLE events ADD COLUMN IF NOT EXISTS goals TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS due_date TEXT;

-- App users for authentication
CREATE TABLE IF NOT EXISTS app_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed admin user (skip if already exists)
INSERT INTO app_users (username, password, display_name, role)
VALUES ('Gerald', 'ubag1964', 'Gerald', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Project sections (like Asana sections)
CREATE TABLE IF NOT EXISTS project_sections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Project tasks (within sections)
CREATE TABLE IF NOT EXISTS project_tasks (
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
