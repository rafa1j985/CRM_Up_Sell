
import React, { useMemo } from 'react';
import { Lead, TestType, Consultant, PipelineStage } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trophy, Users, TrendingUp, Award } from 'lucide-react';

interface Props {
  leads: Lead[];
  consultants: Consultant[];
  pipelineStages: PipelineStage[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const Analytics: React.FC<Props> = ({ leads, consultants, pipelineStages }) => {
  
  // Helper to determine if a status ID corresponds to a 'WON' stage
  const isWon = (statusId: string) => {
      const stage = pipelineStages.find(s => s.id === statusId);
      return stage?.type === 'WON';
  };

  const isLost = (statusId: string) => {
      const stage = pipelineStages.find(s => s.id === statusId);
      return stage?.type === 'LOST';
  };

  const stats = useMemo(() => {
    const total = leads.length;
    const won = leads.filter(l => isWon(l.status)).length;
    const lost = leads.filter(l => isLost(l.status)).length;
    const open = total - won - lost;
    const conversionRate = total > 0 ? (won / total) * 100 : 0;

    return { total, won, lost, open, conversionRate };
  }, [leads, pipelineStages]);

  const testTypeData = useMemo(() => {
    const t1 = leads.filter(l => l.testType === TestType.TEST_1_ACTIVE);
    const t2 = leads.filter(l => l.testType === TestType.TEST_2_PASSIVE);

    const getConv = (group: Lead[]) => {
        const wins = group.filter(l => isWon(l.status)).length;
        return group.length > 0 ? (wins / group.length) * 100 : 0;
    };

    return [
        { name: 'Teste 1 (Ativo)', leads: t1.length, conversao: getConv(t1).toFixed(1) },
        { name: 'Teste 2 (LP)', leads: t2.length, conversao: getConv(t2).toFixed(1) },
    ];
  }, [leads, pipelineStages]);

  // --- LOGIC FOR CONSULTANTS & TEAMS ---
  const performanceData = useMemo(() => {
    // 1. Create a map of Consultant Name -> Supervisor
    const consultantSupervisorMap: Record<string, string> = {};
    consultants.forEach(c => {
        consultantSupervisorMap[c.name] = c.supervisor || 'Sem Supervisor';
    });

    // 2. Metrics containers
    const consultantMetrics: Record<string, { name: string, supervisor: string, leads: number, sales: number }> = {};
    const teamMetrics: Record<string, { name: string, leads: number, sales: number }> = {};

    // 3. Process Leads
    leads.forEach(l => {
        const name = l.consultantName;
        const supervisor = consultantSupervisorMap[name] || 'Outros / LP';

        // Init Consultant
        if (!consultantMetrics[name]) {
            consultantMetrics[name] = { name, supervisor, leads: 0, sales: 0 };
        }
        
        // Init Team
        if (!teamMetrics[supervisor]) {
            teamMetrics[supervisor] = { name: supervisor, leads: 0, sales: 0 };
        }

        // Increment Leads
        consultantMetrics[name].leads++;
        teamMetrics[supervisor].leads++;

        // Increment Sales
        if (isWon(l.status)) {
            consultantMetrics[name].sales++;
            teamMetrics[supervisor].sales++;
        }
    });

    // 4. Convert to Arrays & Sort
    const consultantList = Object.values(consultantMetrics).map(m => ({
        ...m,
        rate: m.leads > 0 ? (m.sales / m.leads) * 100 : 0
    })).sort((a, b) => b.sales - a.sales || b.leads - a.leads); // Primary Sort: Sales, Secondary: Leads

    const teamList = Object.values(teamMetrics).map(m => ({
        ...m,
        rate: m.leads > 0 ? (m.sales / m.leads) * 100 : 0
    })).sort((a, b) => b.sales - a.sales);

    return { consultantList, teamList };
  }, [leads, consultants, pipelineStages]);

  const topPerformers = useMemo(() => {
    const { consultantList, teamList } = performanceData;
    
    // Best Consultant (Sales)
    const bestSeller = consultantList.length > 0 ? consultantList[0] : null;
    
    // Best Consultant (Lead Gen) - Re-sort by leads
    const bestLeadGen = [...consultantList].sort((a,b) => b.leads - a.leads)[0];

    // Best Team (Sales)
    const bestTeam = teamList.length > 0 ? teamList[0] : null;

    return { bestSeller, bestLeadGen, bestTeam };
  }, [performanceData]);

  // Generate pie data dynamically from stages, but grouping small ones if needed
  // For simplicity, we group by Stage Type (Won, Lost, Open) + Specific Won types if we can distinguish them by title
  const pieData = [
    { name: 'Vendas (Total)', value: stats.won },
    { name: 'Em Aberto', value: stats.open },
    { name: 'Perdidos', value: stats.lost },
  ];

  return (
    <div className="space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-gray-500 text-sm font-medium">Total de Leads</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-gray-500 text-sm font-medium">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.conversionRate.toFixed(1)}%</p>
            </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-gray-500 text-sm font-medium">Vendas Totais</p>
                <p className="text-3xl font-bold text-blue-600">{stats.won}</p>
            </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-gray-500 text-sm font-medium">Em Negociação</p>
                <p className="text-3xl font-bold text-purple-600">{stats.open}</p>
            </div>
        </div>

        {/* --- CHAMPIONS SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-yellow-50 to-amber-100 p-6 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden">
                <div className="absolute right-2 top-2 opacity-10">
                    <Trophy size={80} className="text-amber-600" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-amber-500 text-white p-2 rounded-full"><Trophy size={20} /></div>
                    <h3 className="font-bold text-amber-900 text-sm uppercase tracking-wide">Top Vendedor(a)</h3>
                </div>
                {topPerformers.bestSeller ? (
                    <div>
                        <p className="text-2xl font-bold text-amber-900">{topPerformers.bestSeller.name}</p>
                        <p className="text-sm text-amber-700 font-medium">{topPerformers.bestSeller.sales} Vendas Confirmadas</p>
                        <p className="text-xs text-amber-600 mt-1">Taxa: {topPerformers.bestSeller.rate.toFixed(1)}%</p>
                    </div>
                ) : <p className="text-gray-500 text-sm">Sem dados</p>}
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border border-indigo-200 shadow-sm relative overflow-hidden">
                <div className="absolute right-2 top-2 opacity-10">
                    <Users size={80} className="text-indigo-600" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                     <div className="bg-indigo-500 text-white p-2 rounded-full"><TrendingUp size={20} /></div>
                    <h3 className="font-bold text-indigo-900 text-sm uppercase tracking-wide">Top Gerador de Leads</h3>
                </div>
                {topPerformers.bestLeadGen ? (
                    <div>
                        <p className="text-2xl font-bold text-indigo-900">{topPerformers.bestLeadGen.name}</p>
                        <p className="text-sm text-indigo-700 font-medium">{topPerformers.bestLeadGen.leads} Leads Gerados</p>
                    </div>
                ) : <p className="text-gray-500 text-sm">Sem dados</p>}
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm relative overflow-hidden">
                <div className="absolute right-2 top-2 opacity-10">
                    <Award size={80} className="text-emerald-600" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-emerald-500 text-white p-2 rounded-full"><Users size={20} /></div>
                    <h3 className="font-bold text-emerald-900 text-sm uppercase tracking-wide">Melhor Equipe (Supervisor)</h3>
                </div>
                {topPerformers.bestTeam ? (
                    <div>
                        <p className="text-2xl font-bold text-emerald-900">{topPerformers.bestTeam.name}</p>
                        <p className="text-sm text-emerald-700 font-medium">{topPerformers.bestTeam.sales} Vendas Totais</p>
                        <p className="text-xs text-emerald-600 mt-1">Total de Leads: {topPerformers.bestTeam.leads}</p>
                    </div>
                ) : <p className="text-gray-500 text-sm">Sem dados</p>}
            </div>
        </div>

        {/* --- PERFORMANCE TABLES --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Team Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800">Performance por Equipe</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Supervisor</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Vendas</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Conv. %</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {performanceData.teamList.map((team, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{team.name}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">{team.leads}</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{team.sales}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">{team.rate.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Consultant Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800">Ranking de Consultores</h3>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Consultor</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Equipe</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Vendas</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">%</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {performanceData.consultantList.map((c, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        {idx + 1}º {c.name}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{c.supervisor}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">{c.leads}</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{c.sales}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">{c.rate.toFixed(0)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Existing Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Teste 1 vs Teste 2 (Taxa de Conversão %)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={testTypeData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis dataKey="name" type="category" width={150} />
                            <Tooltip />
                            <Bar dataKey="conversao" fill="#10b981" radius={[0, 4, 4, 0]} name="% Conversão" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Distribuição do Funil</h3>
                 <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Analytics;
