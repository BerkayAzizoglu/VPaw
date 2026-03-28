/**
 * Static breed health database — zero API cost, bundled with the app.
 * Covers ~50 dog breeds, ~30 cat breeds, and street/mixed animal profiles.
 *
 * Each entry includes:
 *  - healthRisks: genetic / predisposed conditions (2-4 items)
 *  - careTips:    breed-specific care notes (2-3 items)
 *  - weightRangeKg: [min, max] healthy weight range
 *  - lifespanYears: [min, max] average lifespan
 *
 * Street / mixed animals are matched via `matchKeywords`:
 *  - If the pet's breed field contains any keyword → that entry is returned.
 *  - Keyword matching is a substring check (case-insensitive).
 *  - Generic fallback entries (isGenericFallback: true) are tried last.
 */

export type DailyCareCategory = 'grooming' | 'exercise' | 'feeding' | 'environment' | 'health';

export type DailyCareItem = {
  label: string;
  label_tr: string;
  category: DailyCareCategory;
};

export type BreedHealthEntry = {
  /** Canonical breed name (must match petProfile.breed, case-insensitive) */
  breed: string;
  /** Alternative spellings / common aliases — checked with exact match */
  aliases?: string[];
  /**
   * Keyword fragments — if the pet's breed name CONTAINS any of these (substring),
   * this entry matches. Used for street/mixed animals described by coat pattern.
   */
  matchKeywords?: string[];
  /** True for catch-all entries — only used when no other entry matches */
  isGenericFallback?: boolean;
  petType: 'Dog' | 'Cat';
  healthRisks: { label: string; label_tr: string }[];
  /** Daily care schedule items: grooming, exercise, feeding, environment, health checks */
  dailyCare?: DailyCareItem[];
  careTips: { label: string; label_tr: string }[];
  weightRangeKg: [number, number];
  lifespanYears: [number, number];
};

// ─── DOG BREEDS ──────────────────────────────────────────────────────────────
const dogBreeds: BreedHealthEntry[] = [
  {
    breed: 'Labrador Retriever',
    aliases: ['Labrador', 'Lab'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Hip & elbow dysplasia', label_tr: 'Kalça & dirsek displazisi' },
      { label: 'Obesity tendency', label_tr: 'Obezite eğilimi' },
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
      { label: 'Exercise-induced collapse', label_tr: 'Egzersizle tetiklenen kollaps' },
    ],
    dailyCare: [
      { label: 'Brush weekly — moderate shedding', label_tr: 'Haftalık fırçalama — orta düzeyde tüy dökülmesi', category: 'grooming' },
      { label: '1–2h vigorous exercise/day — fetch, swimming', label_tr: 'Günde 1-2 saat yoğun egzersiz — topu getirme, yüzme', category: 'exercise' },
      { label: '2 meals/day — measured portions, no treats between meals', label_tr: 'Günde 2 öğün — ölçülü porsiyonlar, öğün arası atıştırmak yok', category: 'feeding' },
      { label: 'Needs outdoor space and mental stimulation', label_tr: 'Dış mekan alanı ve zihinsel uyarıma ihtiyaç duyar', category: 'environment' },
      { label: 'Annual hip screening + eye exam (PRA)', label_tr: 'Yıllık kalça taraması + göz muayenesi (PRA)', category: 'health' },
    ],
    careTips: [
      { label: 'Portion control is critical — Labs overeat easily', label_tr: 'Porsiyon kontrolü kritik — Lablar kolayca aşırı yer' },
      { label: 'Daily exercise 1–2h to prevent weight gain', label_tr: 'Kilo kontrolü için günlük 1-2 saat egzersiz' },
      { label: 'Regular ear cleaning to prevent infections', label_tr: 'Enfeksiyon önlemek için düzenli kulak temizliği' },
    ],
    weightRangeKg: [25, 36],
    lifespanYears: [10, 12],
  },
  {
    breed: 'Golden Retriever',
    petType: 'Dog',
    healthRisks: [
      { label: 'Cancer (high genetic risk)', label_tr: 'Kanser (yüksek genetik risk)' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Hypothyroidism', label_tr: 'Hipotiroidizm' },
      { label: 'Skin allergies', label_tr: 'Cilt alerjileri' },
    ],
    dailyCare: [
      { label: 'Brush 2–3× weekly, daily during seasonal shedding', label_tr: 'Haftada 2-3 kez fırçalama, mevsimsel döküm sırasında günlük', category: 'grooming' },
      { label: '1–2h outdoor activity/day — loves swimming', label_tr: 'Günde 1-2 saat dış mekan aktivitesi — yüzmeyi sever', category: 'exercise' },
      { label: '2 meals/day — monitor weight carefully', label_tr: 'Günde 2 öğün — kiloyu dikkatli izleyin', category: 'feeding' },
      { label: 'Avoid prolonged sun/heat — heavy coat', label_tr: 'Uzun süreli güneş/sıcaktan kaçının — yoğun tüy', category: 'environment' },
      { label: 'Cancer screening from age 6 — annual full bloodwork', label_tr: '6 yaşından itibaren kanser taraması — yıllık tam kan paneli', category: 'health' },
    ],
    careTips: [
      { label: 'Annual cancer screening recommended after age 6', label_tr: '6 yaş sonrası yıllık kanser taraması önerilir' },
      { label: 'Brush 2–3× per week to control shedding', label_tr: 'Tüy dökülmesi için haftada 2-3 kez tarayın' },
      { label: 'Avoid prolonged heat exposure', label_tr: 'Uzun süreli sıcağa maruziyetten kaçının' },
    ],
    weightRangeKg: [25, 34],
    lifespanYears: [10, 12],
  },
  {
    breed: 'German Shepherd',
    aliases: ['Alsatian'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Hip & elbow dysplasia', label_tr: 'Kalça & dirsek displazisi' },
      { label: 'Degenerative myelopathy', label_tr: 'Dejeneratif miyelopati' },
      { label: 'Bloat (GDV)', label_tr: 'Mide volvulusu (GDV)' },
      { label: 'Exocrine pancreatic insufficiency', label_tr: 'Ekzokrin pankreas yetmezliği' },
    ],
    careTips: [
      { label: 'Feed 2 smaller meals/day to reduce bloat risk', label_tr: 'Şişkinlik riskini azaltmak için günde 2 küçük öğün' },
      { label: 'Daily mental stimulation + exercise', label_tr: 'Günlük mental uyarım ve egzersiz' },
      { label: 'Regular joint supplements from age 5+', label_tr: '5 yaşından itibaren düzenli eklem takviyesi' },
    ],
    weightRangeKg: [22, 40],
    lifespanYears: [9, 13],
  },
  {
    breed: 'French Bulldog',
    aliases: ['Frenchie'],
    petType: 'Dog',
    healthRisks: [
      { label: 'BOAS — breathing difficulties', label_tr: 'BOAS — solunum güçlüğü' },
      { label: 'Spinal issues (IVDD)', label_tr: 'Omurga sorunları (IVDD)' },
      { label: 'Skin fold dermatitis', label_tr: 'Deri kıvrımı dermatiti' },
      { label: 'Eye conditions (cherry eye, entropion)', label_tr: 'Göz sorunları (kiraz göz, entropyon)' },
    ],
    dailyCare: [
      { label: 'Wipe skin folds daily — ears weekly', label_tr: 'Deri kıvrımlarını günlük sil — kulakları haftalık', category: 'grooming' },
      { label: '20–30 min low-impact walks — no heat, no intense running', label_tr: '20-30 dk düşük tempolu yürüyüş — sıcak yok, yoğun koşu yok', category: 'exercise' },
      { label: '2 meals/day — prone to weight gain', label_tr: 'Günde 2 öğün — kilo almaya eğilimli', category: 'feeding' },
      { label: 'Never leave in hot car — overheating risk is severe', label_tr: 'Asla sıcak arabada bırakmayın — aşırı ısınma riski ciddi', category: 'environment' },
      { label: 'Annual spinal check + breathing assessment', label_tr: 'Yıllık omurga kontrolü + solunum değerlendirmesi', category: 'health' },
    ],
    careTips: [
      { label: 'Avoid heat & humid weather — overheating risk', label_tr: 'Sıcak ve nemli havadan kaçının — aşırı ısınma riski' },
      { label: 'Clean skin folds daily to prevent infections', label_tr: 'Enfeksiyonu önlemek için deri kıvrımlarını günlük temizleyin' },
      { label: 'Low-impact exercise only — no intense running', label_tr: 'Yalnızca düşük yoğunluklu egzersiz — yoğun koşu yok' },
    ],
    weightRangeKg: [8, 14],
    lifespanYears: [10, 12],
  },
  {
    breed: 'Bulldog',
    aliases: ['English Bulldog', 'British Bulldog'],
    petType: 'Dog',
    healthRisks: [
      { label: 'BOAS — severe breathing issues', label_tr: 'BOAS — ciddi solunum sorunları' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Skin fold infections', label_tr: 'Deri kıvrımı enfeksiyonları' },
      { label: 'Cherry eye', label_tr: 'Kiraz göz' },
    ],
    careTips: [
      { label: 'Keep cool — very heat sensitive', label_tr: 'Serin tutun — ısıya çok duyarlı' },
      { label: 'Clean face wrinkles daily', label_tr: 'Yüz kırışıklıklarını günlük temizleyin' },
      { label: 'Dental care important — short muzzle causes crowding', label_tr: 'Diş bakımı önemli — kısa yüz dişleri sıkıştırır' },
    ],
    weightRangeKg: [18, 25],
    lifespanYears: [8, 10],
  },
  {
    breed: 'Poodle',
    aliases: ['Standard Poodle', 'Toy Poodle', 'Miniature Poodle'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
      { label: 'Epilepsy', label_tr: 'Epilepsi' },
      { label: 'Addison\'s disease', label_tr: 'Addison hastalığı' },
      { label: 'Bloat (standard size)', label_tr: 'Şişkinlik (standart boy)' },
    ],
    careTips: [
      { label: 'Professional grooming every 6–8 weeks', label_tr: 'Her 6-8 haftada profesyonel grooming' },
      { label: 'High mental stimulation needs', label_tr: 'Yüksek mental uyarım gereksinimi' },
      { label: 'Ear cleaning weekly — prone to infections', label_tr: 'Haftalık kulak temizliği — enfeksiyona eğilimli' },
    ],
    weightRangeKg: [2, 32],
    lifespanYears: [12, 15],
  },
  {
    breed: 'Beagle',
    petType: 'Dog',
    healthRisks: [
      { label: 'Epilepsy', label_tr: 'Epilepsi' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Hypothyroidism', label_tr: 'Hipotiroidizm' },
      { label: 'Obesity', label_tr: 'Obezite' },
    ],
    careTips: [
      { label: 'Strong nose — secure fencing essential', label_tr: 'Güçlü burun — güvenli çitle kapama zorunlu' },
      { label: 'Portion control — obesity prone', label_tr: 'Porsiyon kontrolü — obeziteye eğilimli' },
      { label: 'Regular ear checks for infections', label_tr: 'Enfeksiyon için düzenli kulak kontrolü' },
    ],
    weightRangeKg: [9, 14],
    lifespanYears: [12, 15],
  },
  {
    breed: 'Rottweiler',
    petType: 'Dog',
    healthRisks: [
      { label: 'Hip & elbow dysplasia', label_tr: 'Kalça & dirsek displazisi' },
      { label: 'Osteosarcoma (bone cancer)', label_tr: 'Osteosarkom (kemik kanseri)' },
      { label: 'Heart disease (SAS)', label_tr: 'Kalp hastalığı (SAS)' },
      { label: 'Bloat (GDV)', label_tr: 'Mide volvulusu (GDV)' },
    ],
    careTips: [
      { label: 'Hip screening at 2 years recommended', label_tr: '2 yaşında kalça taraması önerilir' },
      { label: 'Avoid over-exercising before age 2 (growth plates)', label_tr: '2 yaşından önce aşırı egzersizden kaçının (büyüme plakaları)' },
      { label: 'Heart checkup annually', label_tr: 'Yıllık kalp kontrolü' },
    ],
    weightRangeKg: [35, 60],
    lifespanYears: [9, 10],
  },
  {
    breed: 'Yorkshire Terrier',
    aliases: ['Yorkie'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Tracheal collapse', label_tr: 'Trakea kollapsı' },
      { label: 'Patellar luxation', label_tr: 'Patella luksasyonu' },
      { label: 'Dental disease (overcrowding)', label_tr: 'Diş hastalığı (aşırı kalabalık)' },
      { label: 'Hypoglycemia (low blood sugar)', label_tr: 'Hipoglisemi (düşük kan şekeri)' },
    ],
    careTips: [
      { label: 'Use harness instead of collar to protect trachea', label_tr: 'Trakeayı korumak için tasma yerine koşum kullanın' },
      { label: 'Daily dental brushing', label_tr: 'Günlük diş fırçalama' },
      { label: 'Regular meals to avoid hypoglycemia', label_tr: 'Hipoglisemiyi önlemek için düzenli öğünler' },
    ],
    weightRangeKg: [2, 3.5],
    lifespanYears: [13, 16],
  },
  {
    breed: 'Dachshund',
    aliases: ['Sausage Dog', 'Wiener Dog'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Intervertebral disc disease (IVDD)', label_tr: 'Intervertebral disk hastalığı (IVDD)' },
      { label: 'Obesity — worsens back problems', label_tr: 'Obezite — sırt sorunlarını kötüleştirir' },
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
    ],
    careTips: [
      { label: 'No stairs or jumping — protects spine', label_tr: 'Merdiven ve zıplama yok — omurgayı korur' },
      { label: 'Strict weight control essential', label_tr: 'Sıkı kilo kontrolü şart' },
      { label: 'Ramps instead of stairs/furniture', label_tr: 'Merdiven/mobilya yerine rampa kullanın' },
    ],
    weightRangeKg: [7, 15],
    lifespanYears: [12, 16],
  },
  {
    breed: 'Boxer',
    petType: 'Dog',
    healthRisks: [
      { label: 'Cancer (high incidence)', label_tr: 'Kanser (yüksek insidans)' },
      { label: 'Heart conditions (AS, DCM)', label_tr: 'Kalp sorunları (AS, DCM)' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'BOAS — breathing issues', label_tr: 'BOAS — solunum sorunları' },
    ],
    careTips: [
      { label: 'Annual cardiac screening', label_tr: 'Yıllık kardiyak tarama' },
      { label: 'Avoid extreme heat — poor heat tolerance', label_tr: 'Aşırı sıcaktan kaçının — düşük sıcak toleransı' },
      { label: 'Cancer screening from age 7+', label_tr: '7 yaşından itibaren kanser taraması' },
    ],
    weightRangeKg: [25, 32],
    lifespanYears: [9, 12],
  },
  {
    breed: 'Siberian Husky',
    aliases: ['Husky'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Autoimmune skin conditions', label_tr: 'Otoimmün cilt sorunları' },
      { label: 'Cataracts', label_tr: 'Katarakt' },
    ],
    careTips: [
      { label: 'High exercise requirement — 2+ hours/day', label_tr: 'Yüksek egzersiz ihtiyacı — günde 2+ saat' },
      { label: 'Prone to escape — secure yard essential', label_tr: 'Kaçmaya eğilimli — güvenli bahçe şart' },
      { label: 'Heavy seasonal shedding — brush daily in season', label_tr: 'Ağır mevsimsel tüy dökülmesi — mevsimde günlük tarayın' },
    ],
    weightRangeKg: [16, 27],
    lifespanYears: [12, 14],
  },
  {
    breed: 'Chihuahua',
    petType: 'Dog',
    healthRisks: [
      { label: 'Patellar luxation', label_tr: 'Patella luksasyonu' },
      { label: 'Tracheal collapse', label_tr: 'Trakea kollapsı' },
      { label: 'Dental overcrowding', label_tr: 'Diş aşırı kalabalığı' },
      { label: 'Hypoglycemia', label_tr: 'Hipoglisemi' },
    ],
    careTips: [
      { label: 'Harness only — no neck collar', label_tr: 'Sadece koşum — boyun tasması yok' },
      { label: 'Dental care critical — tiny mouths overcrowd', label_tr: 'Diş bakımı kritik — küçük ağızlar dişleri sıkıştırır' },
      { label: 'Protect from cold — low body fat', label_tr: 'Soğuktan koruyun — düşük vücut yağı' },
    ],
    weightRangeKg: [1.5, 3],
    lifespanYears: [14, 16],
  },
  {
    breed: 'Shih Tzu',
    petType: 'Dog',
    healthRisks: [
      { label: 'Eye problems (proptosis, corneal ulcers)', label_tr: 'Göz sorunları (proptozis, kornea ülserleri)' },
      { label: 'BOAS — airway issues', label_tr: 'BOAS — hava yolu sorunları' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
    ],
    careTips: [
      { label: 'Daily face cleaning around eyes', label_tr: 'Gözler etrafında günlük yüz temizliği' },
      { label: 'Keep cool — heat sensitive', label_tr: 'Serin tutun — ısıya duyarlı' },
      { label: 'Professional grooming every 6–8 weeks', label_tr: 'Her 6-8 haftada profesyonel grooming' },
    ],
    weightRangeKg: [4, 7.5],
    lifespanYears: [10, 16],
  },
  {
    breed: 'Maltese',
    petType: 'Dog',
    healthRisks: [
      { label: 'Patellar luxation', label_tr: 'Patella luksasyonu' },
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
      { label: 'Hypoglycemia', label_tr: 'Hipoglisemi' },
      { label: 'Tracheal collapse', label_tr: 'Trakea kollapsı' },
    ],
    careTips: [
      { label: 'Daily brushing to prevent matting', label_tr: 'Düğümlenmeyi önlemek için günlük fırçalama' },
      { label: 'Tear stain cleaning daily', label_tr: 'Günlük gözyaşı lekesi temizliği' },
      { label: 'Regular dental check-ups', label_tr: 'Düzenli diş kontrolleri' },
    ],
    weightRangeKg: [1.5, 4],
    lifespanYears: [12, 15],
  },
  {
    breed: 'Border Collie',
    petType: 'Dog',
    healthRisks: [
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Collie eye anomaly (CEA)', label_tr: 'Collie göz anomalisi (CEA)' },
      { label: 'Epilepsy', label_tr: 'Epilepsi' },
      { label: 'MDR1 gene mutation (drug sensitivity)', label_tr: 'MDR1 gen mutasyonu (ilaç duyarlılığı)' },
    ],
    careTips: [
      { label: '2+ hours vigorous daily exercise mandatory', label_tr: 'Günde 2+ saat yoğun egzersiz zorunlu' },
      { label: 'High mental stimulation — working dog intelligence', label_tr: 'Yüksek mental uyarım — çalışma köpeği zekası' },
      { label: 'Inform vet of MDR1 status before medications', label_tr: 'İlaçlar öncesi vete MDR1 durumunu bildirin' },
    ],
    weightRangeKg: [14, 20],
    lifespanYears: [12, 15],
  },
  {
    breed: 'Pomeranian',
    petType: 'Dog',
    healthRisks: [
      { label: 'Tracheal collapse', label_tr: 'Trakea kollapsı' },
      { label: 'Patellar luxation', label_tr: 'Patella luksasyonu' },
      { label: 'Alopecia X (coat loss)', label_tr: 'Alopesia X (tüy dökülmesi)' },
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
    ],
    careTips: [
      { label: 'Harness instead of collar', label_tr: 'Tasma yerine koşum kullanın' },
      { label: 'Brush 2–3× weekly to prevent tangles', label_tr: 'Düğümlenmeyi önlemek için haftada 2-3 kez fırçalayın' },
      { label: 'Watch for overheating in summer', label_tr: 'Yazın aşırı ısınmaya dikkat edin' },
    ],
    weightRangeKg: [1.9, 3.5],
    lifespanYears: [12, 16],
  },
  {
    breed: 'Cavalier King Charles Spaniel',
    aliases: ['Cavalier', 'CKCS'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Mitral valve disease (MVD) — very common', label_tr: 'Mitral kapak hastalığı (MVD) — çok yaygın' },
      { label: 'Syringomyelia / Chiari malformation', label_tr: 'Siringomiyeli / Chiari malformasyonu' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Episodic falling syndrome', label_tr: 'Epizodik düşme sendromu' },
    ],
    careTips: [
      { label: 'Annual cardiac auscultation from age 1', label_tr: '1 yaşından itibaren yıllık kardiyak oskültasyon' },
      { label: 'Check for scratching at neck/head (syringomyelia sign)', label_tr: 'Boyun/baş kaşımasını kontrol edin (siringomiyeli belirtisi)' },
      { label: 'Moderate exercise — monitor breathing', label_tr: 'Orta düzeyde egzersiz — nefes almayı izleyin' },
    ],
    weightRangeKg: [5.9, 8.2],
    lifespanYears: [9, 14],
  },
  {
    breed: 'Great Dane',
    petType: 'Dog',
    healthRisks: [
      { label: 'Bloat / GDV (life-threatening)', label_tr: 'Şişkinlik / GDV (hayatı tehdit eden)' },
      { label: 'Dilated cardiomyopathy (DCM)', label_tr: 'Dilate kardiyomiyopati (DCM)' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Osteosarcoma', label_tr: 'Osteosarkom' },
    ],
    careTips: [
      { label: 'Feed from raised bowl — reduces bloat risk debate', label_tr: 'Yükseltilmiş kaseden besleyin' },
      { label: 'Rest 1h before/after meals', label_tr: 'Yemeklerden önce/sonra 1 saat dinlenin' },
      { label: 'Annual cardiac screening', label_tr: 'Yıllık kardiyak tarama' },
    ],
    weightRangeKg: [50, 82],
    lifespanYears: [7, 10],
  },
  {
    breed: 'Doberman Pinscher',
    aliases: ['Doberman'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Dilated cardiomyopathy (DCM)', label_tr: 'Dilate kardiyomiyopati (DCM)' },
      { label: 'Von Willebrand\'s disease', label_tr: 'Von Willebrand hastalığı' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Wobbler syndrome', label_tr: 'Wobbler sendromu' },
    ],
    careTips: [
      { label: 'Cardiac Holter monitoring annually from age 3', label_tr: '3 yaşından itibaren yıllık kardiyak Holter izlemi' },
      { label: 'High exercise needs — boredom causes destructive behavior', label_tr: 'Yüksek egzersiz ihtiyacı — can sıkıntısı yıkıcı davranışa yol açar' },
      { label: 'L-carnitine & taurine supplementation discussed with vet', label_tr: 'L-karnitin & taurin takviyesi vet ile görüşülmeli' },
    ],
    weightRangeKg: [32, 45],
    lifespanYears: [10, 13],
  },
  {
    breed: 'Cocker Spaniel',
    aliases: ['English Cocker Spaniel', 'American Cocker Spaniel'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Ear infections (chronic)', label_tr: 'Kulak enfeksiyonları (kronik)' },
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Familial nephropathy', label_tr: 'Familyal nefropati' },
    ],
    careTips: [
      { label: 'Weekly ear cleaning mandatory', label_tr: 'Haftalık kulak temizliği zorunlu' },
      { label: 'Grooming every 6–8 weeks', label_tr: 'Her 6-8 haftada grooming' },
      { label: 'Kidney function check from age 4+', label_tr: '4 yaşından itibaren böbrek fonksiyon kontrolü' },
    ],
    weightRangeKg: [9, 14],
    lifespanYears: [12, 15],
  },
  {
    breed: 'Miniature Schnauzer',
    petType: 'Dog',
    healthRisks: [
      { label: 'Pancreatitis', label_tr: 'Pankreatit' },
      { label: 'Urinary stones', label_tr: 'Üriner taşlar' },
      { label: 'Hyperlipidemia', label_tr: 'Hiperlipidemi' },
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
    ],
    careTips: [
      { label: 'Low-fat diet important', label_tr: 'Düşük yağlı diyet önemli' },
      { label: 'Fresh water always available — prevents stones', label_tr: 'Taşları önlemek için her zaman taze su' },
      { label: 'Lipid panel check annually', label_tr: 'Yıllık lipid paneli kontrolü' },
    ],
    weightRangeKg: [5.4, 9],
    lifespanYears: [12, 15],
  },
  {
    breed: 'Spitz',
    aliases: ['Japanese Spitz', 'German Spitz'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Patellar luxation', label_tr: 'Patella luksasyonu' },
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
      { label: 'Dental issues', label_tr: 'Diş sorunları' },
    ],
    careTips: [
      { label: 'Brush 2× weekly', label_tr: 'Haftada 2 kez fırçalayın' },
      { label: 'Moderate daily exercise', label_tr: 'Günlük orta düzeyde egzersiz' },
      { label: 'Regular dental care', label_tr: 'Düzenli diş bakımı' },
    ],
    weightRangeKg: [5, 10],
    lifespanYears: [12, 16],
  },
  {
    breed: 'Pug',
    petType: 'Dog',
    healthRisks: [
      { label: 'BOAS — severe breathing issues', label_tr: 'BOAS — ciddi solunum sorunları' },
      { label: 'Eye prolapse', label_tr: 'Göz prolapsı' },
      { label: 'Spinal issues (hemivertebrae)', label_tr: 'Omurga sorunları (hemivertebra)' },
      { label: 'Skin fold infections', label_tr: 'Deri kıvrımı enfeksiyonları' },
    ],
    careTips: [
      { label: 'No exercise in heat — breathing risk', label_tr: 'Sıcakta egzersiz yok — solunum riski' },
      { label: 'Clean facial wrinkles daily', label_tr: 'Yüz kırışıklıklarını günlük temizleyin' },
      { label: 'Monitor eyes for injury — protruding', label_tr: 'Çıkık gözleri yaralanmaya karşı izleyin' },
    ],
    weightRangeKg: [6, 9],
    lifespanYears: [12, 15],
  },
  {
    breed: 'Akita',
    aliases: ['Akita Inu', 'Japanese Akita'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Autoimmune disorders', label_tr: 'Otoimmün bozukluklar' },
      { label: 'Bloat (GDV)', label_tr: 'Mide volvulusu (GDV)' },
      { label: 'Hypothyroidism', label_tr: 'Hipotiroidizm' },
    ],
    careTips: [
      { label: 'Feed 2× daily to reduce bloat risk', label_tr: 'Şişkinlik riskini azaltmak için günde 2 kez besleyin' },
      { label: 'Early socialization critical', label_tr: 'Erken sosyalleşme kritik' },
      { label: 'Thyroid levels checked annually', label_tr: 'Tiroid seviyeleri yıllık kontrol edilmeli' },
    ],
    weightRangeKg: [34, 54],
    lifespanYears: [10, 13],
  },
  {
    breed: 'Bichon Frise',
    petType: 'Dog',
    healthRisks: [
      { label: 'Patellar luxation', label_tr: 'Patella luksasyonu' },
      { label: 'Allergies & skin conditions', label_tr: 'Alerjiler & cilt sorunları' },
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
      { label: 'Bladder stones', label_tr: 'Mesane taşları' },
    ],
    careTips: [
      { label: 'Professional grooming every 4–6 weeks', label_tr: 'Her 4-6 haftada profesyonel grooming' },
      { label: 'Hypoallergenic diet if skin issues present', label_tr: 'Cilt sorunları varsa hipoalerjenik diyet' },
      { label: 'Regular dental brushing', label_tr: 'Düzenli diş fırçalama' },
    ],
    weightRangeKg: [3, 5.5],
    lifespanYears: [14, 15],
  },
  {
    breed: 'Samoyed',
    petType: 'Dog',
    healthRisks: [
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Samoyed hereditary glomerulopathy', label_tr: 'Samoyed kalıtsal glomerülopatisi' },
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
      { label: 'Diabetes mellitus', label_tr: 'Diabetes mellitus' },
    ],
    careTips: [
      { label: 'Heavy grooming — brush daily during shedding', label_tr: 'Yoğun grooming — tüy döküm döneminde günlük fırçalayın' },
      { label: 'Kidney function check annually', label_tr: 'Yıllık böbrek fonksiyon kontrolü' },
      { label: 'Keep cool — heavy coat in heat', label_tr: 'Serin tutun — sıcakta yoğun tüy' },
    ],
    weightRangeKg: [16, 30],
    lifespanYears: [12, 14],
  },
  // ─── Mixed / Street Dogs ───────────────────────────────────────────────────
  {
    breed: 'Mixed Breed Dog',
    aliases: ['Mixed Breed', 'Mutt', 'Mongrel', 'Crossbreed', 'Sokak Köpeği', 'Melez Köpek', 'Karışık Irk'],
    matchKeywords: ['sokak', 'stray', 'mixed', 'melez', 'karışık', 'mutt', 'mongrel', 'crossbreed'],
    petType: 'Dog',
    dailyCare: [
      { label: 'Brush weekly — coat type varies by mix', label_tr: 'Haftalık fırçalama — tüy tipi karışıma göre değişir', category: 'grooming' },
      { label: '30–60 min daily exercise — adapt to your dog\'s energy level', label_tr: 'Günde 30-60 dk egzersiz — köpeğinizin enerji düzeyine uyarlayın', category: 'exercise' },
      { label: '2 meals/day — portion to body size and activity', label_tr: 'Günde 2 öğün — vücut büyüklüğü ve aktiviteye göre porsiyon', category: 'feeding' },
      { label: 'Socialization and mental enrichment important', label_tr: 'Sosyalleşme ve zihinsel zenginleştirme önemli', category: 'environment' },
      { label: 'Annual vaccination (incl. rabies) + parasite check', label_tr: 'Yıllık aşılama (kuduz dahil) + parazit kontrolü', category: 'health' },
    ],
    healthRisks: [
      { label: 'Dental disease (very common in street dogs)', label_tr: 'Diş hastalığı (sokak köpeklerinde çok yaygın)' },
      { label: 'Intestinal parasites', label_tr: 'Bağırsak parazitleri' },
      { label: 'Skin conditions & mange', label_tr: 'Cilt sorunları & uyuz' },
      { label: 'Infectious diseases (distemper, parvovirus)', label_tr: 'Bulaşıcı hastalıklar (gençlik hastalığı, parvovirus)' },
    ],
    careTips: [
      { label: 'Full vaccination series critical — especially rabies', label_tr: 'Tam aşı serisi kritik — özellikle kuduz' },
      { label: 'Annual deworming & flea/tick prevention', label_tr: 'Yıllık bağırsak kurdu tedavisi & pire/kene önlemi' },
      { label: 'Hybrid vigor — generally hardier than purebreds', label_tr: 'Hibrit güç — saf ırktan genellikle daha sağlıklı' },
    ],
    weightRangeKg: [10, 30],
    lifespanYears: [12, 15],
  },
];

// ─── CAT BREEDS ──────────────────────────────────────────────────────────────
const catBreeds: BreedHealthEntry[] = [
  {
    breed: 'British Shorthair',
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy (HCM)', label_tr: 'Hipertrofik kardiyomiyopati (HCM)' },
      { label: 'Polycystic kidney disease (PKD)', label_tr: 'Polikistik böbrek hastalığı (PKD)' },
      { label: 'Obesity tendency', label_tr: 'Obezite eğilimi' },
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
    ],
    dailyCare: [
      { label: 'Brush 2× weekly — short dense coat, low shedding', label_tr: 'Haftada 2 kez fırçalama — kısa yoğun tüy, düşük dökülme', category: 'grooming' },
      { label: '15–20 min gentle play daily — calm, low-energy breed', label_tr: 'Günde 15-20 dk hafif oyun — sakin, düşük enerjili ırk', category: 'exercise' },
      { label: '2 measured meals/day — no free feeding, obesity prone', label_tr: 'Günde 2 ölçülü öğün — serbest beslenme yok, obeziteye eğilimli', category: 'feeding' },
      { label: 'Indoor life ideal — adapts well to apartment living', label_tr: 'İç mekan yaşamı ideal — apartman hayatına çok iyi uyum sağlar', category: 'environment' },
      { label: 'Annual cardiac echo + kidney (PKD/creatinine) panel', label_tr: 'Yıllık kardiyak eko + böbrek (PKD/kreatinin) paneli', category: 'health' },
    ],
    careTips: [
      { label: 'Cardiac echo screening annually from age 2', label_tr: '2 yaşından itibaren yıllık kardiyak eko taraması' },
      { label: 'PKD genetic test before breeding', label_tr: 'Üretimden önce PKD genetik testi' },
      { label: 'Portion-controlled diet — low activity breed', label_tr: 'Düşük aktivite ırkı — porsiyon kontrollü diyet' },
    ],
    weightRangeKg: [4, 8],
    lifespanYears: [12, 17],
  },
  {
    breed: 'Persian',
    aliases: ['Persian Cat'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Polycystic kidney disease (PKD)', label_tr: 'Polikistik böbrek hastalığı (PKD)' },
      { label: 'Hypertrophic cardiomyopathy (HCM)', label_tr: 'Hipertrofik kardiyomiyopati (HCM)' },
      { label: 'Brachycephalic respiratory issues', label_tr: 'Brakisefal solunum sorunları' },
      { label: 'Eye discharge / epiphora', label_tr: 'Göz akıntısı / epifor' },
    ],
    careTips: [
      { label: 'Daily coat grooming — mats quickly', label_tr: 'Günlük tüy bakımı — hızlıca dolaşır' },
      { label: 'Daily eye cleaning', label_tr: 'Günlük göz temizliği' },
      { label: 'PKD DNA test recommended', label_tr: 'PKD DNA testi önerilir' },
    ],
    weightRangeKg: [3, 6],
    lifespanYears: [10, 17],
  },
  {
    breed: 'Maine Coon',
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy (HCM)', label_tr: 'Hipertrofik kardiyomiyopati (HCM)' },
      { label: 'Spinal muscular atrophy (SMA)', label_tr: 'Spinal müsküler atrofi (SMA)' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Polycystic kidney disease', label_tr: 'Polikistik böbrek hastalığı' },
    ],
    dailyCare: [
      { label: 'Brush 2–3× weekly — semi-long coat, tangle-prone belly/ruff', label_tr: 'Haftada 2-3 kez fırçalama — yarı uzun tüy, karın/yakası dolaşmaya eğilimli', category: 'grooming' },
      { label: '20–30 min interactive play daily — intelligent, needs stimulation', label_tr: 'Günde 20-30 dk interaktif oyun — zeki, uyarıma ihtiyaç duyar', category: 'exercise' },
      { label: '2–3 meals/day — large breed, higher caloric need', label_tr: 'Günde 2-3 öğün — büyük ırk, daha yüksek kalori ihtiyacı', category: 'feeding' },
      { label: 'Tall cat trees essential — loves climbing heights', label_tr: 'Yüksek kedi tırmanma ağacı şart — yüksek tırmanmayı sever', category: 'environment' },
      { label: 'Cardiac echo annually from age 2', label_tr: '2 yaşından itibaren yıllık kardiyak eko', category: 'health' },
    ],
    careTips: [
      { label: 'Annual cardiac echo from age 2', label_tr: '2 yaşından itibaren yıllık kardiyak eko' },
      { label: 'Brush 2× weekly — semi-long coat', label_tr: 'Yarı uzun tüy — haftada 2 kez fırçalayın' },
      { label: 'Large litter box needed (big breed)', label_tr: 'Büyük kedi tuvalet kutusu gerekli (büyük ırk)' },
    ],
    weightRangeKg: [4, 9],
    lifespanYears: [12, 15],
  },
  {
    breed: 'Ragdoll',
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy (HCM)', label_tr: 'Hipertrofik kardiyomiyopati (HCM)' },
      { label: 'Polycystic kidney disease (PKD)', label_tr: 'Polikistik böbrek hastalığı (PKD)' },
      { label: 'Bladder stones', label_tr: 'Mesane taşları' },
    ],
    careTips: [
      { label: 'Cardiac screening annually', label_tr: 'Yıllık kardiyak tarama' },
      { label: 'Indoor only recommended — docile personality', label_tr: 'Yalnızca iç mekan önerilir — sakin kişilik' },
      { label: 'Brush 2× weekly — minimal shedding coat', label_tr: 'Haftada 2 kez fırçalayın — minimal tüy dökülmesi' },
    ],
    weightRangeKg: [4.5, 9],
    lifespanYears: [12, 17],
  },
  {
    breed: 'Siamese',
    petType: 'Cat',
    healthRisks: [
      { label: 'Amyloidosis (liver/kidney)', label_tr: 'Amiloidoz (karaciğer/böbrek)' },
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
      { label: 'Mediastinal lymphoma', label_tr: 'Mediastinal lenfoma' },
      { label: 'Asthma / respiratory issues', label_tr: 'Astım / solunum sorunları' },
    ],
    careTips: [
      { label: 'High social/mental stimulation needs', label_tr: 'Yüksek sosyal/mental uyarım ihtiyacı' },
      { label: 'Annual kidney & liver panels from age 5', label_tr: '5 yaşından itibaren yıllık böbrek & karaciğer paneli' },
      { label: 'Minimize dust/smoke exposure (asthma)', label_tr: 'Toz/duman maruziyetini minimuma indirin (astım)' },
    ],
    weightRangeKg: [3, 5],
    lifespanYears: [15, 20],
  },
  {
    breed: 'Abyssinian',
    petType: 'Cat',
    healthRisks: [
      { label: 'Progressive retinal atrophy (rdAc mutation)', label_tr: 'Progresif retinal atrofi (rdAc mutasyonu)' },
      { label: 'Pyruvate kinase deficiency', label_tr: 'Piruvat kinaz eksikliği' },
      { label: 'Renal amyloidosis', label_tr: 'Renal amiloidoz' },
      { label: 'Hypertrophic cardiomyopathy', label_tr: 'Hipertrofik kardiyomiyopati' },
    ],
    careTips: [
      { label: 'Very active — needs large play space', label_tr: 'Çok aktif — geniş oyun alanı gerektirir' },
      { label: 'Annual kidney function test from age 4', label_tr: '4 yaşından itibaren yıllık böbrek fonksiyon testi' },
      { label: 'Short coat — minimal grooming', label_tr: 'Kısa tüy — minimal bakım' },
    ],
    weightRangeKg: [2.5, 5],
    lifespanYears: [14, 17],
  },
  {
    breed: 'Sphynx',
    aliases: ['Sphinx Cat'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy (HCM) — very high risk', label_tr: 'Hipertrofik kardiyomiyopati (HCM) — çok yüksek risk' },
      { label: 'Skin conditions — sunburn, oil buildup', label_tr: 'Cilt sorunları — güneş yanığı, yağ birikimi' },
      { label: 'Respiratory infections', label_tr: 'Solunum enfeksiyonları' },
    ],
    careTips: [
      { label: 'Cardiac echo every 6 months (high HCM risk)', label_tr: 'Her 6 ayda kardiyak eko (yüksek HCM riski)' },
      { label: 'Weekly bathing to remove skin oil', label_tr: 'Cilt yağını gidermek için haftalık banyo' },
      { label: 'Keep warm — no fur insulation', label_tr: 'Sıcak tutun — tüy yalıtımı yok' },
    ],
    weightRangeKg: [3.5, 7],
    lifespanYears: [8, 14],
  },
  {
    breed: 'Birman',
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy', label_tr: 'Hipertrofik kardiyomiyopati' },
      { label: 'Congenital hypotrichosis', label_tr: 'Konjenital hipotrikozis' },
    ],
    careTips: [
      { label: 'Brush 2× weekly', label_tr: 'Haftada 2 kez fırçalayın' },
      { label: 'Gentle, social — needs human interaction', label_tr: 'Nazik, sosyal — insan etkileşimine ihtiyaç duyar' },
      { label: 'Annual cardiac check', label_tr: 'Yıllık kardiyak kontrol' },
    ],
    weightRangeKg: [3.5, 6],
    lifespanYears: [14, 15],
  },
  {
    breed: 'Scottish Fold',
    petType: 'Cat',
    healthRisks: [
      { label: 'Osteochondrodysplasia (joint/cartilage issues)', label_tr: 'Osteokondrodisplazi (eklem/kıkırdak sorunları)' },
      { label: 'Hypertrophic cardiomyopathy', label_tr: 'Hipertrofik kardiyomiyopati' },
      { label: 'Polycystic kidney disease', label_tr: 'Polikistik böbrek hastalığı' },
      { label: 'Chronic pain in tail/limbs', label_tr: 'Kuyruk/uzuvlarda kronik ağrı' },
    ],
    careTips: [
      { label: 'Watch for limping or reluctance to move', label_tr: 'Topallama veya hareket etmeme isteğini izleyin' },
      { label: 'Pain management — joint issues common', label_tr: 'Ağrı yönetimi — eklem sorunları yaygın' },
      { label: 'Cardiac echo annually', label_tr: 'Yıllık kardiyak eko' },
    ],
    weightRangeKg: [2.5, 6],
    lifespanYears: [11, 14],
  },
  {
    breed: 'Bengal',
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy', label_tr: 'Hipertrofik kardiyomiyopati' },
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
      { label: 'Pyruvate kinase deficiency', label_tr: 'Piruvat kinaz eksikliği' },
      { label: 'Flat-chested kitten syndrome', label_tr: 'Düz göğüslü yavrek kedi sendromu' },
    ],
    careTips: [
      { label: 'Very high energy — large enrichment space needed', label_tr: 'Çok yüksek enerji — geniş zenginleştirme alanı gerekli' },
      { label: 'Short coat — weekly brushing', label_tr: 'Kısa tüy — haftalık fırçalama' },
      { label: 'Annual cardiac screening', label_tr: 'Yıllık kardiyak tarama' },
    ],
    weightRangeKg: [3.5, 7],
    lifespanYears: [12, 16],
  },
  {
    breed: 'Norwegian Forest Cat',
    aliases: ['Norsk Skogkatt', 'Wegie'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy', label_tr: 'Hipertrofik kardiyomiyopati' },
      { label: 'Glycogen storage disease type IV', label_tr: 'Tip IV glikojen depolama hastalığı' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
    ],
    careTips: [
      { label: 'Brush 2× weekly — thick double coat', label_tr: 'Yoğun çift katlı tüy — haftada 2 kez fırçalayın' },
      { label: 'Climbing structures important', label_tr: 'Tırmanma yapıları önemli' },
      { label: 'Annual cardiac check', label_tr: 'Yıllık kardiyak kontrol' },
    ],
    weightRangeKg: [4, 9],
    lifespanYears: [14, 16],
  },
  {
    breed: 'Russian Blue',
    petType: 'Cat',
    healthRisks: [
      { label: 'Bladder stones', label_tr: 'Mesane taşları' },
      { label: 'Obesity tendency', label_tr: 'Obezite eğilimi' },
      { label: 'Hypertrophic cardiomyopathy (less common)', label_tr: 'Hipertrofik kardiyomiyopati (daha az yaygın)' },
    ],
    careTips: [
      { label: 'Portion control — gains weight easily', label_tr: 'Porsiyon kontrolü — kolayca kilo alır' },
      { label: 'Short dense coat — weekly brushing', label_tr: 'Kısa yoğun tüy — haftalık fırçalama' },
      { label: 'Shy with strangers — needs safe space', label_tr: 'Yabancılara çekingen — güvenli alan gerektirir' },
    ],
    weightRangeKg: [3.5, 6.5],
    lifespanYears: [15, 20],
  },
  {
    breed: 'Burmese',
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypokalemia (low potassium)', label_tr: 'Hipokalemi (düşük potasyum)' },
      { label: 'Diabetes mellitus', label_tr: 'Diabetes mellitus' },
      { label: 'Facial defect (flat face related)', label_tr: 'Yüz defekti (düz yüzle ilgili)' },
    ],
    careTips: [
      { label: 'Annual blood glucose & potassium panel', label_tr: 'Yıllık kan şekeri & potasyum paneli' },
      { label: 'High social needs — don\'t leave alone long', label_tr: 'Yüksek sosyal ihtiyaç — uzun süre yalnız bırakmayın' },
      { label: 'Minimal grooming — short silky coat', label_tr: 'Minimal bakım — kısa ipeksi tüy' },
    ],
    weightRangeKg: [3, 6],
    lifespanYears: [15, 16],
  },
  {
    breed: 'Turkish Angora',
    petType: 'Cat',
    healthRisks: [
      { label: 'Hereditary ataxia (white/odd-eyed cats)', label_tr: 'Kalıtsal ataksi (beyaz/tek gözlü kediler)' },
      { label: 'Hypertrophic cardiomyopathy', label_tr: 'Hipertrofik kardiyomiyopati' },
      { label: 'Deafness (white coat gene linked)', label_tr: 'Sağırlık (beyaz tüy geniyle bağlantılı)' },
    ],
    careTips: [
      { label: 'White cats prone to deafness — hearing check early', label_tr: 'Beyaz kediler sağırlığa eğilimli — erken işitme kontrolü' },
      { label: 'Brush weekly — minimal matting', label_tr: 'Haftalık fırçalayın — minimal dolaşma' },
      { label: 'Annual cardiac echo', label_tr: 'Yıllık kardiyak eko' },
    ],
    weightRangeKg: [2.5, 5],
    lifespanYears: [12, 18],
  },
  {
    breed: 'Turkish Van',
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy', label_tr: 'Hipertrofik kardiyomiyopati' },
      { label: 'Deafness (white coat gene linked)', label_tr: 'Sağırlık (beyaz tüy geniyle bağlantılı)' },
    ],
    careTips: [
      { label: 'Enjoys water — unique for cats', label_tr: 'Suyu sever — kediler için eşsiz' },
      { label: 'Brush weekly, especially in summer shedding', label_tr: 'Haftalık fırçalayın, özellikle yaz döküm döneminde' },
      { label: 'Annual cardiac check', label_tr: 'Yıllık kardiyak kontrol' },
    ],
    weightRangeKg: [3, 8],
    lifespanYears: [12, 17],
  },

  // ─── Street / Mixed Cats (by coat pattern) ─────────────────────────────────

  {
    breed: 'Tekir Kedi (Tabby)',
    aliases: ['Tabby', 'Tekir', 'Mackerel Tabby', 'Classic Tabby', 'Striped Cat'],
    matchKeywords: ['tekir', 'tabby', 'striped', 'mackerel', 'çizgili'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Dental disease — tartar buildup', label_tr: 'Diş hastalığı — diş taşı birikimi' },
      { label: 'Obesity in indoor cats', label_tr: 'Ev kedilerinde obezite' },
      { label: 'FIV/FeLV risk if contact with other cats', label_tr: 'Diğer kedilerle temasta FIV/FeLV riski' },
    ],
    careTips: [
      { label: 'Hardy mixed-gene cat — lower hereditary disease risk', label_tr: 'Sağlam karma genler — düşük kalıtsal hastalık riski' },
      { label: 'Annual dental check', label_tr: 'Yıllık diş kontrolü' },
      { label: 'Portion control for indoor cats', label_tr: 'Ev kedileri için porsiyon kontrolü' },
    ],
    weightRangeKg: [3, 6],
    lifespanYears: [13, 17],
  },
  {
    breed: 'Smokin Kedi (Tuxedo)',
    aliases: ['Tuxedo Cat', 'Tuxedo', 'Smokin', 'Black and White Cat', 'Siyah Beyaz Kedi'],
    matchKeywords: ['smokin', 'tuxedo', 'siyah beyaz', 'black white', 'black and white'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
      { label: 'Obesity tendency in neutered cats', label_tr: 'Kısırlaştırılmış kedilerde obezite eğilimi' },
      { label: 'FIV/FeLV risk if outdoor', label_tr: 'Dış mekana çıkıyorsa FIV/FeLV riski' },
    ],
    careTips: [
      { label: 'Coat pattern, not a breed — generally very healthy', label_tr: 'Tüy deseni, ırk değil — genel olarak çok sağlıklı' },
      { label: 'Annual vet check & vaccinations', label_tr: 'Yıllık veteriner kontrolü & aşılar' },
      { label: 'Spay/neuter recommended', label_tr: 'Kısırlaştırma önerilir' },
    ],
    weightRangeKg: [3, 6],
    lifespanYears: [13, 17],
  },
  {
    breed: 'Portakal Kedi (Orange Tabby)',
    aliases: ['Orange Tabby', 'Ginger Cat', 'Turuncu Kedi', 'Sarı Kedi', 'Portakal Kedi'],
    matchKeywords: ['portakal', 'sarı kedi', 'turuncu', 'orange', 'ginger', 'kızıl'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Obesity — ~80% are male, neutered males gain weight easily', label_tr: 'Obezite — ~%80\'i erkek, kısırlaştırılmış erkekler kolayca kilo alır' },
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
      { label: 'FIV risk — males tend to roam/fight more', label_tr: 'FIV riski — erkekler daha fazla dolaşır/kavga eder' },
    ],
    careTips: [
      { label: '~80% male — testosterone-driven roaming if not neutered', label_tr: '~%80 erkek — kısırlaştırılmadan dolaşma isteği yüksek' },
      { label: 'Strict portion control after neutering', label_tr: 'Kısırlaştırma sonrası sıkı porsiyon kontrolü' },
      { label: 'Orange coat gene (OCA2) not linked to health issues', label_tr: 'Turuncu tüy geni (OCA2) sağlık sorunlarıyla bağlantılı değil' },
    ],
    weightRangeKg: [3.5, 7],
    lifespanYears: [13, 17],
  },
  {
    breed: 'Calico / Üç Renkli Kedi',
    aliases: ['Calico', 'Tortoiseshell', 'Tortie', 'Üç Renkli', 'Alaca Kedi', 'Üç Renk'],
    matchKeywords: ['calico', 'üç renkli', 'üç renk', 'tortoiseshell', 'tortie', 'alaca', 'tricolor'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Almost exclusively female — males are rare & often sterile (XXY)', label_tr: 'Neredeyse yalnızca dişi — erkekler nadir ve genellikle kısır (XXY)' },
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
      { label: '"Tortitude" — can be feisty, stress-related conditions', label_tr: '"Tortitude" — huysuz olabilir, stres kaynaklı sorunlar' },
    ],
    careTips: [
      { label: 'No breed-specific genetic diseases — healthy mixed gene pool', label_tr: 'Irka özgü genetik hastalık yok — sağlıklı karma gen havuzu' },
      { label: 'Annual vet visit & dental check', label_tr: 'Yıllık veteriner ziyareti & diş kontrolü' },
      { label: 'If male calico — vet check for XXY (Klinefelter)', label_tr: 'Erkek calico ise — XXY (Klinefelter) için veteriner kontrolü' },
    ],
    weightRangeKg: [2.5, 5.5],
    lifespanYears: [13, 17],
  },
  {
    breed: 'Siyah Kedi',
    aliases: ['Black Cat', 'Siyah Kedi', 'All Black Cat'],
    matchKeywords: ['siyah kedi', 'black cat', 'all black', 'tam siyah'],
    petType: 'Cat',
    healthRisks: [
      { label: 'No coat-color linked health risks', label_tr: 'Tüy rengiyle bağlantılı sağlık riski yok' },
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
      { label: 'FIV/FeLV if outdoor', label_tr: 'Dış mekana çıkıyorsa FIV/FeLV' },
    ],
    careTips: [
      { label: 'Black coat absorbs heat — watch in summer', label_tr: 'Siyah tüy ısıyı emer — yazın dikkat edin' },
      { label: 'Generally very healthy — diverse gene pool', label_tr: 'Genel olarak çok sağlıklı — geniş gen havuzu' },
      { label: 'Annual vet check & vaccinations', label_tr: 'Yıllık veteriner kontrolü & aşılar' },
    ],
    weightRangeKg: [3, 6],
    lifespanYears: [13, 17],
  },
  // Generic catch-all — used when no other entry matches
  {
    breed: 'Sokak Kedisi (Karma Irk)',
    aliases: ['Domestic Shorthair', 'Domestic Longhair', 'Domestic Cat', 'Mixed Breed Cat', 'DSH', 'DLH', 'Sokak Kedisi', 'Karma Irk Kedi'],
    matchKeywords: ['sokak', 'stray', 'domestic', 'mixed', 'karma', 'melez', 'kedi'],
    isGenericFallback: true,
    petType: 'Cat',
    dailyCare: [
      { label: 'Brush weekly — short coat variants, 2× for long coat', label_tr: 'Haftalık fırçalama — kısa tüy için, uzun tüy için haftada 2 kez', category: 'grooming' },
      { label: '15–20 min play 2× daily — wand toys, puzzle feeders', label_tr: 'Günde 2 kez 15-20 dk oyun — olta oyuncağı, bulmaca besleyici', category: 'exercise' },
      { label: '2 meals/day — measure portions, avoid free-feeding', label_tr: 'Günde 2 öğün — porsiyonları ölçün, serbest beslenme önerin', category: 'feeding' },
      { label: 'Fresh water always available — prevents urinary issues', label_tr: 'Her zaman taze su — idrar sorunlarını önler', category: 'environment' },
      { label: 'Annual vaccination + dental check', label_tr: 'Yıllık aşılama + diş kontrolü', category: 'health' },
    ],
    healthRisks: [
      { label: 'Dental disease — most common cat health issue', label_tr: 'Diş hastalığı — en yaygın kedi sağlık sorunu' },
      { label: 'Obesity in indoor/spayed-neutered cats', label_tr: 'Ev/kısırlaştırılmış kedilerde obezite' },
      { label: 'FIV/FeLV if in contact with other cats', label_tr: 'Diğer kedilerle temasta FIV/FeLV' },
      { label: 'Urinary tract issues', label_tr: 'İdrar yolu sorunları' },
    ],
    careTips: [
      { label: 'Diverse gene pool — lower hereditary disease risk than purebreds', label_tr: 'Geniş gen havuzu — saf ırklardan daha az kalıtsal hastalık riski' },
      { label: 'Annual dental check-up', label_tr: 'Yıllık diş kontrolü' },
      { label: 'Fresh water always available — prevents urinary issues', label_tr: 'Her zaman taze su — idrar sorunlarını önler' },
    ],
    weightRangeKg: [3, 6],
    lifespanYears: [13, 17],
  },
];

// ─── Lookup ───────────────────────────────────────────────────────────────────
const ALL_BREEDS: BreedHealthEntry[] = [...dogBreeds, ...catBreeds];

/**
 * Look up a breed entry by breed name (case-insensitive).
 *
 * Match priority:
 *  1. Exact match on `breed` or `aliases`
 *  2. Keyword match — the breed name CONTAINS a `matchKeywords` entry
 *  3. Generic fallback (isGenericFallback: true) for the same petType
 *
 * Pass `useFallback: false` to skip step 3 (returns undefined if not found).
 */
export function getBreedHealthEntry(
  breedName: string,
  petType?: 'Dog' | 'Cat',
  options?: { useFallback?: boolean },
): BreedHealthEntry | undefined {
  if (!breedName) return undefined;
  const query = breedName.trim().toLowerCase();
  const { useFallback = true } = options ?? {};

  const candidates = ALL_BREEDS.filter(
    (e) => !petType || e.petType === petType,
  );

  // 1. Exact match
  const exact = candidates.find((entry) => {
    if (entry.breed.toLowerCase() === query) return true;
    return entry.aliases?.some((a) => a.toLowerCase() === query) ?? false;
  });
  if (exact) return exact;

  // 2. Keyword match (non-fallback entries first)
  const byKeyword = candidates.find((entry) => {
    if (entry.isGenericFallback) return false;
    return entry.matchKeywords?.some((kw) => query.includes(kw.toLowerCase())) ?? false;
  });
  if (byKeyword) return byKeyword;

  // 3. Generic fallback
  if (useFallback) {
    return candidates.find((e) => e.isGenericFallback);
  }

  return undefined;
}

/** Returns all breeds for a given pet type */
export function getBreedsForType(petType: 'Dog' | 'Cat'): BreedHealthEntry[] {
  return ALL_BREEDS.filter((e) => e.petType === petType);
}
