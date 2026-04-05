/**
 * Static breed health database — zero API cost, bundled with the app.
 * Covers ~43 dog breeds, ~32 cat breeds, and street/mixed animal profiles.
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

export type GroomingFrequency = 'daily' | '3x-week' | '2x-week' | 'weekly' | 'monthly';

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
  /** Personality / behavioural traits */
  temperament?: { label: string; label_tr: string }[];
  /** Breed-specific dietary guidance beyond standard portioning */
  dietaryNeeds?: { label: string; label_tr: string }[];
  /** Recommended daily exercise range in minutes [min, max] */
  exerciseMinutesPerDay?: [number, number];
  /** How often brushing / coat maintenance is needed */
  groomingFrequency?: GroomingFrequency;
  /** Allergens or substances this breed is commonly sensitive to */
  commonAllergies?: { label: string; label_tr: string }[];
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
    temperament: [
      { label: 'Friendly and outgoing', label_tr: 'Arkadaşcıl ve dışa dönük' },
      { label: 'Eager to please', label_tr: 'Memnun etmeye hevesli' },
      { label: 'Active and playful', label_tr: 'Aktif ve oyuncu' },
      { label: 'Good with children and other pets', label_tr: 'Çocuklar ve diğer evcil hayvanlarla iyi geçinir' },
    ],
    dietaryNeeds: [
      { label: 'Low-fat diet — very prone to obesity', label_tr: 'Düşük yağlı diyet — obeziteye çok yatkın' },
      { label: 'Joint supplements (glucosamine) after age 5', label_tr: '5 yaşından sonra eklem takviyesi (glukozamin)' },
    ],
    exerciseMinutesPerDay: [60, 120],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Skin allergies (atopy) — grass, dust, pollen', label_tr: 'Cilt alerjileri (atopi) — çimen, toz, polen' },
      { label: 'Food sensitivities — corn or soy', label_tr: 'Besin duyarlılığı — mısır veya soya' },
    ],
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
    temperament: [
      { label: 'Gentle and patient', label_tr: 'Nazik ve sabırlı' },
      { label: 'Trustworthy with children', label_tr: 'Çocuklarla güvenilir' },
      { label: 'Highly trainable', label_tr: 'Kolayca eğitilebilir' },
      { label: 'Friendly with strangers', label_tr: 'Yabancılara karşı dostane' },
    ],
    dietaryNeeds: [
      { label: 'Balanced diet — monitor weight carefully', label_tr: 'Dengeli diyet — kiloyu dikkatli izleyin' },
      { label: 'Omega-3 for coat and joint health', label_tr: 'Tüy ve eklem sağlığı için Omega-3' },
    ],
    exerciseMinutesPerDay: [60, 120],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Skin allergies — environmental and food (very common)', label_tr: 'Cilt alerjileri — çevresel ve besin (çok yaygın)' },
      { label: 'Ear infections related to allergy', label_tr: 'Alerjiye bağlı kulak enfeksiyonları' },
    ],
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
    temperament: [
      { label: 'Loyal and courageous', label_tr: 'Sadık ve cesur' },
      { label: 'Confident and alert', label_tr: 'Kendinden emin ve tetikte' },
      { label: 'Highly intelligent and trainable', label_tr: 'Çok zeki ve eğitilebilir' },
      { label: 'Protective of family', label_tr: 'Aileyi koruyucu' },
    ],
    dietaryNeeds: [
      { label: 'High-protein diet — active working breed', label_tr: 'Yüksek proteinli diyet — aktif çalışma ırkı' },
      { label: 'Joint supplements from age 5', label_tr: '5 yaşından itibaren eklem takviyesi' },
    ],
    exerciseMinutesPerDay: [60, 120],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Food allergies — beef and wheat common', label_tr: 'Besin alerjileri — sığır eti ve buğday yaygın' },
      { label: 'Flea allergy dermatitis', label_tr: 'Pire alerjisi dermatiti' },
    ],
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
    temperament: [
      { label: 'Playful and adaptable', label_tr: 'Oyuncu ve uyumlu' },
      { label: 'Affectionate with family', label_tr: 'Aileye karşı sevecen' },
      { label: 'Low-energy indoors', label_tr: 'İç mekanda düşük enerjili' },
      { label: 'Stubborn at times', label_tr: 'Zaman zaman inatçı' },
    ],
    dietaryNeeds: [
      { label: 'Low-fat diet — prone to obesity', label_tr: 'Düşük yağlı diyet — obeziteye eğilimli' },
      { label: 'Avoid foods that cause gas — worsens breathing issues', label_tr: 'Gaz oluşturan yiyeceklerden kaçının — nefes sorunlarını kötüleştirir' },
    ],
    exerciseMinutesPerDay: [20, 40],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food allergies — chicken, dairy, wheat common', label_tr: 'Besin alerjileri — tavuk, süt ürünleri, buğday yaygın' },
      { label: 'Environmental allergies — skin fold dermatitis', label_tr: 'Çevresel alerjiler — cilt kıvrım dermatiti' },
    ],
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
    temperament: [
      { label: 'Docile and willful', label_tr: 'Uysal ve inatçı' },
      { label: 'Friendly and courageous', label_tr: 'Dostane ve cesur' },
      { label: 'Calm indoors', label_tr: 'İç mekanda sakin' },
      { label: 'Good with children', label_tr: 'Çocuklarla iyi geçinir' },
    ],
    dietaryNeeds: [
      { label: 'Controlled portions — very obesity prone', label_tr: 'Kontrollü porsiyonlar — obeziteye çok yatkın' },
      { label: 'Avoid gas-producing foods', label_tr: 'Gaz oluşturan yiyeceklerden kaçının' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Skin fold allergies — yeast and bacterial', label_tr: 'Cilt kıvrım alerjileri — maya ve bakteriyel' },
      { label: 'Environmental allergies (pollen, dust)', label_tr: 'Çevresel alerjiler (polen, toz)' },
    ],
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
    temperament: [
      { label: 'Highly intelligent and active', label_tr: 'Çok zeki ve aktif' },
      { label: 'Elegant and proud', label_tr: 'Zarif ve gururlu' },
      { label: 'Trainable and responsive', label_tr: 'Eğitilebilir ve duyarlı' },
      { label: 'Good family dog', label_tr: 'İyi bir aile köpeği' },
    ],
    dietaryNeeds: [
      { label: 'High-quality protein — active intelligent breed', label_tr: 'Yüksek kaliteli protein — aktif zeki ırk' },
      { label: 'Limit treats — prone to pancreatitis', label_tr: 'Ödülleri sınırlayın — pankreatite eğilimli' },
    ],
    exerciseMinutesPerDay: [30, 60],
    groomingFrequency: '3x-week',
    commonAllergies: [
      { label: 'Food allergies — lamb and chicken', label_tr: 'Besin alerjileri — kuzu ve tavuk' },
      { label: 'Environmental allergies (common in Poodles)', label_tr: 'Çevresel alerjiler (Poodlelerde yaygın)' },
    ],
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
    temperament: [
      { label: 'Curious and merry', label_tr: 'Meraklı ve neşeli' },
      { label: 'Friendly with everyone', label_tr: 'Herkese karşı dostane' },
      { label: 'Strong-willed and stubborn', label_tr: 'İradeli ve inatçı' },
      { label: 'Pack-oriented', label_tr: 'Sürü odaklı' },
    ],
    dietaryNeeds: [
      { label: 'Strict portion control — most food-obsessed breed', label_tr: 'Katı porsiyon kontrolü — en yiyecek takıntılı ırk' },
      { label: 'Slow-feeder bowl recommended', label_tr: 'Yavaş besleyici kap önerilir' },
    ],
    exerciseMinutesPerDay: [45, 60],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Environmental allergies — very common in Beagles', label_tr: 'Çevresel alerjiler — Beaglelerde çok yaygın' },
      { label: 'Food sensitivities — wheat or corn', label_tr: 'Besin duyarlılığı — buğday veya mısır' },
    ],
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
    temperament: [
      { label: 'Loyal and confident', label_tr: 'Sadık ve kendinden emin' },
      { label: 'Calm and courageous', label_tr: 'Sakin ve cesur' },
      { label: 'Protective instinct', label_tr: 'Koruyucu içgüdü' },
      { label: 'Good-natured with proper training', label_tr: 'Doğru eğitimle iyi huylu' },
    ],
    dietaryNeeds: [
      { label: 'High-protein large-breed formula', label_tr: 'Yüksek proteinli büyük ırk formülü' },
      { label: 'Joint supplements from age 4', label_tr: '4 yaşından itibaren eklem takviyeleri' },
    ],
    exerciseMinutesPerDay: [60, 90],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food allergies — beef or soy', label_tr: 'Besin alerjileri — sığır eti veya soya' },
      { label: 'Environmental allergies (pollen)', label_tr: 'Çevresel alerjiler (polen)' },
    ],
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
    temperament: [
      { label: 'Feisty and brave', label_tr: 'Atılgan ve cesur' },
      { label: 'Affectionate with family', label_tr: 'Aileye karşı sevecen' },
      { label: 'Alert and vocal', label_tr: 'Tetikte ve sesli' },
      { label: 'Independent streak', label_tr: 'Bağımsız eğilim' },
    ],
    dietaryNeeds: [
      { label: 'Small-breed high-quality kibble — 2 small meals', label_tr: 'Küçük ırk yüksek kaliteli mama — 2 küçük öğün' },
      { label: 'Dental chews daily', label_tr: 'Günlük diş çiğneme ödülü' },
    ],
    exerciseMinutesPerDay: [30, 45],
    groomingFrequency: 'daily',
    commonAllergies: [
      { label: 'Food sensitivities — chicken or beef', label_tr: 'Besin duyarlılığı — tavuk veya sığır eti' },
      { label: 'Skin allergies — contact and environmental', label_tr: 'Cilt alerjileri — temas ve çevresel' },
    ],
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
    temperament: [
      { label: 'Clever and lively', label_tr: 'Zeki ve canlı' },
      { label: 'Courageous and stubborn', label_tr: 'Cesur ve inatçı' },
      { label: 'Devoted to family', label_tr: 'Aileye adanmış' },
      { label: 'Curious with high prey drive', label_tr: 'Meraklı ve yüksek av içgüdüsü' },
    ],
    dietaryNeeds: [
      { label: 'Strict weight management — every gram stresses the spine', label_tr: 'Katı kilo yönetimi — her gram omurgaya baskı yapar' },
      { label: 'Joint support supplements from age 4', label_tr: '4 yaşından itibaren eklem destek takviyeleri' },
    ],
    exerciseMinutesPerDay: [30, 45],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food allergies — common in the breed', label_tr: 'Besin alerjileri — ırkta yaygın' },
      { label: 'Environmental allergies — skin irritation', label_tr: 'Çevresel alerjiler — cilt tahrişi' },
    ],
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
    temperament: [
      { label: 'Playful and energetic', label_tr: 'Oyuncu ve enerjik' },
      { label: 'Loyal and protective', label_tr: 'Sadık ve koruyucu' },
      { label: 'Patient with children', label_tr: 'Çocuklarla sabırlı' },
      { label: 'Silly and fun-loving', label_tr: 'Neşeli ve eğlenceyi seven' },
    ],
    dietaryNeeds: [
      { label: 'High-protein active-breed diet', label_tr: 'Yüksek proteinli aktif ırk diyeti' },
      { label: 'No exercise near mealtimes — bloat risk', label_tr: 'Öğün zamanlarında egzersiz yok — şişkinlik riski' },
    ],
    exerciseMinutesPerDay: [60, 90],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food allergies — beef, dairy, wheat (very common)', label_tr: 'Besin alerjileri — sığır eti, süt, buğday (çok yaygın)' },
      { label: 'Environmental allergies — skin issues', label_tr: 'Çevresel alerjiler — cilt sorunları' },
    ],
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
    temperament: [
      { label: 'Outgoing and friendly', label_tr: 'Dışa dönük ve arkadaşcıl' },
      { label: 'Mischievous and energetic', label_tr: 'Yaramaz ve enerjik' },
      { label: 'Pack-oriented', label_tr: 'Sürü odaklı' },
      { label: 'Not a one-person dog', label_tr: 'Tek kişilik köpek değil' },
    ],
    dietaryNeeds: [
      { label: 'Surprisingly low calorie needs for their size — efficient metabolism', label_tr: 'Boyutlarına göre şaşırtıcı derecede düşük kalori ihtiyacı — verimli metabolizma' },
      { label: 'High-protein formula', label_tr: 'Yüksek proteinli formül' },
    ],
    exerciseMinutesPerDay: [90, 120],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Zinc-responsive dermatosis (unique to Huskies)', label_tr: 'Çinkoya duyarlı dermatoz (Huskylere özgü)' },
      { label: 'Food sensitivities — some dogs react to grain', label_tr: 'Besin duyarlılığı — bazı köpekler tahıla tepki verir' },
    ],
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
    temperament: [
      { label: 'Sassy and confident', label_tr: 'Kendine güvenen ve şımarık' },
      { label: 'Loyal to one person', label_tr: 'Bir kişiye sadık' },
      { label: 'Alert watchdog', label_tr: 'Tetikte bekçi köpek' },
      { label: 'Can be snappy if not socialised', label_tr: 'Sosyalleştirilmezse ısırgan olabilir' },
    ],
    dietaryNeeds: [
      { label: 'Toy-breed formula — small kibble, high energy density', label_tr: 'Oyuncak ırk formülü — küçük mama, yüksek enerji yoğunluğu' },
      { label: 'Calcium-rich diet — supports fragile bones', label_tr: 'Kalsiyumca zengin diyet — kırılgan kemikleri destekler' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food sensitivities — corn, wheat, soy', label_tr: 'Besin duyarlılığı — mısır, buğday, soya' },
      { label: 'Environmental allergies — grass, dust', label_tr: 'Çevresel alerjiler — çimen, toz' },
    ],
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
    temperament: [
      { label: 'Affectionate and outgoing', label_tr: 'Sevecen ve dışa dönük' },
      { label: 'Playful but calm indoors', label_tr: 'Oyuncu ama iç mekanda sakin' },
      { label: 'Good with all ages', label_tr: 'Her yaşla iyi geçinir' },
      { label: 'Trusting and friendly', label_tr: 'Güvenen ve dostane' },
    ],
    dietaryNeeds: [
      { label: 'Small-breed formula with skin/coat support', label_tr: 'Cilt/tüy desteği olan küçük ırk formülü' },
      { label: 'Daily dental chews — prone to dental disease', label_tr: 'Günlük diş çiğneme ödülü — diş hastalığına eğilimli' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: 'daily',
    commonAllergies: [
      { label: 'Food allergies — chicken or beef protein', label_tr: 'Besin alerjileri — tavuk veya sığır eti proteini' },
      { label: 'Environmental allergies — skin irritation', label_tr: 'Çevresel alerjiler — cilt tahrişi' },
    ],
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
    temperament: [
      { label: 'Gentle and fearless', label_tr: 'Nazik ve korkusuz' },
      { label: 'Playful and charming', label_tr: 'Oyuncu ve büyüleyici' },
      { label: 'Loves attention', label_tr: 'İlgiyi sever' },
      { label: 'Good with other pets', label_tr: 'Diğer evcil hayvanlarla iyi geçinir' },
    ],
    dietaryNeeds: [
      { label: 'Toy-breed small kibble — 2–3 small meals to prevent hypoglycemia', label_tr: 'Oyuncak ırk küçük mama — hipoglisemiyi önlemek için 2-3 küçük öğün' },
      { label: 'Omega-3 for coat health', label_tr: 'Tüy sağlığı için Omega-3' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: 'daily',
    commonAllergies: [
      { label: 'Tear staining linked to food sensitivities', label_tr: 'Gözyaşı lekesi besin duyarlılıklarıyla bağlantılı' },
      { label: 'Environmental allergens — common', label_tr: 'Çevresel alerjenler — yaygın' },
    ],
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
    temperament: [
      { label: 'Exceptionally intelligent', label_tr: 'İstisnai derecede zeki' },
      { label: 'Energetic and workaholic', label_tr: 'Enerjik ve çalışkan' },
      { label: 'Loyal to handler', label_tr: 'Sahibine sadık' },
      { label: 'Obsessive if under-stimulated', label_tr: 'Yeterince uyarılmazsa takıntılı' },
    ],
    dietaryNeeds: [
      { label: 'High-calorie working-dog formula — burns huge energy', label_tr: 'Yüksek kalorili çalışma köpeği formülü — büyük enerji yakar' },
      { label: 'Increase rations in heavy training periods', label_tr: 'Yoğun antrenman dönemlerinde rasyon artırın' },
    ],
    exerciseMinutesPerDay: [90, 120],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Food sensitivities (some lines)', label_tr: 'Besin duyarlılıkları (bazı soylar)' },
      { label: 'Environmental allergies — grass and pollen', label_tr: 'Çevresel alerjiler — çimen ve polen' },
    ],
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
    temperament: [
      { label: 'Bold and vivacious', label_tr: 'Cesur ve canlı' },
      { label: 'Curious and playful', label_tr: 'Meraklı ve oyuncu' },
      { label: 'Loyal and protective for its size', label_tr: 'Boyutuna göre sadık ve koruyucu' },
      { label: 'Vocal — can be a barker', label_tr: 'Sesli — havlamaya eğilimli' },
    ],
    dietaryNeeds: [
      { label: 'Toy-breed formula — 2–3 small meals, hypoglycemia risk', label_tr: 'Oyuncak ırk formülü — 2-3 küçük öğün, hipoglisemi riski' },
      { label: 'Omega-3 for dense double coat', label_tr: 'Yoğun çift kat tüy için Omega-3' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: '3x-week',
    commonAllergies: [
      { label: 'Skin allergies — common in Pomeranians', label_tr: 'Cilt alerjileri — Pomeranyanlarda yaygın' },
      { label: 'Food sensitivities — grain', label_tr: 'Besin duyarlılığı — tahıl' },
    ],
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
    temperament: [
      { label: 'Gentle and affectionate', label_tr: 'Nazik ve sevecen' },
      { label: 'Sociable with everyone', label_tr: 'Herkesle sosyal' },
      { label: 'Adaptable and patient', label_tr: 'Uyumlu ve sabırlı' },
      { label: 'Low prey drive — safe with small animals', label_tr: 'Düşük av içgüdüsü — küçük hayvanlarla güvenli' },
    ],
    dietaryNeeds: [
      { label: 'Controlled portions — obesity worsens heart disease', label_tr: 'Kontrollü porsiyonlar — obezite kalp hastalığını kötüleştirir' },
      { label: 'Omega-3 for heart and coat support', label_tr: 'Kalp ve tüy desteği için Omega-3' },
    ],
    exerciseMinutesPerDay: [30, 60],
    groomingFrequency: '3x-week',
    commonAllergies: [
      { label: 'Skin allergies — very common in the breed', label_tr: 'Cilt alerjileri — ırkta çok yaygın' },
      { label: 'Food sensitivities — grain, dairy', label_tr: 'Besin duyarlılığı — tahıl, süt ürünleri' },
    ],
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
    temperament: [
      { label: 'Friendly and patient', label_tr: 'Arkadaşcıl ve sabırlı' },
      { label: 'Gentle giant', label_tr: 'Nazik dev' },
      { label: 'Confident and dependable', label_tr: 'Kendinden emin ve güvenilir' },
      { label: 'Good with children when socialised', label_tr: 'Sosyalleştirildiğinde çocuklarla iyi' },
    ],
    dietaryNeeds: [
      { label: 'Large-breed puppy formula to slow bone growth', label_tr: 'Kemik büyümesini yavaşlatmak için büyük ırk yavru formülü' },
      { label: 'No exercise 2h after meals — critical bloat risk', label_tr: 'Yemekten 2 saat sonra egzersiz yok — kritik şişkinlik riski' },
    ],
    exerciseMinutesPerDay: [45, 90],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food allergies — beef, chicken', label_tr: 'Besin alerjileri — sığır eti, tavuk' },
      { label: 'Environmental allergies — skin', label_tr: 'Çevresel alerjiler — cilt' },
    ],
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
    temperament: [
      { label: 'Loyal and fearless', label_tr: 'Sadık ve korkusuz' },
      { label: 'Alert and obedient', label_tr: 'Tetikte ve itaatkâr' },
      { label: 'Highly intelligent', label_tr: 'Çok zeki' },
      { label: 'Protective of family', label_tr: 'Aileyi koruyucu' },
    ],
    dietaryNeeds: [
      { label: 'High-protein lean diet for muscle maintenance', label_tr: 'Kas bakımı için yüksek proteinli yağsız diyet' },
      { label: 'Taurine and L-carnitine support — DCM prevention', label_tr: 'Taurin ve L-karnitin desteği — DKM önleme' },
    ],
    exerciseMinutesPerDay: [60, 90],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food allergies — wheat and corn', label_tr: 'Besin alerjileri — buğday ve mısır' },
      { label: 'Environmental allergies — common', label_tr: 'Çevresel alerjiler — yaygın' },
    ],
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
    temperament: [
      { label: 'Cheerful and gentle', label_tr: 'Neşeli ve nazik' },
      { label: 'Eager to please', label_tr: 'Memnun etmeye hevesli' },
      { label: 'Sensitive — responds to positive training', label_tr: 'Hassas — olumlu eğitime iyi yanıt verir' },
      { label: 'Good family companion', label_tr: 'İyi aile arkadaşı' },
    ],
    dietaryNeeds: [
      { label: 'Moderate portions — weight gain tendency', label_tr: 'Orta porsiyonlar — kilo alma eğilimi' },
      { label: 'Omega-3 for ear and coat health', label_tr: 'Kulak ve tüy sağlığı için Omega-3' },
    ],
    exerciseMinutesPerDay: [30, 60],
    groomingFrequency: '3x-week',
    commonAllergies: [
      { label: 'Food allergies — common in the breed', label_tr: 'Besin alerjileri — ırkta yaygın' },
      { label: 'Ear infections related to allergies', label_tr: 'Alerjiye bağlı kulak enfeksiyonları' },
    ],
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
    temperament: [
      { label: 'Alert and spirited', label_tr: 'Tetikte ve canlı' },
      { label: 'Friendly and obedient', label_tr: 'Dostane ve itaatkâr' },
      { label: 'Intelligent and trainable', label_tr: 'Zeki ve eğitilebilir' },
      { label: 'Vocal watchdog', label_tr: 'Sesli bekçi köpek' },
    ],
    dietaryNeeds: [
      { label: 'Low-fat diet — pancreatitis risk', label_tr: 'Düşük yağlı diyet — pankreatit riski' },
      { label: 'Limit high-fat treats strictly', label_tr: 'Yüksek yağlı ödülleri kesinlikle sınırlayın' },
    ],
    exerciseMinutesPerDay: [30, 45],
    groomingFrequency: '3x-week',
    commonAllergies: [
      { label: 'Food allergies — quite common', label_tr: 'Besin alerjileri — oldukça yaygın' },
      { label: 'Skin allergies — environmental', label_tr: 'Cilt alerjileri — çevresel' },
    ],
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
    temperament: [
      { label: 'Lively and alert', label_tr: 'Canlı ve tetikte' },
      { label: 'Independent and devoted', label_tr: 'Bağımsız ve adanmış' },
      { label: 'Vocal watchdog', label_tr: 'Sesli bekçi köpek' },
      { label: 'Reserved with strangers', label_tr: 'Yabancılara karşı çekingen' },
    ],
    dietaryNeeds: [
      { label: 'Moderate portions — can be picky eater', label_tr: 'Orta porsiyonlar — seçici yiyici olabilir' },
      { label: 'Omega-3 for dense coat', label_tr: 'Yoğun tüy için Omega-3' },
    ],
    exerciseMinutesPerDay: [30, 60],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Skin allergies — fairly common', label_tr: 'Cilt alerjileri — oldukça yaygın' },
      { label: 'Food sensitivities', label_tr: 'Besin duyarlılıkları' },
    ],
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
    temperament: [
      { label: 'Charming and mischievous', label_tr: 'Büyüleyici ve yaramaz' },
      { label: 'Even-tempered and loving', label_tr: 'Dengeli ve sevgi dolu' },
      { label: 'Loves to cuddle', label_tr: 'Kucaklaşmayı sever' },
      { label: 'Stubborn at times', label_tr: 'Zaman zaman inatçı' },
    ],
    dietaryNeeds: [
      { label: 'Low-calorie strictly portioned diet', label_tr: 'Düşük kalorili, katı porsiyonlu diyet' },
      { label: 'Avoid foods that cause bloating and gas', label_tr: 'Şişkinlik ve gaz yapan yiyeceklerden kaçının' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Skin fold allergies — bacterial and yeast', label_tr: 'Cilt kıvrım alerjileri — bakteriyel ve maya' },
      { label: 'Food allergies — chicken, wheat', label_tr: 'Besin alerjileri — tavuk, buğday' },
    ],
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
    temperament: [
      { label: 'Loyal and dignified', label_tr: 'Sadık ve onurlu' },
      { label: 'Reserved with strangers', label_tr: 'Yabancılara karşı çekingen' },
      { label: 'Courageous and alert', label_tr: 'Cesur ve tetikte' },
      { label: 'Independent — challenging to train', label_tr: 'Bağımsız — eğitimi zorlu' },
    ],
    dietaryNeeds: [
      { label: 'High-quality protein — working dog background', label_tr: 'Yüksek kaliteli protein — çalışma köpeği geçmişi' },
      { label: 'Omega-3 for double coat maintenance', label_tr: 'Çift kat tüy bakımı için Omega-3' },
    ],
    exerciseMinutesPerDay: [45, 90],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'VKH syndrome (immune skin/eye disorder — Akita specific)', label_tr: 'VKH sendromu (bağışıklık kökenli cilt/göz bozukluğu — Akitaya özgü)' },
      { label: 'Food allergies — not uncommon', label_tr: 'Besin alerjileri — nadir değil' },
    ],
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
    temperament: [
      { label: 'Cheerful and gentle', label_tr: 'Neşeli ve nazik' },
      { label: 'Playful and curious', label_tr: 'Oyuncu ve meraklı' },
      { label: 'Friendly with everyone', label_tr: 'Herkese karşı dostane' },
      { label: 'Hypoallergenic — minimal shedding', label_tr: 'Hipoalerjenik — minimal dökülme' },
    ],
    dietaryNeeds: [
      { label: 'High-quality small-breed formula', label_tr: 'Yüksek kaliteli küçük ırk formülü' },
      { label: 'Avoid dyes and artificial additives — can cause tear staining', label_tr: 'Boyalar ve yapay katkılardan kaçının — gözyaşı lekesine yol açabilir' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: '3x-week',
    commonAllergies: [
      { label: 'Skin allergies — very common', label_tr: 'Cilt alerjileri — çok yaygın' },
      { label: 'Food allergies — chicken, beef, grain', label_tr: 'Besin alerjileri — tavuk, sığır eti, tahıl' },
    ],
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
    temperament: [
      { label: 'Friendly and gentle', label_tr: 'Arkadaşcıl ve nazik' },
      { label: 'Playful and sociable', label_tr: 'Oyuncu ve sosyal' },
      { label: 'Alert and lively', label_tr: 'Tetikte ve canlı' },
      { label: 'Stubborn independent streak', label_tr: 'İnatçı bağımsız eğilim' },
    ],
    dietaryNeeds: [
      { label: 'High-protein northern breed formula', label_tr: 'Yüksek proteinli kuzey ırkı formülü' },
      { label: 'Omega-3 for thick double coat', label_tr: 'Kalın çift kat tüy için Omega-3' },
    ],
    exerciseMinutesPerDay: [60, 90],
    groomingFrequency: '3x-week',
    commonAllergies: [
      { label: 'Skin allergies — common', label_tr: 'Cilt alerjileri — yaygın' },
      { label: 'Zinc-related skin conditions', label_tr: 'Çinkoyla ilgili cilt sorunları' },
    ],
  },
  {
    breed: 'Australian Shepherd',
    aliases: ['Aussie'],
    petType: 'Dog',
    healthRisks: [
      { label: 'MDR1 gene mutation — drug sensitivity', label_tr: 'MDR1 gen mutasyonu — ilaç duyarlılığı' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Epilepsy', label_tr: 'Epilepsi' },
      { label: 'Collie eye anomaly', label_tr: 'Collie göz anomalisi' },
    ],
    dailyCare: [
      { label: 'Brush 2–3× weekly — double coat, heavy seasonal shedding', label_tr: 'Haftada 2-3 kez fırçalama — çift kat, yoğun mevsimsel dökülme', category: 'grooming' },
      { label: '1.5–2h vigorous exercise/day — frisbee, agility, herding', label_tr: 'Günde 1.5-2 saat yoğun egzersiz — frisbee, çeviklik, güdücülük', category: 'exercise' },
      { label: '2 meals/day — active breed, fuel accordingly', label_tr: 'Günde 2 öğün — aktif ırk, buna göre besleyin', category: 'feeding' },
      { label: 'Needs daily mental challenge — puzzle feeders, training games', label_tr: 'Günlük zihinsel meydan okuma — bulmaca besleyici, eğitim oyunları', category: 'environment' },
      { label: 'MDR1 test before any medication; annual eye exam', label_tr: 'Her ilaçtan önce MDR1 testi; yıllık göz muayenesi', category: 'health' },
    ],
    careTips: [
      { label: 'Test for MDR1 mutation — common drug interactions', label_tr: 'MDR1 mutasyonu için test — sık görülen ilaç etkileşimleri' },
      { label: 'High-energy breed — needs a job or activity', label_tr: 'Yüksek enerjili ırk — bir iş veya aktivite gerektirir' },
      { label: 'Annual eye exam for CEA screening', label_tr: 'CEA taraması için yıllık göz muayenesi' },
    ],
    weightRangeKg: [16, 32],
    lifespanYears: [12, 15],
    temperament: [
      { label: 'Intelligent and work-driven', label_tr: 'Zeki ve iş odaklı' },
      { label: 'Loyal and protective', label_tr: 'Sadık ve koruyucu' },
      { label: 'Energetic and playful', label_tr: 'Enerjik ve oyuncu' },
      { label: 'Herding instinct — may nip at heels', label_tr: 'Güdücülük içgüdüsü — topuklara ısırabilir' },
    ],
    dietaryNeeds: [
      { label: 'High-calorie active-breed diet', label_tr: 'Yüksek kalorili aktif ırk diyeti' },
      { label: 'Taurine if grain-free diet chosen (DCM link)', label_tr: 'Tahılsız diyet seçilirse taurin (DKM bağlantısı)' },
    ],
    exerciseMinutesPerDay: [90, 120],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Drug sensitivity (MDR1) — not allergy but critical', label_tr: 'İlaç duyarlılığı (MDR1) — alerji değil ama kritik' },
      { label: 'Environmental allergies — some lines', label_tr: 'Çevresel alerjiler — bazı soylar' },
    ],
  },
  {
    breed: 'Shiba Inu',
    petType: 'Dog',
    healthRisks: [
      { label: 'Allergies (skin, food)', label_tr: 'Alerjiler (cilt, gıda)' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Patellar luxation', label_tr: 'Patella luksasyonu' },
      { label: 'Eye conditions (glaucoma, PRA)', label_tr: 'Göz sorunları (glokom, PRA)' },
    ],
    dailyCare: [
      { label: 'Brush weekly, daily during shedding season (twice yearly)', label_tr: 'Haftalık fırçalama, yılda iki kez olan dökülme sezonunda günlük', category: 'grooming' },
      { label: '1h moderate exercise/day — leash essential, high prey drive', label_tr: 'Günde 1 saat orta egzersiz — tasma şart, yüksek av içgüdüsü', category: 'exercise' },
      { label: '2 meals/day — high-quality protein-based diet', label_tr: 'Günde 2 öğün — yüksek kaliteli protein bazlı diyet', category: 'feeding' },
      { label: 'Never off-leash in open areas — strong escape instinct', label_tr: 'Açık alanlarda asla tasmasız — güçlü kaçma içgüdüsü', category: 'environment' },
      { label: 'Annual eye exam + allergy panel if scratching persists', label_tr: 'Yıllık göz muayenesi + kalıcı kaşıntıda alerji paneli', category: 'health' },
    ],
    careTips: [
      { label: 'Always leash in open areas — high prey drive', label_tr: 'Açık alanlarda her zaman tasmada tutun — yüksek av içgüdüsü' },
      { label: 'Early socialisation reduces aggression', label_tr: 'Erken sosyalleşme saldırganlığı azaltır' },
      { label: 'Annual eye + skin checkup', label_tr: 'Yıllık göz + cilt kontrolü' },
    ],
    weightRangeKg: [7, 11],
    lifespanYears: [13, 16],
    temperament: [
      { label: 'Bold and alert', label_tr: 'Cesur ve tetikte' },
      { label: 'Loyal but independent', label_tr: 'Sadık ama bağımsız' },
      { label: 'Clean and cat-like in habits', label_tr: 'Temiz ve kedi gibi alışkanlıklar' },
      { label: 'Can be stubborn and strong-willed', label_tr: 'İnatçı ve iradeli olabilir' },
    ],
    dietaryNeeds: [
      { label: 'High-protein grain-free if allergic', label_tr: 'Alerjik ise yüksek proteinli tahılsız' },
      { label: 'Omega-3 for skin and coat health', label_tr: 'Cilt ve tüy sağlığı için Omega-3' },
    ],
    exerciseMinutesPerDay: [60, 90],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food allergies — chicken and grains', label_tr: 'Besin alerjileri — tavuk ve tahıllar' },
      { label: 'Environmental skin allergies — very common', label_tr: 'Çevresel cilt alerjileri — çok yaygın' },
    ],
  },
  {
    breed: 'Jack Russell Terrier',
    aliases: ['Parson Russell Terrier', 'JRT'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Lens luxation — can lead to blindness', label_tr: 'Lens luksasyonu — körlüğe yol açabilir' },
      { label: 'Patellar luxation', label_tr: 'Patella luksasyonu' },
      { label: 'Deafness (linked to white coat genetics)', label_tr: 'Sağırlık (beyaz tüy genetiği ile ilişkili)' },
      { label: 'Legg-Calvé-Perthes disease', label_tr: 'Legg-Calvé-Perthes hastalığı' },
    ],
    dailyCare: [
      { label: 'Brush weekly — smooth coat; strip rough-coated 2× yearly', label_tr: 'Haftalık fırçalama — düz tüy; sert tüylü ırk için yılda 2 kez tüy alma', category: 'grooming' },
      { label: '1–1.5h active play/day — digging, chasing, ball games', label_tr: 'Günde 1-1.5 saat aktif oyun — kazma, kovalama, top oyunları', category: 'exercise' },
      { label: '2 small meals/day — portion carefully, prone to obesity', label_tr: 'Günde 2 küçük öğün — porsiyonları dikkatle ayarlayın, obeziteye eğilimli', category: 'feeding' },
      { label: 'Secure fencing — great escape artist', label_tr: 'Güvenli çit — kaçma konusunda ustadır', category: 'environment' },
      { label: 'Annual eye exam (lens luxation screen) + patellar check', label_tr: 'Yıllık göz muayenesi (lens luksasyonu taraması) + patella kontrolü', category: 'health' },
    ],
    careTips: [
      { label: 'Annual eye exam — lens luxation can progress quickly', label_tr: 'Yıllık göz muayenesi — lens luksasyonu hızlıca ilerleyebilir' },
      { label: 'Secure garden essential — very high escape instinct', label_tr: 'Güvenli bahçe şart — çok yüksek kaçma içgüdüsü' },
      { label: 'Mental stimulation as important as physical exercise', label_tr: 'Zihinsel uyarım fiziksel egzersiz kadar önemli' },
    ],
    weightRangeKg: [5, 8],
    lifespanYears: [13, 16],
    temperament: [
      { label: 'Energetic and fearless', label_tr: 'Enerjik ve korkusuz' },
      { label: 'Tenacious and clever', label_tr: 'Azimli ve zeki' },
      { label: 'Vocal and alert', label_tr: 'Sesli ve tetikte' },
      { label: 'Can be stubborn — needs firm training', label_tr: 'İnatçı olabilir — kararlı eğitim gerektirir' },
    ],
    dietaryNeeds: [
      { label: 'Small-breed high-protein formula', label_tr: 'Küçük ırk yüksek proteinli formül' },
      { label: 'Strict portions — gains weight despite high activity', label_tr: 'Katı porsiyonlar — yüksek aktiviteye rağmen kilo alır' },
    ],
    exerciseMinutesPerDay: [60, 90],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Skin allergies — atopy common', label_tr: 'Cilt alerjileri — atopi yaygın' },
      { label: 'Food sensitivities — some lines', label_tr: 'Besin duyarlılıkları — bazı soylar' },
    ],
  },
  {
    breed: 'Dalmatian',
    petType: 'Dog',
    healthRisks: [
      { label: 'Congenital deafness (one or both ears)', label_tr: 'Konjenital sağırlık (bir veya iki kulak)' },
      { label: 'Urinary urate stones (unique uric acid metabolism)', label_tr: 'Üriner ürat taşları (özgün ürik asit metabolizması)' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Skin allergies', label_tr: 'Cilt alerjileri' },
    ],
    dailyCare: [
      { label: 'Brush weekly — short coat, year-round shedding', label_tr: 'Haftalık fırçalama — kısa tüy, yıl boyu dökülme', category: 'grooming' },
      { label: '1.5–2h vigorous exercise/day — running, cycling companion', label_tr: 'Günde 1.5-2 saat yoğun egzersiz — koşu, bisiklet arkadaşı', category: 'exercise' },
      { label: 'Low-purine diet recommended — prevents urate stone formation', label_tr: 'Düşük pürin diyeti önerilir — ürat taşı oluşumunu önler', category: 'feeding' },
      { label: 'Needs ample space and daily outdoor runs', label_tr: 'Geniş alan ve günlük dış mekan koşuları gerektirir', category: 'environment' },
      { label: 'Hearing test (BAER) at 6 weeks if breeding; urine screen annually', label_tr: 'Üretimde 6. haftada işitme testi (BAER); yıllık idrar taraması', category: 'health' },
    ],
    careTips: [
      { label: 'Low-purine diet reduces urate stone risk', label_tr: 'Düşük pürin diyeti ürat taşı riskini azaltır' },
      { label: 'BAER hearing test recommended as pup', label_tr: 'Yavruken BAER işitme testi önerilir' },
      { label: 'High endurance breed — needs long daily runs', label_tr: 'Yüksek dayanıklılık ırkı — uzun günlük koşular gerektirir' },
    ],
    weightRangeKg: [22, 32],
    lifespanYears: [11, 13],
    temperament: [
      { label: 'Energetic and playful', label_tr: 'Enerjik ve oyuncu' },
      { label: 'Sensitive and loyal', label_tr: 'Hassas ve sadık' },
      { label: 'Outgoing and friendly', label_tr: 'Dışa dönük ve arkadaşcıl' },
      { label: 'Needs early socialisation', label_tr: 'Erken sosyalleşmeye ihtiyaç duyar' },
    ],
    dietaryNeeds: [
      { label: 'Low-purine diet is essential — unique urate metabolism', label_tr: 'Düşük pürin diyeti şart — özgün ürat metabolizması' },
      { label: 'Avoid organ meats (liver, kidney) — very high purine', label_tr: 'Sakatat (ciğer, böbrek) kaçının — çok yüksek pürin' },
    ],
    exerciseMinutesPerDay: [90, 120],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food allergies — grain or beef', label_tr: 'Besin alerjileri — tahıl veya sığır eti' },
      { label: 'Environmental skin allergies', label_tr: 'Çevresel cilt alerjileri' },
    ],
  },
  {
    breed: 'Alaskan Malamute',
    petType: 'Dog',
    healthRisks: [
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Hypothyroidism', label_tr: 'Hipotiroidizm' },
      { label: 'Inherited polyneuropathy', label_tr: 'Kalıtsal polinöropati' },
      { label: 'Chondrodysplasia (dwarfism gene)', label_tr: 'Kondrodisplazi (cücelik geni)' },
    ],
    dailyCare: [
      { label: 'Brush 2–3× weekly; daily during bi-annual coat blow', label_tr: 'Haftada 2-3 kez fırçalama; yılda iki kez olan tüy değişiminde günlük', category: 'grooming' },
      { label: '1.5–2h vigorous exercise/day — sled, weight-pulling, hiking', label_tr: 'Günde 1.5-2 saat yoğun egzersiz — kızak, ağırlık çekme, yürüyüş', category: 'exercise' },
      { label: '2 high-protein meals/day — working-dog metabolism', label_tr: 'Günde 2 yüksek proteinli öğün — çalışma köpeği metabolizması', category: 'feeding' },
      { label: 'Needs cool environment — suffers in heat; space for digging', label_tr: 'Serin ortam gerektirir — sıcakta zorlanır; kazma için alan', category: 'environment' },
      { label: 'Annual thyroid panel + hip screening; watch for heat exhaustion', label_tr: 'Yıllık tiroid paneli + kalça taraması; ısı bitkinliğine dikkat', category: 'health' },
    ],
    careTips: [
      { label: 'Keep cool — very heat-sensitive', label_tr: 'Serin tutun — sıcağa çok duyarlı' },
      { label: 'Annual thyroid panel recommended', label_tr: 'Yıllık tiroid paneli önerilir' },
      { label: 'Needs strong owner — independent and powerful', label_tr: 'Güçlü sahip gerektirir — bağımsız ve güçlü' },
    ],
    weightRangeKg: [32, 43],
    lifespanYears: [10, 14],
    temperament: [
      { label: 'Affectionate and loyal', label_tr: 'Sevecen ve sadık' },
      { label: 'Playful but dominant', label_tr: 'Oyuncu ama dominant' },
      { label: 'Independent — difficult to train for novices', label_tr: 'Bağımsız — yeni başlayanlar için zor eğitim' },
      { label: 'Pack-oriented', label_tr: 'Sürü odaklı' },
    ],
    dietaryNeeds: [
      { label: 'High-protein working-dog formula', label_tr: 'Yüksek proteinli çalışma köpeği formülü' },
      { label: 'Reduce portions in summer — less active in heat', label_tr: 'Yazın porsiyonları azaltın — sıcakta daha az aktif' },
    ],
    exerciseMinutesPerDay: [90, 120],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Zinc-responsive skin condition (similar to Huskies)', label_tr: 'Çinkoya duyarlı cilt sorunu (Huskylere benzer)' },
      { label: 'Environmental allergies', label_tr: 'Çevresel alerjiler' },
    ],
  },
  {
    breed: 'Bernese Mountain Dog',
    aliases: ['Berner', 'Berner Sennenhund'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Cancer (highest rate of any breed — ~50%)', label_tr: 'Kanser (tüm ırklar arasında en yüksek oran — ~%50)' },
      { label: 'Hip & elbow dysplasia', label_tr: 'Kalça & dirsek displazisi' },
      { label: 'Von Willebrand disease', label_tr: 'Von Willebrand hastalığı' },
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
    ],
    dailyCare: [
      { label: 'Brush 2–3× weekly — heavy tri-colour double coat', label_tr: 'Haftada 2-3 kez fırçalama — yoğun üç renkli çift kat tüy', category: 'grooming' },
      { label: '1h moderate exercise/day — avoid overexertion before 18 months', label_tr: 'Günde 1 saat orta egzersiz — 18 aydan önce aşırı zorlamaktan kaçının', category: 'exercise' },
      { label: '2 meals/day — age-appropriate portions; prone to bloat', label_tr: 'Günde 2 öğün — yaşa uygun porsiyonlar; şişkinliğe eğilimli', category: 'feeding' },
      { label: 'Prefers cool climates — limit outdoor time in heat', label_tr: 'Serin iklimleri tercih eder — sıcakta dış mekan süresini sınırlayın', category: 'environment' },
      { label: 'Annual cancer screening from age 5 + cardiac + hip evaluation', label_tr: '5 yaşından itibaren yıllık kanser taraması + kardiyak + kalça değerlendirmesi', category: 'health' },
    ],
    careTips: [
      { label: 'Cancer screening critical — starts from age 5', label_tr: 'Kanser taraması kritik — 5 yaşından başlar' },
      { label: 'Short lifespan (~7–10 years) — regular checkups essential', label_tr: 'Kısa yaşam süresi (~7-10 yıl) — düzenli kontroller şart' },
      { label: 'Keep cool — poor heat tolerance', label_tr: 'Serin tutun — sıcağa toleransı düşük' },
    ],
    weightRangeKg: [32, 52],
    lifespanYears: [7, 10],
    temperament: [
      { label: 'Gentle and calm', label_tr: 'Nazik ve sakin' },
      { label: 'Loyal and affectionate', label_tr: 'Sadık ve sevecen' },
      { label: 'Good-natured with children', label_tr: 'Çocuklarla iyi huylu' },
      { label: 'Sensitive — harsh training backfires', label_tr: 'Hassas — sert eğitim ters etki yapar' },
    ],
    dietaryNeeds: [
      { label: 'Large-breed formula with joint support', label_tr: 'Eklem desteği olan büyük ırk formülü' },
      { label: 'Antioxidant-rich diet — cancer prevention support', label_tr: 'Antioksidanlardan zengin diyet — kanser önleme desteği' },
    ],
    exerciseMinutesPerDay: [60, 90],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Food allergies — common in the breed', label_tr: 'Besin alerjileri — ırkta yaygın' },
      { label: 'Environmental allergies — skin manifestation', label_tr: 'Çevresel alerjiler — cilt belirtisi' },
    ],
  },
  {
    breed: 'Belgian Malinois',
    aliases: ['Malinois', 'Mali', 'Belçika Malinua'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Elbow dysplasia', label_tr: 'Dirsek displazisi' },
      { label: 'Progressive retinal atrophy', label_tr: 'Progresif retinal atrofi' },
      { label: 'Epilepsy', label_tr: 'Epilepsi' },
    ],
    dailyCare: [
      { label: 'Brush weekly — short dense coat, year-round shedding', label_tr: 'Haftalık fırçalama — kısa yoğun tüy, yıl boyu dökülme', category: 'grooming' },
      { label: '2h+ intense exercise/day — running, Schutzhund, bite sports', label_tr: 'Günde 2+ saat yoğun egzersiz — koşu, Schutzhund, koruma sporları', category: 'exercise' },
      { label: '2 meals/day — high-energy working-dog formula', label_tr: 'Günde 2 öğün — yüksek enerjili çalışma köpeği formülü', category: 'feeding' },
      { label: 'Needs a job and strict mental routine — destructive without it', label_tr: 'Bir iş ve sıkı zihinsel rutin gerektirir — yoksa yıkıcı olur', category: 'environment' },
      { label: 'Annual hip + eye screening; watch for thyroid issues', label_tr: 'Yıllık kalça + göz taraması; tiroid sorunlarına dikkat', category: 'health' },
    ],
    careTips: [
      { label: 'Extremely high drive — not a beginner dog', label_tr: 'Son derece yüksek dürtü — yeni başlayan için uygun değil' },
      { label: 'Needs structured daily training, not just exercise', label_tr: 'Sadece egzersiz değil, yapılandırılmış günlük eğitim gerektirir' },
      { label: 'Annual hip and eye evaluation', label_tr: 'Yıllık kalça ve göz değerlendirmesi' },
    ],
    weightRangeKg: [20, 30],
    lifespanYears: [12, 14],
    temperament: [
      { label: 'Highly driven and intense', label_tr: 'Son derece azimli ve yoğun' },
      { label: 'Loyal and obedient with proper handler', label_tr: 'Uygun sahibiyle sadık ve itaatkâr' },
      { label: 'Alert and watchful', label_tr: 'Tetikte ve gözetleyici' },
      { label: 'Not recommended for first-time owners', label_tr: 'İlk kez köpek sahipleri için önerilmez' },
    ],
    dietaryNeeds: [
      { label: 'High-protein working-dog formula', label_tr: 'Yüksek proteinli çalışma köpeği formülü' },
      { label: 'Adjust calories to training intensity', label_tr: 'Kalorileri antrenman yoğunluğuna göre ayarlayın' },
    ],
    exerciseMinutesPerDay: [120, 180],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food sensitivities — relatively low incidence', label_tr: 'Besin duyarlılıkları — görece düşük insidans' },
      { label: 'Environmental allergies — some lines', label_tr: 'Çevresel alerjiler — bazı soylar' },
    ],
  },
  {
    breed: 'Cane Corso',
    aliases: ['Italian Mastiff'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Gastric dilatation-volvulus (bloat)', label_tr: 'Mide dilatasyonu-volvulusu (şişkinlik)' },
      { label: 'Entropion / ectropion (eyelid defects)', label_tr: 'Entropion / ektropion (göz kapağı defektleri)' },
      { label: 'Cardiac disease (DCM)', label_tr: 'Kalp hastalığı (DKM)' },
    ],
    dailyCare: [
      { label: 'Brush weekly — short easy-care coat', label_tr: 'Haftalık fırçalama — kısa, bakımı kolay tüy', category: 'grooming' },
      { label: '1.5h moderate exercise/day — avoid intense activity after meals', label_tr: 'Günde 1.5 saat orta egzersiz — yemekten sonra yoğun aktiviteden kaçının', category: 'exercise' },
      { label: '2 meals/day — no exercise 1h before and 2h after meals (bloat risk)', label_tr: 'Günde 2 öğün — yemekten 1 saat önce ve 2 saat sonra egzersiz yok (şişkinlik riski)', category: 'feeding' },
      { label: 'Secure fencing — powerful dog with territorial instincts', label_tr: 'Güvenli çit — toprak koruma içgüdüsüne sahip güçlü köpek', category: 'environment' },
      { label: 'Annual cardiac echo + hip evaluation + eye exam', label_tr: 'Yıllık kardiyak eko + kalça değerlendirmesi + göz muayenesi', category: 'health' },
    ],
    careTips: [
      { label: 'Bloat risk — feed from floor level, avoid post-meal exercise', label_tr: 'Şişkinlik riski — yerde besleyin, yemek sonrası egzersizden kaçının' },
      { label: 'Early obedience training essential — strong and wilful', label_tr: 'Erken itaat eğitimi şart — güçlü ve inatçı' },
      { label: 'Annual cardiac screening', label_tr: 'Yıllık kardiyak tarama' },
    ],
    weightRangeKg: [40, 60],
    lifespanYears: [9, 12],
    temperament: [
      { label: 'Stable and even-tempered', label_tr: 'Dengeli ve sakin huylu' },
      { label: 'Loyal and protective', label_tr: 'Sadık ve koruyucu' },
      { label: 'Reserved with strangers', label_tr: 'Yabancılara karşı çekingen' },
      { label: 'Requires experienced owner', label_tr: 'Deneyimli sahip gerektirir' },
    ],
    dietaryNeeds: [
      { label: 'Large-breed formula — restrict calcium in puppies', label_tr: 'Büyük ırk formülü — yavru köpeklerde kalsiyumu kısıtlayın' },
      { label: 'No exercise around mealtimes — bloat risk', label_tr: 'Öğün zamanlarında egzersiz yok — şişkinlik riski' },
    ],
    exerciseMinutesPerDay: [60, 90],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food allergies — wheat, soy', label_tr: 'Besin alerjileri — buğday, soya' },
      { label: 'Environmental allergies — skin', label_tr: 'Çevresel alerjiler — cilt' },
    ],
  },
  {
    breed: 'Kangal',
    aliases: ['Kangal Çoban Köpeği', 'Sivas Kangal', 'Kangal Shepherd Dog'],
    matchKeywords: ['kangal'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Lipoma (benign fatty tumours)', label_tr: 'Lipom (iyi huylu yağ tümörleri)' },
      { label: 'Entropion (eyelid rolling inward)', label_tr: 'Entropion (göz kapağı içe dönmesi)' },
      { label: 'Hypothyroidism in senior dogs', label_tr: 'Yaşlı köpeklerde hipotiroidizm' },
    ],
    dailyCare: [
      { label: 'Brush 2× weekly; daily in spring coat shed', label_tr: 'Haftada 2 kez fırçalama; ilkbahar tüy dökümünde günlük', category: 'grooming' },
      { label: '1.5–2h outdoor exercise/day — needs space, not city-suited', label_tr: 'Günde 1.5-2 saat dış mekan egzersizi — geniş alan gerektirir, şehre uygun değil', category: 'exercise' },
      { label: '2 measured meals/day — avoid overfeeding to protect joints', label_tr: 'Günde 2 ölçülü öğün — eklemleri korumak için aşırı besleme yok', category: 'feeding' },
      { label: 'Large secure space needed — strong guardian instinct', label_tr: 'Büyük güvenli alan gerektirir — güçlü koruma içgüdüsü', category: 'environment' },
      { label: 'Annual hip screening + eye exam + parasite prevention', label_tr: 'Yıllık kalça taraması + göz muayenesi + parazit önlemi', category: 'health' },
    ],
    careTips: [
      { label: 'Needs a large property — not suited for apartment living', label_tr: 'Geniş arazi gerektirir — apartman hayatına uygun değil' },
      { label: 'Annual hip and eye evaluation', label_tr: 'Yıllık kalça ve göz değerlendirmesi' },
      { label: 'One of the hardiest and healthiest large breeds', label_tr: 'En dayanıklı ve sağlıklı büyük ırklardan biri' },
    ],
    weightRangeKg: [40, 65],
    lifespanYears: [12, 15],
    temperament: [
      { label: 'Calm and independent', label_tr: 'Sakin ve bağımsız' },
      { label: 'Loyal to livestock and family', label_tr: 'Hayvanlara ve aileye sadık' },
      { label: 'Protective and alert', label_tr: 'Koruyucu ve tetikte' },
      { label: 'Not suited for apartment life', label_tr: 'Apartman hayatına uygun değil' },
    ],
    dietaryNeeds: [
      { label: 'High-quality large-breed formula', label_tr: 'Yüksek kaliteli büyük ırk formülü' },
      { label: 'Avoid overfeeding — prone to obesity with low activity', label_tr: 'Aşırı besleme yapmayın — düşük aktivitede obeziteye eğilimli' },
    ],
    exerciseMinutesPerDay: [60, 90],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Generally robust — low allergy incidence', label_tr: 'Genellikle dayanıklı — düşük alerji insidansı' },
      { label: 'Flea allergy dermatitis in some dogs', label_tr: 'Bazı köpeklerde pire alerjisi dermatiti' },
    ],
  },
  {
    breed: 'Anatolian Shepherd Dog',
    aliases: ['Anadolu Çoban Köpeği', 'Coban Kopegi', 'Çoban Köpeği', 'Karabas'],
    matchKeywords: ['anadolu çoban', 'coban kopegi', 'çoban köpeği', 'karabaş'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Hypothyroidism', label_tr: 'Hipotiroidizm' },
      { label: 'Entropion', label_tr: 'Entropion' },
      { label: 'Sensitivity to anaesthesia', label_tr: 'Anesteziye duyarlılık' },
    ],
    dailyCare: [
      { label: 'Brush weekly; extra care in spring blowout', label_tr: 'Haftalık fırçalama; ilkbahar tüy dökümünde ekstra bakım', category: 'grooming' },
      { label: '1–1.5h patrolling/outdoor exercise — needs territory to roam', label_tr: 'Günde 1-1.5 saat devriye/dış mekan egzersizi — gezecek alan gerektirir', category: 'exercise' },
      { label: '2 meals/day — balanced portions for large slow-metabolism breed', label_tr: 'Günde 2 öğün — yavaş metabolizmalı büyük ırk için dengeli porsiyonlar', category: 'feeding' },
      { label: 'Open space essential — high territorial guardian behaviour', label_tr: 'Açık alan şart — yüksek toprak koruma davranışı', category: 'environment' },
      { label: 'Inform vet of anaesthesia sensitivity; annual parasite + joint check', label_tr: 'Veterineri anestezi duyarlılığı konusunda bilgilendirin; yıllık parazit + eklem kontrolü', category: 'health' },
    ],
    careTips: [
      { label: 'Alert vet to anaesthesia sensitivity before any procedure', label_tr: 'Her işlem öncesi veterineri anestezi duyarlılığı konusunda uyarın' },
      { label: 'Needs open land — not apartment-friendly', label_tr: 'Açık arazi gerektirir — apartmana uygun değil' },
      { label: 'Naturally healthy — regular parasite prevention key', label_tr: 'Doğal olarak sağlıklı — düzenli parazit önlemi anahtar' },
    ],
    weightRangeKg: [40, 68],
    lifespanYears: [11, 13],
    temperament: [
      { label: 'Independent and self-reliant', label_tr: 'Bağımsız ve özgüveni yüksek' },
      { label: 'Loyal to family and flock', label_tr: 'Aileye ve sürüye sadık' },
      { label: 'Calm but decisive', label_tr: 'Sakin ama kararlı' },
      { label: 'Not suitable for novice owners', label_tr: 'Deneyimsiz sahiplere uygun değil' },
    ],
    dietaryNeeds: [
      { label: 'Quality large-breed formula — avoid overfeeding', label_tr: 'Kaliteli büyük ırk formülü — aşırı besleme yapmayın' },
      { label: 'Joint supplements from age 6', label_tr: '6 yaşından itibaren eklem takviyeleri' },
    ],
    exerciseMinutesPerDay: [60, 90],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Low allergy incidence — hardy native breed', label_tr: 'Düşük alerji insidansı — dayanıklı yerli ırk' },
      { label: 'Flea/tick sensitivity common in outdoor dogs', label_tr: 'Dış mekan köpeklerinde pire/kene duyarlılığı yaygın' },
    ],
  },
  {
    breed: 'Pembroke Welsh Corgi',
    aliases: ['Corgi', 'Welsh Corgi', 'Pembroke Corgi'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Intervertebral disc disease (IVDD)', label_tr: 'İntervertebral disk hastalığı (IVDD)' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Progressive retinal atrophy (PRA)', label_tr: 'Progresif retinal atrofi (PRA)' },
      { label: 'Von Willebrand disease', label_tr: 'Von Willebrand hastalığı' },
    ],
    dailyCare: [
      { label: 'Brush 2–3× weekly — double coat, heavy seasonal shedding', label_tr: 'Haftada 2-3 kez fırçalama — çift kat, yoğun mevsimsel dökülme', category: 'grooming' },
      { label: '45–60 min active exercise/day — herding background, needs variety', label_tr: 'Günde 45-60 dk aktif egzersiz — güdücülük geçmişi, çeşitlilik gerektirir', category: 'exercise' },
      { label: '2 measured meals/day — very prone to obesity', label_tr: 'Günde 2 ölçülü öğün — obeziteye çok yatkın', category: 'feeding' },
      { label: 'No jumping on/off furniture — protects long back and short legs', label_tr: 'Mobilyaya atlamayın — uzun sırtı ve kısa bacakları korur', category: 'environment' },
      { label: 'Annual eye exam (PRA) + back/hip screening', label_tr: 'Yıllık göz muayenesi (PRA) + sırt/kalça taraması', category: 'health' },
    ],
    careTips: [
      { label: 'Avoid jumping — long spine is IVDD risk', label_tr: 'Atlamaktan kaçının — uzun omurga IVDD riski taşır' },
      { label: 'Strict portion control — gains weight very easily', label_tr: 'Katı porsiyon kontrolü — çok kolay kilo alır' },
      { label: 'Annual PRA eye screening', label_tr: 'Yıllık PRA göz taraması' },
    ],
    temperament: [
      { label: 'Intelligent and eager to please', label_tr: 'Zeki ve memnun etmeye hevesli' },
      { label: 'Affectionate with family', label_tr: 'Aileye karşı sevecen' },
      { label: 'Alert and vocal — natural watchdog', label_tr: 'Tetikte ve sesli — doğal bekçi köpek' },
      { label: 'Strong herding instinct', label_tr: 'Güçlü güdücülük içgüdüsü' },
    ],
    dietaryNeeds: [
      { label: 'Low-calorie diet — obesity triggers IVDD', label_tr: 'Düşük kalorili diyet — obezite IVDD\'yi tetikler' },
      { label: 'Joint supplements (glucosamine) after age 4', label_tr: '4 yaşından sonra eklem takviyeleri (glukozamin)' },
    ],
    exerciseMinutesPerDay: [45, 60],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Grain / wheat sensitivity (some lines)', label_tr: 'Tahıl / buğday duyarlılığı (bazı soylar)' },
      { label: 'Flea allergy dermatitis', label_tr: 'Pire alerjisi dermatiti' },
    ],
    weightRangeKg: [9, 14],
    lifespanYears: [12, 15],
  },
  {
    breed: 'Havanese',
    aliases: ['Havanais'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Progressive retinal atrophy (PRA)', label_tr: 'Progresif retinal atrofi (PRA)' },
      { label: 'Legg-Calvé-Perthes disease', label_tr: 'Legg-Calvé-Perthes hastalığı' },
      { label: 'Patellar luxation', label_tr: 'Patella luksasyonu' },
      { label: 'Dental disease — common in small breeds', label_tr: 'Diş hastalığı — küçük ırklarda yaygın' },
    ],
    dailyCare: [
      { label: 'Brush daily or clip short every 6–8 weeks', label_tr: 'Günlük fırçalama veya 6-8 haftada bir kısa kırpma', category: 'grooming' },
      { label: '30–45 min moderate exercise/day — indoor play counts', label_tr: 'Günde 30-45 dk orta egzersiz — iç mekan oyunu da sayılır', category: 'exercise' },
      { label: '2 small meals/day — small stomach, high-quality kibble', label_tr: 'Günde 2 küçük öğün — küçük mide, yüksek kaliteli mama', category: 'feeding' },
      { label: 'Apartment-friendly — does well indoors with short walks', label_tr: 'Apartmana uygun — kısa yürüyüşlerle iç mekanda iyi eder', category: 'environment' },
      { label: 'Annual eye exam + patella + dental scaling', label_tr: 'Yıllık göz muayenesi + patella + diş taşı temizliği', category: 'health' },
    ],
    careTips: [
      { label: 'Daily brushing prevents painful matting', label_tr: 'Günlük fırçalama acı veren dolanmaları önler' },
      { label: 'Annual dental cleaning — small dog dental disease', label_tr: 'Yıllık diş temizliği — küçük köpek diş hastalığı' },
      { label: 'Separation anxiety prone — needs companionship', label_tr: 'Ayrılık anksiyetesine eğilimli — arkadaşlık gerektirir' },
    ],
    temperament: [
      { label: 'Playful and gentle', label_tr: 'Oyuncu ve nazik' },
      { label: 'Very social — gets along with children and other pets', label_tr: 'Çok sosyal — çocuklar ve diğer evcil hayvanlarla iyi geçinir' },
      { label: 'Intelligent — trains easily', label_tr: 'Zeki — kolayca eğitilir' },
      { label: 'Prone to separation anxiety', label_tr: 'Ayrılık anksiyetesine eğilimli' },
    ],
    dietaryNeeds: [
      { label: 'Small-breed formula — higher energy density, small kibble', label_tr: 'Küçük ırk formülü — yüksek enerji yoğunluğu, küçük mama tanesi' },
      { label: 'Dental chews help reduce tartar', label_tr: 'Diş çiğneme ödülleri tartar azaltmaya yardımcı olur' },
    ],
    exerciseMinutesPerDay: [30, 45],
    groomingFrequency: 'daily',
    commonAllergies: [
      { label: 'Environmental allergies (pollen, dust)', label_tr: 'Çevresel alerjiler (polen, toz)' },
      { label: 'Food sensitivities — chicken or grain in some dogs', label_tr: 'Besin duyarlılığı — bazı köpeklerde tavuk veya tahıl' },
    ],
    weightRangeKg: [3, 6],
    lifespanYears: [14, 16],
  },
  {
    breed: 'Weimaraner',
    aliases: ['Gri Hayalet'],
    petType: 'Dog',
    healthRisks: [
      { label: 'Gastric dilatation-volvulus (bloat)', label_tr: 'Mide dilatasyonu-volvulusu (şişkinlik)' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Hypothyroidism', label_tr: 'Hipotiroidizm' },
      { label: 'Spinal dysraphism (hereditary in some lines)', label_tr: 'Spinal disrafi (bazı soyda kalıtsal)' },
    ],
    dailyCare: [
      { label: 'Brush weekly — short sleek coat, minimal shedding', label_tr: 'Haftalık fırçalama — kısa parlak tüy, minimal dökülme', category: 'grooming' },
      { label: '1.5–2h vigorous exercise/day — hunting breed, high stamina', label_tr: 'Günde 1.5-2 saat yoğun egzersiz — av köpeği, yüksek dayanıklılık', category: 'exercise' },
      { label: '2 meals/day — no exercise 1h before or 2h after eating (bloat risk)', label_tr: 'Günde 2 öğün — yemekten 1 saat önce ve 2 saat sonra egzersiz yok (şişkinlik riski)', category: 'feeding' },
      { label: 'Needs large space and daily long runs', label_tr: 'Geniş alan ve günlük uzun koşular gerektirir', category: 'environment' },
      { label: 'Annual thyroid panel + hip evaluation; bloat prevention protocol', label_tr: 'Yıllık tiroid paneli + kalça değerlendirmesi; şişkinlik önleme protokolü', category: 'health' },
    ],
    careTips: [
      { label: 'Bloat is life-threatening — never exercise around mealtimes', label_tr: 'Şişkinlik hayati tehlike — öğün zamanlarında kesinlikle egzersiz yaptırmayın' },
      { label: 'Annual thyroid screening', label_tr: 'Yıllık tiroid taraması' },
      { label: 'Extremely high energy — not suited for sedentary owners', label_tr: 'Son derece yüksek enerji — hareketsiz sahipler için uygun değil' },
    ],
    temperament: [
      { label: 'Energetic and driven', label_tr: 'Enerjik ve azimli' },
      { label: 'Loyal and affectionate with family', label_tr: 'Aileye sadık ve sevecen' },
      { label: 'Intelligent but stubborn', label_tr: 'Zeki ama inatçı' },
      { label: 'High prey drive', label_tr: 'Yüksek av içgüdüsü' },
    ],
    dietaryNeeds: [
      { label: 'Slow-feeder bowl recommended — reduces bloat risk', label_tr: 'Yavaş besleyici kap önerilir — şişkinlik riskini azaltır' },
      { label: 'High-protein active-breed formula', label_tr: 'Yüksek proteinli aktif ırk formülü' },
    ],
    exerciseMinutesPerDay: [90, 120],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food allergies — beef or dairy in some dogs', label_tr: 'Besin alerjisi — bazı köpeklerde sığır eti veya süt ürünleri' },
      { label: 'Environmental allergies (grass, pollen)', label_tr: 'Çevresel alerjiler (çimen, polen)' },
    ],
    weightRangeKg: [25, 40],
    lifespanYears: [10, 13],
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
    temperament: [
      { label: 'Varies by individual', label_tr: 'Bireye göre değişir' },
      { label: 'Often adaptable and resilient', label_tr: 'Genellikle uyumlu ve dayanıklı' },
      { label: 'Hybrid vigor — often very robust', label_tr: 'Hibrit güç — genellikle çok güçlü' },
    ],
    dietaryNeeds: [
      { label: 'Feed according to size and activity level', label_tr: 'Boyut ve aktivite düzeyine göre besleyin' },
      { label: 'Annual weight assessment to adjust portions', label_tr: 'Porsiyonu ayarlamak için yıllık kilo değerlendirmesi' },
    ],
    exerciseMinutesPerDay: [30, 60],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Allergy profile depends on breed mix', label_tr: 'Alerji profili ırk karışımına bağlıdır' },
      { label: 'Skin and food allergies possible', label_tr: 'Cilt ve besin alerjileri mümkün' },
    ],
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
    temperament: [
      { label: 'Calm and easygoing', label_tr: 'Sakin ve kolay huylu' },
      { label: 'Affectionate but not demanding', label_tr: 'Sevecen ama talepkar değil' },
      { label: 'Adapts well to indoor living', label_tr: 'İç mekan hayatına iyi uyum sağlar' },
      { label: 'Good with children and other pets', label_tr: 'Çocuklar ve diğer evcil hayvanlarla iyi' },
    ],
    dietaryNeeds: [
      { label: 'Weight management formula after age 3', label_tr: '3 yaşından sonra kilo yönetimi formülü' },
      { label: 'Avoid free feeding — very obesity prone', label_tr: 'Serbest beslemeden kaçının — obeziteye çok yatkın' },
    ],
    exerciseMinutesPerDay: [15, 20],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Environmental allergens — dust mites', label_tr: 'Çevresel alerjenler — ev akarları' },
      { label: 'Food protein sensitivities possible', label_tr: 'Besin proteini duyarlılığı mümkün' },
    ],
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
    temperament: [
      { label: 'Quiet and docile', label_tr: 'Sessiz ve sakin' },
      { label: 'Affectionate and gentle', label_tr: 'Sevecen ve nazik' },
      { label: 'Enjoys a calm environment', label_tr: 'Sakin ortamı sever' },
      { label: 'Not very playful — prefers lounging', label_tr: 'Çok oyuncu değil — uzanmayı tercih eder' },
    ],
    dietaryNeeds: [
      { label: 'Flat-faced anatomy — wet food easier to eat', label_tr: 'Basık yüzlü anatomi — yaş mama yemeği kolaylaştırır' },
      { label: 'Hairball control formula', label_tr: 'Tüy yumağı kontrol formülü' },
    ],
    exerciseMinutesPerDay: [10, 20],
    groomingFrequency: 'daily',
    commonAllergies: [
      { label: 'Skin fold dermatitis — facial folds', label_tr: 'Cilt kıvrım dermatiti — yüz kıvrımları' },
      { label: 'Food protein sensitivities', label_tr: 'Besin proteini duyarlılıkları' },
    ],
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
    temperament: [
      { label: 'Gentle and dog-like', label_tr: 'Nazik ve köpek gibi' },
      { label: 'Playful and curious', label_tr: 'Oyuncu ve meraklı' },
      { label: 'Social with family and guests', label_tr: 'Aile ve misafirlerle sosyal' },
      { label: 'Adaptable and easygoing', label_tr: 'Uyumlu ve kolay huylu' },
    ],
    dietaryNeeds: [
      { label: 'Large-breed cat formula — bigger portion needs', label_tr: 'Büyük ırk kedi formülü — daha büyük porsiyon ihtiyacı' },
      { label: 'Joint support after age 7', label_tr: '7 yaşından sonra eklem desteği' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Food sensitivities — some individuals', label_tr: 'Besin duyarlılıkları — bazı bireyler' },
      { label: 'Environmental allergens', label_tr: 'Çevresel alerjenler' },
    ],
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
    temperament: [
      { label: 'Docile and relaxed — goes limp when held', label_tr: 'Sakin ve gevşek — tutulunca sarkıverir' },
      { label: 'Affectionate and gentle', label_tr: 'Sevecen ve nazik' },
      { label: 'Follows owners like a puppy', label_tr: 'Yavru köpek gibi sahiplerini takip eder' },
      { label: 'Good with children', label_tr: 'Çocuklarla iyi' },
    ],
    dietaryNeeds: [
      { label: 'Large-breed formula — slow-maturing cat', label_tr: 'Büyük ırk formülü — yavaş olgunlaşan kedi' },
      { label: 'Joint supplements after age 6', label_tr: '6 yaşından sonra eklem takviyeleri' },
    ],
    exerciseMinutesPerDay: [15, 25],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Some food sensitivities — chicken', label_tr: 'Bazı besin duyarlılıkları — tavuk' },
      { label: 'Environmental allergens — dust', label_tr: 'Çevresel alerjenler — toz' },
    ],
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
    temperament: [
      { label: 'Very vocal and demanding', label_tr: 'Çok sesli ve talepkar' },
      { label: 'Affectionate and people-oriented', label_tr: 'Sevecen ve insan odaklı' },
      { label: 'Intelligent and curious', label_tr: 'Zeki ve meraklı' },
      { label: 'Can be jealous', label_tr: 'Kıskanç olabilir' },
    ],
    dietaryNeeds: [
      { label: 'High-protein diet — active lean breed', label_tr: 'Yüksek proteinli diyet — aktif ince ırk' },
      { label: 'Avoid overfeeding — metabolic issues in older cats', label_tr: 'Aşırı beslemeden kaçının — yaşlı kedilerde metabolik sorunlar' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food protein sensitivities — fairly common', label_tr: 'Besin proteini duyarlılıkları — oldukça yaygın' },
      { label: 'Environmental allergies', label_tr: 'Çevresel alerjiler' },
    ],
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
    temperament: [
      { label: 'Active and curious', label_tr: 'Aktif ve meraklı' },
      { label: 'Playful and mischievous', label_tr: 'Oyuncu ve yaramaz' },
      { label: 'Social but independent', label_tr: 'Sosyal ama bağımsız' },
      { label: 'Loves heights and exploration', label_tr: 'Yüksekleri ve keşfetmeyi sever' },
    ],
    dietaryNeeds: [
      { label: 'High-protein diet — very active metabolism', label_tr: 'Yüksek proteinli diyet — çok aktif metabolizma' },
      { label: 'Taurine-rich food — heart health', label_tr: 'Taurin açısından zengin besin — kalp sağlığı' },
    ],
    exerciseMinutesPerDay: [30, 45],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Gingivitis — dental sensitivity', label_tr: 'Diş eti iltihabı — diş hassasiyeti' },
      { label: 'Food sensitivities possible', label_tr: 'Besin duyarlılıkları mümkün' },
    ],
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
    temperament: [
      { label: 'Extroverted and mischievous', label_tr: 'Dışa dönük ve yaramaz' },
      { label: 'Very affectionate and warm-seeking', label_tr: 'Çok sevecen ve sıcak arayan' },
      { label: 'Loyal and dog-like', label_tr: 'Sadık ve köpek gibi' },
      { label: 'Energetic and playful', label_tr: 'Enerjik ve oyuncu' },
    ],
    dietaryNeeds: [
      { label: 'Higher caloric intake — no fur means more heat loss', label_tr: 'Daha yüksek kalori alımı — tüy olmaması daha fazla ısı kaybı demek' },
      { label: 'High-protein, high-fat diet', label_tr: 'Yüksek proteinli, yüksek yağlı diyet' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Skin sensitivity — no fur barrier', label_tr: 'Cilt hassasiyeti — tüy bariyer yok' },
      { label: 'Environmental allergens cause visible skin reactions', label_tr: 'Çevresel alerjenler görünür cilt reaksiyonlarına yol açar' },
    ],
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
    temperament: [
      { label: 'Gentle and calm', label_tr: 'Nazik ve sakin' },
      { label: 'Social and affectionate', label_tr: 'Sosyal ve sevecen' },
      { label: 'Quiet but inquisitive', label_tr: 'Sessiz ama meraklı' },
      { label: 'Good with children and other cats', label_tr: 'Çocuklar ve diğer kedilerle iyi' },
    ],
    dietaryNeeds: [
      { label: 'Balanced diet with coat support (biotin, omega-3)', label_tr: 'Tüy desteği olan dengeli diyet (biotin, omega-3)' },
      { label: 'Weight monitoring — moderate activity', label_tr: 'Kilo takibi — orta düzey aktivite' },
    ],
    exerciseMinutesPerDay: [15, 25],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Skin sensitivities — some individuals', label_tr: 'Cilt hassasiyetleri — bazı bireyler' },
      { label: 'Food protein sensitivities', label_tr: 'Besin proteini duyarlılıkları' },
    ],
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
    temperament: [
      { label: 'Sweet-natured and calm', label_tr: 'Tatlı huylu ve sakin' },
      { label: 'Adaptable and peaceful', label_tr: 'Uyumlu ve huzurlu' },
      { label: 'Good with other pets', label_tr: 'Diğer evcil hayvanlarla iyi' },
      { label: 'Tends to stay close to owners', label_tr: 'Sahiplerinin yakınında kalmaya eğilimli' },
    ],
    dietaryNeeds: [
      { label: 'Weight management — low activity breed', label_tr: 'Kilo yönetimi — düşük aktivite ırkı' },
      { label: 'Omega-3 to support joint inflammation', label_tr: 'Eklem iltihabını desteklemek için Omega-3' },
    ],
    exerciseMinutesPerDay: [15, 20],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food sensitivities possible', label_tr: 'Besin duyarlılıkları mümkün' },
      { label: 'Environmental allergens', label_tr: 'Çevresel alerjenler' },
    ],
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
    temperament: [
      { label: 'Highly active and athletic', label_tr: 'Son derece aktif ve atletik' },
      { label: 'Curious and playful', label_tr: 'Meraklı ve oyuncu' },
      { label: 'Vocal and demanding', label_tr: 'Sesli ve talepkar' },
      { label: 'Loves water — unusual for a cat', label_tr: 'Suyu sever — kedi için alışılmadık' },
    ],
    dietaryNeeds: [
      { label: 'High-protein meat-based diet — obligate carnivore with high activity', label_tr: 'Yüksek proteinli et bazlı diyet — yüksek aktiviteli zorunlu etobur' },
      { label: 'Taurine-rich — essential for heart function', label_tr: 'Taurin açısından zengin — kalp fonksiyonu için gerekli' },
    ],
    exerciseMinutesPerDay: [30, 60],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food sensitivities — chicken or fish', label_tr: 'Besin duyarlılıkları — tavuk veya balık' },
      { label: 'Environmental allergies', label_tr: 'Çevresel alerjiler' },
    ],
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
    temperament: [
      { label: 'Gentle and patient', label_tr: 'Nazik ve sabırlı' },
      { label: 'Independent but affectionate', label_tr: 'Bağımsız ama sevecen' },
      { label: 'Loves to climb and explore outdoors', label_tr: 'Tırmanmayı ve dış mekan keşfini sever' },
      { label: 'Good with children and other animals', label_tr: 'Çocuklar ve diğer hayvanlarla iyi' },
    ],
    dietaryNeeds: [
      { label: 'High-protein diet for active semi-outdoor breed', label_tr: 'Aktif yarı dış mekan ırkı için yüksek proteinli diyet' },
      { label: 'Glycogen storage disease screening — avoid high-sugar foods', label_tr: 'Glikojen depo hastalığı taraması — yüksek şekerli besinlerden kaçının' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Food sensitivities — some individuals', label_tr: 'Besin duyarlılıkları — bazı bireyler' },
      { label: 'Environmental allergens — outdoor exposure', label_tr: 'Çevresel alerjenler — dış mekan maruziyeti' },
    ],
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
    temperament: [
      { label: 'Reserved and shy with strangers', label_tr: 'Yabancılara karşı çekingen ve utangaç' },
      { label: 'Very loyal to family', label_tr: 'Aileye çok sadık' },
      { label: 'Quiet and gentle', label_tr: 'Sessiz ve nazik' },
      { label: 'Playful with trusted people', label_tr: 'Güvenilen kişilerle oyuncu' },
    ],
    dietaryNeeds: [
      { label: 'Moderate portions — tends to overeat', label_tr: 'Orta porsiyonlar — aşırı yeme eğilimi' },
      { label: 'High-quality protein for lean body maintenance', label_tr: 'İnce vücut bakımı için yüksek kaliteli protein' },
    ],
    exerciseMinutesPerDay: [15, 25],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Relatively low allergen producer — hypoallergenic tendency', label_tr: 'Görece düşük alerjen üretici — hipoalerjenik eğilim' },
      { label: 'Food sensitivities possible', label_tr: 'Besin duyarlılıkları mümkün' },
    ],
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
    temperament: [
      { label: 'Social and affectionate', label_tr: 'Sosyal ve sevecen' },
      { label: 'Playful throughout life', label_tr: 'Yaşam boyu oyuncu' },
      { label: 'Dog-like — follows owners', label_tr: 'Köpek gibi — sahiplerini takip eder' },
      { label: 'Vocal and demanding', label_tr: 'Sesli ve talepkar' },
    ],
    dietaryNeeds: [
      { label: 'High-protein diet — very active metabolism', label_tr: 'Yüksek proteinli diyet — çok aktif metabolizma' },
      { label: 'Weight monitoring — can overeat', label_tr: 'Kilo takibi — aşırı yiyebilir' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Gingivitis — dental sensitivity', label_tr: 'Diş eti iltihabı — diş hassasiyeti' },
      { label: 'Food sensitivities in some individuals', label_tr: 'Bazı bireylerde besin duyarlılıkları' },
    ],
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
    temperament: [
      { label: 'Athletic and playful', label_tr: 'Atletik ve oyuncu' },
      { label: 'Intelligent and sociable', label_tr: 'Zeki ve sosyal' },
      { label: 'Dominant with other cats', label_tr: 'Diğer kedilere karşı dominant' },
      { label: 'Loves interaction and games', label_tr: 'Etkileşim ve oyunları sever' },
    ],
    dietaryNeeds: [
      { label: 'High-protein diet for active breed', label_tr: 'Aktif ırk için yüksek proteinli diyet' },
      { label: 'Omega-3 for silky coat', label_tr: 'İpeksi tüy için Omega-3' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Congenital deafness linked to white coat — not allergy', label_tr: 'Beyaz tüyle bağlantılı konjenital sağırlık — alerji değil' },
      { label: 'Food sensitivities — occasional', label_tr: 'Besin duyarlılıkları — ara sıra' },
    ],
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
    temperament: [
      { label: 'Active and energetic', label_tr: 'Aktif ve enerjik' },
      { label: 'Loves water — unique trait', label_tr: 'Suyu sever — benzersiz özellik' },
      { label: 'Independent but affectionate', label_tr: 'Bağımsız ama sevecen' },
      { label: 'Bonds strongly with one person', label_tr: 'Bir kişiyle güçlü bağ kurar' },
    ],
    dietaryNeeds: [
      { label: 'High-protein active-cat formula', label_tr: 'Aktif kedi için yüksek proteinli formül' },
      { label: 'Weight management — can be sedentary indoors', label_tr: 'Kilo yönetimi — iç mekanda hareketsiz kalabilir' },
    ],
    exerciseMinutesPerDay: [20, 35],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Generally robust — low allergy incidence', label_tr: 'Genellikle güçlü — düşük alerji insidansı' },
      { label: 'Food protein sensitivities possible', label_tr: 'Besin proteini duyarlılıkları mümkün' },
    ],
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
    temperament: [
      { label: 'Varies widely — coat pattern, not a breed', label_tr: 'Geniş çeşitlilik gösterir — ırk değil, tüy deseni' },
      { label: 'Often curious and active', label_tr: 'Genellikle meraklı ve aktif' },
      { label: 'Usually sociable and adaptable', label_tr: 'Genellikle sosyal ve uyumlu' },
    ],
    dietaryNeeds: [
      { label: 'Feed by size and activity level', label_tr: 'Boyut ve aktivite düzeyine göre besleyin' },
      { label: 'Fresh water always available', label_tr: 'Her zaman taze su' },
    ],
    exerciseMinutesPerDay: [15, 25],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food sensitivities possible', label_tr: 'Besin duyarlılıkları mümkün' },
      { label: 'Environmental allergens', label_tr: 'Çevresel alerjenler' },
    ],
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
    temperament: [
      { label: 'Often bold and assertive', label_tr: 'Genellikle cesur ve iddialı' },
      { label: 'Sociable and playful', label_tr: 'Sosyal ve oyuncu' },
      { label: 'Personality varies by genetics', label_tr: 'Kişilik genetiğe göre değişir' },
    ],
    dietaryNeeds: [
      { label: 'Feed by size and activity level', label_tr: 'Boyut ve aktivite düzeyine göre besleyin' },
    ],
    exerciseMinutesPerDay: [15, 25],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Coat pattern not breed — allergy risk varies', label_tr: 'Tüy deseni ırk değil — alerji riski değişir' },
    ],
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
    temperament: [
      { label: 'Often laid-back and friendly', label_tr: 'Genellikle rahat ve arkadaşcıl' },
      { label: 'Food-motivated', label_tr: 'Yiyeceğe düşkün' },
      { label: 'Personality varies by genetics', label_tr: 'Kişilik genetiğe göre değişir' },
    ],
    dietaryNeeds: [
      { label: 'Portion control — orange tabbies often overeat', label_tr: 'Porsiyon kontrolü — turuncu tekir kediler genellikle aşırı yer' },
    ],
    exerciseMinutesPerDay: [15, 25],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Coat colour not breed — allergy risk varies', label_tr: 'Tüy rengi ırk değil — alerji riski değişir' },
    ],
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
    temperament: [
      { label: 'Often independent and feisty', label_tr: 'Genellikle bağımsız ve atılgan' },
      { label: 'Usually female (XX genetic pattern)', label_tr: 'Genellikle dişi (XX genetik düzen)' },
      { label: 'Personality varies by breed base', label_tr: 'Kişilik temel ırka göre değişir' },
    ],
    dietaryNeeds: [
      { label: 'Feed by individual size and activity', label_tr: 'Bireysel boyut ve aktiviteye göre besleyin' },
    ],
    exerciseMinutesPerDay: [15, 25],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Coat pattern not breed — allergy risk varies', label_tr: 'Tüy deseni ırk değil — alerji riski değişir' },
    ],
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
    temperament: [
      { label: 'Personality entirely by genetics/upbringing', label_tr: 'Kişilik tamamen genetik/yetiştirilişe göre' },
      { label: 'Often calm and adaptable', label_tr: 'Genellikle sakin ve uyumlu' },
    ],
    dietaryNeeds: [
      { label: 'Feed by individual size and activity', label_tr: 'Bireysel boyut ve aktiviteye göre besleyin' },
    ],
    exerciseMinutesPerDay: [15, 25],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Coat colour not breed — allergy risk varies', label_tr: 'Tüy rengi ırk değil — alerji riski değişir' },
    ],
  },
  {
    breed: 'Exotic Shorthair',
    aliases: ['Exotic'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Brachycephalic respiratory syndrome', label_tr: 'Brakisefal solunum sendromu' },
      { label: 'Polycystic kidney disease (PKD)', label_tr: 'Polikistik böbrek hastalığı (PKD)' },
      { label: 'Eye discharge / epiphora', label_tr: 'Göz akıntısı / epifor' },
      { label: 'Dental crowding', label_tr: 'Diş kalabalığı' },
    ],
    dailyCare: [
      { label: 'Brush 2–3× weekly — plush dense coat', label_tr: 'Haftada 2-3 kez fırçalama — peluş yoğun tüy', category: 'grooming' },
      { label: 'Daily eye cleaning — prone to tearing/discharge', label_tr: 'Günlük göz temizliği — gözyaşı/akıntıya eğilimli', category: 'grooming' },
      { label: '2× 10–15 min gentle play sessions/day — low-energy breed', label_tr: 'Günde 2 kez 10-15 dk hafif oyun seansı — düşük enerjili ırk', category: 'exercise' },
      { label: '2 measured meals/day — obesity prone like Persian', label_tr: 'Günde 2 ölçülü öğün — Pers gibi obeziteye eğilimli', category: 'feeding' },
      { label: 'Annual PKD screen + cardiac check; dental exam yearly', label_tr: 'Yıllık PKD taraması + kardiyak kontrol; yıllık diş muayenesi', category: 'health' },
    ],
    careTips: [
      { label: 'Daily face/eye cleaning — brachycephalic anatomy', label_tr: 'Günlük yüz/göz temizliği — brakisefal anatomi' },
      { label: 'PKD genetic test recommended', label_tr: 'PKD genetik testi önerilir' },
      { label: 'Flat-faced — watch for breathing issues in heat', label_tr: 'Basık yüzlü — sıcakta nefes sorunlarına dikkat' },
    ],
    weightRangeKg: [3, 6],
    lifespanYears: [10, 15],
    temperament: [
      { label: 'Calm and gentle like Persian', label_tr: 'Pers gibi sakin ve nazik' },
      { label: 'Playful but not demanding', label_tr: 'Oyuncu ama talepkar değil' },
      { label: 'Quiet and easygoing', label_tr: 'Sessiz ve kolay huylu' },
      { label: 'Good apartment cat', label_tr: 'İyi apartman kedisi' },
    ],
    dietaryNeeds: [
      { label: 'Weight management formula — low activity', label_tr: 'Kilo yönetimi formülü — düşük aktivite' },
      { label: 'Hairball control — medium-length plush coat', label_tr: 'Tüy yumağı kontrolü — orta uzunlukta peluş tüy' },
    ],
    exerciseMinutesPerDay: [15, 20],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Facial fold skin sensitivity', label_tr: 'Yüz kıvrım cilt hassasiyeti' },
      { label: 'Food protein sensitivities', label_tr: 'Besin proteini duyarlılıkları' },
    ],
  },
  {
    breed: 'Devon Rex',
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy (HCM)', label_tr: 'Hipertrofik kardiyomiyopati (HCM)' },
      { label: 'Devon Rex myopathy (muscle weakness)', label_tr: 'Devon Rex miyopatisi (kas zayıflığı)' },
      { label: 'Patellar luxation', label_tr: 'Patella luksasyonu' },
      { label: 'Skin fragility — coat breaks easily', label_tr: 'Cilt kırılganlığı — tüy kolayca kırılır' },
    ],
    dailyCare: [
      { label: 'Wipe/pat coat gently — no brushing, breaks curly fur', label_tr: 'Tüyü nazikçe silin/pat yapın — fırçalamayın, kıvırcık tüyü kırar', category: 'grooming' },
      { label: 'Clean ears weekly — large ears accumulate wax', label_tr: 'Haftalık kulak temizliği — büyük kulaklar balmumu biriktirir', category: 'grooming' },
      { label: '2× 15 min active play/day — loves jumping and climbing', label_tr: 'Günde 2 kez 15 dk aktif oyun — zıplamayı ve tırmanmayı sever', category: 'exercise' },
      { label: '2 meals/day — high metabolism, may need more food than average', label_tr: 'Günde 2 öğün — yüksek metabolizma, ortalamanın üzerinde yiyecek gerektirebilir', category: 'feeding' },
      { label: 'Annual cardiac echo (HCM) + joint check (patella)', label_tr: 'Yıllık kardiyak eko (HCM) + eklem kontrolü (patella)', category: 'health' },
    ],
    careTips: [
      { label: 'No brushing — use a soft cloth, prevents coat breakage', label_tr: 'Fırçalamayın — yumuşak bez kullanın, tüy kırılmasını önler' },
      { label: 'Annual cardiac echo recommended', label_tr: 'Yıllık kardiyak eko önerilir' },
      { label: 'Loves warmth — provide blankets and heated spots', label_tr: 'Sıcağı sever — battaniye ve ısıtmalı köşeler sağlayın' },
    ],
    weightRangeKg: [3, 5],
    lifespanYears: [9, 15],
    temperament: [
      { label: 'Mischievous and playful', label_tr: 'Yaramaz ve oyuncu' },
      { label: 'Affectionate and people-oriented', label_tr: 'Sevecen ve insan odaklı' },
      { label: 'Dog-like loyalty', label_tr: 'Köpek gibi sadakat' },
      { label: 'Loves to ride on shoulders', label_tr: 'Omuzlarda sürmeyi sever' },
    ],
    dietaryNeeds: [
      { label: 'Slightly higher caloric intake — thin coat, high heat loss', label_tr: 'Biraz daha yüksek kalori alımı — ince tüy, yüksek ısı kaybı' },
      { label: 'High-quality protein diet', label_tr: 'Yüksek kaliteli protein diyeti' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Skin sensitivity — wavy coat fragile', label_tr: 'Cilt hassasiyeti — dalgalı tüy kırılgan' },
      { label: 'Food sensitivities possible', label_tr: 'Besin duyarlılıkları mümkün' },
    ],
  },
  {
    breed: 'Munchkin',
    petType: 'Cat',
    healthRisks: [
      { label: 'Lordosis (spinal curvature — severe in homozygous)', label_tr: 'Lordozis (omurga eğriliği — homozigotlarda şiddetli)' },
      { label: 'Pectus excavatum (sunken chest)', label_tr: 'Pektus ekskavatum (çökmüş göğüs)' },
      { label: 'Hip dysplasia', label_tr: 'Kalça displazisi' },
      { label: 'Osteoarthritis (short limb stress on joints)', label_tr: 'Osteoartrit (kısa uzuv eklem stresi)' },
    ],
    dailyCare: [
      { label: 'Brush short coat weekly; long variety 2–3× weekly', label_tr: 'Kısa tüy için haftalık fırçalama; uzun çeşit için haftada 2-3 kez', category: 'grooming' },
      { label: '2× 15–20 min play/day — active despite short legs', label_tr: 'Günde 2 kez 15-20 dk oyun — kısa bacaklara rağmen aktif', category: 'exercise' },
      { label: '2 meals/day — measure portions, obesity stresses short joints', label_tr: 'Günde 2 öğün — porsiyonları ölçün, obezite kısa eklemlere baskı yapar', category: 'feeding' },
      { label: 'Low-rise furniture important — can\'t jump high safely', label_tr: 'Alçak mobilya önemli — güvenle yüksek atlayamaz', category: 'environment' },
      { label: 'Spine + hip check 6-monthly first 2 years; annual thereafter', label_tr: 'İlk 2 yıl 6 ayda bir omurga + kalça kontrolü; sonrasında yıllık', category: 'health' },
    ],
    careTips: [
      { label: 'Keep lean — extra weight damages short-limb joints', label_tr: 'Zayıf tutun — fazla ağırlık kısa uzuv eklemlere zarar verir' },
      { label: 'Provide ramps/steps — high jumping is risky', label_tr: 'Rampa/basamak sağlayın — yüksek atlama risklidir' },
      { label: 'Regular spinal and joint monitoring', label_tr: 'Düzenli omurga ve eklem takibi' },
    ],
    weightRangeKg: [2.5, 4.5],
    lifespanYears: [12, 15],
    temperament: [
      { label: 'Playful and curious despite short legs', label_tr: 'Kısa bacaklara rağmen oyuncu ve meraklı' },
      { label: 'Sociable and outgoing', label_tr: 'Sosyal ve dışa dönük' },
      { label: 'Adapts well to apartment life', label_tr: 'Apartman hayatına iyi uyum sağlar' },
      { label: 'Gets along with children and other pets', label_tr: 'Çocuklar ve diğer evcil hayvanlarla iyi geçinir' },
    ],
    dietaryNeeds: [
      { label: 'Weight management critical — extra weight damages joints', label_tr: 'Kilo yönetimi kritik — fazla kilo eklemlere zarar verir' },
      { label: 'Joint support supplements from age 3', label_tr: '3 yaşından itibaren eklem destek takviyeleri' },
    ],
    exerciseMinutesPerDay: [15, 25],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food sensitivities — some individuals', label_tr: 'Besin duyarlılıkları — bazı bireyler' },
      { label: 'Environmental allergens', label_tr: 'Çevresel alerjenler' },
    ],
  },
  {
    breed: 'Himalayan',
    aliases: ['Himalayan Cat', 'Colourpoint Persian', 'Himalaya Kedisi'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Polycystic kidney disease (PKD)', label_tr: 'Polikistik böbrek hastalığı (PKD)' },
      { label: 'Brachycephalic respiratory issues', label_tr: 'Brakisefal solunum sorunları' },
      { label: 'Hypertrophic cardiomyopathy (HCM)', label_tr: 'Hipertrofik kardiyomiyopati (HCM)' },
      { label: 'Eye discharge / cherry eye', label_tr: 'Göz akıntısı / kiraz göz' },
    ],
    dailyCare: [
      { label: 'Brush daily — long silky coat mats quickly', label_tr: 'Günlük fırçalama — uzun ipeksi tüy hızla dolaşır', category: 'grooming' },
      { label: 'Daily eye and face cleaning — flat-faced anatomy', label_tr: 'Günlük göz ve yüz temizliği — basık yüzlü anatomi', category: 'grooming' },
      { label: '2× 10 min gentle play/day — calm, low-energy breed', label_tr: 'Günde 2 kez 10 dk hafif oyun — sakin, düşük enerjili ırk', category: 'exercise' },
      { label: '2 meals/day — controlled diet, obesity-prone', label_tr: 'Günde 2 öğün — kontrollü diyet, obeziteye eğilimli', category: 'feeding' },
      { label: 'Annual PKD + cardiac echo; watch breathing in summer heat', label_tr: 'Yıllık PKD + kardiyak eko; yaz sıcağında nefes alışını izleyin', category: 'health' },
    ],
    careTips: [
      { label: 'Daily grooming non-negotiable — mats cause skin problems', label_tr: 'Günlük bakım pazarlık konusu değil — dolanmalar cilt sorununa yol açar' },
      { label: 'PKD genetic test recommended', label_tr: 'PKD genetik testi önerilir' },
      { label: 'Keep indoors — sensitive to heat and cold extremes', label_tr: 'İç mekanda tutun — aşırı sıcak ve soğuğa duyarlı' },
    ],
    weightRangeKg: [3, 6],
    lifespanYears: [9, 15],
    temperament: [
      { label: 'Calm and gentle like Persian', label_tr: 'Pers gibi sakin ve nazik' },
      { label: 'Affectionate but not clingy', label_tr: 'Sevecen ama yapışkan değil' },
      { label: 'Quiet indoors', label_tr: 'İç mekanda sessiz' },
      { label: 'Can be shy with strangers', label_tr: 'Yabancılara karşı çekingen olabilir' },
    ],
    dietaryNeeds: [
      { label: 'Hairball control formula — long coat', label_tr: 'Tüy yumağı kontrol formülü — uzun tüy' },
      { label: 'Kidney support diet if PKD detected', label_tr: 'PKD tespit edilirse böbrek destek diyeti' },
    ],
    exerciseMinutesPerDay: [10, 20],
    groomingFrequency: 'daily',
    commonAllergies: [
      { label: 'Facial fold skin sensitivity', label_tr: 'Yüz kıvrım cilt hassasiyeti' },
      { label: 'Food protein sensitivities', label_tr: 'Besin proteini duyarlılıkları' },
    ],
  },
  {
    breed: 'Oriental Shorthair',
    aliases: ['Oriental', 'Oriental Kısa Tüylü'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Amyloidosis (kidney/liver protein deposits)', label_tr: 'Amiloidoz (böbrek/karaciğer protein birikimi)' },
      { label: 'Hypertrophic cardiomyopathy (HCM)', label_tr: 'Hipertrofik kardiyomiyopati (HCM)' },
      { label: 'Crossed eyes (inherited in some lines)', label_tr: 'Şaşılık (bazı soyda kalıtsal)' },
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
    ],
    dailyCare: [
      { label: 'Brush weekly — minimal grooming needed', label_tr: 'Haftalık fırçalama — minimum bakım gerektirir', category: 'grooming' },
      { label: '2× 20 min interactive play/day — highly active and vocal', label_tr: 'Günde 2 kez 20 dk etkileşimli oyun — oldukça aktif ve sesli', category: 'exercise' },
      { label: '2 meals/day — high-protein diet supports lean muscular build', label_tr: 'Günde 2 öğün — yüksek proteinli diyet ince kaslı yapıyı destekler', category: 'feeding' },
      { label: 'Needs companionship — destructive if left alone too long', label_tr: 'Arkadaşlık gerektirir — çok uzun süre yalnız bırakılırsa yıkıcı olabilir', category: 'environment' },
      { label: 'Annual cardiac echo + dental exam', label_tr: 'Yıllık kardiyak eko + diş muayenesi', category: 'health' },
    ],
    careTips: [
      { label: 'Highly social — thrives with another cat companion', label_tr: 'Son derece sosyal — başka bir kedi arkadaşıyla gelişir' },
      { label: 'Annual cardiac screening', label_tr: 'Yıllık kardiyak tarama' },
      { label: 'Very vocal — prepare for conversations', label_tr: 'Çok sesli — konuşmalara hazır olun' },
    ],
    weightRangeKg: [3, 5],
    lifespanYears: [12, 15],
    temperament: [
      { label: 'Highly intelligent and opinionated', label_tr: 'Çok zeki ve fikirleri olan' },
      { label: 'Very vocal — lots of meowing', label_tr: 'Çok sesli — çok miyavlama' },
      { label: 'Demands attention', label_tr: 'İlgi talep eder' },
      { label: 'Athletic and agile', label_tr: 'Atletik ve çevik' },
    ],
    dietaryNeeds: [
      { label: 'High-protein lean diet for muscular build', label_tr: 'Kaslı yapı için yüksek proteinli yağsız diyet' },
      { label: 'Avoid overfeeding — lean breed', label_tr: 'Aşırı beslemeden kaçının — ince ırk' },
    ],
    exerciseMinutesPerDay: [25, 40],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Food protein sensitivities — common in Siamese family', label_tr: 'Besin proteini duyarlılıkları — Siyam ailesinde yaygın' },
      { label: 'Dental sensitivity — gingivitis', label_tr: 'Diş hassasiyeti — diş eti iltihabı' },
    ],
  },
  {
    breed: 'Cornish Rex',
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy (HCM)', label_tr: 'Hipertrofik kardiyomiyopati (HCM)' },
      { label: 'Hypotrichosis (patchy hair loss)', label_tr: 'Hipotrikozis (yama şeklinde tüy kaybı)' },
      { label: 'Blood type incompatibility (type B cats — rare)', label_tr: 'Kan grubu uyumsuzluğu (tip B kediler — nadir)' },
      { label: 'Sensitive skin — prone to greasiness', label_tr: 'Hassas cilt — yağlanmaya eğilimli' },
    ],
    dailyCare: [
      { label: 'Wipe coat with a damp cloth weekly — no harsh brushing', label_tr: 'Haftalık nemli bezle tüy silme — sert fırçalama yok', category: 'grooming' },
      { label: '2× 15 min play/day — agile, loves to run and leap', label_tr: 'Günde 2 kez 15 dk oyun — çevik, koşmayı ve zıplamayı sever', category: 'exercise' },
      { label: '2 meals/day — higher caloric need due to thin coat heat loss', label_tr: 'Günde 2 öğün — ince tüyden ısı kaybı nedeniyle daha yüksek kalori ihtiyacı', category: 'feeding' },
      { label: 'Keep warm indoors — minimal insulating coat', label_tr: 'İç mekanda sıcak tutun — minimal yalıtım tüyü', category: 'environment' },
      { label: 'Annual cardiac echo recommended', label_tr: 'Yıllık kardiyak eko önerilir', category: 'health' },
    ],
    careTips: [
      { label: 'Needs warmth — thin wavy coat provides little insulation', label_tr: 'Sıcaklık gerektirir — ince dalgalı tüy az yalıtım sağlar' },
      { label: 'Annual cardiac check — HCM risk', label_tr: 'Yıllık kardiyak kontrol — HCM riski' },
      { label: 'Very food-motivated — useful for training', label_tr: 'Yiyeceğe çok düşkün — eğitim için kullanışlı' },
    ],
    weightRangeKg: [2.5, 4.5],
    lifespanYears: [11, 15],
    temperament: [
      { label: 'Kitten-like energy throughout life', label_tr: 'Hayat boyu yavru kedi enerjisi' },
      { label: 'Sociable and playful', label_tr: 'Sosyal ve oyuncu' },
      { label: 'Intelligent — learns tricks easily', label_tr: 'Zeki — numaraları kolayca öğrenir' },
      { label: 'Loves warm laps', label_tr: 'Sıcak kucakları sever' },
    ],
    dietaryNeeds: [
      { label: 'Higher calorie needs — thin coat causes heat loss', label_tr: 'Daha yüksek kalori ihtiyacı — ince tüy ısı kaybına yol açar' },
      { label: 'High-protein formula', label_tr: 'Yüksek proteinli formül' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Skin sensitivity — wavy coat minimal barrier', label_tr: 'Cilt hassasiyeti — dalgalı tüy minimum bariyer' },
      { label: 'Food sensitivities possible', label_tr: 'Besin duyarlılıkları mümkün' },
    ],
  },
  {
    breed: 'Anadolu Kedisi',
    aliases: ['Turkish Domestic Cat', 'Anatolian Cat', 'Anadolu Kedi', 'Yerli Kedi'],
    matchKeywords: ['anadolu kedi', 'yerli kedi', 'anadolu cat'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Dental disease — common in semi-feral cats', label_tr: 'Diş hastalığı — yarı yabani kedilerde yaygın' },
      { label: 'FIV/FeLV if exposed to outdoor cats', label_tr: 'Dış mekan kedileriyle temasta FIV/FeLV' },
      { label: 'Parasites (fleas, intestinal worms)', label_tr: 'Parazitler (pire, bağırsak solucanları)' },
      { label: 'Urinary tract infections', label_tr: 'İdrar yolu enfeksiyonları' },
    ],
    dailyCare: [
      { label: 'Brush weekly — short to medium coat', label_tr: 'Haftalık fırçalama — kısa-orta uzunlukta tüy', category: 'grooming' },
      { label: '2× 15–20 min play/day — naturally active hunters', label_tr: 'Günde 2 kez 15-20 dk oyun — doğal olarak aktif avcılar', category: 'exercise' },
      { label: '2 meals/day — portion by activity level', label_tr: 'Günde 2 öğün — aktivite düzeyine göre porsiyon', category: 'feeding' },
      { label: 'Fresh water always available — supports urinary health', label_tr: 'Her zaman taze su — idrar sağlığını destekler', category: 'environment' },
      { label: 'Annual vaccination + deworming + dental check', label_tr: 'Yıllık aşılama + iç parazit tedavisi + diş kontrolü', category: 'health' },
    ],
    careTips: [
      { label: 'Generally robust and healthy — diverse gene pool', label_tr: 'Genellikle dayanıklı ve sağlıklı — geniş gen havuzu' },
      { label: 'Annual dental check important — dental disease common', label_tr: 'Yıllık diş kontrolü önemli — diş hastalığı yaygın' },
      { label: 'Regular parasite prevention — especially for outdoor cats', label_tr: 'Düzenli parazit önlemi — özellikle dış mekan kedileri için' },
    ],
    weightRangeKg: [3, 6],
    lifespanYears: [13, 18],
    temperament: [
      { label: 'Independent and street-smart', label_tr: 'Bağımsız ve sokak zekası olan' },
      { label: 'Adaptable and resilient', label_tr: 'Uyumlu ve dayanıklı' },
      { label: 'Often affectionate with trusted people', label_tr: 'Güvenilen kişilerle genellikle sevecen' },
      { label: 'Active and curious hunter', label_tr: 'Aktif ve meraklı avcı' },
    ],
    dietaryNeeds: [
      { label: 'Feed by size and activity — no breed-specific needs', label_tr: 'Boyut ve aktiviteye göre besleyin — ırka özgü ihtiyaç yok' },
      { label: 'Fresh water always — urinary health', label_tr: 'Her zaman taze su — idrar sağlığı' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Generally robust — low allergy incidence', label_tr: 'Genellikle dayanıklı — düşük alerji insidansı' },
      { label: 'Parasites more relevant than allergies for street cats', label_tr: 'Sokak kedileri için alerjilerden çok parazitler önemli' },
    ],
  },
  {
    breed: 'Tonkinese',
    aliases: ['Tonkin Kedisi'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Gingivitis / periodontal disease', label_tr: 'Diş eti iltihabı / periodontal hastalık' },
      { label: 'Amyloidosis (Siamese lineage)', label_tr: 'Amiloidoz (Siyam soyundan)' },
      { label: 'Hypertrophic cardiomyopathy (HCM)', label_tr: 'Hipertrofik kardiyomiyopati (HCM)' },
      { label: 'Respiratory infections in kittens', label_tr: 'Yavru kedilerde solunum yolu enfeksiyonları' },
    ],
    dailyCare: [
      { label: 'Brush weekly — short silky low-maintenance coat', label_tr: 'Haftalık fırçalama — kısa ipeksi, bakımı az tüy', category: 'grooming' },
      { label: '2× 20 min active play/day — playful and social', label_tr: 'Günde 2 kez 20 dk aktif oyun — oyuncu ve sosyal', category: 'exercise' },
      { label: '2 meals/day — balanced, high-quality protein diet', label_tr: 'Günde 2 öğün — dengeli, yüksek kaliteli protein diyeti', category: 'feeding' },
      { label: 'Thrives with companion cat — lonely Tonks are unhappy', label_tr: 'Kedi arkadaşıyla gelişir — yalnız Tonklar mutsuz olur', category: 'environment' },
      { label: 'Annual dental cleaning + cardiac check', label_tr: 'Yıllık diş temizliği + kardiyak kontrol', category: 'health' },
    ],
    careTips: [
      { label: 'Annual dental care — prone to gum disease', label_tr: 'Yıllık diş bakımı — diş eti hastalığına eğilimli' },
      { label: 'Social breed — gets lonely without company', label_tr: 'Sosyal ırk — arkadaşsız yalnız kalıyor' },
      { label: 'Annual cardiac screening recommended', label_tr: 'Yıllık kardiyak tarama önerilir' },
    ],
    weightRangeKg: [3, 5.5],
    lifespanYears: [12, 16],
    temperament: [
      { label: 'Curious and mischievous', label_tr: 'Meraklı ve yaramaz' },
      { label: 'Very social and people-oriented', label_tr: 'Çok sosyal ve insan odaklı' },
      { label: 'Vocal but not as demanding as Siamese', label_tr: 'Sesli ama Siyam kadar talepkar değil' },
      { label: 'Playful throughout life', label_tr: 'Hayat boyu oyuncu' },
    ],
    dietaryNeeds: [
      { label: 'High-protein diet for active lean breed', label_tr: 'Aktif ince ırk için yüksek proteinli diyet' },
      { label: 'Weight monitoring — can overeat', label_tr: 'Kilo takibi — aşırı yiyebilir' },
    ],
    exerciseMinutesPerDay: [20, 35],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Dental sensitivity — gingivitis common', label_tr: 'Diş hassasiyeti — diş eti iltihabı yaygın' },
      { label: 'Food sensitivities — Siamese lineage', label_tr: 'Besin duyarlılıkları — Siyam soyundan' },
    ],
  },
  {
    breed: 'British Longhair',
    aliases: ['Highland Straight'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy (HCM)', label_tr: 'Hipertrofik kardiyomiyopati (HCM)' },
      { label: 'Polycystic kidney disease (PKD)', label_tr: 'Polikistik böbrek hastalığı (PKD)' },
      { label: 'Obesity tendency', label_tr: 'Obezite eğilimi' },
      { label: 'Dental disease', label_tr: 'Diş hastalığı' },
    ],
    dailyCare: [
      { label: 'Brush 2–3× weekly — semi-long plush coat, tangles in collar area', label_tr: 'Haftada 2-3 kez fırçalama — yarı uzun peluş tüy, tasma bölgesinde düğüm yapar', category: 'grooming' },
      { label: '2× 15 min gentle play/day — calm, relaxed breed', label_tr: 'Günde 2 kez 15 dk hafif oyun — sakin, rahat ırk', category: 'exercise' },
      { label: '2 measured meals/day — no free feeding, obesity risk', label_tr: 'Günde 2 ölçülü öğün — serbest besleme yok, obezite riski', category: 'feeding' },
      { label: 'Indoor life ideal — adapts well to apartment', label_tr: 'İç mekan hayatı ideal — apartmana iyi uyum sağlar', category: 'environment' },
      { label: 'Annual cardiac echo + PKD screen + dental exam', label_tr: 'Yıllık kardiyak eko + PKD taraması + diş muayenesi', category: 'health' },
    ],
    careTips: [
      { label: 'Annual HCM echo screening from age 2', label_tr: '2 yaşından itibaren yıllık HCM eko taraması' },
      { label: 'PKD genetic test recommended', label_tr: 'PKD genetik testi önerilir' },
      { label: 'Portion control essential — calm breed gains weight easily', label_tr: 'Porsiyon kontrolü şart — sakin ırk kolayca kilo alır' },
    ],
    temperament: [
      { label: 'Calm and easygoing', label_tr: 'Sakin ve kolay huylu' },
      { label: 'Affectionate but not clingy', label_tr: 'Sevecen ama yapışkan değil' },
      { label: 'Good with children and other pets', label_tr: 'Çocuklar ve diğer evcil hayvanlarla iyi geçinir' },
      { label: 'Quiet — rarely vocalises', label_tr: 'Sessiz — nadiren ses çıkarır' },
    ],
    dietaryNeeds: [
      { label: 'Weight-management formula after age 3', label_tr: '3 yaşından sonra kilo yönetimi formülü' },
      { label: 'Dental kibble or water additive to reduce tartar', label_tr: 'Tartar azaltmak için diş maması veya su katkısı' },
    ],
    exerciseMinutesPerDay: [20, 30],
    groomingFrequency: '2x-week',
    commonAllergies: [
      { label: 'Environmental allergens — dust mites', label_tr: 'Çevresel alerjenler — ev akarları' },
      { label: 'Some food protein sensitivities (chicken)', label_tr: 'Bazı besin proteini duyarlılıkları (tavuk)' },
    ],
    weightRangeKg: [4, 9],
    lifespanYears: [12, 16],
  },
  {
    breed: 'Chartreux',
    aliases: ['Kartüz Kedisi'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Polycystic kidney disease (PKD — rare but reported)', label_tr: 'Polikistik böbrek hastalığı (PKD — nadir ama bildirilen)' },
      { label: 'Patellar luxation', label_tr: 'Patella luksasyonu' },
      { label: 'Obesity in indoor cats', label_tr: 'İç mekan kedilerinde obezite' },
      { label: 'Urinary tract disease', label_tr: 'İdrar yolu hastalığı' },
    ],
    dailyCare: [
      { label: 'Brush weekly — dense woolly water-resistant coat', label_tr: 'Haftalık fırçalama — yoğun yünlü su itici tüy', category: 'grooming' },
      { label: '2× 15–20 min interactive play/day — smart and engaged', label_tr: 'Günde 2 kez 15-20 dk etkileşimli oyun — akıllı ve meşgul', category: 'exercise' },
      { label: '2 meals/day — measured, avoid overfeeding', label_tr: 'Günde 2 öğün — ölçülü, aşırı besleme önleyin', category: 'feeding' },
      { label: 'Indoor only recommended — adaptable to quiet households', label_tr: 'Sadece iç mekan önerilir — sessiz hane ortamlarına uyarlanabilir', category: 'environment' },
      { label: 'Annual kidney + patella check; fresh water always available', label_tr: 'Yıllık böbrek + patella kontrolü; her zaman taze su', category: 'health' },
    ],
    careTips: [
      { label: 'Fresh water critical — prone to urinary issues', label_tr: 'Taze su kritik — idrar sorunlarına eğilimli' },
      { label: 'Quiet and observant — not demanding but enjoys interaction', label_tr: 'Sessiz ve gözlemci — talepkar değil ama etkileşimi sever' },
      { label: 'Annual kidney function screening', label_tr: 'Yıllık böbrek fonksiyonu taraması' },
    ],
    temperament: [
      { label: 'Quiet and observant', label_tr: 'Sessiz ve gözlemci' },
      { label: 'Loyal to one person or family', label_tr: 'Bir kişiye veya aileye sadık' },
      { label: 'Calm and adaptable', label_tr: 'Sakin ve uyumlu' },
      { label: 'Rarely vocalises — chirps rather than meows', label_tr: 'Nadiren ses çıkarır — miyavlamak yerine cıvıldar' },
    ],
    dietaryNeeds: [
      { label: 'Wet food encouraged — increases water intake, prevents UTI', label_tr: 'Yaş mama teşvik edilir — su alımını artırır, idrar yolu iltihabını önler' },
      { label: 'Low-phosphorus diet if kidney issues detected', label_tr: 'Böbrek sorunu tespit edilirse düşük fosfor diyeti' },
    ],
    exerciseMinutesPerDay: [20, 35],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Environmental allergens — pollen and dust', label_tr: 'Çevresel alerjenler — polen ve toz' },
    ],
    weightRangeKg: [4, 7],
    lifespanYears: [12, 15],
  },
  {
    breed: 'Bombay',
    aliases: ['Bombay Cat', 'Bombay Kedisi', 'Black Burmese'],
    petType: 'Cat',
    healthRisks: [
      { label: 'Hypertrophic cardiomyopathy (HCM)', label_tr: 'Hipertrofik kardiyomiyopati (HCM)' },
      { label: 'Craniofacial defect in some bloodlines', label_tr: 'Bazı kan hatlarında kraniofasiyal defekt' },
      { label: 'Excessive tearing / eye discharge', label_tr: 'Aşırı gözyaşı / göz akıntısı' },
      { label: 'Obesity in inactive indoor cats', label_tr: 'Hareketsiz iç mekan kedilerinde obezite' },
    ],
    dailyCare: [
      { label: 'Wipe coat weekly with chamois — glossy short coat needs little', label_tr: 'Güderi bezle haftalık silme — parlak kısa tüy az bakım gerektirir', category: 'grooming' },
      { label: '2× 15–20 min active play/day — playful and interactive', label_tr: 'Günde 2 kez 15-20 dk aktif oyun — oyuncu ve etkileşimli', category: 'exercise' },
      { label: '2 meals/day — controlled portions, gains weight easily', label_tr: 'Günde 2 öğün — kontrollü porsiyonlar, kolayca kilo alır', category: 'feeding' },
      { label: 'Loves warmth — provide sunny spots and blankets', label_tr: 'Sıcağı sever — güneşli köşeler ve battaniyeler sağlayın', category: 'environment' },
      { label: 'Annual cardiac echo; eye cleaning if discharge present', label_tr: 'Yıllık kardiyak eko; akıntı varsa göz temizliği', category: 'health' },
    ],
    careTips: [
      { label: 'Annual cardiac screening — HCM risk from Burmese lineage', label_tr: 'Yıllık kardiyak tarama — Burmese soyundan HCM riski' },
      { label: 'Highly people-oriented — not suited to being alone for long', label_tr: 'Çok insan odaklı — uzun süre yalnız kalmaya uygun değil' },
      { label: 'Minimal grooming — easiest coat to maintain', label_tr: 'Minimum bakım — en kolay bakılan tüy' },
    ],
    temperament: [
      { label: 'Affectionate and people-oriented', label_tr: 'Sevecen ve insan odaklı' },
      { label: 'Playful and curious', label_tr: 'Oyuncu ve meraklı' },
      { label: 'Dog-like loyalty — follows owners around', label_tr: 'Köpek gibi sadakat — sahiplerini takip eder' },
      { label: 'Adaptable to other pets and children', label_tr: 'Diğer evcil hayvanlara ve çocuklara uyumlu' },
    ],
    dietaryNeeds: [
      { label: 'Lean protein diet — prone to weight gain', label_tr: 'Yağsız protein diyeti — kilo almaya eğilimli' },
      { label: 'Omega-3 supplements for coat shine', label_tr: 'Tüy parlaklığı için Omega-3 takviyeleri' },
    ],
    exerciseMinutesPerDay: [25, 40],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Environmental allergens (dust, pollen)', label_tr: 'Çevresel alerjenler (toz, polen)' },
      { label: 'Some food protein sensitivities', label_tr: 'Bazı besin proteini duyarlılıkları' },
    ],
    weightRangeKg: [3.5, 6],
    lifespanYears: [12, 16],
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
    temperament: [
      { label: 'Highly variable — depends on individual and upbringing', label_tr: 'Yüksek değişkenlik — bireye ve yetiştirilişe bağlıdır' },
      { label: 'Often resilient and adaptable', label_tr: 'Genellikle dayanıklı ve uyumlu' },
    ],
    dietaryNeeds: [
      { label: 'Feed by size and activity', label_tr: 'Boyut ve aktiviteye göre besleyin' },
      { label: 'Fresh water always available', label_tr: 'Her zaman taze su' },
    ],
    exerciseMinutesPerDay: [15, 25],
    groomingFrequency: 'weekly',
    commonAllergies: [
      { label: 'Allergy profile varies by genetics', label_tr: 'Alerji profili genetiğe göre değişir' },
    ],
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
