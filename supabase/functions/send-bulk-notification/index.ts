import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  email: string;
  name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, message, recipients } = await req.json() as {
      subject: string;
      message: string;
      recipients: Recipient[];
    };

    // Log the notification attempt for debugging
    console.log(`Bulk notification: "${subject}" to ${recipients.length} recipients`);
    console.log("Recipients:", recipients.map((r) => r.email).join(", "));

    // Email delivery would go here when an email domain is configured.
    // For now, this edge function logs the attempt. The in-app notifications
    // are already saved to the database before this function is called.

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification logged for ${recipients.length} recipient(s). In-app notifications delivered. Email delivery requires email domain configuration.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-bulk-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
