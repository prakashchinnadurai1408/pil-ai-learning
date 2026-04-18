ALTER TABLE public.llm_settings
ADD COLUMN IF NOT EXISTS age_group_difficulty_overrides jsonb NOT NULL DEFAULT '{
  "10-14": {"floor": "easy", "ceiling": "easy"},
  "15-18": {"floor": "easy", "ceiling": "medium"},
  "19-22": {"floor": "easy", "ceiling": "hard"},
  "23+":   {"floor": "easy", "ceiling": "hard"}
}'::jsonb;