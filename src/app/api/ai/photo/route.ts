import { getUserModelPrefs } from "@/lib/model-prefs";
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzePhoto } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 });
  const { photoUrl } = await req.json();
  const prefs = await getUserModelPrefs();
  try {
    const result = await analyzePhoto(photoUrl, prefs.photo);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
