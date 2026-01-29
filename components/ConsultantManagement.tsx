import React, { useState, useEffect } from 'react';
import { Consultant } from '../types';
import { getConsultants, saveConsultant, deleteConsultant } from '../services/crmService';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, UserPlus, Shield, User, Key, Users } from 'lucide-react';

interface Props {
  readOnly?: boolean;
}

const SUPERVISORS = ['Bruna', 'Cristiane', 'Isabela'];

const ConsultantManagement: React.FC<Props> = ({ readOnly = false }) => {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  
  // Single Add State
  const [newConsultant, setNewConsultant] = useState({
    name: '',
    username: '',
    password: '',
    supervisor: ''
  });

  // Bulk Add State
  const [bulkNames, setBulkNames] = useState('');
  const [bulkSupervisor, setBulkSupervisor] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadConsultants();
  }, []);

  const loadConsultants = async () => {
    setConsultants(await getConsultants());
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsultant.name || !newConsultant.username || !newConsultant.password) return;

    // Check if username already exists
    if (consultants.some(c => c.username === newConsultant.username)) {
      alert('Este login já está em uso.');
      return;
    }

    const consultant: Consultant = {
      id: uuidv4(),
      name: newConsultant.name,
      username: newConsultant.username,
      password: newConsultant.password,
      supervisor: newConsultant.supervisor || undefined
    };

    setIsProcessing(true);
    await saveConsultant(consultant);
    setNewConsultant({ name: '', username: '', password: '', supervisor: '' });
    await loadConsultants();
    setIsProcessing(false);
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const lines = bulkNames.split('\n');
    let addedCount = 0;
    let skippedCount = 0;

    // Refresh list to ensure we have latest for duplicate check
    const currentList = await getConsultants(); 

    for (const line of lines) {
      const name = line.trim();
      if (!name) continue;

      // Generate Username:
      const username = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');

      // Check duplicate
      if (currentList.some(c => c.username === username)) {
        skippedCount++;
        continue;
      }

      const newC: Consultant = {
        id: uuidv4(),
        name: name,
        username: username,
        password: 'qwerty123456',
        supervisor: bulkSupervisor || undefined
      };

      await saveConsultant(newC);
      currentList.push(newC); // Add to local check list for next iteration
      addedCount++;
    }

    setBulkNames('');
    setBulkSupervisor('');
    await loadConsultants();
    setIsProcessing(false);
    alert(`Processo finalizado!\n\nCadastrados: ${addedCount}\nPulados (login já existia): ${skippedCount}\n\nSenha padrão: qwerty123456\nSupervisor: ${bulkSupervisor || 'Nenhum'}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este consultor? O histórico de vendas será mantido, mas o acesso será revogado.')) {
      await deleteConsultant(id);
      await loadConsultants();
    }
  };

  return (
    <div className="space-y-8">
      
      {!readOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Single Add */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="text-emerald-600" size={24} />
              Cadastro Individual
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newConsultant.name}
                  onChange={(e) => setNewConsultant({ ...newConsultant, name: e.target.value })}
                  className="block w-full rounded-md border-gray-300 border p-2.5 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                  <input
                    type="text"
                    required
                    value={newConsultant.username}
                    onChange={(e) => setNewConsultant({ ...newConsultant, username: e.target.value })}
                    className="block w-full rounded-md border-gray-300 border p-2.5 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="usuario.voll"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <input
                    type="text"
                    required
                    value={newConsultant.password}
                    onChange={(e) => setNewConsultant({ ...newConsultant, password: e.target.value })}
                    className="block w-full rounded-md border-gray-300 border p-2.5 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Senha"
                  />
                </div>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor(a)</label>
                 <select
                   value={newConsultant.supervisor}
                   onChange={(e) => setNewConsultant({ ...newConsultant, supervisor: e.target.value })}
                   className="block w-full rounded-md border-gray-300 border p-2.5 focus:ring-emerald-500 focus:border-emerald-500"
                 >
                   <option value="">Selecione...</option>
                   {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-emerald-600 text-white font-medium py-2.5 px-4 rounded-md hover:bg-emerald-700 transition flex justify-center items-center gap-2"
              >
                <UserPlus size={18} />
                {isProcessing ? 'Processando...' : 'Criar Acesso'}
              </button>
            </form>
          </div>

          {/* Bulk Add */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 h-full bg-blue-50/30">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Users className="text-blue-600" size={24} />
              Cadastro em Massa
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Cole a lista de nomes abaixo (um por linha). O sistema gerará o login e a senha padrão <strong>qwerty123456</strong>.
            </p>
            <form onSubmit={handleBulkAdd} className="flex flex-col h-[calc(100%-80px)]">
              <textarea
                required
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                className="flex-grow w-full rounded-md border-gray-300 border p-3 focus:ring-blue-500 focus:border-blue-500 text-sm mb-4 min-h-[100px]"
                placeholder="Exemplo:&#10;Maria Souza&#10;Carlos Alberto de Nóbrega"
              />
              <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor(a) para estes:</label>
                 <select
                   value={bulkSupervisor}
                   onChange={(e) => setBulkSupervisor(e.target.value)}
                   className="block w-full rounded-md border-gray-300 border p-2.5 focus:ring-blue-500 focus:border-blue-500"
                 >
                   <option value="">Nenhum / Selecione...</option>
                   {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-md hover:bg-blue-700 transition flex justify-center items-center gap-2"
              >
                <Users size={18} />
                {isProcessing ? 'Processando...' : 'Gerar Acessos em Massa'}
              </button>
            </form>
          </div>
        </div>
      )}

      {readOnly && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-blue-800 text-sm flex items-center gap-2">
          <Shield size={18} />
          <strong>Modo Leitura:</strong> Você tem permissão apenas para visualizar a equipe.
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="text-slate-600" size={24} />
          Consultores com Acesso ({consultants.length})
        </h2>
        
        {consultants.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            Nenhum consultor cadastrado ainda. Use o formulário acima.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Senha</th>
                  {!readOnly && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consultants.map((consultant) => (
                  <tr key={consultant.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                          <User size={20} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{consultant.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {consultant.supervisor ? (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-700">{consultant.supervisor}</span>
                      ) : (
                          <span className="text-xs text-gray-400 italic">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {consultant.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {consultant.password}
                    </td>
                    {!readOnly && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleDelete(consultant.id)}
                          className="text-red-600 hover:text-red-900 transition flex items-center gap-1 ml-auto"
                        >
                          <Trash2 size={16} />
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultantManagement;