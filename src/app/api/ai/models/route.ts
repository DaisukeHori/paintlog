import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Vision対応モデルのみ（PaintLogで使えるもの）
const SUPPORTED_MODELS = [
  { id: 'gpt-5.4', label: 'GPT-5.4', price: '$2.50/$15.00', tier: 'flagship', vision: true },
  { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini', price: '$0.75/$4.50', tier: 'balanced', vision: true },
  { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano', price: '$0.20/$1.25', tier: 'economy', vision: true },
  { id: 'gpt-5.4-pro', label: 'GPT-5.4 Pro', price: '$30/$180', tier: 'premium', vision: true },
  { id: 'gpt-4o', label: 'GPT-4o', price: '$2.50/$10.00', tier: 'legacy', vision: true },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', price: '$0.15/$0.60', tier: 'legacy-economy', vision: true },
  { id: 'gpt-4.1', label: 'GPT-4.1', price: '$2.00/$8.00', tier: 'coding', vision: true },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', price: '$0.40/$1.60', tier: 'coding-economy', vision: true },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', price: '$0.10/$0.40', tier: 'coding-nano', vision: true },
];

export async function GET() {
  // OpenAI APIから最新モデル一覧を取得し、サポートリストと突合
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' });
    const response = await openai.models.list();
    const apiModels = new Set<string>();
    for await (const model of response) {
      apiModels.add(model.id);
    }
    // APIで利用可能なもののみ返す
    const available = SUPPORTED_MODELS.filter((m) => apiModels.has(m.id));
    // API接続できなかった場合は全リスト返す
    return NextResponse.json({ models: available.length > 0 ? available : SUPPORTED_MODELS });
  } catch {
    return NextResponse.json({ models: SUPPORTED_MODELS });
  }
}
