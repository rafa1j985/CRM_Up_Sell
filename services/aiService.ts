import { GoogleGenAI } from "@google/genai";
import { Lead, LeadStatus, TestType } from '../types';

// --- CONFIGURAÇÃO DA IA ---
// Como o site é estático, cole sua chave aqui entre as aspas.
// Exemplo: const API_KEY = 'AIzaSyD...';
const API_KEY = 'COLE_SUA_CHAVE_GEMINI_AQUI';

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const analyzeCRMData = async (leads: Lead[]): Promise<string> => {
  if (API_KEY === 'COLE_SUA_CHAVE_GEMINI_AQUI' || !API_KEY) {
    return "⚠️ Configuração Pendente: Por favor, adicione sua chave API do Google Gemini no arquivo 'services/aiService.ts' para habilitar a IA.";
  }

  try {
    // 1. Prepare data for the AI (simplify to reduce token usage and focus on relevant info)
    const simplifiedLeads = leads.map(l => ({
      status: l.status,
      testType: l.testType,
      consultant: l.consultantName,
      classCode: l.classCode || l.city, // Provide class code or fallback city
      notes: l.notes,
      managerNotes: l.managerNotes,
    }));

    // 2. Construct the prompt
    const prompt = `
      Atue como um analista de dados sênior e estrategista comercial para a VOLL Pilates.
      Analise os dados brutos de leads abaixo referentes a uma campanha promocional de fevereiro.

      Contexto:
      - Teste 1: Contato Ativo (Consultor cadastra, Rafael entra em contato ativamente).
      - Teste 2: Landing Page (Aluno clica e chama o Rafael passivamente).
      - Objetivo: Vender "Formação por 3 anos" ou "Passe Vitalício".
      
      Dados (JSON):
      ${JSON.stringify(simplifiedLeads)}

      Por favor, forneça uma análise concisa e estratégica respondendo:
      1. Qual abordagem (Teste 1 vs Teste 2) está tendo melhor performance qualitativa e quantitativa?
      2. Existem padrões nos motivos de perda (Status LOST) baseados nas observações?
      3. Qual consultor está trazendo leads mais qualificados?
      4. Recomendação prática de 1 parágrafo para o Rafael Juliano melhorar a conversão nesta semana.

      Use formatação Markdown para a resposta. Seja direto.
    `;

    // 3. Call Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite-preview-02-05',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a análise no momento.";

  } catch (error) {
    console.error("Erro ao analisar dados com IA:", error);
    return "Erro ao conectar com a inteligência artificial. Verifique se a chave de API está correta e se o modelo 'gemini-2.0-flash-lite-preview-02-05' está disponível.";
  }
};