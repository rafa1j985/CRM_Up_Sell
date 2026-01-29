import React, { useState } from 'react';
import { Consultant, Lead, LeadStatus, TestType } from '../types';
import { saveLead } from '../services/crmService';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle, User, MessageSquare, Hash } from 'lucide-react';
import { formatPhone } from '../utils/formHelpers';

interface Props {
  consultant: Consultant;
}

const ConsultantView: React.FC<Props> = ({ consultant }) => {
  const [formData, setFormData] = useState({
    studentName: '',
    whatsapp: '',
    classCode: '',
    notes: '',
  });

  const [submitted, setSubmitted] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, whatsapp: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.whatsapp.length < 15) {
      alert("Por favor, preencha o WhatsApp corretamente no formato (XX) XXXXX-XXXX");
      return;
    }

    setIsSubmitting(true);
    
    const newLead: Lead = {
      id: uuidv4(),
      studentName: formData.studentName,
      whatsapp: formData.whatsapp,
      classCode: formData.classCode,
      notes: formData.notes,
      consultantName: consultant.name,
      testType: TestType.TEST_1_ACTIVE, // ALWAYS Test 1 for Consultants
      status: LeadStatus.NEW,
      createdAt: Date.now(),
      // Legacy fields explicitly undefined or empty
      city: '', 
      paymentMethod: '' 
    };

    await saveLead(newLead);
    setSubmitted(newLead);
    setIsSubmitting(false);
    
    // Reset form
    setFormData({
      studentName: '',
      whatsapp: '',
      classCode: '',
      notes: '',
    });
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg border border-emerald-100">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cadastro Realizado!</h2>
          <p className="text-gray-600 mb-6">O aluno da turma <strong>{submitted.classCode}</strong> foi registrado.</p>
          
          <div className="bg-yellow-50 p-4 rounded-lg w-full mb-6 border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">Próximo Passo</h3>
            <p className="text-sm text-yellow-700 font-medium">
              Avise ao aluno que o Rafael entrará em contato pessoalmente em breve por meio do número 19 98906-2406
            </p>
          </div>

          <button 
            onClick={() => setSubmitted(null)}
            className="text-gray-500 hover:text-gray-700 underline"
          >
            Cadastrar novo aluno
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Novo Cadastro (Consultor)</h1>
        <p className="text-gray-500">
          Cadastre o aluno que acabou de comprar a formação. <br/>
          <span className="text-emerald-600 font-medium">Este lead será tratado com Abordagem Ativa (Teste 1).</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-6">
        
        {/* Student Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Aluno *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              required
              type="text"
              value={formData.studentName}
              onChange={(e) => setFormData({...formData, studentName: e.target.value})}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2.5"
              placeholder="Nome completo"
            />
          </div>
        </div>

        {/* Whatsapp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDD) *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </div>
            <input
              required
              type="tel"
              value={formData.whatsapp}
              onChange={handlePhoneChange}
              maxLength={15}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2.5"
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Formato obrigatório: (00) 00000-0000</p>
        </div>

        {/* Class Code (New Field) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CÓDIGO DA TURMA *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Hash className="h-5 w-5 text-gray-400" />
            </div>
            <input
              required
              type="text"
              value={formData.classCode}
              onChange={(e) => setFormData({...formData, classCode: e.target.value})}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2.5 uppercase"
              placeholder="Ex: T25-SP"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2.5"
            placeholder="Alguma informação importante para o Rafael?"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'}`}
          >
            {isSubmitting ? 'Salvando...' : 'Cadastrar Aluno'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConsultantView;