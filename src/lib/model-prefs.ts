import { createClient } from '@/lib/supabase/server';
import { DEFAULT_MODELS } from '@/lib/ai';

export async function getUserModelPrefs(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...DEFAULT_MODELS };

  const { data } = await supabase
    .from('user_defaults')
    .select('model_preferences')
    .eq('user_id', user.id)
    .single();

  return { ...DEFAULT_MODELS, ...(data?.model_preferences || {}) };
}
