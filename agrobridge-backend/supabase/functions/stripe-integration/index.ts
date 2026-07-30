import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.16.0";

// Retrieve secrets securely from Supabase Vault/Env
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Configure CORS for calling from the app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the User using the JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Initialize Service Role client to update users table securely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get action payload
    const body = await req.json();
    const action = body.action;

    // ==========================================
    // STRIPE CONNECT ESCROW FUNCTIONS
    // ==========================================

    if (action === 'createStripeAccount') {
      // Create an Express account for the Farmer
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
      });

      // Save the Stripe Account ID to the user's Supabase record
      await supabaseAdmin.from('users').update({
        stripeAccountId: account.id
      }).eq('id', user.id);

      // Generate an onboarding link for the Farmer
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: 'https://agrobridge.com/reauth',
        return_url: 'https://agrobridge.com/success',
        type: 'account_onboarding',
      });

      return new Response(JSON.stringify({ accountId: account.id, url: accountLink.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'createEscrowPayment') {
      const { amount, cropId } = body.data;

      if (!amount) {
        return new Response(JSON.stringify({ error: 'Amount is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const returnUrl = body.data.returnUrl || 'https://agrobridge.com/success';
      // Create a Stripe Checkout Session with manual capture (ESCROW LOCK)
      // We are using Demo Mode (no connected account transfers) to keep it simple for testing
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'inr',
            product_data: { 
              name: 'AgroBridge Escrow Lock',
              description: 'Funds are securely held in escrow until IoT delivery verification.'
            },
            unit_amount: Math.round(amount * 100), // paise for INR
          },
          quantity: 1,
        }],
        mode: 'payment',
        payment_intent_data: {
          capture_method: 'manual', // This makes it an "Escrow" hold!
        },
        success_url: returnUrl,
        cancel_url: returnUrl,
        metadata: {
          buyerId: user.id,
          cropId: cropId || 'unknown',
          orderId: body.data.orderId || 'mock-order'
        }
      });

      return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'releaseEscrow') {
      const { orderId } = body.data;

      if (!orderId) {
        return new Response(JSON.stringify({ error: 'Order ID is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Fetch the payment_intent_id from the orders table
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('payment_intent_id')
        .eq('id', orderId)
        .single();

      if (orderError || !orderData?.payment_intent_id) {
        return new Response(JSON.stringify({ error: 'Order not found or payment intent missing.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Capture the funds, instantly transferring to the destination account
      const intent = await stripe.paymentIntents.capture(orderData.payment_intent_id);

      // Update the order status to completed
      await supabaseAdmin
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      return new Response(JSON.stringify({ success: true, status: intent.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const err = error as Error;
    console.error("Stripe Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
