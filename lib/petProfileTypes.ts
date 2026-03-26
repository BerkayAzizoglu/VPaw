import type { PetId } from './healthMvpModel';

export type VaccinationRecord = {
  name: string;
  date: string;
};

export type SurgeryRecord = {
  name: string;
  date: string;
  note?: string;
};

export type AllergyRecord = {
  category: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'resolved';
};

export type DiabetesRecord = {
  type: string;
  date: string;
  status: 'active' | 'remission' | 'resolved';
};

export type RoutineCareRecord = {
  enabled: boolean;
  lastDate: string;
  intervalDays: number;
};

export type PetProfile = {
  id: PetId;
  name: string;
  petType: 'Dog' | 'Cat';
  gender: 'male' | 'female';
  breed: string;
  coatPattern: string;
  birthDate: string;
  ageYears: number;
  microchip: string;
  image: string;
  vaccines: string;
  surgeries: string;
  vaccinations: VaccinationRecord[];
  surgeriesLog: SurgeryRecord[];
  allergiesLog: AllergyRecord[];
  diabetesLog: DiabetesRecord[];
  routineCare: {
    internalParasite: RoutineCareRecord;
    externalParasite: RoutineCareRecord;
  };
  chronicConditions: {
    allergies: boolean;
    diabetes: boolean;
  };
};

export type HealthEventType = 'vaccination' | 'vet_visit' | 'health_note' | 'weight' | 'other';

export type HealthEvent = {
  id: string;
  petId: string;
  type: HealthEventType;
  title: string;
  description?: string;
  date: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
