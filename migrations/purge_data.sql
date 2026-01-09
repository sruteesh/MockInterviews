-- Purge all transactional data in correct order
DELETE FROM interviews;
DELETE FROM availability_slots;
DELETE FROM availabilities;
DELETE FROM time_slots;
DELETE FROM rounds;

-- Optional: Clear profiles if you want to reset user data as well
-- DELETE FROM profiles;

-- Note: This does NOT delete auth users. 
-- To delete auth users, you must use the Supabase Auth dashboard or API.
