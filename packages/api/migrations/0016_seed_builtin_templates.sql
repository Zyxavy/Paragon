INSERT INTO templates (
  id, user_id, name, source,
  default_purpose, default_philosophy, default_protocol,
  default_floor_action, default_trigger_pattern, default_barrier_list,
  default_environment_cue,
  suggested_widgets, created_at, updated_at
) VALUES
(
  'tpl_reading_system', NULL, 'Reading System', 'built_in',
  'Build a consistent daily reading habit',
  'This system exists because reading consistently matters to me, especially on days when motivation doesn''t show up.',
  'Read for [N] minutes after [trigger habit]',
  'Open the book and read one paragraph',
  'After I brush my teeth at night',
  '["Phone on nightstand", "No fixed reading time", "Fall asleep before reading"]',
  'Book visible on the pillow or nightstand, phone charging in another room',
  '["counter", "log", "streak"]',
  '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'
),
(
  'tpl_studying_system', NULL, 'Studying System', 'built_in',
  'Study [subject] consistently using the PERO method',
  'This system exists because mastering [subject] matters to me, especially on days when motivation doesn''t show up.',
  'Prime (skim headings) -> Encode (explain in own words) -> Reference (Anki cards) -> Retrieve (recall without notes)',
  'Open notes and read one heading',
  'After I sit at my desk in the morning',
  '["Phone distractions", "No clear stopping point", "Jumping straight to passive re-reading"]',
  'Notes left open on the desk from the night before',
  '["timer", "checklist", "log", "counter"]',
  '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'
),
(
  'tpl_workout_system', NULL, 'Workout System', 'built_in',
  'Build a consistent exercise habit with progressive overload',
  'This system exists because building strength and consistency matters to me, especially on days when motivation doesn''t show up.',
  'Warm-up -> Main lifts (log weight/reps) -> Cool-down',
  'Put on workout clothes and do one set',
  'After I eat breakfast',
  '["No energy after work", "Skipping when traveling", "No logged baseline"]',
  'Gym bag packed and by the door the night before',
  '["log", "counter", "chart", "checklist"]',
  '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'
);