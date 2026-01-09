-- 1. Add whatsapp_number column to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='whatsapp_number') THEN
        ALTER TABLE profiles ADD COLUMN whatsapp_number text;
    END IF;
END $$;

-- 2. Add UPDATE policy for profiles so users can save their own WhatsApp number
-- First, drop if exists to avoid errors
DROP POLICY IF EXISTS "Users can update their own profiles" ON profiles;

CREATE POLICY "Users can update their own profiles" ON profiles
  FOR UPDATE USING (auth.uid() = id);
