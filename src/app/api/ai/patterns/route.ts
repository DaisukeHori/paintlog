import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzePatterns } from '@/lib/clustering';
import { getUserModelPrefs } from '@/lib/model-prefs';
import OpenAI from 'openai';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 });

  const { data: logs } = await supabase.from('paint_logs').select('*')
    .eq('user_id', user.id).order('painted_at', { ascending: true }).limit(500);

  if (!logs || logs.length < 5) {
    return NextResponse.json({ error: 'データが5件未満です。もう少し記録を増やしてから分析してください。' }, { status: 400 });
  }

  const result = analyzePatterns(logs);
  if (!result) {
    return NextResponse.json({ error: '分析に必要な完全データ（全項目入力済み）が不足しています。' }, { status: 400 });
  }

  // GPTによる解釈（オプション）
  let aiInterpretation: string | null = null;
  try {
    const prefs = await getUserModelPrefs();
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    const response = await openai.chat.completions.create({
      model: prefs.recommend || 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: 'あなたは塗装品質管理のエキスパートです。クラスタリング分析の結果を、現場の塗装作業者が理解しやすい日本語で簡潔に解釈してください。200文字以内で。' },
        { role: 'user', content: `歩留まりパターン分析結果:\n${JSON.stringify(result.clusters.map(c => ({ id: c.id, size: c.size, successRate: c.successRate, ranges: c.ranges })))}\n\n高歩留vs低歩留の差:\n${JSON.stringify(result.successVsFailure)}\n\n重要度:\n${JSON.stringify(result.featureImportance)}` },
      ],
      max_tokens: 300,
    });
    aiInterpretation = response.choices[0].message.content;
  } catch { /* GPT解釈は失敗してもOK */ }

  return NextResponse.json({ ...result, aiInterpretation });
}
