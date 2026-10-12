// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Shared hardware secret key matching the ESP32-CAM and Gateway firmware
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
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  // CORS preflight handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }

  // 1. Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const deviceId = req.headers.get('x-device-id') || 'ESP32_WAREHOUSE_01';
    const timestampStr = req.headers.get('x-device-timestamp');
    const signatureFromDevice = req.headers.get('x-device-signature');

    if (!timestampStr || !signatureFromDevice) {
      return new Response(JSON.stringify({ error: 'Missing security headers' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const timestamp = parseInt(timestampStr, 10);
    const currentTime = Math.floor(Date.now() / 1000);

    // 2. Anti-Replay Check (5-minute drift window)
    if (Math.abs(currentTime - timestamp) > 300) {
      return new Response(JSON.stringify({ error: 'Timestamp expired' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. HMAC-SHA256 Security Verification (message = `${deviceId}:${timestamp}`)
    const payloadToVerify = `${deviceId}:${timestamp}`;
    const expectedSignature = await calculateHMAC(payloadToVerify, HARDWARE_SECRET_KEY);

    if (signatureFromDevice !== expectedSignature) {
      console.error("Security Alert: Invalid Snapshot Signature from Device", deviceId);
      return new Response(JSON.stringify({ error: 'Invalid device signature' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Extract raw JPEG image bytes from body
    const imageBuffer = await req.arrayBuffer();
    if (!imageBuffer || imageBuffer.byteLength === 0) {
      return new Response(JSON.stringify({ error: 'Empty image buffer received' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. Initialize Supabase Client with Service Role Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const filePath = `${deviceId}/latest.jpg`;

    // 6. Upload JPEG buffer directly to Supabase Storage Bucket
    const { error: uploadError } = await supabaseClient.storage
      .from('warehouse-snapshots')
      .upload(filePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload snapshot to storage' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 7. Retrieve public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('warehouse-snapshots')
      .getPublicUrl(filePath);

    // 8. Update storage_telemetry to broadcast to Realtime listeners
    const { error: dbError } = await supabaseClient
      .from('storage_telemetry')
      .upsert({
        device_id: deviceId,
        camera_image_url: publicUrl,
        camera_updated_at: timestamp
      }, { onConflict: 'device_id' });

    if (dbError) {
      console.error("Database upsert error:", dbError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      imageUrl: publicUrl,
      updatedAt: timestamp,
      byteSize: imageBuffer.byteLength
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("Unexpected error ingesting camera snapshot:", err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
