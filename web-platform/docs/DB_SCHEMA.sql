-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: profiles (Extends auth.users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text check (role in ('iniciante', 'acompanhante', 'mestre', 'admin')) default 'iniciante',
  cim text unique, -- Código de Identificação Maçônica
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: courses
create table courses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  duration_minutes integer,
  min_role text check (min_role in ('iniciante', 'acompanhante', 'mestre')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: modules
create table modules (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  order_index integer not null
);

-- Table: lessons
create table lessons (
  id uuid default uuid_generate_v4() primary key,
  module_id uuid references modules(id) on delete cascade not null,
  title text not null,
  content text, -- Markdown content or video URL
  order_index integer not null
);

-- Table: enrollments (Track progress)
create table enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  course_id uuid references courses(id) not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

-- Table: lesson_progress
create table lesson_progress (
  id uuid default uuid_generate_v4() primary key,
  enrollment_id uuid references enrollments(id) on delete cascade not null,
  lesson_id uuid references lessons(id) not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()),
  unique(enrollment_id, lesson_id)
);

-- Table: certificates
create table certificates (
  id uuid default uuid_generate_v4() primary key,
  enrollment_id uuid references enrollments(id) not null,
  validation_code text unique not null,
  pdf_url text,
  issued_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: audit_logs
create table audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  action text not null,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Examples)

alter table profiles enable row level security;
-- Profiles are viewable by self and admins
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

alter table courses enable row level security;
-- Courses viewable by verified users with role >= min_role logic handled in app or advanced query
create policy "Courses are viewable by auth users" on courses for select using (auth.role() = 'authenticated');

alter table enrollments enable row level security;
create policy "Users manage own enrollments" on enrollments for all using (auth.uid() = user_id);

-- Event Trigger for Audit (Concept)
-- create trigger audit_log_trigger after insert or update or delete on ...
