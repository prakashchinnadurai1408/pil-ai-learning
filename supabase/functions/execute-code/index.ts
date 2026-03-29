import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// JDoodle API - free tier: 200 credits/day
const JDOODLE_API = "https://api.jdoodle.com/v1/execute";

// Comprehensive JDoodle language mapping (40+ languages)
const jdoodleLangs: Record<string, { language: string; versionIndex: string }> = {
  // Tier 1: Popular
  python3:       { language: "python3", versionIndex: "4" },
  javascript:    { language: "nodejs", versionIndex: "4" },
  typescript:    { language: "typescript", versionIndex: "0" },
  java:          { language: "java", versionIndex: "4" },
  c:             { language: "c", versionIndex: "5" },
  cpp:           { language: "cpp17", versionIndex: "1" },
  csharp:        { language: "csharp", versionIndex: "4" },
  go:            { language: "go", versionIndex: "4" },
  rust:          { language: "rust", versionIndex: "4" },
  kotlin:        { language: "kotlin", versionIndex: "4" },
  swift:         { language: "swift", versionIndex: "4" },
  ruby:          { language: "ruby", versionIndex: "4" },
  php:           { language: "php", versionIndex: "4" },
  scala:         { language: "scala", versionIndex: "4" },
  // Tier 2: Systems & Functional
  perl:          { language: "perl", versionIndex: "4" },
  haskell:       { language: "haskell", versionIndex: "4" },
  lua:           { language: "lua", versionIndex: "3" },
  r:             { language: "r", versionIndex: "4" },
  dart:          { language: "dart", versionIndex: "4" },
  elixir:        { language: "elixir", versionIndex: "4" },
  clojure:       { language: "clojure", versionIndex: "4" },
  fsharp:        { language: "fsharp", versionIndex: "1" },
  erlang:        { language: "erlang", versionIndex: "0" },
  ocaml:         { language: "ocaml", versionIndex: "1" },
  groovy:        { language: "groovy", versionIndex: "4" },
  // Tier 3: Scripting & Niche
  bash:          { language: "bash", versionIndex: "4" },
  powershell:    { language: "powershell", versionIndex: "0" },
  "objective-c": { language: "objc", versionIndex: "4" },
  pascal:        { language: "pascal", versionIndex: "3" },
  fortran:       { language: "fortran", versionIndex: "4" },
  cobol:         { language: "cobol", versionIndex: "4" },
  lisp:          { language: "commonlisp", versionIndex: "3" },
  prolog:        { language: "prolog", versionIndex: "1" },
  d:             { language: "d", versionIndex: "1" },
  racket:        { language: "racket", versionIndex: "1" },
  julia:         { language: "julia", versionIndex: "0" },
  nim:           { language: "nim", versionIndex: "0" },
  smalltalk:     { language: "gst", versionIndex: "0" },
  vb:            { language: "vbn", versionIndex: "4" },
  coffeescript:  { language: "coffeescript", versionIndex: "4" },
  tcl:           { language: "tcl", versionIndex: "4" },
  sql:           { language: "sql", versionIndex: "4" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { language, code, stdin } = await req.json();

    if (!language || !code) {
      return new Response(JSON.stringify({ error: "language and code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try JDoodle first (if credentials available)
    const clientId = Deno.env.get("JDOODLE_CLIENT_ID");
    const clientSecret = Deno.env.get("JDOODLE_CLIENT_SECRET");

    if (clientId && clientSecret) {
      const result = await tryJDoodle(language, code, stdin || "", clientId, clientSecret);
      if (result) {
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: Use AI to evaluate code output
    const aiResult = await tryAIExecution(language, code, stdin || "");
    if (aiResult) {
      return new Response(JSON.stringify(aiResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      run: { output: "", stderr: "Code execution service is temporarily unavailable. Please try again later." }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("execute-code error:", e);
    return new Response(JSON.stringify({
      run: { output: "", stderr: e instanceof Error ? e.message : "Unknown execution error" }
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function tryJDoodle(language: string, code: string, stdin: string, clientId: string, clientSecret: string) {
  const config = jdoodleLangs[language];
  if (!config) return null;

  try {
    console.log(`Executing ${language} via JDoodle`);
    const res = await fetch(JDOODLE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        clientSecret,
        script: code,
        stdin,
        language: config.language,
        versionIndex: config.versionIndex,
      }),
    });

    if (!res.ok) {
      console.error("JDoodle error:", res.status);
      return null;
    }

    const data = await res.json();
    if (data.error) {
      return { run: { output: "", stderr: data.error } };
    }

    const output = (data.output || "").replace(/\n$/, "");
    return { run: { output, stderr: "" } };
  } catch (err) {
    console.error("JDoodle exception:", err);
    return null;
  }
}

async function tryAIExecution(language: string, code: string, stdin: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  try {
    console.log(`Using AI to evaluate ${language} code`);

    const prompt = `You are a code execution engine. Execute the following ${language} code mentally and return ONLY the exact output that would be printed to stdout. No explanations, no markdown, no code blocks - just the raw output.

${stdin ? `Standard input (stdin):\n${stdin}\n\n` : ""}Code:
\`\`\`${language}
${code}
\`\`\`

Rules:
- Return ONLY what would be printed to stdout
- If there's a runtime error, start your response with "ERROR:" followed by the error message
- If there's a compilation error, start with "ERROR:" followed by the error
- Do NOT include any explanation or formatting
- Return the exact output including spacing and newlines`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a precise code execution simulator. Output ONLY the exact stdout output of the given code. Never add explanations." },
          { role: "user", content: prompt },
        ],
        temperature: 0,
      }),
    });

    if (!res.ok) {
      console.error("AI execution error:", res.status);
      return null;
    }

    const data = await res.json();
    let output = data.choices?.[0]?.message?.content || "";
    
    // Clean any accidental markdown
    output = output.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();

    if (output.startsWith("ERROR:")) {
      return { run: { output: "", stderr: output } };
    }

    return { run: { output, stderr: "", ai_evaluated: true } };
  } catch (err) {
    console.error("AI execution exception:", err);
    return null;
  }
}
