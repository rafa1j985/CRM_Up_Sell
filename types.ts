
export enum Role {
  CONSULTANT = 'CONSULTANT',
  MANAGER = 'MANAGER', // Rafael or Corat
}

export enum TestType {
  TEST_1_ACTIVE = 'TEST_1_ACTIVE', // Rafael entra em contato
  TEST_2_PASSIVE = 'TEST_2_PASSIVE', // Landing Page -> Aluno chama
}

export enum LeadStatus {
  NEW = 'NEW', // Novo cadastro
  TODO = 'TODO', // Rafael ainda não entrou em contato
  CONTACTED = 'CONTACTED', // Rafael fez o primeiro contato
  WAITING = 'WAITING', // Aguardando retorno
  SCHEDULED = 'SCHEDULED', // Retornar em data específica
  LOST = 'LOST', // Sem interesse
  WON_3Y = 'WON_3Y', // Comprou 3 Anos
  WON_LIFETIME = 'WON_LIFETIME', // Comprou Vitalício
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
  status: LeadStatus;
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

export const STATUS_LABELS: Record<LeadStatus, string> = {
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
