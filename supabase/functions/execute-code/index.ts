import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Wandbox API - free, no auth required
const WANDBOX_API = "https://wandbox.org/api/compile.json";

const langMap: Record<string, { compiler: string }> = {
  python3: { compiler: "cpython-3.10.2" },
  javascript: { compiler: "nodejs-18.16.1" },
  typescript: { compiler: "typescript-5.0.4" },
  java: { compiler: "openjdk-jdk-17.0.1+12" },
  c: { compiler: "gcc-12.2.0" },
  cpp: { compiler: "gcc-12.2.0-c" },  // will fix below
  go: { compiler: "go-1.19.5" },
  rust: { compiler: "rust-1.68.0" },
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

    // Map language to Wandbox compiler
    let compiler = "";
    let actualCode = code;

    switch (language) {
      case "python3":
        compiler = "cpython-3.10.2";
        break;
      case "javascript":
        compiler = "nodejs-18.16.1";
        break;
      case "typescript":
        compiler = "typescript-5.0.4";
        break;
      case "java":
        compiler = "openjdk-jdk-17.0.1+12";
        break;
      case "c":
        compiler = "gcc-12.2.0";
        break;
      case "cpp":
        compiler = "gcc-12.2.0";
        break;
      case "go":
        compiler = "go-1.19.5";
        break;
      case "rust":
        compiler = "rust-1.68.0";
        break;
      default:
        return new Response(JSON.stringify({ error: `Unsupported language: ${language}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const wandboxPayload: Record<string, string> = {
      code: actualCode,
      compiler,
      stdin: stdin || "",
    };

    // For C++, we need to add compiler options
    if (language === "cpp") {
      wandboxPayload["options"] = "warning,c++17";
    }

    const res = await fetch(WANDBOX_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wandboxPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Wandbox error:", res.status, errText);
      
      // Fallback: try Glot.io API
      const glotResult = await tryGlotIO(language, code, stdin || "");
      if (glotResult) {
        return new Response(JSON.stringify(glotResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        run: { output: "", stderr: `Compiler service error (${res.status}). Please try again.` }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    
    const output = data.program_output || "";
    const stderr = data.compiler_error || data.program_error || "";
    const compilerOutput = data.compiler_output || "";

    return new Response(JSON.stringify({
      run: {
        output: output,
        stderr: stderr || (compilerOutput && !output ? compilerOutput : ""),
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

// Fallback: Glot.io API
async function tryGlotIO(language: string, code: string, stdin: string) {
  const glotLangMap: Record<string, string> = {
    python3: "python",
    javascript: "javascript",
    typescript: "typescript",
    java: "java",
    c: "c",
    cpp: "cpp",
    go: "go",
    rust: "rust",
  };

  const glotLang = glotLangMap[language];
  if (!glotLang) return null;

  try {
    const filename = language === "java" ? "Main.java" 
      : language === "python3" ? "main.py"
      : language === "c" ? "main.c"
      : language === "cpp" ? "main.cpp"
      : language === "go" ? "main.go"
      : language === "rust" ? "main.rs"
      : language === "typescript" ? "main.ts"
      : "main.js";

    const res = await fetch(`https://glot.io/api/run/${glotLang}/latest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stdin,
        files: [{ name: filename, content: code }],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      run: {
        output: data.stdout || "",
        stderr: data.stderr || data.error || "",
      }
    };
  } catch {
    return null;
  }
}
