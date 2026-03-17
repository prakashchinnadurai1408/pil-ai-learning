import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Multiple code execution APIs with fallback
const CODEX_API = "https://api.codex.jaagrav.in";

const codexLangMap: Record<string, string> = {
  python3: "py",
  javascript: "js",
  typescript: "ts",
  java: "java",
  c: "c",
  cpp: "cpp",
  go: "go",
  rust: "rs",
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

    // Try CodeX API first
    const codexResult = await tryCodeX(language, code, stdin || "");
    if (codexResult) {
      return new Response(JSON.stringify(codexResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: Rextester API
    const rextesterResult = await tryRextester(language, code, stdin || "");
    if (rextesterResult) {
      return new Response(JSON.stringify(rextesterResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      run: { output: "", stderr: "All compiler services are temporarily unavailable. Please try again later." }
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

async function tryCodeX(language: string, code: string, stdin: string) {
  const lang = codexLangMap[language];
  if (!lang) return null;

  try {
    console.log(`Trying CodeX API for ${language}`);
    const formData = new URLSearchParams();
    formData.append("code", code);
    formData.append("language", lang);
    formData.append("input", stdin);

    const res = await fetch(CODEX_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!res.ok) {
      console.error("CodeX error:", res.status);
      return null;
    }

    const data = await res.json();
    const output = (data.output || "").replace(/\n$/, "");
    const error = data.error || "";

    return { run: { output: error ? "" : output, stderr: error } };
  } catch (err) {
    console.error("CodeX exception:", err);
    return null;
  }
}

async function tryRextester(language: string, code: string, stdin: string) {
  // Rextester language IDs
  const rextesterLangs: Record<string, number> = {
    python3: 24,
    javascript: 23,
    java: 4,
    c: 6,
    cpp: 7,
    go: 20,
  };

  const langId = rextesterLangs[language];
  if (langId === undefined) return null;

  try {
    console.log(`Trying Rextester for ${language}`);
    const formData = new URLSearchParams();
    formData.append("LanguageChoice", String(langId));
    formData.append("Program", code);
    formData.append("Input", stdin);

    const res = await fetch("https://rextester.com/rundotnet/api", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!res.ok) {
      console.error("Rextester error:", res.status);
      return null;
    }

    const data = await res.json();
    const output = (data.Result || "").replace(/\n$/, "");
    const errors = data.Errors || "";

    return { run: { output: errors ? "" : output, stderr: errors } };
  } catch (err) {
    console.error("Rextester exception:", err);
    return null;
  }
}
