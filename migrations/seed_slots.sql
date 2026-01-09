-- 1. Create an active round for the next 7 days
INSERT INTO rounds (name, start_date, end_date, is_active)
VALUES ('January Sprint', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', true)
RETURNING id;

-- 2. Generate 1-hour slots from 8 AM to 8 PM for the next 7 days
-- Note: Replace 'YOUR_ROUND_ID' with the ID returned above if running manually, 
-- or use the subquery below which picks the latest active round.

INSERT INTO time_slots (round_id, date, start_time, end_time)
SELECT 
    (SELECT id FROM rounds WHERE is_active = true ORDER BY start_date DESC LIMIT 1),
    (CURRENT_DATE + d_offset)::date,
    ('08:00'::time + (h * INTERVAL '1 hour'))::time,
    ('08:00'::time + ((h + 1) * INTERVAL '1 hour'))::time
FROM 
    generate_series(0, 6) AS d_offset
CROSS JOIN 
    generate_series(0, 11) AS h;
