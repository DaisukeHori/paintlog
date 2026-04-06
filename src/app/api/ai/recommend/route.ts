import { getUserModelPrefs } from "@/lib/model-prefs";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recommendSettings } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 });
  const { paintType, conditions } = await req.json();
  const { data: logs } = await supabase
    .from('paint_logs')
    .select('air_pressure,throttle_turns,needle_turns,dilution_ratio,gun_distance,coat_count,film_thickness,fan_power,ambient_temp,ambient_humidity')
    .eq('user_id', user.id).eq('paint_type', paintType)
    .order('painted_at', { ascending: false }).limit(30);
  const prefs = await getUserModelPrefs();
  try {
    return NextResponse.json(await recommendSettings(paintType, conditions, logs || [], prefs.recommend));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
