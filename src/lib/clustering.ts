/**
 * 成功パターン発見エンジン
 * K-meansクラスタリングで塗装成功条件のまとまりを自動検出
 */

// 分析に使う特徴量
export const FEATURES = [
  { key: 'ambient_temp', label: '気温', unit: '℃' },
  { key: 'ambient_humidity', label: '湿度', unit: '%' },
  { key: 'air_pressure', label: 'エア圧', unit: 'MPa' },
  { key: 'viscosity_seconds', label: '粘度', unit: '秒' },
  { key: 'dilution_ratio', label: '希釈率', unit: '%' },
  { key: 'gun_distance', label: 'ガン距離', unit: 'cm' },
  { key: 'film_thickness', label: '膜厚', unit: 'μm' },
] as const;

type FeatureKey = typeof FEATURES[number]['key'];

interface DataPoint {
  values: number[];       // 正規化済み特徴ベクトル
  raw: number[];          // 元の値
  isSuccess: boolean;
  logId: string;
}

export interface Cluster {
  id: number;
  size: number;
  successRate: number;
  avgYield: number;           // クラスタ内の平均歩留まり（%）
  centroid: number[];
  rawCentroid: number[];
  ranges: { key: string; label: string; unit: string; min: number; max: number; avg: number }[];
  description: string;
}

export interface PatternResult {
  clusters: Cluster[];
  totalHighYield: number;
  totalLowYield: number;
  yieldThreshold: number;
  overallAvgYield: number;       // 全体平均歩留まり
  highYieldAvg: number;          // 高歩留まり群の平均歩留まり
  lowYieldAvg: number;           // 低歩留まり群の平均歩留まり
  featureImportance: { key: string; label: string; score: number }[];
  successVsFailure: { key: string; label: string; unit: string; successAvg: number; failureAvg: number; diff: number }[];
}

// --- 正規化 ---
function normalize(data: number[][], mins: number[], maxes: number[]): number[][] {
  return data.map(row => row.map((v, i) => {
    const range = maxes[i] - mins[i];
    return range === 0 ? 0 : (v - mins[i]) / range;
  }));
}

// --- ユークリッド距離 ---
function distance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

// --- K-means++ 初期化 ---
function initCentroids(data: number[][], k: number): number[][] {
  const centroids: number[][] = [];
  // 最初のセントロイドをランダム選択
  centroids.push(data[Math.floor(Math.random() * data.length)].slice());

  for (let c = 1; c < k; c++) {
    // 各点の最近セントロイドまでの距離の2乗を計算
    const dists = data.map(p => Math.min(...centroids.map(cent => distance(p, cent) ** 2)));
    const total = dists.reduce((a, b) => a + b, 0);
    // 距離の2乗に比例した確率で次のセントロイドを選択
    let r = Math.random() * total;
    for (let i = 0; i < data.length; i++) {
      r -= dists[i];
      if (r <= 0) { centroids.push(data[i].slice()); break; }
    }
    if (centroids.length <= c) centroids.push(data[Math.floor(Math.random() * data.length)].slice());
  }
  return centroids;
}

// --- K-means クラスタリング ---
function kmeans(data: number[][], k: number, maxIter: number = 50): { assignments: number[]; centroids: number[][] } {
  if (data.length < k) k = data.length;
  let centroids = initCentroids(data, k);
  let assignments = new Array(data.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign
    const newAssignments = data.map(p => {
      let minDist = Infinity, closest = 0;
      centroids.forEach((c, i) => {
        const d = distance(p, c);
        if (d < minDist) { minDist = d; closest = i; }
      });
      return closest;
    });

    // Check convergence
    if (newAssignments.every((a, i) => a === assignments[i])) break;
    assignments = newAssignments;

    // Update centroids
    centroids = centroids.map((_, ci) => {
      const members = data.filter((_, di) => assignments[di] === ci);
      if (members.length === 0) return centroids[ci]; // keep old if empty
      const dim = data[0].length;
      return Array.from({ length: dim }, (__, fi) =>
        members.reduce((sum, m) => sum + m[fi], 0) / members.length
      );
    });
  }

  return { assignments, centroids };
}

// --- 最適K自動選択（エルボー法簡易版）---
function findOptimalK(data: number[][], maxK: number = 5): number {
  if (data.length <= 3) return 1;
  const inertias: number[] = [];
  for (let k = 1; k <= Math.min(maxK, data.length); k++) {
    const { assignments, centroids } = kmeans(data, k);
    const inertia = data.reduce((sum, p, i) => sum + distance(p, centroids[assignments[i]]) ** 2, 0);
    inertias.push(inertia);
  }
  // エルボーポイント: 改善率が最も落ちる点
  let bestK = 1;
  let maxDrop = 0;
  for (let i = 1; i < inertias.length; i++) {
    const prev = i > 0 ? (inertias[i - 1] - inertias[i]) / (inertias[0] || 1) : 0;
    const next = i < inertias.length - 1 ? (inertias[i] - inertias[i + 1]) / (inertias[0] || 1) : 0;
    const drop = prev - next;
    if (drop > maxDrop) { maxDrop = drop; bestK = i + 1; }
  }
  return Math.max(2, Math.min(bestK, 4)); // 2-4クラスタに制限
}

// --- 特徴量重要度（成功/失敗間の分離度）---
function featureImportance(successData: number[][], failureData: number[][]): number[] {
  if (failureData.length === 0 || successData.length === 0) return FEATURES.map(() => 0);
  const dim = FEATURES.length;
  return Array.from({ length: dim }, (_, fi) => {
    const sMean = successData.reduce((s, r) => s + r[fi], 0) / successData.length;
    const fMean = failureData.reduce((s, r) => s + r[fi], 0) / failureData.length;
    const sVar = successData.reduce((s, r) => s + (r[fi] - sMean) ** 2, 0) / successData.length;
    const fVar = failureData.reduce((s, r) => s + (r[fi] - fMean) ** 2, 0) / failureData.length;
    // フィッシャーの判別比
    const pooledVar = sVar + fVar;
    return pooledVar === 0 ? 0 : (sMean - fMean) ** 2 / pooledVar;
  });
}

// --- メイン分析関数 ---
export function analyzePatterns(logs: Array<Record<string, unknown>>): PatternResult | null {
  // 有効なレコードを抽出（全特徴量が非null）
  const validLogs = logs.filter(log =>
    FEATURES.every(f => log[f.key] !== null && log[f.key] !== undefined)
  );

  if (validLogs.length < 5) return null;

  // 特徴ベクトルに変換
  const rawData = validLogs.map(log => FEATURES.map(f => Number(log[f.key])));
  const yieldRates = validLogs.map(log => {
    const bs = Number(log.batch_size) || 20;
    const dc = Number(log.defect_count) || 0;
    return bs > 0 ? ((bs - dc) / bs) * 100 : 100;
  });
  // 動的閾値: 上位25%（第3四分位数）を「高歩留まり」とする
  const sortedYields = [...yieldRates].sort((a, b) => a - b);
  const q3Index = Math.floor(sortedYields.length * 0.75);
  const yieldThreshold = sortedYields[q3Index] ?? 50;
  const isHighYield = yieldRates.map(yr => yr >= yieldThreshold);
  const logIds = validLogs.map(log => String(log.id || ''));

  // 正規化
  const dim = FEATURES.length;
  const mins = Array.from({ length: dim }, (_, i) => Math.min(...rawData.map(r => r[i])));
  const maxes = Array.from({ length: dim }, (_, i) => Math.max(...rawData.map(r => r[i])));
  const normalized = normalize(rawData, mins, maxes);

  // 高歩留まりデータでクラスタリング
  const successIdx = isHighYield.map((s, i) => s ? i : -1).filter(i => i >= 0);
  const failureIdx = isHighYield.map((s, i) => !s ? i : -1).filter(i => i >= 0);

  if (successIdx.length < 3) return null;

  const successNorm = successIdx.map(i => normalized[i]);
  const successRaw = successIdx.map(i => rawData[i]);
  const failureNorm = failureIdx.map(i => normalized[i]);
  const failureRaw = failureIdx.map(i => rawData[i]);

  // 最適K決定 + クラスタリング
  const k = findOptimalK(successNorm);
  const { assignments, centroids } = kmeans(successNorm, k);

  // 各クラスタの情報を構築
  // 全レコード（高歩留+低歩留の両方）を最近傍クラスタに割り当て、実際の歩留まりを計算
  const allAssignments = normalized.map(p => {
    let minDist = Infinity, closest = 0;
    centroids.forEach((c, i) => { const d = distance(p, c); if (d < minDist) { minDist = d; closest = i; } });
    return closest;
  });

  const clusters: Cluster[] = centroids.map((centroid, ci) => {
    // 高歩留まりメンバー（クラスタリング元）
    const highYieldMemberIdx = assignments.map((a, i) => a === ci ? i : -1).filter(i => i >= 0);
    const highYieldMembers = highYieldMemberIdx.map(i => successRaw[i]);

    // 全レコードでこのクラスタに割り当てられたもの
    const allMemberIdx = allAssignments.map((a, i) => a === ci ? i : -1).filter(i => i >= 0);
    const allMemberYields = allMemberIdx.map(i => yieldRates[i]);
    const avgYield = allMemberYields.length > 0
      ? Math.round((allMemberYields.reduce((a, b) => a + b, 0) / allMemberYields.length) * 10) / 10
      : 0;

    // 元スケールのセントロイド（高歩留まりメンバーの平均）
    const rawCentroid = FEATURES.map((_, fi) =>
      highYieldMembers.length > 0 ? highYieldMembers.reduce((s, m) => s + m[fi], 0) / highYieldMembers.length : 0
    );

    // 各特徴のレンジ（高歩留まりメンバーのみ）
    const ranges = FEATURES.map((f, fi) => ({
      key: f.key, label: f.label, unit: f.unit,
      min: highYieldMembers.length > 0 ? Math.min(...highYieldMembers.map(m => m[fi])) : 0,
      max: highYieldMembers.length > 0 ? Math.max(...highYieldMembers.map(m => m[fi])) : 0,
      avg: rawCentroid[fi],
    }));

    // このクラスタ領域での高歩留まり率
    const highYieldInCluster = allMemberIdx.filter(i => isHighYield[i]).length;
    const successRate = allMemberIdx.length > 0 ? Math.round((highYieldInCluster / allMemberIdx.length) * 100) : 0;

    const desc = generateDescription(ranges, avgYield);

    return { id: ci + 1, size: highYieldMembers.length, successRate, avgYield, centroid, rawCentroid, ranges, description: desc };
  }).filter(c => c.size > 0).sort((a, b) => b.avgYield - a.avgYield);

  // 特徴量重要度
  const importance = featureImportance(successNorm, failureNorm);
  const maxImp = Math.max(...importance, 0.001);
  const featureImp = FEATURES.map((f, i) => ({
    key: f.key, label: f.label, score: Math.round((importance[i] / maxImp) * 100),
  })).sort((a, b) => b.score - a.score);

  // 成功 vs 失敗 比較
  const successVsFailure = FEATURES.map((f, fi) => {
    const sAvg = successRaw.length > 0 ? successRaw.reduce((s, r) => s + r[fi], 0) / successRaw.length : 0;
    const fAvg = failureRaw.length > 0 ? failureRaw.reduce((s, r) => s + r[fi], 0) / failureRaw.length : 0;
    return { key: f.key, label: f.label, unit: f.unit, successAvg: Math.round(sAvg * 100) / 100, failureAvg: Math.round(fAvg * 100) / 100, diff: Math.round((sAvg - fAvg) * 100) / 100 };
  });

  // 歩留まり統計
  const overallAvgYield = Math.round((yieldRates.reduce((a, b) => a + b, 0) / yieldRates.length) * 10) / 10;
  const highYieldRates = successIdx.map(i => yieldRates[i]);
  const lowYieldRates = failureIdx.map(i => yieldRates[i]);
  const highYieldAvg = highYieldRates.length > 0 ? Math.round((highYieldRates.reduce((a, b) => a + b, 0) / highYieldRates.length) * 10) / 10 : 0;
  const lowYieldAvg = lowYieldRates.length > 0 ? Math.round((lowYieldRates.reduce((a, b) => a + b, 0) / lowYieldRates.length) * 10) / 10 : 0;

  return {
    clusters,
    totalHighYield: successIdx.length,
    totalLowYield: failureIdx.length,
    yieldThreshold: Math.round(yieldThreshold),
    overallAvgYield,
    highYieldAvg,
    lowYieldAvg,
    featureImportance: featureImp,
    successVsFailure,
  };
}

function generateDescription(ranges: Cluster['ranges'], avgYield: number): string {
  const temp = ranges.find(r => r.key === 'ambient_temp');
  const hum = ranges.find(r => r.key === 'ambient_humidity');
  const press = ranges.find(r => r.key === 'air_pressure');
  const parts: string[] = [];
  if (temp) parts.push(`気温${Math.round(temp.min)}〜${Math.round(temp.max)}℃`);
  if (hum) parts.push(`湿度${Math.round(hum.min)}〜${Math.round(hum.max)}%`);
  if (press) parts.push(`エア圧${press.min.toFixed(2)}〜${press.max.toFixed(2)}MPa`);
  return `${parts.join('、')}（平均歩留${avgYield}%）`;
}
