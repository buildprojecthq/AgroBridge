import { supabase } from '../config/supabase';

// In-memory cache to prevent redundant edge function calls
const translationCache = {};

export const translateCropName = async (text, targetLanguage) => {
  if (!text || !targetLanguage || targetLanguage === 'en') return text;
  
  const cacheKey = `${text}_${targetLanguage}`;
  if (translationCache[cacheKey]) return translationCache[cacheKey];

  try {
    const { data, error } = await supabase.functions.invoke('translate-crop', {
      body: { text, target_language: targetLanguage }
    });

    if (error) throw error;
    
    if (data && data.translatedText) {
      translationCache[cacheKey] = data.translatedText;
      return data.translatedText;
    }
  } catch (err) {
    console.error("Translation Edge Function Error:", err);
  }

  return text; // Fallback to original text
};
