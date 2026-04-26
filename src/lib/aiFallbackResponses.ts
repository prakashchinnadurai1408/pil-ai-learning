// Read-only fallback responses for when AI credits are exhausted.
// These let students continue practicing prompts even when the live model is unavailable.

interface FallbackExample {
  id: string;
  title: string;
  keywords: string[];
  response: string;
}

const EXAMPLES: FallbackExample[] = [
  {
    id: "rag-overview",
    title: "RAG overview",
    keywords: ["rag", "retrieval", "augmented"],
    response: `## Retrieval Augmented Generation (RAG) — cached example

**RAG** combines a search step with a language model so answers are grounded in your own documents.

**How it works:**
1. **Index** — Documents are split into chunks and converted into vector embeddings.
2. **Retrieve** — When a question arrives, the system finds the most similar chunks.
3. **Generate** — Those chunks are passed to the LLM as context to produce a grounded answer.

**Why it matters:** Reduces hallucinations, supports private data, and lets you cite sources.

> ⚠️ This is a cached fallback response (AI credits are temporarily exhausted). Live answers will resume once credits are added.`,
  },
  {
    id: "prompt-engineering-basics",
    title: "Prompt engineering basics",
    keywords: ["prompt", "engineering", "write a prompt"],
    response: `## Prompt Engineering — cached example

A strong prompt usually has **four parts**:

1. **Role** — "You are a senior data analyst..."
2. **Task** — "Summarize this CSV..."
3. **Context** — "The data covers Q3 2025 sales..."
4. **Format** — "Return a markdown table with 3 columns."

**Tips:**
- Be specific about output length and format.
- Give 1–2 examples (few-shot) for tricky tasks.
- Ask the model to "think step by step" for reasoning problems.

> ⚠️ This is a cached fallback response (AI credits are temporarily exhausted).`,
  },
  {
    id: "chain-of-thought",
    title: "Chain-of-thought reasoning",
    keywords: ["chain of thought", "cot", "reasoning"],
    response: `## Chain of Thought (CoT) Prompting — cached example

CoT asks the model to **show its reasoning** before giving the final answer.

**Example prompt:**
> "Roger has 5 tennis balls. He buys 2 cans, each with 3 balls. How many balls now? **Let's think step by step.**"

**Model output:**
> Roger started with 5 balls. 2 cans × 3 balls = 6. Total = 5 + 6 = **11 balls**.

**When to use:** math, multi-step logic, code debugging, structured planning.

> ⚠️ Cached fallback response — credits exhausted.`,
  },
  {
    id: "ai-agents-intro",
    title: "AI agents intro",
    keywords: ["agent", "ai agent", "agents"],
    response: `## AI Agents — cached example

An **AI Agent** is an LLM that can use **tools** in a loop to accomplish a goal.

**Components:**
- **Brain** — the LLM (planning + reasoning).
- **Tools** — search, calculator, code execution, APIs.
- **Memory** — short-term (conversation) and long-term (vector store).
- **Loop** — Plan → Act → Observe → Repeat until goal is reached.

**Frameworks:** LangChain, LlamaIndex, AutoGen, CrewAI.

> ⚠️ Cached fallback response — credits exhausted.`,
  },
  {
    id: "model-comparison",
    title: "Frontier model comparison",
    keywords: ["gpt", "claude", "gemini", "compare", "model"],
    response: `## Comparing Frontier Models — cached overview

| Model | Strengths | Best for |
|---|---|---|
| **GPT-5** | Strong all-rounder, code, multimodal | Production agents, complex reasoning |
| **Claude (Sonnet/Opus)** | Long context, careful tone, coding | Document analysis, safe assistants |
| **Gemini 2.5 Pro** | Huge context (1M+), multimodal | Video/image understanding, research |

Pick by **cost vs. capability** and **context window** required.

> ⚠️ Cached fallback response — credits exhausted.`,
  },
  {
    id: "college-project-ideas",
    title: "College project ideas",
    keywords: ["project", "college", "idea"],
    response: `## AI for College Projects — cached suggestions

**Beginner-friendly project ideas:**
1. **Resume Screener** — Embed resumes + job description, rank by similarity.
2. **Study Buddy Chatbot** — RAG over your textbook PDFs.
3. **Smart Notes Summarizer** — Upload lectures → bullet summary + flashcards.
4. **Sentiment Dashboard** — Scrape product reviews → classify with an LLM.
5. **Code Reviewer Bot** — Paste code, get refactor suggestions.

**Stack tip:** React + Lovable Cloud + an LLM gateway is enough for an MVP.

> ⚠️ Cached fallback response — credits exhausted.`,
  },
];

export const GENERIC_FALLBACK_KEY = "generic-practice-mode";

const GENERIC_FALLBACK = `## Practice Mode (cached response)

I'm currently in **read-only practice mode** because AI credits are temporarily exhausted. Live answers will resume once credits are topped up.

In the meantime, you can:
- 📚 Review **Module lessons** in the Learning section
- 🧠 Try the **Prompt Engineering Lab** to build prompts offline
- 📝 Take a **Quiz** to test what you know
- 💡 Explore the **suggested prompts** above — they have cached examples

Try one of the example questions above to see a worked-through answer.`;

export function getFallbackResponse(userQuestion: string): string {
  const q = userQuestion.toLowerCase();
  for (const example of EXAMPLES) {
    if (example.keywords.some((k) => q.includes(k))) {
      return example.response;
    }
  }
  return GENERIC_FALLBACK;
}

export const FALLBACK_BANNER =
  "💡 **Practice Mode active** — showing cached examples while AI credits are topped up. Your prompts are still saved.";
