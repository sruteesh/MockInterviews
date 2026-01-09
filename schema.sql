-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (auto-managed)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  whatsapp_number text
);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Rounds table
create table rounds (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean default false
);

-- Time Slots table
create table time_slots (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid references rounds(id) not null,
  date date not null,
  start_time time not null,
  end_time time not null
);

-- Availabilities table
create table availabilities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) not null,
  round_id uuid references rounds(id) not null,
  role text check (role in ('interviewer', 'interviewee')) not null,
  subject text[],
  recording_consent boolean default false,
  created_at timestamp with time zone default now(),
  unique(user_id, round_id, role)
);

-- Availability Slots (Many-to-Many)
create table availability_slots (
  id uuid primary key default uuid_generate_v4(),
  availability_id uuid references availabilities(id) on delete cascade not null,
  time_slot_id uuid references time_slots(id) on delete cascade not null,
  unique(availability_id, time_slot_id)
);

-- Interviews table
create table interviews (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid references rounds(id) not null,
  subject text[] not null,
  interviewer_id uuid references profiles(id),
  interviewee_id uuid references profiles(id),
  time_slot_id uuid references time_slots(id) not null,
  recording_allowed boolean default false,
  meeting_link text,
  recording_link text,
  status text check (status in ('Upcoming', 'Live', 'Completed')) default 'Upcoming',
  created_at timestamp with time zone default now()
);

-- RLS Policies
alter table profiles enable row level security;
create policy "Profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update their own profiles" on profiles for update using (auth.uid() = id);

alter table rounds enable row level security;
create policy "Rounds are viewable by everyone" on rounds for select using (true);

alter table time_slots enable row level security;
create policy "Time slots are viewable by everyone" on time_slots for select using (true);

alter table availabilities enable row level security;
create policy "Users can view their own availabilities" on availabilities for select using (auth.uid() = user_id);
create policy "Users can insert their own availabilities" on availabilities for insert with check (auth.uid() = user_id);
create policy "Users can update their own availabilities" on availabilities for update using (auth.uid() = user_id);
create policy "Users can delete their own availabilities" on availabilities for delete using (auth.uid() = user_id);

alter table availability_slots enable row level security;
create policy "Users can view their own availability slots" on availability_slots for select using (
  exists (select 1 from availabilities where id = availability_slots.availability_id and user_id = auth.uid())
);
create policy "Users can insert their own availability slots" on availability_slots for insert with check (
  exists (select 1 from availabilities where id = availability_slots.availability_id and user_id = auth.uid())
);
create policy "Users can delete their own availability slots" on availability_slots for delete using (
  exists (select 1 from availabilities where id = availability_slots.availability_id and user_id = auth.uid())
);

alter table interviews enable row level security;
create policy "Interviews are viewable by everyone" on interviews for select using (true);
