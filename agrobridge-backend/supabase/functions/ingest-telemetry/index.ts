import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This MUST match the key you will eventually hardcode into the ESP32 C++ script
const HARDWARE_SECRET_KEY = "agro_secret_key_123";

// Helper to calculate HMAC-SHA256
async function calculateHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const messageData = encoder.encode(message);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  
  // Convert ArrayBuffer to Hex String
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

serve(async (req: Request) => {
  // 1. Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const payloadString = await req.text();
    const signatureFromDevice = req.headers.get('x-device-signature');

    if (!signatureFromDevice) {
      return new Response('Unauthorized: Missing Signature', { status: 401 });
    }

    // 2. Cryptographic Security Check
    const expectedSignature = await calculateHMAC(payloadString, HARDWARE_SECRET_KEY);

    if (signatureFromDevice !== expectedSignature) {
      console.error("Security Alert: Invalid Signature");
      return new Response('Unauthorized: Bad Signature', { status: 401 });
    }

    // Parse the payload now that it's verified
    const body = JSON.parse(payloadString);

    // 3. Anti-Replay Attack Check (Reject data older than 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - body.timestamp > 300) {
      return new Response('Unauthorized: Payload Expired', { status: 401 });
    }

    // 4. Extract Data
    const { deviceId, temperature, humidity, gasLevel, timestamp } = body;

    // 5. Smart Spoilage & Auto-Ventilation Logic
    const SPOILAGE_THRESHOLD = 1000;      // Critical gas threshold (triggers fan at 1000+)
    const ELEVATED_GAS_THRESHOLD = 900;   // Elevated warning threshold
    const TEMP_HIGH_THRESHOLD = 35.0;     // Critical temperature threshold (°C)
    const HUMIDITY_HIGH_THRESHOLD = 80.0; // High humidity threshold (%)

    let unitStatus = "NORMAL";
    let isEnvironmentalCritical = false;

    if (gasLevel >= SPOILAGE_THRESHOLD) {
      unitStatus = "CRITICAL_SPOILAGE_DETECTED";
      isEnvironmentalCritical = true;
    } else if (temperature >= TEMP_HIGH_THRESHOLD) {
      unitStatus = "CRITICAL_HIGH_TEMP";
      isEnvironmentalCritical = true;
    } else if (humidity >= HUMIDITY_HIGH_THRESHOLD) {
      unitStatus = "CRITICAL_HIGH_HUMIDITY";
      isEnvironmentalCritical = true;
    } else if (gasLevel >= ELEVATED_GAS_THRESHOLD) {
      unitStatus = "WARNING_ELEVATED_GAS";
    }

    // 6. Save securely to Supabase PostgreSQL
    // We use the Service Role Key here because this request is coming from hardware (not a user session)
    // and we need to bypass RLS to insert data.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Read current fan_status and camera fields
    const { data: currentRecord } = await supabaseClient
      .from('storage_telemetry')
      .select('fan_status, camera_image_url, camera_updated_at')
      .eq('device_id', deviceId)
      .maybeSingle();

    // If critical condition detected, fan is automatically activated
    const fanStatus = isEnvironmentalCritical ? true : (currentRecord?.fan_status ?? false);

    const { error } = await supabaseClient
      .from('storage_telemetry')
      .upsert({
        device_id: deviceId,
        current_temperature: temperature,
        current_humidity: humidity,
        gas_level: gasLevel,
        status: unitStatus,
        last_updated: timestamp,
        fan_status: fanStatus,
        camera_image_url: currentRecord?.camera_image_url ?? null,
        camera_updated_at: currentRecord?.camera_updated_at ?? null
      }, { onConflict: 'device_id' });

    if (error) {
      console.error("Database insert error:", error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Telemetry processed successfully',
      fan_status: fanStatus 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error processing telemetry:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
});
