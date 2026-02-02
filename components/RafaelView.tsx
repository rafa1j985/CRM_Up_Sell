
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lead, TestType, HistoryItem, Consultant, PipelineStage, StageType } from '../types';
import { getLeads, updateLead, deleteLead, saveLead, getMessageTemplate, saveMessageTemplate, getAllCitiesByState, getCustomCities, addCustomCity, removeCustomCity, getConsultants, getPipelineStages, savePipelineStages, supabase } from '../services/crmService';
import { analyzeCRMData } from '../services/aiService';
import { Search, Phone, Filter, BarChart2, List, Trash2, Users, PlusCircle, User, MessageSquare, MapPin, Save, Settings, Copy, ClipboardCopy, Sparkles, X, Shield, LayoutDashboard, Calendar, AlertCircle, Send, History, SlidersHorizontal, Hash, GripVertical, ChevronUp, ChevronDown, Bell, Volume2, VolumeX, PlayCircle } from 'lucide-react';
import Analytics from './Analytics';
import ConsultantManagement from './ConsultantManagement';
import KanbanBoard from './KanbanBoard';
import { v4 as uuidv4 } from 'uuid';
import { formatPhone, STATES } from '../utils/formHelpers';

interface Props {
  currentUser: string; // 'Rafael' or 'Corat' or 'Bruna Ramalho' or 'Isabela'
}

// Som de "Ding" curto e nítido
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const RafaelView: React.FC<Props> = ({ currentUser }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'analytics' | 'team' | 'register' | 'settings'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'LAST_7' | 'THIS_MONTH'>('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');

  // WhatsApp Template State
  const [waTemplate, setWaTemplate] = useState('');

  // Cities Management State
  const [customCities, setCustomCities] = useState<{state: string, name: string}[]>([]);
  const [newCityState, setNewCityState] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [citiesMap, setCitiesMap] = useState<Record<string, string[]>>({});

  // Pipeline Management State
  const [editingStages, setEditingStages] = useState<PipelineStage[]>([]);

  // Manual Register Form State
  const [manualForm, setManualForm] = useState({
    studentName: '',
    whatsapp: '',
    classCode: '',
    notes: '',
  });

  // Note Input State (Mapped by Lead ID)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Notifications State
  const [notification, setNotification] = useState<{show: boolean, message: string} | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // READ ONLY MODE CHECK (Supervisors)
  const isReadOnly = currentUser === 'Bruna Ramalho' || currentUser === 'Isabela';

  useEffect(() => {
    loadInitialData();
    
    // Auto-refresh every minute (fallback)
    const interval = setInterval(refreshLeads, 60000);

    console.log("Iniciando conexão Realtime com Supabase...");

    // --- REALTIME SUBSCRIPTION ---
    const channel = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          console.log('🔥 REALTIME: NOVO LEAD DETECTADO!', payload);
          handleNewLeadNotification(payload.new);
        }
      )
      .subscribe((status, err) => {
        console.log(`STATUS REALTIME: ${status}`, err);
      });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []); // Run only once on mount

  // --- AUDIO LOGIC ---

  const activateSound = () => {
    if (!audioRef.current) return;
    
    // Tenta tocar o som imediatamente para obter a "permissão" do navegador
    audioRef.current.currentTime = 0;
    audioRef.current.volume = 1.0;
    
    const playPromise = audioRef.current.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Sucesso: navegador permitiu
          setSoundEnabled(true);
          console.log("Áudio ativado com sucesso.");
        })
        .catch(error => {
          // Falha: navegador bloqueou
          console.error("Erro ao ativar áudio:", error);
          alert("O navegador bloqueou o som. Por favor, clique novamente no botão de som para autorizar.");
          setSoundEnabled(false);
        });
    }
  };

  const playAlert = () => {
    // Método 1: Tentar tocar o arquivo MP3
    if (soundEnabled && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((e) => {
            console.error("Falha ao tocar MP3, tentando fallback de voz...", e);
            speakAlert(); // Fallback
        });
    } else {
        // Se som não estiver "ativado" oficialmente, tenta fallback direto
        speakAlert();
    }
  };

  // Método 2: Fallback (Text-to-Speech nativo do navegador)
  // Isso geralmente funciona mesmo quando o autoplay de mídia é bloqueado
  const speakAlert = () => {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance("Novo Lead chegou!");
        utterance.lang = 'pt-BR';
        utterance.rate = 1.2;
        window.speechSynthesis.speak(utterance);
    }
  };

  const handleTestNotification = () => {
    // Força o teste visual e sonoro
    const dummyLead = {
      student_name: "Aluno Teste",
      class_code: "TESTE"
    };
    
    // Se o som não estiver ativado, tenta ativar agora
    if (!soundEnabled) {
        activateSound();
    } else {
        playAlert();
    }

    setNotification({
      show: true,
      message: `Teste de Notificação: ${dummyLead.student_name}`
    });

    setTimeout(() => setNotification(null), 5000);
  };

  const handleNewLeadNotification = (newLead: any) => {
    console.log("Processando lead...", newLead);

    // 1. Tocar Som
    playAlert();

    // 2. Mostrar Popup Visual
    setNotification({
      show: true,
      message: `Novo Lead: ${newLead.student_name} (Turma: ${newLead.class_code || 'N/A'})`
    });

    // 3. Esconder após 8s
    setTimeout(() => {
      setNotification(null);
    }, 8000);

    // 4. Atualizar lista
    refreshLeads();
  };

  const loadInitialData = async () => {
    await refreshLeads();
    await refreshPipeline();
    const loadedConsultants = await getConsultants();
    setConsultants(loadedConsultants);
    
    const tmpl = await getMessageTemplate();
    setWaTemplate(tmpl);
    await refreshCities();
  };

  const refreshLeads = async () => {
    const data = await getLeads();
    const now = Date.now();
    const loadedLeads = data.sort((a, b) => {
      const aOverdue = a.scheduledFor && a.scheduledFor < now && a.status === 'SCHEDULED';
      const bOverdue = b.scheduledFor && b.scheduledFor < now && b.status === 'SCHEDULED';
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return b.createdAt - a.createdAt;
    });
    setLeads(loadedLeads);
  };

  const refreshCities = async () => {
    setCustomCities(await getCustomCities());
    setCitiesMap(await getAllCitiesByState());
  };

  const refreshPipeline = async () => {
    const stages = await getPipelineStages();
    setPipelineStages(stages);
    setEditingStages(JSON.parse(JSON.stringify(stages))); 
  };

  const availableLocations = useMemo(() => {
    const locations = new Set(leads.map(l => l.classCode || l.city || 'N/A'));
    return Array.from(locations).sort();
  }, [leads]);

  const getStatusLabel = (statusId: string) => {
    const stage = pipelineStages.find(s => s.id === statusId);
    return stage ? stage.title : statusId;
  };
  
  const getStatusColorClass = (statusId: string) => {
      const stage = pipelineStages.find(s => s.id === statusId);
      if (!stage) return 'bg-gray-100 text-gray-800';
      const colors: Record<string, string> = {
          blue: 'bg-blue-100 text-blue-800 border-blue-200',
          green: 'bg-green-100 text-green-800 border-green-200',
          emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          red: 'bg-red-100 text-red-800 border-red-200',
          yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          purple: 'bg-purple-100 text-purple-800 border-purple-200',
          indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          orange: 'bg-orange-100 text-orange-800 border-orange-200',
          gray: 'bg-gray-100 text-gray-800 border-gray-200',
          pink: 'bg-pink-100 text-pink-800 border-pink-200',
          cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200'
      };
      return colors[stage.color] || colors['gray'];
  };

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    if (isReadOnly) return;
    let newScheduledFor = lead.scheduledFor;
    if (newStatus === 'SCHEDULED' && !newScheduledFor) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        newScheduledFor = tomorrow.getTime();
    }
    const updated = { 
      ...lead, 
      status: newStatus,
      scheduledFor: newScheduledFor,
      lastUpdatedBy: currentUser
    };
    setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
    await updateLead(updated);
    refreshLeads();
  };

  const handleScheduleChange = async (lead: Lead, dateStr: string) => {
    if (isReadOnly) return;
    const timestamp = dateStr ? new Date(dateStr).getTime() : null;
    const updated = { ...lead, scheduledFor: timestamp, lastUpdatedBy: currentUser };
    setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
    await updateLead(updated);
    refreshLeads();
  };

  // --- PIPELINE MANAGEMENT ---
  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
      const newStages = [...editingStages];
      if (direction === 'up' && index > 0) {
          [newStages[index], newStages[index - 1]] = [newStages[index - 1], newStages[index]];
      } else if (direction === 'down' && index < newStages.length - 1) {
          [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
      }
      setEditingStages(newStages);
  };

  const handleDeleteStage = (index: number) => {
      if (window.confirm("Tem certeza? Leads nesta etapa ficarão invisíveis no Kanban até serem movidos.")) {
          const newStages = editingStages.filter((_, i) => i !== index);
          setEditingStages(newStages);
      }
  };

  const handleAddStage = () => {
      const id = uuidv4().split('-')[0].toUpperCase();
      const newStage: PipelineStage = {
          id: `STAGE_${id}`,
          title: 'Nova Etapa',
          color: 'gray',
          type: 'OPEN',
          order: editingStages.length
      };
      setEditingStages([...editingStages, newStage]);
  };

  const handleUpdateStage = (index: number, field: keyof PipelineStage, value: any) => {
      const newStages = [...editingStages];
      newStages[index] = { ...newStages[index], [field]: value };
      setEditingStages(newStages);
  };

  const handleSavePipeline = async () => {
      const ordered = editingStages.map((s, idx) => ({ ...s, order: idx }));
      await savePipelineStages(ordered);
      await refreshPipeline();
      alert('Funil atualizado com sucesso!');
  };

  // --- HISTORY / TIMELINE LOGIC ---
  const handleNoteInputChange = (id: string, value: string) => {
    setNoteInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleAddHistoryNote = async (lead: Lead) => {
    if (isReadOnly) return;
    const text = noteInputs[lead.id];
    if (!text || text.trim() === '') return;

    const newHistoryItem: HistoryItem = {
      id: uuidv4(),
      content: text,
      timestamp: Date.now(),
      author: currentUser
    };

    const updatedHistory = lead.history ? [newHistoryItem, ...lead.history] : [newHistoryItem];
    const updatedLead = {
      ...lead,
      history: updatedHistory,
      lastUpdatedBy: currentUser
    };
    await updateLead(updatedLead);
    setNoteInputs(prev => ({ ...prev, [lead.id]: '' }));
    refreshLeads();
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    if(window.confirm('Tem certeza que deseja excluir este lead?')) {
        await deleteLead(id);
        refreshLeads();
    }
  }

  const handleManualPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setManualForm({ ...manualForm, whatsapp: formatted });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (manualForm.whatsapp.length < 15) {
        alert("Por favor, preencha o WhatsApp corretamente no formato (XX) XXXXX-XXXX");
        return;
    }
    const defaultStage = pipelineStages.length > 0 ? pipelineStages[0].id : 'NEW';
    const newLead: Lead = {
      id: uuidv4(),
      ...manualForm,
      city: '',
      paymentMethod: '',
      consultantName: 'Landing Page (Passivo)',
      testType: TestType.TEST_2_PASSIVE, 
      status: defaultStage,
      createdAt: Date.now(),
      lastUpdatedBy: currentUser,
      history: []
    };
    await saveLead(newLead);
    setManualForm({ studentName: '', whatsapp: '', classCode: '', notes: '' });
    setTimeout(() => {
        refreshLeads();
        setViewMode('list');
    }, 500);
  };

  const handleSaveTemplate = async () => {
    if (isReadOnly) return;
    await saveMessageTemplate(waTemplate);
    alert('Modelo de mensagem salvo com sucesso!');
  };

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (newCityState && newCityName) {
      await addCustomCity(newCityState, newCityName);
      setNewCityName('');
      refreshCities();
      alert(`Cidade ${newCityName} - ${newCityState} adicionada à lista.`);
    }
  };

  const handleRemoveCity = async (state: string, name: string) => {
    if (isReadOnly) return;
    if (window.confirm(`Remover a cidade ${name} - ${state} da lista manual?`)) {
      await removeCustomCity(state, name);
      refreshCities();
    }
  };

  // --- COPY FUNCTIONS ---
  const formatLeadHistory = (lead: Lead) => {
    const scheduleInfo = lead.status === 'SCHEDULED' && lead.scheduledFor 
      ? `\nAgendado para: ${new Date(lead.scheduledFor).toLocaleString()}` 
      : '';
    let historyText = '';
    if (lead.history && lead.history.length > 0) {
        historyText = lead.history.map(h => 
            `${new Date(h.timestamp).toLocaleString()} (${h.author}): ${h.content}`
        ).join('\n');
    } else {
        historyText = lead.managerNotes ? `(Legado): ${lead.managerNotes}` : 'Nenhuma interação registrada.';
    }
    return `
=== HISTÓRICO DO CLIENTE ===
Nome: ${lead.studentName}
WhatsApp: ${lead.whatsapp}
Turma: ${lead.classCode || lead.city || 'N/A'}
Status Atual: ${getStatusLabel(lead.status)}${scheduleInfo}
Consultor Origem: ${lead.consultantName}
Tipo de Teste: ${lead.testType === TestType.TEST_1_ACTIVE ? 'Ativo' : 'Passivo (LP)'}

-- Observações do Consultor --
${lead.notes || 'Nenhuma observação.'}

-- Linha do Tempo (Interações) --
${historyText}
============================
`.trim();
  };

  const handleCopyLeadHistory = (lead: Lead) => {
    const text = formatLeadHistory(lead);
    navigator.clipboard.writeText(text);
    alert(`Histórico de ${lead.studentName} copiado!`);
  };

  const handleCopyAllHistory = () => {
    if (leads.length === 0) {
      alert("Não há leads para copiar.");
      return;
    }
    const allText = leads.map(l => formatLeadHistory(l)).join('\n\n\n');
    navigator.clipboard.writeText(allText);
    alert("Histórico COMPLETO de todos os clientes copiado!");
  };

  // --- AI ANALYSIS ---
  const handleRunAI = async () => {
    if (leads.length === 0) {
      alert("Não há dados suficientes para análise.");
      return;
    }
    setIsAnalyzing(true);
    setAiResult(null);
    const result = await analyzeCRMData(leads);
    setAiResult(result);
    setIsAnalyzing(false);
  };

  const generateWhatsAppLink = (lead: Lead) => {
    const cleanNumber = lead.whatsapp.replace(/\D/g, '');
    let message = waTemplate;
    message = message.replace(/{cliente}/g, lead.studentName);
    message = message.replace(/{consultor}/g, lead.consultantName);
    message = message.replace(/{cidade}/g, lead.classCode || lead.city || 'sua cidade');
    return `https://wa.me/55${cleanNumber}?text=${encodeURIComponent(message)}`;
  };

  const timestampToInput = (ts?: number | null) => {
    if (!ts) return '';
    const date = new Date(ts);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const filteredLeads = leads.filter(lead => {
    const matchesStatus = viewMode === 'kanban' ? true : (filterStatus === 'ALL' || lead.status === filterStatus);
    const matchesSearch = lead.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.consultantName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === 'ALL' || 
                            (lead.classCode === locationFilter) || 
                            (lead.city === locationFilter);
    let matchesDate = true;
    const leadDate = new Date(lead.createdAt);
    const now = new Date();
    if (dateFilter === 'TODAY') {
      matchesDate = leadDate.toDateString() === now.toDateString();
    } else if (dateFilter === 'LAST_7') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      matchesDate = leadDate >= sevenDaysAgo;
    } else if (dateFilter === 'THIS_MONTH') {
      matchesDate = leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
    }
    return matchesStatus && matchesSearch && matchesLocation && matchesDate;
  });

  const isLeadOverdue = (lead: Lead) => {
    return lead.status === 'SCHEDULED' && lead.scheduledFor && lead.scheduledFor < Date.now();
  };

  const COLORS_OPTIONS = ['blue', 'green', 'emerald', 'yellow', 'red', 'purple', 'indigo', 'orange', 'gray', 'pink', 'cyan'];
  const TYPE_OPTIONS: {val: StageType, label: string}[] = [
      {val: 'OPEN', label: 'Em Aberto (Andamento)'},
      {val: 'WON', label: 'Ganho (Venda)'},
      {val: 'LOST', label: 'Perdido (Sem Venda)'}
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto relative">
      
      {/* HIDDEN AUDIO ELEMENT - CROSSORIGIN ENABLED */}
      <audio 
        ref={audioRef} 
        src={NOTIFICATION_SOUND_URL} 
        preload="auto" 
        crossOrigin="anonymous"
      />

      {/* NOTIFICATION TOAST (FIXED Z-INDEX) */}
      {notification && notification.show && (
        <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right fade-in duration-300 max-w-sm w-full cursor-pointer" onClick={() => setNotification(null)}>
           <div className="bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-white ring-4 ring-emerald-200">
             <div className="bg-white/20 p-2 rounded-full">
               <Bell size={24} className="animate-pulse" />
             </div>
             <div className="flex-1">
               <h4 className="font-bold text-sm uppercase tracking-wide mb-1">Nova Oportunidade!</h4>
               <p className="font-medium text-white/95 text-sm">{notification.message}</p>
             </div>
             <button onClick={(e) => {e.stopPropagation(); setNotification(null)}} className="ml-2 text-white/70 hover:text-white">
                <X size={20} />
             </button>
           </div>
        </div>
      )}

      {/* AI Modal Result */}
      {aiResult && (
        <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-xl text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-300" />
                Análise de Inteligência Artificial
              </h2>
              <button onClick={() => setAiResult(null)} className="hover:bg-white/20 p-1 rounded transition">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-gray-800 leading-relaxed space-y-4">
               <div className="whitespace-pre-wrap font-sans text-sm md:text-base">
                 {aiResult}
               </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
              <button 
                onClick={() => setAiResult(null)}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900"
              >
                Fechar Análise
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            Painel do Manager
            {isReadOnly && (
              <span title="Modo Leitura">
                <Shield size={20} className="text-blue-500" />
              </span>
            )}
          </h1>
          <p className="text-gray-500">Logado como: <strong className="text-emerald-600">{currentUser}</strong></p>
        </div>
        
        <div className="flex flex-wrap gap-2">
           
           {/* TEST & SOUND BUTTONS */}
           <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm mr-2">
             <button
                onClick={handleTestNotification}
                className="px-3 py-2 rounded-l-md flex items-center gap-2 text-sm font-bold text-gray-700 hover:bg-gray-100 border-r border-gray-200"
                title="Simular um lead chegando para testar o som"
             >
                <PlayCircle size={16} />
                Testar Alerta
             </button>
             <button
               onClick={() => {
                   if (!soundEnabled) activateSound();
                   else setSoundEnabled(false);
               }}
               className={`px-3 py-2 rounded-r-md flex items-center gap-2 text-sm font-bold transition ${soundEnabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-200'}`}
               title={soundEnabled ? "Som Ativado" : "Clique para ativar som de notificação"}
             >
               {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
               {soundEnabled ? 'ON' : 'OFF'}
             </button>
           </div>

           {/* Global Actions */}
           <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm mr-2">
             <button
               onClick={handleCopyAllHistory}
               className="px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
               title="Copiar histórico de TODOS os clientes"
             >
               <ClipboardCopy size={18} />
               Copiar Tudo
             </button>
             <button
               onClick={handleRunAI}
               disabled={isAnalyzing}
               className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition ${isAnalyzing ? 'bg-indigo-100 text-indigo-400 cursor-wait' : 'text-indigo-700 hover:bg-indigo-50 bg-indigo-50 border border-indigo-100'}`}
               title="Analisar dados com IA"
             >
               <Sparkles size={18} className={isAnalyzing ? 'animate-spin' : ''} />
               {isAnalyzing ? 'Analisando...' : 'IA Insight'}
             </button>
           </div>

           {/* View Modes */}
           <div className="flex flex-wrap gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
             <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <List size={18} />
              Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition ${viewMode === 'kanban' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutDashboard size={18} />
              Quadro
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition ${viewMode === 'analytics' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <BarChart2 size={18} />
              Métricas
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition ${viewMode === 'team' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Users size={18} />
              Equipe
            </button>
            
            {/* HIDE FOR READ ONLY */}
            {!isReadOnly && (
              <>
                <button
                  onClick={() => setViewMode('register')}
                  className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition ${viewMode === 'register' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50 border border-blue-200'}`}
                >
                  <PlusCircle size={18} />
                  Cadastro LP
                </button>
                <button
                  onClick={() => setViewMode('settings')}
                  className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition ${viewMode === 'settings' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                  title="Configurações (Msg)"
                >
                  <Settings size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Search Bar & Filters */}
      {(viewMode === 'list' || viewMode === 'kanban') && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 transition-all">
          
          <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
             {/* Search Input */}
             <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por aluno ou consultor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 block w-full rounded-md border-gray-300 border p-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Toggle Advanced Filters Button */}
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${showAdvancedFilters ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                <SlidersHorizontal size={16} />
                Filtros
              </button>
          </div>

          {/* Expanded Filters Area */}
          {showAdvancedFilters && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-lg grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
                
                {/* Status Filter (Only for List Mode) */}
                {viewMode === 'list' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                      <Filter size={12} /> Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="block w-full rounded-md border-gray-300 border p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="ALL">Todos os Status</option>
                      {pipelineStages.map((stage) => (
                        <option key={stage.id} value={stage.id}>{stage.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                    <Calendar size={12} /> Data de Cadastro
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="block w-full rounded-md border-gray-300 border p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="ALL">Todo o Período</option>
                    <option value="TODAY">Hoje</option>
                    <option value="LAST_7">Últimos 7 dias</option>
                    <option value="THIS_MONTH">Este Mês</option>
                  </select>
                </div>

                {/* Location Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                    <Hash size={12} /> Filtrar por Turma/Cidade
                  </label>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="block w-full rounded-md border-gray-300 border p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="ALL">Todas as Turmas</option>
                    {availableLocations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

            </div>
          )}
        </div>
      )}

      {viewMode === 'team' && <ConsultantManagement readOnly={isReadOnly} />}

      {viewMode === 'analytics' && <Analytics leads={leads} consultants={consultants} pipelineStages={pipelineStages} />}
      
      {viewMode === 'kanban' && (
        <KanbanBoard 
          leads={filteredLeads} 
          pipelineStages={pipelineStages}
          onStatusChange={handleStatusChange}
          onScheduleChange={handleScheduleChange}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Settings Panel */}
      {viewMode === 'settings' && !isReadOnly && (
        <div className="max-w-4xl mx-auto space-y-8">
           
           {/* PIPELINE CONFIG */}
           <div className="bg-white rounded-xl shadow-lg border border-indigo-200 p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                  <LayoutDashboard size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Configurar Funil de Vendas</h2>
                  <p className="text-sm text-gray-500">Adicione, edite ou remova etapas. Arraste para reordenar (use as setas por enquanto).</p>
                </div>
              </div>

              <div className="space-y-4">
                  {editingStages.map((stage, index) => (
                      <div key={stage.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                           <div className="flex flex-col gap-1 pr-2 border-r border-gray-300">
                               <button onClick={() => handleMoveStage(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={20} /></button>
                               <button onClick={() => handleMoveStage(index, 'down')} disabled={index === editingStages.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={20} /></button>
                           </div>

                           <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                               <input 
                                  type="text" 
                                  value={stage.title} 
                                  onChange={(e) => handleUpdateStage(index, 'title', e.target.value)}
                                  className="border border-gray-300 rounded p-2 text-sm"
                                  placeholder="Nome da Etapa"
                               />
                               
                               <select 
                                  value={stage.color}
                                  onChange={(e) => handleUpdateStage(index, 'color', e.target.value)}
                                  className="border border-gray-300 rounded p-2 text-sm"
                               >
                                   {COLORS_OPTIONS.map(c => <option key={c} value={c}>Cor: {c.toUpperCase()}</option>)}
                               </select>

                               <select 
                                  value={stage.type}
                                  onChange={(e) => handleUpdateStage(index, 'type', e.target.value)}
                                  className="border border-gray-300 rounded p-2 text-sm"
                               >
                                   {TYPE_OPTIONS.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                               </select>
                           </div>

                           <button onClick={() => handleDeleteStage(index)} className="text-red-400 hover:text-red-600 p-2">
                               <Trash2 size={18} />
                           </button>
                      </div>
                  ))}

                  <button onClick={handleAddStage} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-emerald-500 hover:text-emerald-600 transition flex items-center justify-center gap-2">
                      <PlusCircle size={20} /> Adicionar Nova Etapa
                  </button>
              </div>

              <div className="pt-6 mt-4 border-t border-gray-100 flex justify-end">
                  <button onClick={handleSavePipeline} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
                    <Save size={18} /> Salvar Funil
                  </button>
              </div>
           </div>

           {/* WhatsApp Config */}
           <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="bg-slate-100 p-3 rounded-full text-slate-600">
                <MessageSquare size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Modelo de Mensagem WhatsApp</h2>
                <p className="text-sm text-gray-500">Configure o texto automático.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem Padrão</label>
                <textarea
                  rows={5}
                  value={waTemplate}
                  onChange={(e) => setWaTemplate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 border p-3 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm"
                />
              </div>
              <div className="pt-2">
                 <button onClick={handleSaveTemplate} className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition flex items-center gap-2">
                  <Save size={18} /> Salvar Modelo
                </button>
              </div>
            </div>
          </div>
          
           {/* Cities Config */}
           <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
             {/* ... Cities UI code ... */}
             <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                <MapPin size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Gerenciar Cidades (Legado)</h2>
              </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={newCityState} onChange={(e) => setNewCityState(e.target.value)} className="block w-full rounded-md border-gray-300 border p-2.5 bg-white">
                  <option value="">Selecione...</option>
                  {STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} className="block w-full rounded-md border-gray-300 border p-2.5" />
              </div>
              <div className="flex items-end">
                <button onClick={handleAddCity} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"><PlusCircle size={18} /> Adicionar</button>
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Cidades Adicionadas Manualmente:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {customCities.map((c, idx) => (
                    <div key={`${c.state}-${c.name}-${idx}`} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                      <span className="text-sm text-gray-700">{c.name} - <strong>{c.state}</strong></span>
                      <button onClick={() => handleRemoveCity(c.state, c.name)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
            </div>
           </div>
        </div>
      )}

      {viewMode === 'register' && !isReadOnly && (
         <div className="max-w-2xl mx-auto">
           <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-8">
             <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
               <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                 <PlusCircle size={24} />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-gray-900">Cadastro Manual (Teste 2)</h2>
                 <p className="text-sm text-gray-500">Registre aqui os leads que vieram da <strong>Landing Page (Passivo)</strong>.</p>
               </div>
             </div>

             <form onSubmit={handleManualSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Aluno</label>
                  <input required type="text" value={manualForm.studentName} onChange={(e) => setManualForm({...manualForm, studentName: e.target.value})} className="block w-full rounded-md border-gray-300 border p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                  <input required type="tel" value={manualForm.whatsapp} onChange={handleManualPhoneChange} className="block w-full rounded-md border-gray-300 border p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CÓDIGO DA TURMA</label>
                  <input required type="text" value={manualForm.classCode} onChange={(e) => setManualForm({...manualForm, classCode: e.target.value})} className="block w-full rounded-md border-gray-300 border p-2.5 uppercase" placeholder="Ex: T25-SP" />
                </div>
                
                <div className="pt-2">
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                    <Save size={20} /> Salvar
                  </button>
                </div>
             </form>
           </div>
        </div>
      )}
      
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 gap-4">
            {filteredLeads.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-lg font-medium">Nenhum aluno encontrado</p>
                    <p className="text-sm">Tente ajustar os filtros ou aguarde novos cadastros.</p>
                </div>
            ) : (
                filteredLeads.map((lead) => {
                  const overdue = isLeadOverdue(lead);
                  return (
                    <div key={lead.id} className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 flex flex-col md:flex-row gap-4 ${overdue ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColorClass(lead.status)}`}>
                            {getStatusLabel(lead.status)}
                          </span>
                          
                          {overdue && (
                             <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 animate-pulse">
                               <AlertCircle size={12} />
                               ATRASADO
                             </span>
                          )}

                          <span className="text-xs text-gray-500 flex items-center gap-1">
                             {new Date(lead.createdAt).toLocaleDateString()}
                          </span>
                          {lead.testType === TestType.TEST_2_PASSIVE ? (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold">LP</span>
                          ) : (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold">Ativo</span>
                          )}
                          {lead.lastUpdatedBy && (
                            <span className="text-xs text-gray-400 italic ml-auto md:ml-2">
                              Atualizado por: {lead.lastUpdatedBy}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{lead.studentName}</h3>
                          <button
                            onClick={() => handleCopyLeadHistory(lead)}
                            className="text-gray-400 hover:text-indigo-600 transition"
                            title="Copiar Histórico deste Lead"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600 mb-3">
                          <p className="flex items-center gap-2">
                            <Phone size={14} /> 
                            <a href={generateWhatsAppLink(lead)} target="_blank" rel="noreferrer" className="hover:text-emerald-600 underline">
                              {lead.whatsapp}
                            </a>
                          </p>
                          <p>Origem: <span className="font-medium">{lead.consultantName}</span></p>
                          <p className="flex items-center gap-1 font-semibold">
                             <Hash size={14} className="text-gray-400" />
                             Turma: {lead.classCode || lead.city || 'N/A'}
                          </p>
                        </div>

                        {/* --- NEW TIMELINE SECTION --- */}
                        <div className="mt-4 border-t border-gray-100 pt-3">
                          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase">
                             <History size={14} />
                             Linha do Tempo
                          </div>
                          
                          {/* Scrollable History Area */}
                          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 max-h-48 overflow-y-auto mb-3 space-y-3 custom-scrollbar">
                             {/* Consultant Notes (Static) */}
                             {lead.notes && (
                                <div className="flex gap-2 text-sm">
                                   <div className="w-1 bg-gray-300 rounded-full flex-shrink-0"></div>
                                   <div>
                                     <p className="text-xs text-gray-500 font-medium">Nota Inicial (Consultor)</p>
                                     <p className="text-gray-700 italic">"{lead.notes}"</p>
                                   </div>
                                </div>
                             )}

                             {/* Legacy Manager Notes */}
                             {lead.managerNotes && !lead.history?.length && (
                                 <div className="flex gap-2 text-sm opacity-70">
                                   <div className="w-1 bg-yellow-300 rounded-full flex-shrink-0"></div>
                                   <div>
                                     <p className="text-xs text-gray-500 font-medium">Nota Antiga (Manager)</p>
                                     <p className="text-gray-700">"{lead.managerNotes}"</p>
                                   </div>
                                </div>
                             )}

                             {/* Timeline Items */}
                             {lead.history?.map((item) => (
                                <div key={item.id} className="flex gap-2 text-sm">
                                   <div className="w-1 bg-emerald-400 rounded-full flex-shrink-0"></div>
                                   <div>
                                     <p className="text-xs text-gray-500 font-medium">
                                       {new Date(item.timestamp).toLocaleString()} • {item.author}
                                     </p>
                                     <p className="text-gray-800">{item.content}</p>
                                   </div>
                                </div>
                             ))}

                             {(!lead.notes && (!lead.history || lead.history.length === 0) && !lead.managerNotes) && (
                               <p className="text-xs text-gray-400 italic text-center py-2">Nenhuma interação registrada.</p>
                             )}
                          </div>

                          {/* Add Note Input */}
                          {!isReadOnly && (
                            <div className="flex gap-2">
                               <input 
                                 type="text" 
                                 className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                 placeholder="Escreva uma nova nota..."
                                 value={noteInputs[lead.id] || ''}
                                 onChange={(e) => handleNoteInputChange(lead.id, e.target.value)}
                                 onKeyDown={(e) => { if (e.key === 'Enter') handleAddHistoryNote(lead); }}
                               />
                               <button 
                                 onClick={() => handleAddHistoryNote(lead)}
                                 className="bg-emerald-600 text-white p-2 rounded-md hover:bg-emerald-700 transition"
                                 title="Adicionar Nota"
                               >
                                 <Send size={16} />
                               </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 justify-start border-t md:border-t-0 md:border-l md:pl-6 border-gray-100 min-w-[200px] mt-4 md:mt-0 pt-4 md:pt-0">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mudar Status</label>
                          <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead, e.target.value)}
                              className="block w-full rounded-md border-gray-300 border p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                              disabled={isReadOnly}
                          >
                              {pipelineStages.map((stage) => (
                                  <option key={stage.id} value={stage.id}>{stage.title}</option>
                              ))}
                          </select>

                          {/* SCHEDULE DATE INPUT */}
                          {lead.status === 'SCHEDULED' && (
                             <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                                <label className="text-[10px] font-bold text-indigo-700 uppercase flex items-center gap-1 mb-1">
                                   <Calendar size={10} />
                                   Agendar Para:
                                </label>
                                <input 
                                  type="datetime-local"
                                  className="w-full text-xs p-1 rounded border border-indigo-200 focus:border-indigo-500"
                                  value={timestampToInput(lead.scheduledFor)}
                                  onChange={(e) => handleScheduleChange(lead, e.target.value)}
                                  disabled={isReadOnly}
                                />
                             </div>
                          )}

                          <div className="mt-2 flex gap-2">
                              <a 
                                 href={generateWhatsAppLink(lead)}
                                 target="_blank" 
                                 rel="noreferrer"
                                 className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-center py-2 rounded text-sm font-medium transition"
                              >
                                  WhatsApp
                              </a>
                              {!isReadOnly && (
                                <button 
                                    onClick={() => handleDelete(lead.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 transition"
                                    title="Excluir"
                                >
                                    <Trash2 size={18} />
                                </button>
                              )}
                          </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
      )}
    </div>
  );
};

export default RafaelView;
