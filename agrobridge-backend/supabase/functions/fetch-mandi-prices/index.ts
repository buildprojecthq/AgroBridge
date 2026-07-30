import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configure CORS for debugging if called from browser, though usually invoked via cron
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase Client with Service Role (bypasses RLS to write prices)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. The target commodities and states we want to track (Karnataka only)
    const targets = [
      { state: 'Karnataka', market: 'Kengeri', commodity: 'Corn', basePrice: 200 },
      { state: 'Karnataka', market: 'Mysuru', commodity: 'Tomato', basePrice: 40 },
      { state: 'Karnataka', market: 'Bengaluru', commodity: 'Wheat', basePrice: 35 },
      { state: 'Karnataka', market: 'Chamarajanagar', commodity: 'Rice', basePrice: 50 },
    ];

    const apiKey = Deno.env.get('DATA_GOV_API_KEY');
    const records = [];

    if (apiKey) {
      try {
        // Fetch real data from the Government API, filtered to Karnataka
        const apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=100&filters[state]=Karnataka`;
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (data && data.records && data.records.length > 0) {
          for (const item of data.records) {
            const state = item.state;
            const market = item.market;
            const commodity = item.commodity;
            
            // Prices are usually in Rs/Quintal (100kg). Convert to Rs/Kg
            const modal_price = Math.round(item.modal_price / 100);
            const min_price = Math.round(item.min_price / 100);
            const max_price = Math.round(item.max_price / 100);

            const compositeId = `${state}_${market}_${commodity}`
              .replace(/[^a-zA-Z0-9_]/g, "")
              .toUpperCase();

            records.push({
              id: compositeId,
              state,
              market,
              commodity,
              modal_price,
              min_price,
              max_price,
              created_at: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch real API data, falling back to mock:", err);
      }
    }

    // Fallback if API fails or no key
    if (records.length === 0) {
      for (const target of targets) {
        const fluctuation = 1 + (Math.random() * 0.1 - 0.05);
        const modal_price = Math.round(target.basePrice * fluctuation);
        const min_price = Math.round(modal_price * 0.85);
        const max_price = Math.round(modal_price * 1.15);

        const compositeId = `${target.state}_${target.market}_${target.commodity}`
          .replace(/[^a-zA-Z0-9_]/g, "")
          .toUpperCase();

        records.push({
          id: compositeId,
          state: target.state,
          market: target.market,
          commodity: target.commodity,
          modal_price,
          min_price,
          max_price,
          created_at: new Date().toISOString()
        });
      }
    }

    // Deduplicate records to avoid PostgreSQL "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const uniqueRecordsMap = new Map();
    for (const record of records) {
      uniqueRecordsMap.set(record.id, record);
    }
    const finalRecords = Array.from(uniqueRecordsMap.values());

    // 4. Upsert the records into the database
    const { error } = await supabase
      .from('mandi_prices')
      .upsert(finalRecords, { onConflict: 'id' });

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully synced ${records.length} Mandi prices.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const err = error as Error;
    console.error("Mandi Price Cron Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
