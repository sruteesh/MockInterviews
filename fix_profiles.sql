-- Backfill profiles for existing users
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
