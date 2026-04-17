-- LLM provider/model configuration (single config row pattern)
CREATE TABLE IF NOT EXISTS public.llm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_provider text NOT NULL DEFAULT 'lovable',
  default_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  enabled_providers jsonb NOT NULL DEFAULT '{"lovable":true,"openai":true,"anthropic":false,"deepseek":false,"xai":false}'::jsonb,
  provider_models jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'admin'
);

ALTER TABLE public.llm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read llm settings" ON public.llm_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert llm settings" ON public.llm_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update llm settings" ON public.llm_settings FOR UPDATE USING (true) WITH CHECK (true);

-- Seed a default config row if empty
INSERT INTO public.llm_settings (default_provider, default_model)
SELECT 'lovable', 'google/gemini-2.5-flash'
WHERE NOT EXISTS (SELECT 1 FROM public.llm_settings);

-- Per-call usage log
CREATE TABLE IF NOT EXISTS public.llm_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL,
  model text NOT NULL,
  user_role text NOT NULL DEFAULT 'student',
  user_name text NOT NULL DEFAULT '',
  user_id text NOT NULL DEFAULT '',
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  feature text NOT NULL DEFAULT 'chat'
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_created_at ON public.llm_usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_provider_model ON public.llm_usage_logs (provider, model);

ALTER TABLE public.llm_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read llm usage" ON public.llm_usage_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert llm usage" ON public.llm_usage_logs FOR INSERT WITH CHECK (true);