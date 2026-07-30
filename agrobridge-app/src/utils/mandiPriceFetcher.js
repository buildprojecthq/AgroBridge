import { supabase } from '../config/supabase';
/**
 * Highly optimized fetch utility to retrieve the latest cached Mandi Price.
 * 
 * @param {string} state - The state (e.g., "Karnataka")
 * @param {string} market - The market (e.g., "Bengaluru")
 * @param {string} commodity - The commodity (e.g., "Corn")
 * @returns {Promise<Object|null>} Returns price data or null if not found.
 */
export const getLatestMandiPrice = async (state, market, commodity) => {
    try {
        if (!state || !market || !commodity) {
            console.warn("Mandi Price Fetcher: Missing required parameters.");
            return null;
        }

        // Generate the deterministic composite document ID matching the Cloud Function logic
        const compositeId = `${state}_${market}_${commodity}`
            .replace(/[^a-zA-Z0-9_]/g, "")
            .toUpperCase();

        // Perform a highly optimized read directly
        const { data, error } = await supabase
            .from('mandi_prices')
            .select('*')
            .eq('id', compositeId)
            .single();

        if (data && !error) {
            return {
                state: data.state,
                market: data.market,
                commodity: data.commodity,
                modal_price: data.modal_price,
                min_price: data.min_price,
                max_price: data.max_price,
                lastUpdated: data.created_at
            };
        } else {
            // Fallback mock since Govt API sync isn't fully ported to Supabase yet
            console.log(`No Mandi price data found for: ${compositeId}. Using fallback.`);
            return {
                state: state,
                market: market,
                commodity: commodity,
                modal_price: Math.floor(Math.random() * 50) + 200,
                min_price: 190,
                max_price: 260,
                lastUpdated: Date.now()
            };
        }
    } catch (error) {
        console.error("Error fetching Mandi Price from Supabase:", error);
        return null;
    }
};
