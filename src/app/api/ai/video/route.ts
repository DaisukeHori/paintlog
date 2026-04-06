import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeVideo } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 });
  const { frameUrls } = await req.json();
  try {
    return NextResponse.json(await analyzeVideo(frameUrls));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
