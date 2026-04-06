import { getUserModelPrefs } from "@/lib/model-prefs";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { queryData } from '@/lib/ai';

const SCHEMA = `paint_logs: id,painted_at,ambient_temp,ambient_humidity,booth_temp,workpiece_temp,paint_temp,paint_type,paint_product,dilution_ratio,viscosity_seconds,paint_lot,air_pressure,throttle_turns,needle_turns,gun_type,gun_distance,coat_count,surface_prep,drying_method,drying_temp,drying_time,film_thickness,fan_power,defects(jsonb: NG枚数map),batch_size(int),defect_count(int),comment`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 });
  const { question } = await req.json();
  const prefs = await getUserModelPrefs();
  try {
    const aiResult = await queryData(question, SCHEMA, prefs.query);
    let query = supabase.from('paint_logs').select('*').eq('user_id', user.id);
    Object.entries(aiResult.filters || {}).forEach(([key, value]) => {
      if (key.endsWith('_gte')) query = query.gte(key.replace('_gte', ''), value);
      else if (key.endsWith('_lte')) query = query.lte(key.replace('_lte', ''), value);
      else if (key.endsWith('_like')) query = query.ilike(key.replace('_like', ''), `%${value}%`);
      else query = query.eq(key, value);
    });
    const { data: logs } = await query.order('painted_at', { ascending: false }).limit(20);
    return NextResponse.json({ ...aiResult, results: logs || [], count: (logs || []).length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
