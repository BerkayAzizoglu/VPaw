import type { PetProfile } from '../components/AuthGate';
import type { HealthDocumentItem } from './healthDocumentsVault';
import { getAllDocumentsForPet } from './healthDocumentsVault';
import { getHealthCardSummary, getVaccinesForUI, getVetVisitsForUI } from './healthEventAdapters';
import type { HealthEvent } from '../components/AuthGate';
import { buildUnifiedHealthEventsForPet, type UnifiedHealthEvent } from './unifiedHealthEvents';
import type { ByPet, MedicalEvent, MedicationCourse, Reminder, VetVisit, WeightPoint } from './healthMvpModel';

type PassportState = {
  petProfiles: Record<string, PetProfile>;
  vetVisitsByPet: ByPet<VetVisit>;
  medicalEventsByPet: ByPet<MedicalEvent>;
  remindersByPet: ByPet<Reminder>;
  medicationCoursesByPet: ByPet<MedicationCourse>;
  weightsByPet: Record<string, WeightPoint[]>;
  legacyHealthEventsByPet: Record<string, HealthEvent[]>;
};

export type PetPassportSectionKey = 'summary' | 'timeline' | 'vaccines' | 'weight' | 'documents';

export type PetPassportExportSelection = {
  includeSections?: Partial<Record<PetPassportSectionKey, boolean>>;
  limits?: Partial<Record<'timeline' | 'vaccines' | 'weight' | 'documents', number>>;
};

export type PetHealthPassportData = {
  petInfo: {
    id: string;
    name: string;
    breed: string;
    ageLabel: string;
    petType: string;
    gender: string;
    microchip?: string;
    image?: string;
    ownerName?: string;
  };
  summaryStats: {
    totalVetVisits: number;
    lastVisit: string;
    vaccineStatus: string;
    weightTrend: string;
    alerts: string[];
  };
  latestHighlights: Array<{
    title: string;
    subtitle: string;
  }>;
  timeline: Array<{
    id: string;
    date: string;
    title: string;
    description: string;
    type: 'vet' | 'record';
  }>;
  weightTrend: {
    min: number | null;
    max: number | null;
    trendLabel: string;
    points: Array<{
      label: string;
      value: number;
      date: string;
    }>;
  };
  vetVisits: Array<{
    id: string;
    date: string;
    title: string;
    clinic: string;
    doctor: string;
    payment?: string;
    attachmentsCount: number;
  }>;
  healthRecords: Array<{
    id: string;
    date: string;
    title: string;
    category: string;
    note?: string;
  }>;
  vaccines: Array<{
    name: string;
    subtitle: string;
    date: string;
    status: 'upToDate' | 'dueSoon' | 'overdue';
  }>;
  documents: Array<{
    id: string;
    title: string;
    date: string;
    type: string;
    sourceLabel: string;
    fileUrl?: string;
  }>;
  generatedAt: string;
};

export type PetHealthPassportPdfResult =
  | { ok: true; uri: string }
  | { ok: false; reason: 'missing_dependency' | 'print_failed'; message: string };

function parseDateMs(value: string | undefined) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function formatDate(value: string | undefined, locale: 'en' | 'tr') {
  const ms = parseDateMs(value);
  if (ms <= 0) return value ?? '';
  return new Date(ms).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function escapeHtml(value: string | undefined) {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function compact<T>(items: Array<T | null | undefined>): T[] {
  return items.filter((item): item is T => item != null);
}

function toSentenceCase(value: string) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getWeightTrendLabel(points: WeightPoint[], locale: 'en' | 'tr') {
  if (points.length < 2) return locale === 'tr' ? 'Yetersiz veri' : 'Not enough data';
  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  if (typeof first !== 'number' || typeof last !== 'number') return locale === 'tr' ? 'Yetersiz veri' : 'Not enough data';
  const delta = last - first;
  if (Math.abs(delta) < 0.05) return locale === 'tr' ? 'Stabil' : 'Stable';
  if (delta > 0) return locale === 'tr' ? `Artis +${delta.toFixed(1)} kg` : `Up +${delta.toFixed(1)} kg`;
  return locale === 'tr' ? `Dususte ${Math.abs(delta).toFixed(1)} kg` : `Down ${Math.abs(delta).toFixed(1)} kg`;
}

function getVaccineStatusLabel(
  vaccineCount: number,
  overdueCount: number,
  locale: 'en' | 'tr',
) {
  if (vaccineCount === 0) return locale === 'tr' ? 'Kayit yok' : 'No records yet';
  if (overdueCount > 0) return locale === 'tr' ? `${overdueCount} gecikmis` : `${overdueCount} overdue`;
  return locale === 'tr' ? 'Guncel' : 'Up to date';
}

function mapDocumentTypeLabel(type: HealthDocumentItem['type'], locale: 'en' | 'tr') {
  if (type === 'lab') return locale === 'tr' ? 'Lab' : 'Lab';
  if (type === 'prescription') return locale === 'tr' ? 'Recete' : 'Prescription';
  if (type === 'image') return locale === 'tr' ? 'Gorsel' : 'Image';
  if (type === 'document') return locale === 'tr' ? 'Belge' : 'Document';
  return locale === 'tr' ? 'Diger' : 'Other';
}

function getWeightChartSvg(points: Array<{ label: string; value: number; date: string }>) {
  if (points.length === 0) {
    return '<div class="empty-box">No records yet</div>';
  }

  const width = 620;
  const height = 180;
  const padX = 24;
  const padY = 20;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.6, max - min);
  const stepX = points.length <= 1 ? 0 : (width - padX * 2) / (points.length - 1);
  const path = points.map((point, index) => {
    const x = padX + stepX * index;
    const y = height - padY - ((point.value - min) / range) * (height - padY * 2);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const dots = points.map((point, index) => {
    const x = padX + stepX * index;
    const y = height - padY - ((point.value - min) / range) * (height - padY * 2);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="#1E2A78" />`;
  }).join('');

  const labels = points.map((point, index) => {
    const x = padX + stepX * index;
    return `<text x="${x.toFixed(1)}" y="${height - 4}" text-anchor="middle" class="chart-label">${escapeHtml(point.label)}</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" class="weight-chart" xmlns="http://www.w3.org/2000/svg">
      <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="#D9DEE6" stroke-width="1" />
      <path d="${path}" fill="none" stroke="#1E2A78" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
      ${labels}
    </svg>
  `;
}

function buildCoverPhoto(photoUrl: string | undefined, petName: string) {
  if (photoUrl && photoUrl.trim().length > 0) {
    return `<img class="cover-photo" src="${escapeHtml(photoUrl)}" alt="${escapeHtml(petName)}" />`;
  }
  return `<div class="cover-photo cover-photo-fallback">${escapeHtml(petName.slice(0, 1).toUpperCase())}</div>`;
}

function buildRowsHtml(rows: Array<string>) {
  if (rows.length === 0) return '<div class="empty-box">No records yet</div>';
  return rows.join('');
}

export function buildPetHealthPassportData(
  petId: string,
  state: PassportState,
  locale: 'en' | 'tr' = 'en',
): PetHealthPassportData | null {
  const pet = state.petProfiles[petId];
  if (!pet) return null;

  const generatedAt = new Date().toISOString();
  const weightEntries = [...(state.weightsByPet[petId] ?? [])].sort((a, b) => parseDateMs(a.date) - parseDateMs(b.date));
  const vaccines = getVaccinesForUI(petId, state.medicalEventsByPet, state.legacyHealthEventsByPet, pet);
  const vetVisits = getVetVisitsForUI(petId, state.vetVisitsByPet, state.medicalEventsByPet, state.legacyHealthEventsByPet, pet) ?? [];
  const healthCardSummary = getHealthCardSummary(
    petId,
    state.vetVisitsByPet,
    state.medicalEventsByPet,
    state.remindersByPet,
    state.medicationCoursesByPet,
    weightEntries,
    state.legacyHealthEventsByPet,
    pet,
  );

  const unified = buildUnifiedHealthEventsForPet(
    petId,
    state.medicalEventsByPet,
    state.vetVisitsByPet,
    state.weightsByPet,
    state.legacyHealthEventsByPet,
    pet,
  );

  const documents = getAllDocumentsForPet(petId, {
    vetVisitsByPet: state.vetVisitsByPet,
    medicalEventsByPet: state.medicalEventsByPet,
    weightsByPet: state.weightsByPet,
  });

  const rawHealthRecords = (state.medicalEventsByPet[petId] ?? [])
    .filter((event) => event.type !== 'vaccine' && event.type !== 'attachment')
    .sort((a, b) => parseDateMs(b.eventDate) - parseDateMs(a.eventDate));

  const overdueCount = vaccines?.attentionCounts?.overdueCount ?? 0;
  const latestWeightPoints = weightEntries.slice(-6).map((point) => ({
    label: formatDate(point.date, locale).slice(0, 6),
    value: point.value,
    date: point.date,
  }));

  return {
    petInfo: {
      id: pet.id,
      name: pet.name,
      breed: pet.breed || (locale === 'tr' ? 'Irk belirtilmedi' : 'Breed not specified'),
      ageLabel: locale === 'tr' ? `${pet.ageYears} yas` : `${pet.ageYears} years old`,
      petType: pet.petType,
      gender: toSentenceCase(pet.gender),
      microchip: pet.microchip || undefined,
      image: pet.image || undefined,
    },
    summaryStats: {
      totalVetVisits: vetVisits.length,
      lastVisit: healthCardSummary.lastVisit ? `${healthCardSummary.lastVisit.title} - ${healthCardSummary.lastVisit.date}` : (locale === 'tr' ? 'Kayit yok' : 'No records yet'),
      vaccineStatus: getVaccineStatusLabel(vaccines?.historyItems.length ?? 0, overdueCount, locale),
      weightTrend: getWeightTrendLabel(weightEntries, locale),
      alerts: healthCardSummary.alerts,
    },
    latestHighlights: compact([
      healthCardSummary.lastVisit ? {
        title: locale === 'tr' ? 'Son veteriner ziyareti' : 'Latest vet visit',
        subtitle: `${healthCardSummary.lastVisit.title} - ${healthCardSummary.lastVisit.date}`,
      } : null,
      healthCardSummary.vaccinesSummary.latest ? {
        title: locale === 'tr' ? 'Son asi kaydi' : 'Latest vaccine',
        subtitle: healthCardSummary.vaccinesSummary.latest,
      } : null,
      healthCardSummary.recentEvents[0] ? {
        title: locale === 'tr' ? 'Son saglik kaydi' : 'Recent health record',
        subtitle: `${healthCardSummary.recentEvents[0].title} - ${healthCardSummary.recentEvents[0].date}`,
      } : null,
    ]).slice(0, 3),
    timeline: unified
      .filter((item): item is UnifiedHealthEvent & { type: 'vet' | 'record' } => item.type === 'vet' || item.type === 'record')
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        date: formatDate(item.date, locale),
        title: item.title || (locale === 'tr' ? 'Saglik kaydi' : 'Health record'),
        description: item.notes || '',
        type: item.type,
      })),
    weightTrend: {
      min: weightEntries.length > 0 ? Math.min(...weightEntries.map((entry) => entry.value)) : null,
      max: weightEntries.length > 0 ? Math.max(...weightEntries.map((entry) => entry.value)) : null,
      trendLabel: getWeightTrendLabel(weightEntries, locale),
      points: latestWeightPoints,
    },
    vetVisits: vetVisits.slice(0, 8).map((visit) => ({
      id: visit.id,
      date: visit.date,
      title: visit.title,
      clinic: visit.clinic,
      doctor: visit.doctor,
      payment: visit.paymentText ?? undefined,
      attachmentsCount: visit.attachments.length,
    })),
    healthRecords: rawHealthRecords.slice(0, 10).map((event) => ({
      id: event.id,
      date: formatDate(event.eventDate, locale),
      title: event.title,
      category: toSentenceCase(event.type.replace('_', ' ')),
      note: event.note,
    })),
    vaccines: vaccines?.historyItems.slice(0, 10).map((item) => ({
      name: item.name,
      subtitle: item.subtitle,
      date: item.dueDate,
      status: item.status,
    })) ?? [],
    documents: documents.slice(0, 20).map((document) => ({
      id: document.id,
      title: document.title,
      date: formatDate(document.date, locale),
      type: mapDocumentTypeLabel(document.type, locale),
      sourceLabel: document.sourceType === 'vet_visit'
        ? (locale === 'tr' ? 'Veteriner ziyareti' : 'Vet visit')
        : (locale === 'tr' ? 'Saglik kaydi' : 'Health record'),
      fileUrl: document.fileUrl,
    })),
    generatedAt,
  };
}

export function buildPetHealthPassportHtml(
  data: PetHealthPassportData,
  locale: 'en' | 'tr' = 'en',
  selection: PetPassportExportSelection = {},
) {
  const include = {
    summary: selection.includeSections?.summary !== false,
    timeline: selection.includeSections?.timeline !== false,
    vaccines: selection.includeSections?.vaccines !== false,
    weight: selection.includeSections?.weight !== false,
    documents: selection.includeSections?.documents !== false,
  };

  const timeline = data.timeline.slice(0, selection.limits?.timeline ?? data.timeline.length);
  const vaccineRows = data.vaccines.slice(0, selection.limits?.vaccines ?? data.vaccines.length);
  const weightPoints = data.weightTrend.points.slice(0, selection.limits?.weight ?? data.weightTrend.points.length);
  const documentRows = data.documents.slice(0, selection.limits?.documents ?? data.documents.length);

  const timelineHtml = buildRowsHtml(
    timeline.map((item) => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-copy">
          <div class="timeline-date">${escapeHtml(item.date)}</div>
          <div class="timeline-title">${escapeHtml(item.title)}</div>
          <div class="timeline-desc">${escapeHtml(item.description || (locale === 'tr' ? 'Not yok' : 'No additional notes'))}</div>
        </div>
      </div>
    `),
  );

  const vaccineHtml = buildRowsHtml(
    vaccineRows.map((item) => `
      <div class="vaccine-card">
        <div class="vaccine-copy">
          <div class="vaccine-title">${escapeHtml(item.name)}</div>
          <div class="vaccine-date">${escapeHtml(formatDate(item.date, locale))}</div>
          <div class="vaccine-subtitle">${escapeHtml(item.subtitle || (locale === 'tr' ? 'Detay yok' : 'No details'))}</div>
        </div>
        <div class="vaccine-side">
          <span class="status status-${escapeHtml(item.status)}">${escapeHtml(item.status === 'upToDate' ? 'Up to date' : item.status === 'dueSoon' ? 'Due soon' : 'Overdue')}</span>
        </div>
      </div>
    `),
  );

  const documentsHtml = buildRowsHtml(
    documentRows.map((item) => `
      <div class="doc-row">
        <div class="doc-icon">${escapeHtml(item.type.slice(0, 1).toUpperCase())}</div>
        <div class="doc-copy">
          <div class="doc-title">${escapeHtml(item.title)}</div>
          <div class="doc-meta">${escapeHtml(item.type)} &middot; ${escapeHtml(item.sourceLabel)} &middot; ${escapeHtml(item.date)}</div>
        </div>
      </div>
    `),
  );

  const highlightHtml = buildRowsHtml(
    data.latestHighlights.map((item) => `
      <div class="highlight-row">
        <div class="highlight-title">${escapeHtml(item.title)}</div>
        <div class="highlight-subtitle">${escapeHtml(item.subtitle)}</div>
      </div>
    `),
  );

  const generatedOn = formatDate(data.generatedAt, locale);

  return `
  <!DOCTYPE html>
  <html lang="${locale}">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
          color: #111111;
          background: #FFFFFF;
        }
        .page {
          width: 100%;
          min-height: 100vh;
          padding: 72px 60px;
        }
        .page-break {
          page-break-before: always;
        }
        .cover {
          position: relative;
          min-height: 94vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding-top: 40px;
          padding-bottom: 56px;
        }
        .cover-corner {
          position: absolute;
          top: 20px;
          right: 8px;
          width: 120px;
          height: 120px;
          opacity: 0.12;
        }
        .cover-label {
          font-size: 11px;
          letter-spacing: 3.2px;
          text-transform: uppercase;
          color: #666666;
          margin-bottom: 22px;
        }
        .cover-photo {
          width: 212px;
          height: 212px;
          object-fit: cover;
          border-radius: 40px;
          margin-top: 28px;
          border: 8px solid #FFFFFF;
          box-shadow: 0 18px 36px rgba(17, 17, 17, 0.07);
        }
        .cover-photo-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F7F8FA;
          color: #1E2A78;
          font-size: 64px;
          font-weight: 800;
        }
        .cover-name {
          font-size: 64px;
          line-height: 0.94;
          font-weight: 800;
          letter-spacing: 1.2px;
          margin: 0;
          text-transform: uppercase;
        }
        .cover-meta {
          margin-top: 14px;
          font-size: 16px;
          line-height: 1.6;
          color: #666666;
        }
        .cover .cover-meta + .cover-meta {
          display: none;
        }
        .cover-footer {
          position: absolute;
          bottom: 12px;
          left: 0;
          right: 0;
          font-size: 12px;
          color: #666666;
          letter-spacing: 0.3px;
        }
        .cover-brand {
          margin-top: 18px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: #1E2A78;
        }
        .section {
          margin-top: 52px;
        }
        .section-shell {
          background: #FFFFFF;
          border-radius: 28px;
          padding: 32px;
        }
        .section-label {
          font-size: 10px;
          letter-spacing: 2.6px;
          text-transform: uppercase;
          color: #666666;
          margin-bottom: 10px;
        }
        .section-title {
          font-size: 28px;
          line-height: 1.15;
          font-weight: 750;
          letter-spacing: -0.6px;
          margin: 0;
          color: #111111;
        }
        .divider {
          height: 1px;
          background: #E4E8EF;
          margin: 26px 0 32px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }
        .summary-card {
          background: #F7F8FA;
          border-radius: 22px;
          padding: 22px;
        }
        .summary-kicker {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #666666;
          margin-bottom: 12px;
        }
        .summary-value {
          font-size: 28px;
          line-height: 1.1;
          font-weight: 700;
          color: #111111;
        }
        .summary-note {
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.5;
          color: #666666;
        }
        .highlights {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .highlight-row {
          background: #F7F8FA;
          border-radius: 18px;
          padding: 18px;
        }
        .highlight-title {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #666666;
        }
        .highlight-subtitle {
          margin-top: 5px;
          font-size: 15px;
          line-height: 1.5;
          color: #111111;
        }
        .timeline {
          position: relative;
          margin-left: 10px;
          padding-left: 30px;
          border-left: 1px solid #DDE2EA;
        }
        .timeline-item {
          position: relative;
          padding: 0 0 28px;
        }
        .timeline-dot {
          position: absolute;
          left: -35px;
          top: 6px;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #1E2A78;
        }
        .timeline-date {
          font-size: 12px;
          color: #666666;
          margin-bottom: 4px;
        }
        .timeline-title {
          font-size: 17px;
          line-height: 1.35;
          font-weight: 700;
          color: #111111;
        }
        .timeline-desc {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.6;
          color: #666666;
        }
        .vaccine-list {
          display: grid;
          gap: 16px;
        }
        .vaccine-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          background: #F7F8FA;
          border-radius: 22px;
          padding: 22px;
        }
        .vaccine-copy {
          flex: 1;
        }
        .vaccine-title {
          font-size: 17px;
          line-height: 1.35;
          font-weight: 700;
          color: #111111;
        }
        .vaccine-date {
          margin-top: 5px;
          font-size: 13px;
          line-height: 1.5;
          color: #111111;
        }
        .vaccine-subtitle {
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.5;
          color: #666666;
        }
        .vaccine-side {
          min-width: 104px;
          text-align: right;
        }
        .status {
          display: inline-block;
          border-radius: 999px;
          padding: 7px 13px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.9px;
          text-transform: uppercase;
          background: #EFF2F7;
          color: #111111;
          border: 1px solid #DCE3EC;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
        }
        .status-overdue {
          background: #F8E9E8;
          color: #8E3A2F;
          border-color: #EFCFCC;
        }
        .status-dueSoon {
          background: #F7F2E7;
          color: #8B6930;
          border-color: #E9DDC9;
        }
        .status-upToDate {
          background: #EDF4EE;
          color: #2E6B44;
          border-color: #CFE1D3;
        }
        .weight-shell {
          background: #F7F8FA;
          border-radius: 22px;
          padding: 24px;
        }
        .weight-meta {
          display: flex;
          gap: 24px;
          margin-top: 20px;
        }
        .weight-stat-label {
          font-size: 10px;
          letter-spacing: 1.8px;
          text-transform: uppercase;
          color: #666666;
        }
        .weight-stat-value {
          margin-top: 6px;
          font-size: 18px;
          font-weight: 700;
          color: #111111;
        }
        .weight-chart {
          width: 100%;
          height: auto;
        }
        .chart-label {
          font-size: 10px;
          fill: #888888;
          font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
        }
        .doc-row {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          padding: 18px;
          border-radius: 20px;
          background: #F7F8FA;
          margin-bottom: 14px;
        }
        .doc-icon {
          width: 32px;
          height: 32px;
          border-radius: 12px;
          background: rgba(30, 42, 120, 0.08);
          color: #1E2A78;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex: 0 0 auto;
        }
        .doc-title {
          font-size: 15px;
          line-height: 1.4;
          font-weight: 600;
          color: #111111;
        }
        .doc-meta {
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.5;
          color: #666666;
        }
        .empty-box {
          background: #F7F8FA;
          border-radius: 20px;
          padding: 24px;
          color: #666666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <section class="page cover">
        <svg class="cover-corner" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="M78 6 L96 6 L96 24" fill="none" stroke="#1E2A78" stroke-width="1.2" />
          <path d="M54 10 L92 48" fill="none" stroke="#1E2A78" stroke-width="0.9" />
          <circle cx="79" cy="24" r="2.4" fill="#1E2A78" />
        </svg>
        <div class="cover-label">${locale === 'tr' ? 'Pet Health Report' : 'Pet Health Report'}</div>
        <h1 class="cover-name">${escapeHtml(data.petInfo.name)}</h1>
        <div class="cover-meta">${escapeHtml(data.petInfo.breed)} &middot; ${escapeHtml(data.petInfo.ageLabel)}</div>
        ${buildCoverPhoto(data.petInfo.image, data.petInfo.name)}
        <div class="cover-brand">Generated by Virnelo</div>
        <div class="cover-footer">
          <span>${escapeHtml(locale === 'tr' ? 'Generated by Virnelo' : 'Generated by Virnelo')}</span><br />
          <span>${escapeHtml(locale === 'tr' ? `Generated on ${generatedOn}` : `Generated on ${generatedOn}`)}</span>
        </div>
      </section>

      ${include.summary ? `
      <section class="page page-break">
        <div class="section-shell">
          <div class="section-label">${locale === 'tr' ? 'Overview' : 'Overview'}</div>
          <h2 class="section-title">${locale === 'tr' ? 'Summary' : 'Summary'}</h2>
          <div class="divider"></div>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-kicker">${locale === 'tr' ? 'Vet visits' : 'Vet visits'}</div>
              <div class="summary-value">${escapeHtml(String(data.summaryStats.totalVetVisits))}</div>
              <div class="summary-note">${escapeHtml(data.summaryStats.lastVisit)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-kicker">${locale === 'tr' ? 'Vaccine status' : 'Vaccine status'}</div>
              <div class="summary-value">${escapeHtml(data.summaryStats.vaccineStatus)}</div>
              <div class="summary-note">${escapeHtml(data.latestHighlights[1]?.subtitle ?? (locale === 'tr' ? 'No records yet' : 'No records yet'))}</div>
            </div>
            <div class="summary-card">
              <div class="summary-kicker">${locale === 'tr' ? 'Weight trend' : 'Weight trend'}</div>
              <div class="summary-value">${escapeHtml(data.summaryStats.weightTrend)}</div>
              <div class="summary-note">${escapeHtml(data.weightTrend.points[data.weightTrend.points.length - 1]?.value?.toFixed(1) ?? '-')}</div>
            </div>
            <div class="summary-card">
              <div class="summary-kicker">${locale === 'tr' ? 'Alerts' : 'Alerts'}</div>
              <div class="summary-value">${escapeHtml(String(data.summaryStats.alerts.length))}</div>
              <div class="summary-note">${escapeHtml(data.summaryStats.alerts[0] ?? (locale === 'tr' ? 'No active alerts' : 'No active alerts'))}</div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="section-label">${locale === 'tr' ? 'Highlights' : 'Highlights'}</div>
          <div class="highlights">${highlightHtml}</div>
        </div>
      </section>
      ` : ''}

      ${include.timeline ? `
      <section class="page page-break">
        <div class="section-shell">
          <div class="section-label">${locale === 'tr' ? 'Chronology' : 'Chronology'}</div>
          <h2 class="section-title">${locale === 'tr' ? 'Health Timeline' : 'Health Timeline'}</h2>
          <div class="divider"></div>
          <div class="timeline">${timelineHtml}</div>
        </div>
      </section>
      ` : ''}

      ${include.vaccines ? `
      <section class="page page-break">
        <div class="section-shell">
          <div class="section-label">${locale === 'tr' ? 'Prevention' : 'Prevention'}</div>
          <h2 class="section-title">${locale === 'tr' ? 'Vaccines' : 'Vaccines'}</h2>
          <div class="divider"></div>
          ${vaccineRows.length === 0 ? '<div class="empty-box">No records yet</div>' : `
            <div class="vaccine-list">${vaccineHtml}</div>
          `}
        </div>
      </section>
      ` : ''}

      ${include.weight ? `
      <section class="page page-break">
        <div class="section-shell">
          <div class="section-label">${locale === 'tr' ? 'Metrics' : 'Metrics'}</div>
          <h2 class="section-title">${locale === 'tr' ? 'Weight' : 'Weight'}</h2>
          <div class="divider"></div>
          <div class="weight-shell">
            ${getWeightChartSvg(weightPoints)}
            <div class="weight-meta">
              <div>
                <div class="weight-stat-label">${locale === 'tr' ? 'Min' : 'Min'}</div>
                <div class="weight-stat-value">${data.weightTrend.min == null ? '-' : `${data.weightTrend.min.toFixed(1)} kg`}</div>
              </div>
              <div>
                <div class="weight-stat-label">${locale === 'tr' ? 'Max' : 'Max'}</div>
                <div class="weight-stat-value">${data.weightTrend.max == null ? '-' : `${data.weightTrend.max.toFixed(1)} kg`}</div>
              </div>
              <div>
                <div class="weight-stat-label">${locale === 'tr' ? 'Trend' : 'Trend'}</div>
                <div class="weight-stat-value">${escapeHtml(data.weightTrend.trendLabel)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      ` : ''}

      ${include.documents ? `
      <section class="page page-break">
        <div class="section-shell">
          <div class="section-label">${locale === 'tr' ? 'Vault' : 'Vault'}</div>
          <h2 class="section-title">${locale === 'tr' ? 'Documents' : 'Documents'}</h2>
          <div class="divider"></div>
          ${documentsHtml}
        </div>
      </section>
      ` : ''}
    </body>
  </html>
  `;
}

export async function generatePetPassportPDF(args: {
  data: PetHealthPassportData;
  locale?: 'en' | 'tr';
  selection?: PetPassportExportSelection;
}): Promise<PetHealthPassportPdfResult> {
  let PrintModule: typeof import('expo-print') | null = null;
  try {
    PrintModule = await import('expo-print');
  } catch {
    PrintModule = null;
  }

  if (!PrintModule) {
    return {
      ok: false,
      reason: 'missing_dependency',
      message: 'expo-print is not installed. Add expo-print to enable PDF export.',
    };
  }

  try {
    const html = buildPetHealthPassportHtml(args.data, args.locale ?? 'en', args.selection);
    const result = await PrintModule.printToFileAsync({ html, base64: false });

    let SharingModule: typeof import('expo-sharing') | null = null;
    try {
      SharingModule = await import('expo-sharing');
    } catch {
      SharingModule = null;
    }

    if (SharingModule && await SharingModule.isAvailableAsync()) {
      await SharingModule.shareAsync(result.uri);
    }

    return { ok: true, uri: result.uri };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate PDF';
    return { ok: false, reason: 'print_failed', message };
  }
}
