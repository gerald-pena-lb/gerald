-- Migration: Add authentication, project management tables
-- Run this in the Supabase SQL Editor on existing databases

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
