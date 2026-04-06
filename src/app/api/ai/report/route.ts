import { getUserModelPrefs } from "@/lib/model-prefs";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMonthlyReport } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 });
  const { year, month } = await req.json();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const { data: logs } = await supabase.from('paint_logs').select('*')
    .eq('user_id', user.id).gte('painted_at', startDate).lt('painted_at', endDate)
    .order('painted_at', { ascending: true });
  const prefs = await getUserModelPrefs();
  try {
    return NextResponse.json(await generateMonthlyReport(logs || [], `${year}年${month}月`, prefs.report));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
