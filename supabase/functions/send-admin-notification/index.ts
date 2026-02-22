import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
// Import jose for native Deno JWT signing
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

// IMPORTANT: Define the shape of your Webhook Payload
interface WebhookPayload {
  type: "INSERT";
  table: "bookings";
  record: {
    id: string;
    business_name: string;
    service: string;
    status: string;
    // ... any other columns you care about
  };
  schema: "public";
  old_record: null;
}

serve(async (req) => {
  try {
    // 1. Parse the Webhook Payload
    const payload: WebhookPayload = await req.json();
    
    // Only send notification if it's a new booking insert
    if (payload.table !== "bookings" || payload.type !== "INSERT") {
      return new Response("Not a booking insert", { status: 200 });
    }

    const booking = payload.record;

    // 2. Initialize Supabase Client (to fetch Admin FCM Tokens)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all admin tokens securely
    const { data: adminTokens, error } = await supabase
      .from("admin_fcm_tokens")
      .select("token");

    if (error) throw error;
    if (!adminTokens || adminTokens.length === 0) {
      return new Response("No admin tokens found.", { status: 200 });
    }

    const tokens = adminTokens.map((t) => t.token);

    // 3. Authenticate with Google / Firebase using Service Account stored in Supabase Edge Secrets
    const serviceAccountJsonStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountJsonStr) {
        throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret.");
    }
    
    // Parse the JSON string 
    const credentials = JSON.parse(serviceAccountJsonStr);
    const projectId = credentials.project_id;
    const clientEmail = credentials.client_email;
    const privateKey = credentials.private_key;

    // Manually sign a JWT to exchange for an OAuth2 Access Token
    const scope = "https://www.googleapis.com/auth/cloud-platform";
    const tokenUrl = "https://oauth2.googleapis.com/token";

    const key = await importPKCS8(privateKey, "RS256");
    const jwt = await new SignJWT({ scope })
        .setProtectedHeader({ alg: "RS256", typ: "JWT" })
        .setIssuer(clientEmail)
        .setAudience(tokenUrl)
        .setExpirationTime("1h")
        .setIssuedAt()
        .sign(key);

    const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    });

    if (!tokenRes.ok) {
        const errDump = await tokenRes.text();
        throw new Error(`Failed to get Google Access Token: ${errDump}`);
    }

    const { access_token: accessToken } = await tokenRes.json();

    // 4. Construct the Firebase Cloud Messaging HTTP v1 Payload
    // The HTTP v1 API accepts ONE token per request, or you must use a topic/batch. 
    // Here we will map over tokens and send them concurrently.
    const messagePromises = tokens.map(async (token) => {
      const fcmPayload = {
        message: {
          token: token,
          notification: {
            title: "New Booking Alert!",
            body: `New booking received from ${booking.business_name || 'a client'}.`,
          },
          webpush: {
            headers: {
              Urgency: "high"
            },
            notification: {
              icon: "https://www.dekaandassociates.in/logo.webp",
              badge: "https://www.dekaandassociates.in/dekalogo.png",
              click_action: "https://www.dekaandassociates.in/admin.html",
              requireInteraction: true
            }
          },
          data: {
            bookingId: String(booking.id)
          },
        },
      };

      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fcmPayload),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Failed to send to token ${token}:`, errorText);
      }
      return res;
    });

    // Wait for all messages to be sent
    await Promise.all(messagePromises);

    return new Response(JSON.stringify({ success: true, message: "Notifications sent" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Error sending push notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
