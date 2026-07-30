import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.16.0";

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
// Note: In production you would verify the Stripe Webhook Signature using STRIPE_WEBHOOK_SECRET
// For this MVP, we will accept the JSON payload directly.

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    
    // Check if this is the correct event
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const orderId = session.metadata?.orderId;
      const cropId = session.metadata?.cropId;
      
      // We also need to grab the payment intent ID so we can capture it later!
      const paymentIntentId = session.payment_intent;

      if (orderId && orderId !== 'mock-order') {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Update Order to escrow_locked and save the payment_intent_id
        await supabase
          .from('orders')
          .update({ 
             status: 'escrow_locked',
             payment_intent_id: paymentIntentId 
          })
          .eq('id', orderId);

        // Decrease Crop Quantity
        if (cropId && cropId !== 'unknown') {
          const { data: orderData } = await supabase.from('orders').select('quantity').eq('id', orderId).single();
          if (orderData) {
             const { data: cropData } = await supabase.from('crops').select('quantity_available').eq('id', cropId).single();
             if (cropData) {
               await supabase
                 .from('crops')
                 .update({ quantity_available: Math.max(0, cropData.quantity_available - orderData.quantity) })
                 .eq('id', cropId);
             }
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
