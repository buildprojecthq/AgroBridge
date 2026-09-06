import { supabase } from '../config/supabase';

// Benchmark baseline prices (INR / kg) for fruits, vegetables, and grains
const COMMODITY_BENCHMARKS = {
  'Apple': { modal: 150, min: 120, max: 180 },
  'Mango': { modal: 80, min: 60, max: 120 },
  'Banana': { modal: 40, min: 30, max: 50 },
  'Orange': { modal: 60, min: 45, max: 75 },
  'Pomegranate': { modal: 140, min: 110, max: 170 },
  'Tomato': { modal: 35, min: 28, max: 45 },
  'Potato': { modal: 30, min: 22, max: 38 },
  'Onion': { modal: 30, min: 24, max: 40 },
  'Wheat': { modal: 28, min: 25, max: 32 },
  'Rice': { modal: 45, min: 38, max: 55 },
  'Corn': { modal: 24, min: 20, max: 30 },
  'Green Chilli': { modal: 60, min: 48, max: 75 },
  'Garlic': { modal: 120, min: 100, max: 150 },
  'Ginger': { modal: 90, min: 75, max: 110 },
  'Cotton': { modal: 75, min: 65, max: 90 },
  'Sugarcane': { modal: 18, min: 15, max: 22 },
  'Soybean': { modal: 48, min: 42, max: 56 },
  'default': { modal: 50, min: 35, max: 70 }
};

/**
 * Clean & simplified Mandi Price Fetcher.
 * Directly queries the 'mandi_prices' table by exact commodity name.
 * 
 * @param {string} state - (Optional)
 * @param {string} market - (Optional)
 * @param {string} commodity - The commodity name (e.g., "Apple", "Potato", "Tomato")
 * @returns {Promise<Object|null>} Returns price data.
 */
export const getLatestMandiPrice = async (state, market, commodity) => {
    try {
        if (!commodity || !commodity.trim()) {
            console.warn("[MandiFetcher] No commodity provided.");
            return null;
        }

        const cleanCommodity = commodity.trim();
        console.log(`[MandiFetcher] Querying mandi_prices table for commodity: "${cleanCommodity}"...`);

        // 1. First, search for exact match on commodity name (e.g., 'Apple' matches 'Apple', not 'Pineapple')
        let { data, error } = await supabase
            .from('mandi_prices')
            .select('*')
            .ilike('commodity', cleanCommodity)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 2. If no exact match, fallback to substring search
        if (!data) {
            const { data: subData, error: subError } = await supabase
                .from('mandi_prices')
                .select('*')
                .ilike('commodity', `%${cleanCommodity}%`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (subData) {
                data = subData;
            }
            if (subError) {
                error = subError;
            }
        }

        if (error) {
            console.error("[MandiFetcher] Supabase query error:", error.message);
        }

        if (data) {
            const modalPrice = Number(data.modal_price ?? data.price_per_kg ?? data.price ?? 0);
            const minPrice = Number(data.min_price ?? modalPrice * 0.85);
            const maxPrice = Number(data.max_price ?? modalPrice * 1.15);

            console.log(`[MandiFetcher] Found DB record for "${cleanCommodity}": Modal Price = ₹${modalPrice}/kg`);
            return {
                state: data.state || state || 'Karnataka',
                market: data.market || market || 'All Mandis',
                commodity: data.commodity,
                modal_price: modalPrice,
                min_price: minPrice,
                max_price: maxPrice,
                lastUpdated: data.created_at
            };
        }

        // 3. Fallback to agricultural benchmark if not yet in database
        console.log(`[MandiFetcher] Commodity "${cleanCommodity}" not found in DB. Using benchmark.`);
        const benchmark = COMMODITY_BENCHMARKS[cleanCommodity] || 
                          Object.entries(COMMODITY_BENCHMARKS).find(([k]) => cleanCommodity.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(cleanCommodity.toLowerCase()))?.[1] ||
                          COMMODITY_BENCHMARKS['default'];

        return {
            state: state || 'Karnataka',
            market: market || 'Market Average',
            commodity: cleanCommodity,
            modal_price: benchmark.modal,
            min_price: benchmark.min,
            max_price: benchmark.max,
            lastUpdated: new Date().toISOString()
        };

    } catch (err) {
        console.error("[MandiFetcher] Unexpected error:", err);
        return null;
    }
};
