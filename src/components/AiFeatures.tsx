'use client';

import { useState } from 'react';

// --- A. 写真不具合検出 ---
export function PhotoAnalysis({ photoUrl }: { photoUrl: string }) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    const res = await fetch('/api/ai/photo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div className="mt-2">
      <button onClick={analyze} disabled={loading}
        className="text-xs px-3 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg touch-manipulation disabled:opacity-50">
        {loading ? 'AI分析中...' : '🤖 AI不具合検出'}
      </button>
      {result && !result.error && (
        <div className="mt-2 p-3 bg-white border border-stone-200 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">品質スコア</span>
            <span className={`text-lg font-medium ${result.score >= 80 ? 'text-emerald-700' : result.score >= 50 ? 'text-amber-700' : 'text-red-600'}`}>
              {result.score}/100
            </span>
          </div>
          {result.defects?.map((d: any, i: number) => (
            <div key={i} className={`p-2 rounded-lg ${d.severity === '重大' ? 'bg-red-50' : d.severity === '中程度' ? 'bg-amber-50' : 'bg-stone-50'}`}>
              <span className="font-medium">{d.type}</span>
              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${d.severity === '重大' ? 'bg-red-200 text-red-800' : d.severity === '中程度' ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-stone-500'}`}>
                {d.severity}
              </span>
              <div className="text-stone-500 mt-0.5">{d.description}</div>
            </div>
          ))}
          <div className="text-stone-500">{result.overall}</div>
        </div>
      )}
    </div>
  );
}

// --- B. リスク判定アラート ---
export function RiskAlert({ conditions }: { conditions: Record<string, number | null> }) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    const res = await fetch('/api/ai/risk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conditions }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  const riskColors = { low: 'bg-emerald-50 border-green-200 text-green-700', medium: 'bg-amber-50 border-amber-200 text-amber-700', high: 'bg-red-50 border-red-200 text-red-700' };

  return (
    <div>
      <button onClick={check} disabled={loading}
        className="w-full py-2.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-xl text-sm touch-manipulation disabled:opacity-50 min-h-[44px]">
        {loading ? '判定中...' : '🤖 AIリスク判定'}
      </button>
      {result && !result.error && (
        <div className={`mt-2 p-3 rounded-xl border text-xs ${riskColors[result.risk_level as keyof typeof riskColors] || ''}`}>
          <div className="font-medium text-sm mb-1">
            リスク: {result.risk_level === 'low' ? '低 ✓' : result.risk_level === 'medium' ? '中 ⚠' : '高 ⚠⚠'}
          </div>
          {result.warnings?.map((w: string, i: number) => (
            <div key={i} className="mb-1">⚠ {w}</div>
          ))}
          {result.recommendations?.map((r: string, i: number) => (
            <div key={i} className="text-stone-500">💡 {r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- C. 最適設定レコメンド ---
export function AiRecommend({ paintType, conditions, onApply }: {
  paintType: string;
  conditions: Record<string, number | null>;
  onApply: (settings: Record<string, number>) => void;
}) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function recommend() {
    setLoading(true);
    const res = await fetch('/api/ai/recommend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paintType, conditions }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  function applyAll() {
    if (!result?.recommended) return;
    const settings: Record<string, number> = {};
    Object.entries(result.recommended).forEach(([k, v]: [string, any]) => {
      settings[k] = v.value;
    });
    onApply(settings);
  }

  return (
    <div>
      <button onClick={recommend} disabled={loading || !paintType}
        className="w-full py-2.5 bg-emerald-50 text-emerald-700 border border-teal-200 rounded-xl text-sm touch-manipulation disabled:opacity-50 min-h-[44px]">
        {loading ? '分析中...' : '🤖 AI最適設定'}
      </button>
      {result && !result.error && result.recommended && (
        <div className="mt-2 p-3 bg-white border border-teal-200 rounded-xl text-xs space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm text-emerald-700">推奨設定</span>
            <span className="text-[10px] text-stone-400">信頼度: {result.confidence}</span>
          </div>
          {Object.entries(result.recommended).map(([key, val]: [string, any]) => (
            <div key={key} className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-stone-500">{key}</span>
              <span><span className="font-medium">{val.value}</span> <span className="text-stone-400">({val.range})</span></span>
            </div>
          ))}
          <div className="text-stone-500 mt-1">{result.explanation}</div>
          <button onClick={applyAll}
            className="w-full mt-2 py-2 bg-teal-600 text-white rounded-lg text-xs touch-manipulation active:bg-teal-700 min-h-[36px]">
            この設定を適用
          </button>
        </div>
      )}
    </div>
  );
}

// --- D. 自然言語検索 ---
export function AiChat() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    const res = await fetch('/api/ai/query', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="text-xs text-stone-500 font-medium mb-2">🤖 AIにデータを聞く</div>
      <div className="flex gap-2">
        <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="例: 先月クリアコートで不具合があった回は？"
          className="flex-1 h-[44px] px-3 rounded-xl border border-stone-200 text-sm touch-manipulation" />
        <button onClick={ask} disabled={loading}
          className="px-4 h-[44px] bg-orange-700 text-white rounded-xl text-sm touch-manipulation disabled:opacity-50">
          {loading ? '...' : '聞く'}
        </button>
      </div>
      {result && !result.error && (
        <div className="mt-3 text-xs space-y-2">
          <div className="text-stone-500">{result.query_description}</div>
          {result.answer && <div className="font-medium text-sm">{result.answer}</div>}
          <div className="text-stone-400">{result.count}件のデータが見つかりました</div>
          {result.results?.slice(0, 5).map((r: any) => (
            <div key={r.id} className="p-2 bg-stone-50 rounded-lg">
              <span className="font-medium">{r.paint_type || '種類未設定'}</span>
              <span className="text-stone-400 ml-2">{new Date(r.painted_at).toLocaleDateString('ja-JP')}</span>
              {Object.keys(r.defects || {}).length > 0 && <span className="ml-2 text-red-600">{Object.entries(r.defects || {}).map(([k,v]) => `${k}×${v}`).join(', ')}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- E. 動画分析 ---
export function VideoAnalysis({ frameUrls }: { frameUrls: string[] }) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    const res = await fetch('/api/ai/video', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameUrls }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div className="mt-2">
      <button onClick={analyze} disabled={loading}
        className="text-xs px-3 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg touch-manipulation disabled:opacity-50">
        {loading ? 'AI分析中...' : '🤖 AI噴霧技術分析'}
      </button>
      {result && !result.error && (
        <div className="mt-2 p-3 bg-white border border-stone-200 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">技術スコア</span>
            <span className="text-lg font-medium">{result.technique_score}/100</span>
          </div>
          {result.observations?.map((o: any, i: number) => (
            <div key={i} className="flex justify-between items-start py-1 border-b border-gray-50">
              <span className="text-stone-500">{o.aspect}</span>
              <div className="text-right">
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${o.rating === '良好' ? 'bg-emerald-50 text-green-700' : o.rating === '要改善' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  {o.rating}
                </span>
                <div className="text-stone-400 mt-0.5">{o.detail}</div>
              </div>
            </div>
          ))}
          {result.improvements?.map((imp: string, i: number) => (
            <div key={i} className="text-stone-500">💡 {imp}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- F. 月次レポート ---
export function MonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch('/api/ai/report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="text-xs text-stone-500 font-medium mb-2">🤖 月次品質レポート</div>
      <div className="flex gap-2 mb-3">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="h-[44px] px-3 rounded-xl border border-stone-200 text-sm touch-manipulation">
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
          className="h-[44px] px-3 rounded-xl border border-stone-200 text-sm touch-manipulation">
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
        </select>
        <button onClick={generate} disabled={loading}
          className="flex-1 h-[44px] bg-orange-700 text-white rounded-xl text-sm touch-manipulation disabled:opacity-50">
          {loading ? '生成中...' : '生成'}
        </button>
      </div>
      {result && !result.error && (
        <div className="text-xs space-y-3">
          <div className="text-sm font-medium">{result.summary}</div>
          {result.stats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-stone-50 rounded-lg p-2 text-center">
                <div className="text-lg font-medium">{result.stats.total}</div>
                <div className="text-stone-400">総記録数</div>
              </div>
              <div className="bg-stone-50 rounded-lg p-2 text-center">
                <div className="text-lg font-medium text-emerald-700">{Math.round(result.stats.defect_free_rate)}%</div>
                <div className="text-stone-400">不具合なし</div>
              </div>
              <div className="bg-stone-50 rounded-lg p-2 text-center">
                <div className="text-lg font-medium">{Math.round(result.stats.avg_thickness)}μm</div>
                <div className="text-stone-400">平均膜厚</div>
              </div>
            </div>
          )}
          {result.trends?.map((t: string, i: number) => <div key={i} className="text-stone-500">📈 {t}</div>)}
          {result.top_issues?.map((t: string, i: number) => <div key={i} className="text-red-600">⚠ {t}</div>)}
          {result.recommendations?.map((r: string, i: number) => <div key={i} className="text-emerald-700">💡 {r}</div>)}
        </div>
      )}
    </div>
  );
}
