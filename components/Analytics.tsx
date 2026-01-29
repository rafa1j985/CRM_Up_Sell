import React, { useMemo } from 'react';
import { Lead, LeadStatus, TestType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Props {
  leads: Lead[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const Analytics: React.FC<Props> = ({ leads }) => {
  
  const stats = useMemo(() => {
    const total = leads.length;
    const won3y = leads.filter(l => l.status === LeadStatus.WON_3Y).length;
    const wonLife = leads.filter(l => l.status === LeadStatus.WON_LIFETIME).length;
    const lost = leads.filter(l => l.status === LeadStatus.LOST).length;
    const open = total - won3y - wonLife - lost;
    const conversionRate = total > 0 ? ((won3y + wonLife) / total) * 100 : 0;

    return { total, won3y, wonLife, lost, open, conversionRate };
  }, [leads]);

  const testTypeData = useMemo(() => {
    const t1 = leads.filter(l => l.testType === TestType.TEST_1_ACTIVE);
    const t2 = leads.filter(l => l.testType === TestType.TEST_2_PASSIVE);

    const getConv = (group: Lead[]) => {
        const wins = group.filter(l => l.status === LeadStatus.WON_3Y || l.status === LeadStatus.WON_LIFETIME).length;
        return group.length > 0 ? (wins / group.length) * 100 : 0;
    };

    return [
        { name: 'Teste 1 (Ativo)', leads: t1.length, conversao: getConv(t1).toFixed(1) },
        { name: 'Teste 2 (LP)', leads: t2.length, conversao: getConv(t2).toFixed(1) },
    ];
  }, [leads]);

  const consultantData = useMemo(() => {
    const map: Record<string, { name: string, total: number, wins: number }> = {};
    
    leads.forEach(l => {
        if (!map[l.consultantName]) {
            map[l.consultantName] = { name: l.consultantName, total: 0, wins: 0 };
        }
        map[l.consultantName].total++;
        if (l.status === LeadStatus.WON_3Y || l.status === LeadStatus.WON_LIFETIME) {
            map[l.consultantName].wins++;
        }
    });

    return Object.values(map).map(c => ({
        name: c.name,
        total: c.total,
        wins: c.wins,
        taxa: c.total > 0 ? ((c.wins / c.total) * 100).toFixed(1) : 0
    }));
  }, [leads]);

  const pieData = [
    { name: '3 Anos', value: stats.won3y },
    { name: 'Vitalício', value: stats.wonLife },
    { name: 'Perdido', value: stats.lost },
    { name: 'Em Aberto', value: stats.open },
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
                <p className="text-gray-500 text-sm font-medium">Vendas 3 Anos</p>
                <p className="text-3xl font-bold text-blue-600">{stats.won3y}</p>
            </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-gray-500 text-sm font-medium">Vendas Vitalício</p>
                <p className="text-3xl font-bold text-purple-600">{stats.wonLife}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 1: Test Types */}
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

            {/* Chart 2: Status Breakdown */}
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

            {/* Chart 3: Consultant Performance */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Desempenho por Consultor</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={consultantData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="total" fill="#94a3b8" name="Leads Totais" />
                            <Bar dataKey="wins" fill="#10b981" name="Vendas (Upsell)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Analytics;