
import React, { useState } from 'react';
import { Lead, TestType, PipelineStage } from '../types';
import { Phone, User, Calendar, DollarSign, MessageSquare, Clock, AlertCircle, Hash } from 'lucide-react';

interface Props {
  leads: Lead[];
  pipelineStages: PipelineStage[];
  onStatusChange: (lead: Lead, newStatus: string) => void;
  onScheduleChange?: (lead: Lead, dateStr: string) => void;
  isReadOnly?: boolean;
  useWebWhatsapp?: boolean;
}

const KanbanBoard: React.FC<Props> = ({ leads, pipelineStages, onStatusChange, onScheduleChange, isReadOnly = false, useWebWhatsapp = false }) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    if (isReadOnly) return;
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    if (isReadOnly || !draggedLeadId) return;

    const lead = leads.find((l) => l.id === draggedLeadId);
    if (lead && lead.status !== targetStatusId) {
      onStatusChange(lead, targetStatusId);
    }
    setDraggedLeadId(null);
  };

  const generateWhatsAppLink = (lead: Lead) => {
    const cleanNumber = lead.whatsapp.replace(/\D/g, '');
    if (useWebWhatsapp) {
        return `https://web.whatsapp.com/send?phone=55${cleanNumber}`;
    }
    return `https://wa.me/55${cleanNumber}`;
  };

  // Helper for input type=datetime-local
  const timestampToInput = (ts?: number | null) => {
    if (!ts) return '';
    const date = new Date(ts);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const formatScheduleDisplay = (ts: number) => {
      return new Date(ts).toLocaleString(undefined, {
          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
  };

  // Helper to map color string to Tailwind classes
  const getStageColorClasses = (colorName: string) => {
      const map: Record<string, { bg: string, border: string, dot: string }> = {
          blue: { bg: 'bg-blue-50', border: 'border-blue-500', dot: 'bg-blue-500' },
          green: { bg: 'bg-green-50', border: 'border-green-500', dot: 'bg-green-500' },
          emerald: { bg: 'bg-emerald-50', border: 'border-emerald-500', dot: 'bg-emerald-500' },
          yellow: { bg: 'bg-yellow-50', border: 'border-yellow-500', dot: 'bg-yellow-500' },
          red: { bg: 'bg-red-50', border: 'border-red-500', dot: 'bg-red-500' },
          purple: { bg: 'bg-purple-50', border: 'border-purple-500', dot: 'bg-purple-500' },
          indigo: { bg: 'bg-indigo-50', border: 'border-indigo-500', dot: 'bg-indigo-500' },
          orange: { bg: 'bg-orange-50', border: 'border-orange-500', dot: 'bg-orange-500' },
          gray: { bg: 'bg-gray-50', border: 'border-gray-500', dot: 'bg-gray-500' },
          pink: { bg: 'bg-pink-50', border: 'border-pink-500', dot: 'bg-pink-500' },
          cyan: { bg: 'bg-cyan-50', border: 'border-cyan-500', dot: 'bg-cyan-500' },
      };
      return map[colorName] || map['gray'];
  };

  const now = Date.now();

  return (
    <div className="flex overflow-x-auto pb-4 gap-4 h-[calc(100vh-220px)] items-start">
      {pipelineStages.map((stage) => {
        const columnLeads = leads.filter((l) => l.status === stage.id);
        const styles = getStageColorClasses(stage.color);
        
        return (
          <div
            key={stage.id}
            className={`min-w-[300px] w-[300px] flex-shrink-0 rounded-xl flex flex-col max-h-full ${styles.bg} border border-gray-200`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Column Header */}
            <div className={`p-3 border-b border-gray-200 flex justify-between items-center sticky top-0 ${styles.bg} rounded-t-xl z-10`}>
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${styles.dot}`}></span>
                {stage.title}
              </h3>
              <span className="text-xs font-semibold bg-white px-2 py-1 rounded text-gray-500 shadow-sm">
                {columnLeads.length}
              </span>
            </div>

            {/* Column Content */}
            <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
              {columnLeads.map((lead) => {
                const isOverdue = lead.status === 'SCHEDULED' && lead.scheduledFor && lead.scheduledFor < now;
                const lastHistoryItem = lead.history && lead.history.length > 0 ? lead.history[0] : null;

                return (
                  <div
                    key={lead.id}
                    draggable={!isReadOnly}
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    className={`bg-white p-3 rounded-lg shadow-sm border-l-4 ${styles.border} hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative group ${isOverdue ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}
                  >
                    {isOverdue && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 font-bold z-10">
                            <AlertCircle size={10} />
                            ATRASADO
                        </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-800 text-sm truncate pr-2" title={lead.studentName}>
                        {lead.studentName}
                      </h4>
                      {lead.testType === TestType.TEST_2_PASSIVE && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded font-bold border border-blue-200">LP</span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5" title="Consultor">
                          <User size={12} className="text-gray-400" />
                          <span className="truncate">{lead.consultantName}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Turma">
                          <Hash size={12} className="text-gray-400" />
                          <span className="truncate">{lead.classCode || lead.city || 'N/A'}</span>
                      </div>
                      
                      {/* SCHEDULE DISPLAY */}
                      {lead.status === 'SCHEDULED' && (
                          <div className="mt-2 p-1 bg-indigo-50 border border-indigo-100 rounded">
                              {onScheduleChange && !isReadOnly ? (
                                   <input 
                                   type="datetime-local"
                                   className="w-full text-[10px] bg-transparent border-none focus:ring-0 p-0 text-indigo-800 font-medium"
                                   value={timestampToInput(lead.scheduledFor)}
                                   onChange={(e) => onScheduleChange(lead, e.target.value)}
                                 />
                              ) : (
                                  <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-600' : 'text-indigo-600'}`}>
                                      <Clock size={12} />
                                      {lead.scheduledFor ? formatScheduleDisplay(lead.scheduledFor) : 'Sem data'}
                                  </div>
                              )}
                          </div>
                      )}

                      {/* Display Last History Note OR Legacy Manager Note */}
                      {lastHistoryItem ? (
                           <div className="mt-2 bg-emerald-50 p-1.5 rounded border border-emerald-100 text-emerald-800 text-[10px]" title={`Última interação: ${lastHistoryItem.content}`}>
                             <span className="font-bold">{new Date(lastHistoryItem.timestamp).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}:</span> {lastHistoryItem.content.length > 50 ? lastHistoryItem.content.substring(0, 50) + '...' : lastHistoryItem.content}
                          </div>
                      ) : lead.managerNotes ? (
                          <div className="mt-2 bg-yellow-50 p-1.5 rounded border border-yellow-100 text-gray-600 italic line-clamp-2" title={lead.managerNotes}>
                             "{lead.managerNotes}"
                          </div>
                      ) : null}
                    </div>

                    <div className="mt-3 flex justify-between items-center pt-2 border-t border-gray-100">
                      <a
                          href={generateWhatsAppLink(lead)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded transition"
                          title="Abrir WhatsApp"
                      >
                          <MessageSquare size={14} />
                      </a>
                      <span className="text-[10px] text-gray-400">
                          {new Date(lead.createdAt).toLocaleDateString(undefined, {day: '2-digit', month: '2-digit'})}
                      </span>
                    </div>
                  </div>
                );
              })}
              {columnLeads.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-xs italic opacity-60">
                      Vazio
                  </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
