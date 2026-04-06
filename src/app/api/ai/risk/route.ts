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
    .from('paint_logs').select('ambient_temp,ambient_humidity,booth_temp,workpiece_temp,paint_temp,defects')
    .eq('user_id', user.id).order('painted_at', { ascending: false }).limit(20);
  const pastData = (pastLogs || []).map((l: any) => ({
    conditions: { ambient_temp: l.ambient_temp, ambient_humidity: l.ambient_humidity, booth_temp: l.booth_temp },
    defects: l.defects || [],
  }));
  const prefs = await getUserModelPrefs();
  try {
    return NextResponse.json(await assessRisk(conditions, pastData, prefs.risk));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
