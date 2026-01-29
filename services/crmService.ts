
import { createClient } from '@supabase/supabase-js';
import { Lead, Consultant, PipelineStage } from '../types';
import { CITIES_BY_STATE } from '../utils/formHelpers';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = 'https://qayvuzxspuikrtdhabhx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFheXZ1enhzcHVpa3J0ZGhhYmh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDc4MDcsImV4cCI6MjA4NTI4MzgwN30.QtiD9Oj8xS3yBfYAdmPuwWAff0703dLvpxctKZWzRFI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DEFAULT_TEMPLATE = `Bom dia, {cliente}! Aqui é o Rafael Juliano da VOLL. A {consultor} me falou de você! Que de tudo certo no seu curso em {cidade}!
Eu posso te mandar um audio ou te ligar para falar da ação que fazemos em fevereiro? O que você prefere? Ligação ou audio?`;

// --- DEFAULT PIPELINE STAGES ---
export const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'NEW', title: 'Novo', color: 'blue', type: 'OPEN', order: 0 },
  { id: 'TODO', title: 'A Fazer', color: 'purple', type: 'OPEN', order: 1 },
  { id: 'CONTACTED', title: 'Contatado', color: 'yellow', type: 'OPEN', order: 2 },
  { id: 'SCHEDULED', title: 'Agendado', color: 'indigo', type: 'OPEN', order: 3 },
  { id: 'WON_3Y', title: 'Venda 3 Anos', color: 'emerald', type: 'WON', order: 4 },
  { id: 'WON_LIFETIME', title: 'Venda Vitalício', color: 'green', type: 'WON', order: 5 },
  { id: 'LOST', title: 'Perdido', color: 'gray', type: 'LOST', order: 6 },
];

// --- HELPER MAPPERS (CamelCase <-> SnakeCase) ---

const mapLeadFromDb = (dbLead: any): Lead => ({
  id: dbLead.id,
  studentName: dbLead.student_name,
  whatsapp: dbLead.whatsapp,
  consultantName: dbLead.consultant_name,
  testType: dbLead.test_type,
  status: dbLead.status,
  notes: dbLead.notes || '',
  classCode: dbLead.class_code || '',
  city: dbLead.city || '',
  paymentMethod: dbLead.payment_method || '',
  managerNotes: dbLead.manager_notes || '',
  lastUpdatedBy: dbLead.last_updated_by,
  history: dbLead.history || [],
  // Convert ISO string to Timestamp number
  createdAt: new Date(dbLead.created_at).getTime(),
  scheduledFor: dbLead.scheduled_for ? new Date(dbLead.scheduled_for).getTime() : null,
});

const mapLeadToDb = (lead: Lead) => ({
  // id is auto-generated or passed if update
  student_name: lead.studentName,
  whatsapp: lead.whatsapp,
  consultant_name: lead.consultantName,
  test_type: lead.testType,
  status: lead.status,
  notes: lead.notes,
  class_code: lead.classCode,
  city: lead.city,
  payment_method: lead.paymentMethod,
  manager_notes: lead.managerNotes,
  last_updated_by: lead.lastUpdatedBy,
  history: lead.history,
  // scheduled_for needs to be ISO string or null
  scheduled_for: lead.scheduledFor ? new Date(lead.scheduledFor).toISOString() : null,
});

// --- LEADS ---

export const getLeads = async (): Promise<Lead[]> => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar leads:', error);
    return [];
  }
  return data.map(mapLeadFromDb);
};

export const saveLead = async (lead: Lead): Promise<void> => {
  const dbData = mapLeadToDb(lead);
  // Remove ID to let DB generate it, or include it if we want to enforce UUID from frontend
  // Since we use uuidv4 in frontend, we can send it.
  const { error } = await supabase.from('leads').insert([{ ...dbData, id: lead.id }]);
  if (error) console.error('Erro ao salvar lead:', error);
};

export const updateLead = async (updatedLead: Lead): Promise<void> => {
  const dbData = mapLeadToDb(updatedLead);
  const { error } = await supabase
    .from('leads')
    .update(dbData)
    .eq('id', updatedLead.id);
  
  if (error) console.error('Erro ao atualizar lead:', error);
};

export const deleteLead = async (id: string): Promise<void> => {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) console.error('Erro ao excluir lead:', error);
}

// --- CONSULTANTS ---

export const getConsultants = async (): Promise<Consultant[]> => {
  const { data, error } = await supabase.from('consultants').select('*');
  if (error) {
    console.error('Erro ao buscar consultores:', error);
    return [];
  }
  return data.map((c: any) => ({
    id: c.id,
    name: c.name,
    username: c.username,
    password: c.password,
    supervisor: c.supervisor
  }));
};

export const saveConsultant = async (consultant: Consultant): Promise<void> => {
  const { error } = await supabase.from('consultants').insert([{
    id: consultant.id,
    name: consultant.name,
    username: consultant.username,
    password: consultant.password,
    supervisor: consultant.supervisor
  }]);
  if (error) console.error('Erro ao salvar consultor:', error);
};

export const updateConsultantPassword = async (id: string, newPassword: string): Promise<void> => {
  const { error } = await supabase
    .from('consultants')
    .update({ password: newPassword })
    .eq('id', id);
  
  if (error) console.error('Erro ao atualizar senha do consultor:', error);
};

export const deleteConsultant = async (id: string): Promise<void> => {
  const { error } = await supabase.from('consultants').delete().eq('id', id);
  if (error) console.error('Erro ao excluir consultor:', error);
};

export const authenticateConsultant = async (username: string, password: string): Promise<Consultant | null> => {
  const { data, error } = await supabase
    .from('consultants')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    username: data.username,
    password: data.password,
    supervisor: data.supervisor
  };
};

// --- MANAGER AUTH ---

// Managers are still hardcoded as requested, no DB needed for auth
export const authenticateManager = (username: string, password: string): string | null => {
  if (username === 'rafa' && password === 'rafa') return 'Rafael';
  if (username === 'corat' && password === 'corat') return 'Corat';
  if (username === 'brunaramalho' && password === 'brunaramalho') return 'Bruna Ramalho';
  if (username === 'isabela' && password === 'isabela') return 'Isabela';
  return null;
};

// --- SETTINGS (WhatsApp Template & Custom Cities & Pipeline Stages) ---

export const getMessageTemplate = async (): Promise<string> => {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'whatsapp_template')
    .single();
  
  return data?.value || DEFAULT_TEMPLATE;
};

export const saveMessageTemplate = async (template: string): Promise<void> => {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'whatsapp_template', value: template });
  
  if (error) console.error('Erro ao salvar template:', error);
};

// Pipeline Stages
export const getPipelineStages = async (): Promise<PipelineStage[]> => {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'pipeline_stages')
    .single();

  if (data?.value) {
    try {
      return JSON.parse(data.value);
    } catch (e) {
      console.error("Erro parsing stages", e);
      return DEFAULT_STAGES;
    }
  }
  return DEFAULT_STAGES;
};

export const savePipelineStages = async (stages: PipelineStage[]): Promise<void> => {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'pipeline_stages', value: JSON.stringify(stages) });
  
  if (error) console.error('Erro ao salvar estágios:', error);
};


// --- CITIES MANAGEMENT ---

interface CustomCity {
  state: string;
  name: string;
}

const getCustomCitiesFromDb = async (): Promise<CustomCity[]> => {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'custom_cities')
    .single();

  if (data?.value) {
    try {
      return JSON.parse(data.value);
    } catch (e) {
      return [];
    }
  }
  return [];
};

export const getCustomCities = async (): Promise<CustomCity[]> => {
  return await getCustomCitiesFromDb();
};

export const addCustomCity = async (state: string, name: string): Promise<void> => {
  const cities = await getCustomCitiesFromDb();
  
  if (!cities.some(c => c.state === state && c.name.toLowerCase() === name.toLowerCase())) {
    const newCities = [...cities, { state, name }];
    await supabase.from('app_settings').upsert({ 
      key: 'custom_cities', 
      value: JSON.stringify(newCities) 
    });
  }
};

export const removeCustomCity = async (state: string, name: string): Promise<void> => {
  const cities = await getCustomCitiesFromDb();
  const filtered = cities.filter(c => !(c.state === state && c.name === name));
  
  await supabase.from('app_settings').upsert({ 
    key: 'custom_cities', 
    value: JSON.stringify(filtered) 
  });
};

// Helper to get ALL cities (Static + Custom) grouped by State
export const getAllCitiesByState = async (): Promise<Record<string, string[]>> => {
  // Deep copy static cities to avoid mutation issues
  const merged = JSON.parse(JSON.stringify(CITIES_BY_STATE));
  const custom = await getCustomCitiesFromDb();

  custom.forEach(c => {
    if (!merged[c.state]) {
      merged[c.state] = [];
    }
    // Only add if not already in the list
    if (!merged[c.state].includes(c.name)) {
      merged[c.state].push(c.name);
      merged[c.state].sort(); // Keep alphabetical
    }
  });

  return merged;
};

export const seedDatabase = () => {
  console.log("Database seed skipped for Supabase.");
};
