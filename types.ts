
export enum Role {
  CONSULTANT = 'CONSULTANT',
  MANAGER = 'MANAGER', // Rafael or Corat
}

export enum TestType {
  TEST_1_ACTIVE = 'TEST_1_ACTIVE', // Rafael entra em contato
  TEST_2_PASSIVE = 'TEST_2_PASSIVE', // Landing Page -> Aluno chama
}

// Mantido apenas para compatibilidade de histórico, mas o sistema agora usa strings dinâmicas
export enum LeadStatus {
  NEW = 'NEW',
  TODO = 'TODO',
  CONTACTED = 'CONTACTED',
  WAITING = 'WAITING',
  SCHEDULED = 'SCHEDULED',
  LOST = 'LOST',
  WON_3Y = 'WON_3Y',
  WON_LIFETIME = 'WON_LIFETIME',
}

export type StageType = 'OPEN' | 'WON' | 'LOST';

export interface PipelineStage {
  id: string;
  title: string;
  color: string; // 'blue', 'green', 'red', 'purple', 'yellow', 'indigo', 'gray'
  type: StageType;
  order: number;
}

export interface HistoryItem {
  id: string;
  content: string;
  timestamp: number;
  author: string;
}

export interface Lead {
  id: string;
  studentName: string;
  whatsapp: string;
  consultantName: string;
  testType: TestType;
  status: string; // Changed from LeadStatus to string to support dynamic stages
  notes: string; // Consultant notes
  createdAt: number;
  
  // New Field
  classCode?: string; // Código da Turma

  // Legacy / Optional Fields
  city?: string;
  paymentMethod?: string;
  
  managerNotes?: string;
  history?: HistoryItem[];
  lastUpdatedBy?: string;
  scheduledFor?: number | null;
}

export interface Consultant {
  id: string;
  name: string;
  username: string;
  password?: string;
  supervisor?: string;
}

// Deprecated: used only for fallback. UI now uses dynamic stages.
export const STATUS_LABELS: Record<string, string> = {
  [LeadStatus.NEW]: 'Novo Cadastro',
  [LeadStatus.TODO]: 'A Fazer (Rafael)',
  [LeadStatus.CONTACTED]: 'Contatado',
  [LeadStatus.WAITING]: 'Aguardando',
  [LeadStatus.SCHEDULED]: 'Agendado',
  [LeadStatus.LOST]: 'Sem Interesse',
  [LeadStatus.WON_3Y]: 'Venda 3 Anos',
  [LeadStatus.WON_LIFETIME]: 'Venda Vitalício',
};

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  [TestType.TEST_1_ACTIVE]: 'Teste 1: Contato Ativo (Rafael chama)',
  [TestType.TEST_2_PASSIVE]: 'Teste 2: Landing Page (Aluno chama)',
};
