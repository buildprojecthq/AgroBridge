import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Initialize Service Role client to update database securely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get action payload
    const body = await req.json();
    const action = body.action;

    // Retrieve Cashfree Credentials (always use Sandbox for staging client keys)
    const CASHFREE_APP_ID = Deno.env.get('CASHFREE_APP_ID');
    const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY');

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Cashfree credentials are not configured on the backend.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ==========================================
    // CASHFREE PG FUNCTIONS
    // ==========================================

    if (action === 'createEscrowPayment') {
      const { amount, cropId, orderId, returnUrl } = body.data;

      if (!amount) {
        return new Response(JSON.stringify({ error: 'Amount is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Generate a unique customer ID if user email/phone is not present
      const customerId = user.id.replace(/-/g, "").substring(0, 16);
      const customerEmail = user.email || 'customer@agrobridge.com';
      const customerPhone = user.user_metadata?.phone || '9999999999';

      // Create an order via Cashfree PG API (V3)
      const cashfreeUrl = "https://sandbox.cashfree.com/pg/orders"; // Staging API url
      
      const payload = {
        order_id: orderId || `order_${Date.now()}`,
        order_amount: parseFloat(amount.toFixed(2)),
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_name: user.user_metadata?.full_name || 'AgroBridge Buyer',
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
        order_meta: {
          return_url: returnUrl || `https://agrobridge.com/success?order_id=${orderId}`
        },
        order_note: `AgroBridge Escrow Lock for order: ${orderId}`
      };

      const response = await fetch(cashfreeUrl, {
        method: "POST",
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Cashfree API error response:", errorText);
        throw new Error(`Cashfree order generation failed: ${response.statusText}`);
      }

      const orderData = await response.json();
      
      if (!orderData.payment_session_id) {
        throw new Error('Cashfree response did not contain payment_session_id');
      }

      // Save Cashfree order ID & status to orders table
      await supabaseAdmin.from('orders').update({
        payment_intent_id: orderData.cf_order_id.toString(), // Save the Cashfree reference
        status: 'pending_payment'
      }).eq('id', orderId);

      // Construct standard Web Checkout URL for Sandbox
      const checkoutUrl = `https://sandbox.cashfree.com/pg/view/checkout?session_id=${orderData.payment_session_id}`;

      return new Response(JSON.stringify({ url: checkoutUrl, orderId: orderData.order_id, paymentSessionId: orderData.payment_session_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'verifyPayment') {
      const { orderId } = body.data;

      if (!orderId) {
        return new Response(JSON.stringify({ error: 'Order ID is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Fetch order details from Cashfree
      const cashfreeUrl = `https://sandbox.cashfree.com/pg/orders/${orderId}`;
      const response = await fetch(cashfreeUrl, {
        method: "GET",
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Failed to fetch order status from Cashfree:", errText);
        throw new Error(`Failed to fetch order status from Cashfree: ${response.statusText}`);
      }

      const orderData = await response.json();
      
      if (orderData.order_status === 'PAID') {
        // Update database to escrow_locked
        await supabaseAdmin.from('orders').update({
          status: 'escrow_locked'
        }).eq('id', orderId);
        
        return new Response(JSON.stringify({ success: true, status: 'PAID' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ success: false, status: orderData.order_status }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'releaseEscrow') {
      const { orderId } = body.data;

      if (!orderId) {
        return new Response(JSON.stringify({ error: 'Order ID is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await supabaseAdmin
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const err = error as Error;
    console.error("Cashfree Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
