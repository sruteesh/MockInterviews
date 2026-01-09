-- Migration: Convert subject from text to text[] (array)

-- Step 1: Alter availabilities table
ALTER TABLE availabilities 
ALTER COLUMN subject TYPE text[] 
USING CASE 
  WHEN subject IS NULL THEN NULL 
  ELSE ARRAY[subject] 
END;

-- Step 2: Alter interviews table
ALTER TABLE interviews 
ALTER COLUMN subject TYPE text[] 
USING CASE 
  WHEN subject IS NULL THEN NULL 
  ELSE ARRAY[subject] 
END;
