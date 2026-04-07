import { getUserModelPrefs } from "@/lib/model-prefs";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recommendSettings } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 });
  const { paintType, conditions } = await req.json();
  const { data: allLogs } = await supabase
    .from('paint_logs')
    .select('air_pressure,throttle_turns,needle_turns,dilution_ratio,viscosity_seconds,gun_distance,coat_count,film_thickness,fan_power,ambient_temp,ambient_humidity,batch_size,defect_count')
    .eq('user_id', user.id).eq('paint_type', paintType)
    .order('painted_at', { ascending: false }).limit(50);
  // 歩留まり上位のレコードからレコメンド
  const logsWithYield = (allLogs || []).map((l: any) => ({
    ...l,
    yield_rate: l.batch_size > 0 ? Math.round(((l.batch_size - (l.defect_count || 0)) / l.batch_size) * 100) : 100,
  })).sort((a: any, b: any) => b.yield_rate - a.yield_rate).slice(0, 20);
  const prefs = await getUserModelPrefs();
  try {
    return NextResponse.json(await recommendSettings(paintType, conditions, logsWithYield, prefs.recommend));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
