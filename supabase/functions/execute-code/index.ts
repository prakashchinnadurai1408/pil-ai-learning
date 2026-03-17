import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WANDBOX_API = "https://wandbox.org/api/compile.json";

// Use "head" (latest) versions which are always available on Wandbox
const compilerMap: Record<string, { compiler: string; options?: string }> = {
  python3:    { compiler: "cpython-head" },
  javascript: { compiler: "nodejs-head" },
  typescript: { compiler: "typescript-head" },
  java:       { compiler: "openjdk-head" },
  c:          { compiler: "gcc-head" },
  cpp:        { compiler: "gcc-head", options: "warning,c++17" },
  go:         { compiler: "go-head" },
  rust:       { compiler: "rust-head" },
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

    const config = compilerMap[language];
    if (!config) {
      return new Response(JSON.stringify({ 
        run: { output: "", stderr: `Unsupported language: ${language}` }
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: Record<string, string> = {
      code,
      compiler: config.compiler,
      stdin: stdin || "",
    };
    if (config.options) payload.options = config.options;

    console.log(`Executing ${language} with compiler ${config.compiler}`);

    const res = await fetch(WANDBOX_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Wandbox error:", res.status, errText);
      return new Response(JSON.stringify({
        run: { output: "", stderr: `Compiler service temporarily unavailable. Please try again shortly.` }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    
    const output = data.program_output || "";
    const stderr = data.compiler_error || data.program_error || "";
    const signal = data.signal || "";

    let finalStderr = stderr;
    if (!stderr && signal) {
      finalStderr = `Program terminated with signal: ${signal}`;
    }

    return new Response(JSON.stringify({
      run: {
        output: output.replace(/\n$/, ""), // trim trailing newline
        stderr: finalStderr,
      }
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
