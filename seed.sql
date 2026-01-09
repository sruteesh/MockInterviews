-- Insert a mock active round
INSERT INTO rounds (name, start_date, end_date, is_active)
VALUES 
  ('Mock Interview Round 1', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', true);

-- Insert time slots for the round (assuming the round ID we just created)
DO $$
DECLARE
  round_uuid uuid;
BEGIN
  SELECT id INTO round_uuid FROM rounds WHERE is_active = true LIMIT 1;

  INSERT INTO time_slots (round_id, date, start_time, end_time)
  VALUES
    (round_uuid, CURRENT_DATE + INTERVAL '1 day', '10:00', '11:00'),
    (round_uuid, CURRENT_DATE + INTERVAL '1 day', '14:00', '15:00'),
    (round_uuid, CURRENT_DATE + INTERVAL '2 days', '11:00', '12:00'),
    (round_uuid, CURRENT_DATE + INTERVAL '2 days', '16:00', '17:00'),
    (round_uuid, CURRENT_DATE + INTERVAL '3 days', '09:00', '10:00');
END $$;
