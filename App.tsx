import React, { useState, useEffect } from 'react';
import { Role, Consultant } from './types';
import ConsultantView from './components/ConsultantView';
import RafaelView from './components/RafaelView';
import { seedDatabase, authenticateConsultant, authenticateManager } from './services/crmService';
import { Users, LogOut, LayoutDashboard, Key, User } from 'lucide-react';

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
  const [managerUser, setManagerUser] = useState<string>('');
  
  // Login State
  const [loginMode, setLoginMode] = useState<'CONSULTANT' | 'MANAGER'>('CONSULTANT');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    seedDatabase();
  }, []);

  const handleLogout = () => {
    setCurrentRole(null);
    setSelectedConsultant(null);
    setManagerUser('');
    setUsername('');
    setPassword('');
    setLoginError('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    if (loginMode === 'MANAGER') {
      // Manager auth is still sync/hardcoded
      const managerName = authenticateManager(username, password);
      if (managerName) {
        setManagerUser(managerName);
        setCurrentRole(Role.MANAGER);
      } else {
        setLoginError('Login ou senha incorretos.');
      }
    } else {
      // Consultant auth is now async against Supabase
      const consultant = await authenticateConsultant(username, password);
      if (consultant) {
        setSelectedConsultant(consultant);
        setCurrentRole(Role.CONSULTANT);
      } else {
        setLoginError('Login ou senha incorretos.');
      }
    }
    setIsLoggingIn(false);
  };

  if (!currentRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-emerald-600 p-6 text-center">
            <h1 className="text-3xl font-bold text-white">VOLL Promo</h1>
            <p className="text-emerald-100 mt-2 text-sm">Controle de Campanha Fevereiro</p>
          </div>

          <div className="flex border-b border-gray-200">
            <button 
              className={`flex-1 py-4 text-sm font-medium transition ${loginMode === 'CONSULTANT' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-gray-50' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setLoginMode('CONSULTANT'); setLoginError(''); }}
            >
              Sou Consultor
            </button>
            <button 
              className={`flex-1 py-4 text-sm font-medium transition ${loginMode === 'MANAGER' ? 'text-slate-800 border-b-2 border-slate-800 bg-gray-50' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setLoginMode('MANAGER'); setLoginError(''); }}
            >
              Acesso Admin
            </button>
          </div>

          <div className="p-8">
             <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 block w-full rounded-md border-gray-300 border p-3 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Seu usuário"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 block w-full rounded-md border-gray-300 border p-3 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Sua senha"
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className={`w-full text-white p-3 rounded-lg font-bold transition shadow-sm mt-2 ${loginMode === 'MANAGER' ? 'bg-slate-800 hover:bg-slate-900' : 'bg-emerald-600 hover:bg-emerald-700'} ${isLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isLoggingIn ? 'Entrando...' : `Entrar ${loginMode === 'MANAGER' ? 'como Admin' : ''}`}
                </button>
              </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">V</div>
            <span className="font-bold text-xl text-gray-800 hidden sm:block">VOLL CRM</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              <Users size={16} />
              <span>
                {currentRole === Role.MANAGER ? `Admin: ${managerUser}` : `Consultor: ${selectedConsultant?.name}`}
              </span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 transition"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow">
        {currentRole === Role.MANAGER ? (
          <RafaelView currentUser={managerUser} />
        ) : selectedConsultant ? (
          <ConsultantView consultant={selectedConsultant} />
        ) : null}
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          VOLL Promo CRM &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default App;