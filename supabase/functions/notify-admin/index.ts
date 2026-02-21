import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY') // Old API Key method for simplicity in Edge Functions (or OAuth2 if strict v1)
// For Firebase HTTP v1 API, getting an OAuth token in Deno is complex without a library. 
// Standard practice for push notifications via Supabase + FCM is often using the Legacy Server Key 
// If mandatory v1 is required, a google auth library is needed. We will try the legacy endpoint first for simplicity.

const FCM_URL = 'https://fcm.googleapis.com/fcm/send'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    // 1. Get the webhook payload
    const payload = await req.json()
    console.log('Webhook payload:', payload)

    // Ensure it's an insert to the bookings table
    if (payload.type !== 'INSERT' || payload.table !== 'bookings') {
      return new Response("Not an insert on bookings", { status: 200 })
    }

    const booking = payload.record
    const businessName = booking.business_name || booking.businesses?.name || 'A new client'

    let serviceName = 'a service'
    if (Array.isArray(booking.services)) {
      serviceName = booking.services.join(', ')
    } else if (booking.service) {
      serviceName = booking.service
    }

    // 2. Initialize Supabase Client to get all Admin FCM tokens
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: tokens, error: tokenError } = await supabase
      .from('admin_fcm_tokens')
      .select('token')

    if (tokenError || !tokens || tokens.length === 0) {
      console.log('No tokens found or error fetching tokens:', tokenError)
      return new Response("No admin tokens available", { status: 200 })
    }

    const registrationIds = tokens.map(t => t.token)

    // 3. Construct FCM Payload
    const fcmPayload = {
      registration_ids: registrationIds,
      notification: {
        title: 'New Booking Alert!',
        body: `${businessName} just booked: ${serviceName}`,
        icon: '/logo.webp', // Ensure this exists in your public folder
        click_action: 'https://dekaandassociates.in/admin.html' // Where to open when clicked
      },
      data: {
        bookingId: booking.id
      }
    }

    // 4. Send to Firebase using Legacy HTTP API (Requires Server Key in secrets)
    const fcmRes = await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`
      },
      body: JSON.stringify(fcmPayload)
    })

    const fcmResult = await fcmRes.json()
    console.log('FCM Send Result:', fcmResult)

    return new Response(JSON.stringify({ success: true, fcmResult }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Error processing webhook:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
