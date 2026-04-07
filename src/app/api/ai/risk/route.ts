import { getUserModelPrefs } from "@/lib/model-prefs";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assessRisk } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 });
  const { conditions } = await req.json();
  const { data: pastLogs } = await supabase
    .from('paint_logs').select('ambient_temp,ambient_humidity,booth_temp,workpiece_temp,paint_temp,defects,batch_size,defect_count,hardener_ratio,drying_steps')
    .eq('user_id', user.id).order('painted_at', { ascending: false }).limit(20);
  const pastData = (pastLogs || []).map((l: any) => ({
    conditions: { ambient_temp: l.ambient_temp, ambient_humidity: l.ambient_humidity, booth_temp: l.booth_temp },
    defects: l.defects || {},
    batch_size: l.batch_size || 20,
    defect_count: l.defect_count || 0,
    yield_rate: l.batch_size > 0 ? Math.round(((l.batch_size - (l.defect_count || 0)) / l.batch_size) * 100) : 100,
    hardener_ratio: l.hardener_ratio,
    drying_steps: l.drying_steps || [],
  }));
  const prefs = await getUserModelPrefs();
  try {
    return NextResponse.json(await assessRisk(conditions, pastData, prefs.risk));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
