---
name: LLM Management
description: Admin can configure default LLM provider/model and view per-call usage analytics; provider keys configured in app settings
type: feature
---
- Tables: `llm_settings` (single config row, default provider/model + enabled providers + per-provider preferred model) and `llm_usage_logs` (per-call tokens, cost estimate, latency, status, user, feature).
- Admin pages: `LLMSettings` (System group) and `LLMUsageAnalytics` (Analytics group) in AdminDashboard sidebar.
- Providers: Lovable AI (Gemini + GPT-5 family, no key), and BYO-key for OpenAI direct, Anthropic Claude, DeepSeek, xAI Grok. Provider API keys are added in Application Settings → Secrets only when enabling a provider.
- The `chat` edge function reads `llm_settings.default_model`, streams via Lovable AI gateway, tees the stream to log usage (prompt+completion tokens, ~4 chars/token estimate when usage object missing) into `llm_usage_logs` with status/latency/feature.
