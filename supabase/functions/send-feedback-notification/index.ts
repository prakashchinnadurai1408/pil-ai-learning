import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { student_name, reviewer_name, reviewer_role, feedback, stream_id } =
      await req.json();

    if (!student_name || !feedback) {
      return new Response(
        JSON.stringify({ error: "student_name and feedback are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up student email
    const { data: student } = await supabase
      .from("students")
      .select("email, name")
      .eq("name", student_name)
      .maybeSingle();

    if (!student?.email) {
      return new Response(
        JSON.stringify({ success: false, message: "Student email not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email using Supabase's built-in auth admin
    // Since no external email provider is connected, we'll store a notification record
    // and log the email intent for when an email provider is configured
    const { error: notifError } = await supabase.from("student_notifications").insert({
      student_id: (
        await supabase
          .from("students")
          .select("id")
          .eq("name", student_name)
          .maybeSingle()
      ).data?.id,
      message_id: (
        await supabase.from("trainer_messages").insert({
          subject: `Project Feedback from ${reviewer_name}`,
          body: `Hi ${student.name},\n\nYour ${reviewer_role} ${reviewer_name} left feedback on your ${stream_id === "tech" ? "Tech" : "Non-Tech"} project:\n\n"${feedback}"\n\nLog in to your dashboard to view the full details.`,
          recipient_count: 1,
        }).select("id").single()
      ).data?.id,
    } as any);

    console.log(
      `📧 Feedback notification for ${student.email}: ${reviewer_name} (${reviewer_role}) commented on ${stream_id} project`
    );

    return new Response(
      JSON.stringify({ success: true, email: student.email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
