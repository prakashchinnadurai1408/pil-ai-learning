import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GLOT_API = "https://glot.io/api/run";

const langConfig: Record<string, { glotLang: string; filename: string }> = {
  python3:    { glotLang: "python", filename: "main.py" },
  javascript: { glotLang: "javascript", filename: "main.js" },
  typescript: { glotLang: "typescript", filename: "main.ts" },
  java:       { glotLang: "java", filename: "Main.java" },
  c:          { glotLang: "c", filename: "main.c" },
  cpp:        { glotLang: "cpp", filename: "main.cpp" },
  go:         { glotLang: "go", filename: "main.go" },
  rust:       { glotLang: "rust", filename: "main.rs" },
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

    const config = langConfig[language];
    if (!config) {
      return new Response(JSON.stringify({
        run: { output: "", stderr: `Unsupported language: ${language}` }
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Executing ${language} via Glot.io`);

    const glotUrl = `${GLOT_API}/${config.glotLang}/latest`;
    
    const res = await fetch(glotUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stdin: stdin || "",
        files: [{ name: config.filename, content: code }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Glot.io error:", res.status, errText);
      
      // Fallback: try Wandbox
      const wandboxResult = await tryWandbox(language, code, stdin || "");
      if (wandboxResult) {
        return new Response(JSON.stringify(wandboxResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        run: { output: "", stderr: `Compiler service temporarily unavailable (${res.status}). Please try again.` }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const output = (data.stdout || "").replace(/\n$/, "");
    const stderr = data.stderr || data.error || "";

    return new Response(JSON.stringify({
      run: { output, stderr }
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

// Fallback: Wandbox API
async function tryWandbox(language: string, code: string, stdin: string) {
  const compilerMap: Record<string, string> = {
    python3: "cpython-head",
    javascript: "nodejs-head",
    typescript: "typescript-head",
    java: "openjdk-head",
    c: "gcc-head",
    cpp: "gcc-head",
    go: "go-head",
    rust: "rust-head",
  };

  const compiler = compilerMap[language];
  if (!compiler) return null;

  try {
    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, compiler, stdin }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      run: {
        output: (data.program_output || "").replace(/\n$/, ""),
        stderr: data.compiler_error || data.program_error || "",
      }
    };
  } catch {
    return null;
  }
}
