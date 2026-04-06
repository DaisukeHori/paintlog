import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' });
  }
  return _openai;
}

// モデル選択: 写真/動画分析はStandard（Vision精度）、それ以外はMini（コスト最適）
const MODEL_VISION = 'gpt-5.4';
const MODEL_TEXT = 'gpt-5.4-mini';

// 塗装ドメイン知識のシステムプロンプト
const PAINT_EXPERT_SYSTEM = `あなたは工業塗装の品質管理エキスパートです。スプレーガン塗装（自動車補修、工業製品）に精通しています。

塗装不具合の種類と原因:
- タレ: 厚塗り、エア圧不足、希釈しすぎ、ガン距離近すぎ
- ブツ: ゴミ付着、塗料中の異物、ブース清掃不足
- ハジキ: シリコン汚染、脱脂不良、油分混入
- ゆず肌: エア圧高すぎ、希釈不足、ガン距離遠すぎ、塗料粘度高
- ピンホール: 厚塗り、溶剤蒸発速すぎ、下地の水分
- クレーター: 表面汚染、シリコン
- 色ムラ: 吹きムラ、ガン操作不均一、希釈ムラ
- 薄膜: 吐出量不足、ガン速度速すぎ、距離遠すぎ

環境条件の影響:
- 気温5℃未満: 塗装不可（乾燥不良）
- 気温35℃超: 速乾によるゆず肌リスク
- 湿度85%超: 白化（ブラッシング）リスク高
- 湿度70-85%: 注意域、リターダー添加推奨
- ワーク温度と気温の差が大きい: 結露リスク

回答は必ず日本語で行ってください。`;

// --- A. 写真不具合検出 ---
export async function analyzePhoto(photoUrl: string): Promise<{
  defects: { type: string; severity: string; description: string }[];
  overall: string;
  score: number;
}> {
  const response = await getClient().chat.completions.create({
    model: MODEL_VISION,
    messages: [
      { role: 'system', content: `${PAINT_EXPERT_SYSTEM}\n\n塗装仕上がり写真を分析し、不具合を検出してください。以下のJSON形式で回答:\n{"defects":[{"type":"不具合名","severity":"軽微|中程度|重大","description":"詳細説明"}],"overall":"総合評価コメント","score":0-100の品質スコア}` },
      { role: 'user', content: [
        { type: 'text', text: '以下の塗装仕上がり写真を分析してください。' },
        { type: 'image_url', image_url: { url: photoUrl } },
      ]},
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
  });
  return JSON.parse(response.choices[0].message.content || '{}');
}

// --- B. 塗装前リスク判定 ---
export async function assessRisk(
  conditions: { ambient_temp: number; ambient_humidity: number; booth_temp: number; workpiece_temp: number; paint_temp: number },
  pastLogs: Array<{ conditions: Record<string, number>; defects: string[] }>
): Promise<{
  risk_level: 'low' | 'medium' | 'high';
  warnings: string[];
  recommendations: string[];
}> {
  const response = await getClient().chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: 'system', content: `${PAINT_EXPERT_SYSTEM}\n\n現在の環境条件とユーザーの過去の塗装記録を元に、不具合リスクを評価してください。JSON形式で回答:\n{"risk_level":"low|medium|high","warnings":["警告メッセージ"],"recommendations":["推奨アクション"]}` },
      { role: 'user', content: `現在の条件:\n${JSON.stringify(conditions)}\n\n過去の類似条件での記録（直近20件）:\n${JSON.stringify(pastLogs)}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 800,
  });
  return JSON.parse(response.choices[0].message.content || '{}');
}

// --- C. 最適設定レコメンド ---
export async function recommendSettings(
  paintType: string,
  conditions: { ambient_temp: number; ambient_humidity: number },
  successfulLogs: Array<Record<string, unknown>>
): Promise<{
  recommended: Record<string, { value: number; range: string }>;
  confidence: string;
  explanation: string;
}> {
  const response = await getClient().chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: 'system', content: `${PAINT_EXPERT_SYSTEM}\n\n過去の不具合ゼロの記録から最適なガン設定を推奨してください。JSON形式で回答:\n{"recommended":{"air_pressure":{"value":0.25,"range":"0.20-0.30"},"throttle_turns":{"value":2.25,"range":"2.0-2.5"},...},"confidence":"高|中|低","explanation":"推奨理由の説明"}` },
      { role: 'user', content: `塗装種類: ${paintType}\n今日の条件: ${JSON.stringify(conditions)}\n\n不具合なしの過去記録:\n${JSON.stringify(successfulLogs)}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
  });
  return JSON.parse(response.choices[0].message.content || '{}');
}

// --- D. 自然言語データ検索 ---
export async function queryData(
  question: string,
  schema: string
): Promise<{
  answer: string;
  query_description: string;
  filters: Record<string, unknown>;
}> {
  const response = await getClient().chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: 'system', content: `あなたは塗装データベースのアシスタントです。ユーザーの自然言語の質問をSupabaseクエリのフィルタ条件に変換してください。\n\nテーブル構造:\n${schema}\n\nJSON形式で回答:\n{"answer":"質問への直接回答（データ取得後に埋める場合は空文字）","query_description":"実行するクエリの説明","filters":{"column":"value"や"column_gte":"value"等のフィルタ条件}}` },
      { role: 'user', content: question },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });
  return JSON.parse(response.choices[0].message.content || '{}');
}

// --- E. 噴霧動画分析 ---
export async function analyzeVideo(frameUrls: string[]): Promise<{
  technique_score: number;
  observations: { aspect: string; rating: string; detail: string }[];
  improvements: string[];
}> {
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: 'text', text: '以下は塗装噴霧時の動画からサンプリングしたフレームです。スプレー技術を分析してください。ガン距離の一貫性、移動速度の均一性、オーバーラップパターン、ガン角度を評価してください。' },
    ...frameUrls.map(url => ({ type: 'image_url' as const, image_url: { url } })),
  ];
  const response = await getClient().chat.completions.create({
    model: MODEL_VISION,
    messages: [
      { role: 'system', content: `${PAINT_EXPERT_SYSTEM}\n\nJSON形式で回答:\n{"technique_score":0-100,"observations":[{"aspect":"評価項目","rating":"良好|要改善|問題あり","detail":"詳細"}],"improvements":["改善提案"]}` },
      { role: 'user', content },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1200,
  });
  return JSON.parse(response.choices[0].message.content || '{}');
}

// --- F. 月次品質レポート ---
export async function generateMonthlyReport(
  logs: Array<Record<string, unknown>>,
  month: string
): Promise<{
  summary: string;
  stats: { total: number; defect_free_rate: number; avg_thickness: number };
  trends: string[];
  top_issues: string[];
  recommendations: string[];
}> {
  const response = await getClient().chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: 'system', content: `${PAINT_EXPERT_SYSTEM}\n\n月次品質レポートを生成してください。JSON形式で回答:\n{"summary":"概要（3文程度）","stats":{"total":件数,"defect_free_rate":不具合なし率,"avg_thickness":平均膜厚},"trends":["傾向分析"],"top_issues":["主な課題"],"recommendations":["改善提案"]}` },
      { role: 'user', content: `${month}の塗装記録データ:\n${JSON.stringify(logs)}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1500,
  });
  return JSON.parse(response.choices[0].message.content || '{}');
}
