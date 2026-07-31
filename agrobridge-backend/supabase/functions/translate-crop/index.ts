import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock dictionary for translating common crops from English to regional languages
const MOCK_DICTIONARY = {
  // Hindi
  "hi": {
    "tomato": "टमाटर",
    "potato": "आलू",
    "onion": "प्याज़",
    "corn": "मक्का",
    "wheat": "गेहूँ",
    "rice": "चावल",
    "apple": "सेब",
    "banana": "केला",
    "mango": "आम",
    "chili": "मिर्च"
  },
  // Telugu
  "te": {
    "tomato": "టమాటా",
    "potato": "బంగాళాదుంప",
    "onion": "ఉల్లిపాయ",
    "corn": "మొక్కజొన్న",
    "wheat": "గోధుమలు",
    "rice": "బియ్యం",
    "apple": "ఆపిల్",
    "banana": "అరటిపండు",
    "mango": "మామిడి",
    "chili": "మిరపకాయ"
  },
  // Tamil
  "ta": {
    "tomato": "தக்காளி",
    "potato": "உருளைக்கிழங்கு",
    "onion": "வெங்காயம்",
    "corn": "சோளம்",
    "wheat": "கோதுமை",
    "rice": "அரிசி",
    "apple": "ஆப்பிள்",
    "banana": "வாழைப்பழம்",
    "mango": "மாம்பழம்",
    "chili": "மிளகாய்"
  },
  // Kannada
  "kn": {
    "tomato": "ಟೊಮೆಟೊ",
    "potato": "ಆಲೂಗಡ್ಡೆ",
    "onion": "ಈರುಳ್ಳಿ",
    "corn": "ಜೋಳ",
    "wheat": "ಗೋಧಿ",
    "rice": "ಅಕ್ಕಿ",
    "apple": "ಸೇಬು",
    "banana": "ಬಾಳೆಹಣ್ಣು",
    "mango": "ಮಾವಿನಹಣ್ಣು",
    "chili": "ಮೆಣಸಿನಕಾಯಿ"
  },
  // Marathi
  "mr": {
    "tomato": "टोमॅटो",
    "potato": "बटाटा",
    "onion": "कांदा",
    "corn": "मका",
    "wheat": "गहू",
    "rice": "तांदूळ",
    "apple": "सफरचंद",
    "banana": "केळी",
    "mango": "आंबा",
    "chili": "मिरची"
  },
  // Malayalam
  "ml": {
    "tomato": "തക്കാളി",
    "potato": "ഉരുളക്കിഴങ്ങ്",
    "onion": "ഉള്ളി",
    "corn": "ചോളം",
    "wheat": "ഗോതമ്പ്",
    "rice": "അരി",
    "apple": "ആപ്പിൾ",
    "banana": "പഴം",
    "mango": "മാങ്ങ",
    "chili": "മുളക്"
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, target_language } = await req.json();

    if (!text || !target_language) {
      throw new Error('Missing text or target_language parameter');
    }

    let translatedText = text;
    const lowerText = text.toLowerCase().trim();

    // If English is the target or language not supported in mock, return original
    if (target_language !== 'en' && MOCK_DICTIONARY[target_language]) {
      // Check if we have an exact match in our mock dictionary
      if (MOCK_DICTIONARY[target_language][lowerText]) {
        translatedText = MOCK_DICTIONARY[target_language][lowerText];
      }
    }

    return new Response(
      JSON.stringify({ translatedText, originalText: text, language: target_language }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
