// ─── Vaccine Name Localization ────────────────────────────────────────────────
// Maps common English/Latin vaccine names to Turkish equivalents.
// Applied at display layer only — stored data is never mutated.

type VaccineEntry = {
  tr: string;
  trSub?: string;
};

const VACCINE_MAP: Record<string, VaccineEntry> = {
  // ── Dogs ──────────────────────────────────────────────────────────────────
  rabies:           { tr: 'Kuduz', trSub: 'Kuduz virüsüne karşı koruma' },
  'kuduz':          { tr: 'Kuduz', trSub: 'Kuduz virüsüne karşı koruma' },
  dhpp:             { tr: 'DHPP', trSub: 'Distemper, Hepatit, Parvo, Parainfluenza' },
  dhlpp:            { tr: 'DHLPP', trSub: 'Distemper, Hepatit, Lepto, Parvo, Parainfluenza' },
  'da2pp':          { tr: 'DA2PP', trSub: 'Distemper, Adenovirus, Parvo, Parainfluenza' },
  distemper:        { tr: 'Distemper (Gençlik Hastalığı)', trSub: 'Kızamıkçık virüsüne karşı koruma' },
  parvovirus:       { tr: 'Parvovirüs', trSub: 'Bağırsak enfeksiyonuna karşı koruma' },
  'parvo':          { tr: 'Parvovirüs', trSub: 'Bağırsak enfeksiyonuna karşı koruma' },
  bordetella:       { tr: 'Kennel Öksürüğü (Bordetella)', trSub: 'Öksürük ve solunum yolu enfeksiyonuna karşı' },
  'kennel cough':   { tr: 'Kennel Öksürüğü', trSub: 'Öksürük ve solunum yolu enfeksiyonuna karşı' },
  leptospirosis:    { tr: 'Leptospiroz', trSub: 'Böbrek ve karaciğer hastalığına karşı koruma' },
  'lepto':          { tr: 'Leptospiroz', trSub: 'Böbrek ve karaciğer hastalığına karşı koruma' },
  'lyme':           { tr: 'Lyme Hastalığı', trSub: 'Kene kaynaklı bakteriyel hastalığa karşı' },
  'canine influenza': { tr: 'Köpek Gribi', trSub: 'Grip virüsüne karşı koruma' },
  'influenza':      { tr: 'Grip', trSub: 'Grip virüsüne karşı koruma' },
  hepatitis:        { tr: 'Hepatit', trSub: 'Karaciğer iltihabına karşı koruma' },
  adenovirus:       { tr: 'Adenovirüs', trSub: 'Solunum ve karaciğer hastalığına karşı' },
  parainfluenza:    { tr: 'Parainfluenza', trSub: 'Solunum yolu hastalığına karşı koruma' },
  coronavirus:      { tr: 'Koronavirüs (Köpek)', trSub: 'Bağırsak iltihabına karşı koruma' },

  // ── Cats ──────────────────────────────────────────────────────────────────
  fvrcp:            { tr: 'FVRCP (Kedi 3\'lüsü)', trSub: 'Rhinotracheitis, Calicivirus, Panleukopenia' },
  'fvr':            { tr: 'Kedi Rhinotracheitisi', trSub: 'Solunum yolu hastalığına karşı koruma' },
  felv:             { tr: 'Kedi Lösemi Virüsü (FeLV)', trSub: 'Bağışıklık sistemi hastalığına karşı koruma' },
  'feline leukemia': { tr: 'Kedi Lösemi Virüsü', trSub: 'Bağışıklık sistemi hastalığına karşı koruma' },
  panleukopenia:    { tr: 'Panlökopeni (Kedi Parvosü)', trSub: 'Kan hücresi azalmasına karşı koruma' },
  calicivirus:      { tr: 'Kedi Kaliçivirüsü', trSub: 'Ağız ve solunum yolu hastalığına karşı' },
  rhinotracheitis:  { tr: 'Kedi Rhinotracheitisi', trSub: 'Üst solunum yolu enfeksiyonuna karşı' },
  'fip':            { tr: 'Kedi Enfeksiyöz Peritoniti (FIP)', trSub: 'Peritona karşı koruma' },
  'fiv':            { tr: 'Kedi İmmün Yetmezlik Virüsü (FIV)', trSub: 'Bağışıklık sistemi hastalığına karşı' },
  chlamydia:        { tr: 'Klamidya', trSub: 'Göz iltihabına karşı koruma' },
};

/**
 * Returns a localized vaccine name (and optional subtitle) for the given locale.
 * Falls back to the original name if no translation is found.
 */
export function localizeVaccine(
  name: string,
  subtitle: string,
  locale: 'en' | 'tr',
): { name: string; subtitle: string } {
  if (locale !== 'tr') return { name, subtitle };

  const key = name.trim().toLowerCase();
  const entry = VACCINE_MAP[key];
  if (!entry) return { name, subtitle };

  return {
    name: entry.tr,
    subtitle: entry.trSub ?? subtitle,
  };
}
