-- Add missing RLS policies for interviews table
-- 1. Allow any authenticated user to create an interview (e.g., when creating an open slot)
create policy "Users can insert interviews" on interviews 
  for insert with check (auth.uid() is not null);

-- 2. Allow participants to update their interviews, or anyone to update an open interview (to join)
create policy "Users can update interviews" on interviews 
  for update using (
    auth.uid() = interviewer_id or 
    auth.uid() = interviewee_id or 
    interviewer_id is null or 
    interviewee_id is null
  );
