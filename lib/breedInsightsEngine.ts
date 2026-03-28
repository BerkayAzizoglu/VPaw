/**
 * Local breed insights engine — zero API cost.
 *
 * Cross-references the pet's existing health records (timeline, weight, vaccines)
 * against the breed's known risk profile and generates a short contextual observation.
 */

import type { BreedHealthEntry } from './breedHealthData';
import type { HealthHubTimelineItem, HealthHubSummary } from '../screens/HealthHubScreen';

export type BreedInsightResult = {
  /** 2–3 sentence observation in the requested locale */
  text: string;
  /** Risk labels (in requested locale) that matched something in the pet's records */
  matchedRisks: string[];
  weightStatus: 'over' | 'at_limit' | 'on_track' | 'unknown';
};

// ─── Risk keyword map ──────────────────────────────────────────────────────────
// Maps fragments of a breed's risk label to terms that may appear in diagnosis/vet titles.
// We use bi-directional matching: risk label → search terms in records.
const RISK_KEYWORD_MAP: [riskFragment: string, searchTerms: string[]][] = [
  ['hcm', ['hcm', 'kardiyomiyopati', 'cardiomyopathy', 'kalp', 'heart']],
  ['pkd', ['pkd', 'böbrek kist', 'kidney cyst', 'polycystic', 'polikistik']],
  ['obes', ['obez', 'obesity', 'overweight', 'şişman', 'kilo fazlası']],
  ['dysplasi', ['displazi', 'dysplasia', 'kalça', 'hip', 'dirsek', 'elbow']],
  ['ivdd', ['ivdd', 'omurga', 'disk', 'intervertebral', 'spine']],
  ['retinal', ['retina', 'pra', 'göz', 'eye', 'görme']],
  ['allergi', ['alerjik', 'allerji', 'allergy', 'alerji', 'cilt reaksiyon', 'kaşıntı']],
  ['allergy', ['allerji', 'allergy', 'alerji', 'kaşıntı', 'cilt']],
  ['epilepsy', ['epilepsi', 'nöbet', 'seizure', 'kriz']],
  ['epilepsi', ['epilepsi', 'nöbet', 'seizure', 'kriz']],
  ['urinary', ['idrar', 'mesane', 'urinary', 'bladder', 'renal']],
  ['diabet', ['diyabet', 'diabet', 'diabetes', 'şeker', 'insülin']],
  ['dental', ['diş', 'dental', 'tartar', 'periodont', 'diş taşı']],
  ['thyroid', ['tiroid', 'thyroid', 'hipotiroid', 'hypothyroid']],
  ['pancreat', ['pankreas', 'pankreatit', 'pancreat']],
  ['lymphoma', ['lenfoma', 'lymphoma', 'lenfosit']],
  ['cancer', ['kanser', 'cancer', 'tümör', 'tumor', 'neoplazi']],
  ['bloat', ['şişkinlik', 'bloat', 'gaz', 'mide bükülmesi', 'gdv']],
  ['boas', ['boas', 'solunum', 'breathing', 'nefes', 'airway']],
  ['skin fold', ['deri kıvrımı', 'skin fold', 'kıvrım enfeksiyon']],
  ['enfeksiyon', ['enfeksiyon', 'infection', 'infeksiyon']],
  ['infection', ['enfeksiyon', 'infection', 'iltihap']],
  ['parasite', ['parazit', 'parasite', 'parazit', 'kene', 'pire', 'bağırsak kurdu']],
  ['fiv', ['fiv', 'feline immunodeficiency', 'kedi aids']],
  ['felv', ['felv', 'feline leukemia', 'kedi lösemi']],
  ['wobbler', ['wobbler', 'boyun omurga', 'cervical']],
  ['cardiomyopati', ['kardiyomiyopati', 'cardiomyopathy', 'kalp kası']],
  ['mitral', ['mitral', 'mvd', 'kalp kapak']],
];

function findSearchTermsForRisk(riskLabel: string): string[] {
  const lower = riskLabel.toLowerCase();
  const matched: string[] = [];
  for (const [fragment, terms] of RISK_KEYWORD_MAP) {
    if (lower.includes(fragment)) {
      matched.push(...terms);
    }
  }
  // Fallback: first two words of the risk label itself
  if (matched.length === 0) {
    matched.push(...lower.split(' ').slice(0, 2));
  }
  return [...new Set(matched)];
}

function timelineContainsAny(
  items: HealthHubTimelineItem[],
  terms: string[],
): HealthHubTimelineItem | undefined {
  return items.find((item) =>
    terms.some((term) => item.title.toLowerCase().includes(term.toLowerCase())),
  );
}

function parseWeightKg(weightStr: string): number | null {
  const n = parseFloat(weightStr.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// ─── Main export ───────────────────────────────────────────────────────────────
export function generateBreedInsight({
  entry,
  timeline,
  summary,
  weightGoal,
  locale,
}: {
  entry: BreedHealthEntry;
  timeline: HealthHubTimelineItem[];
  summary: HealthHubSummary;
  weightGoal?: number;
  locale: 'en' | 'tr';
}): BreedInsightResult {
  const isTr = locale === 'tr';
  const sentences: string[] = [];
  const matchedRisks: string[] = [];

  // ── 1. Weight analysis ───────────────────────────────────────────────────────
  const latestWeightKg = parseWeightKg(summary.latestWeight);
  const [wMin, wMax] = entry.weightRangeKg;
  const hasObesityRisk = entry.healthRisks.some(
    (r) => r.label.toLowerCase().includes('obes') || r.label_tr.toLowerCase().includes('obezite'),
  );

  let weightStatus: BreedInsightResult['weightStatus'] = 'unknown';

  if (latestWeightKg != null) {
    if (latestWeightKg > wMax) {
      weightStatus = 'over';
    } else if (latestWeightKg >= wMax * 0.93) {
      weightStatus = 'at_limit';
    } else {
      weightStatus = 'on_track';
    }
  }

  if (weightStatus === 'over') {
    if (hasObesityRisk) {
      sentences.push(
        isTr
          ? `${entry.breed}, obeziteye genetik yatkınlığı olan bir ırktır — mevcut kilo (${latestWeightKg!.toFixed(1)} kg), ırk için önerilen üst sınırın (${wMax} kg) üzerinde. Porsiyon kontrolü bu ırk için kritik önem taşır.`
          : `${entry.breed} has a genetic predisposition to obesity — the current weight (${latestWeightKg!.toFixed(1)} kg) exceeds the recommended upper limit (${wMax} kg) for this breed. Strict portion control is essential.`,
      );
    } else {
      sentences.push(
        isTr
          ? `Mevcut kilo (${latestWeightKg!.toFixed(1)} kg), bu ırk için önerilen aralığın (${wMin}–${wMax} kg) üzerinde. Beslenme planını veterinerinizle gözden geçirmenizi öneririz.`
          : `Current weight (${latestWeightKg!.toFixed(1)} kg) is above the recommended range (${wMin}–${wMax} kg) for this breed. Consider reviewing the diet plan with your vet.`,
      );
    }
  } else if (weightStatus === 'at_limit' && hasObesityRisk) {
    sentences.push(
      isTr
        ? `Kilo (${latestWeightKg!.toFixed(1)} kg) bu ırk için önerilen üst sınıra (${wMax} kg) yaklaşıyor. ${entry.breed} obeziteye eğilimli olduğu için porsiyon takibi önemli.`
        : `Weight (${latestWeightKg!.toFixed(1)} kg) is approaching the upper limit (${wMax} kg) for this breed. As ${entry.breed} is prone to obesity, portion monitoring matters.`,
    );
  }

  // ── 2. Cross-reference records against breed risks ───────────────────────────
  const relevantItems = timeline.filter(
    (t) => t.type === 'record' || t.type === 'vet',
  );

  for (const risk of entry.healthRisks) {
    const searchTerms = findSearchTermsForRisk(risk.label);
    const found = timelineContainsAny(relevantItems, searchTerms);
    if (found) {
      matchedRisks.push(isTr ? risk.label_tr : risk.label);
    }
  }

  if (matchedRisks.length > 0) {
    const joinedRisks = matchedRisks.slice(0, 2).join(isTr ? ' ve ' : ' and ');
    sentences.push(
      isTr
        ? `Sağlık kayıtlarınızda ${joinedRisks} ile ilişkili bir giriş bulunuyor — bu, ${entry.breed} ırkı için bilinen bir risk faktörüdür. Veterinerinizle düzenli takibi sürdürmenizi öneririz.`
        : `Your health records contain an entry related to ${joinedRisks} — a known risk factor for ${entry.breed}. We recommend continued monitoring with your vet.`,
    );
  }

  // ── 3. Vaccine status context ────────────────────────────────────────────────
  const vaccineItems = timeline.filter((t) => t.type === 'vaccine');
  const isStreetAnimal =
    entry.isGenericFallback ||
    entry.matchKeywords?.some((k) => ['sokak', 'stray', 'mixed', 'melez'].includes(k));

  if (isStreetAnimal && vaccineItems.length === 0) {
    sentences.push(
      isTr
        ? 'Aşı kaydı bulunmuyor — özellikle karma ırk hayvanlar için tam aşı serisi kritik önem taşır.'
        : 'No vaccine records found — a full vaccination series is especially critical for mixed-breed animals.',
    );
  }

  // ── 4. Generic fallback sentence ─────────────────────────────────────────────
  if (sentences.length === 0) {
    const topRisk = entry.healthRisks[0];
    const riskName = isTr ? (topRisk?.label_tr ?? '') : (topRisk?.label ?? '');
    sentences.push(
      isTr
        ? `${entry.breed} ırkı için en önemli izleme alanı ${riskName}'dir. Mevcut kayıtlarda öne çıkan bir risk sinyali görünmüyor — önleyici bakıma devam edin.`
        : `The primary monitoring priority for ${entry.breed} is ${riskName}. No significant risk signals stand out in current records — keep up the preventive care routine.`,
    );
  }

  // Add a forward-looking close sentence when weight is fine and no matched risks
  if (sentences.length === 1 && matchedRisks.length === 0 && weightStatus !== 'over') {
    sentences.push(
      isTr
        ? 'Düzenli veteriner ziyaretleri ve ırka özel günlük bakım rutini uzun vadeli sağlığı destekler.'
        : 'Regular vet visits and a breed-specific daily care routine support long-term health.',
    );
  }

  return {
    text: sentences.join(' '),
    matchedRisks,
    weightStatus,
  };
}
