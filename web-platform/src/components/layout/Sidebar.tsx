"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  LayoutDashboard, Database, FileSearch, HeartPulse, LogOut, Activity, X, Menu, 
  History as HistoryIcon, Users as UsersIcon, BarChart3, ClipboardList, TrendingUp, 
  FolderOpen, ChevronDown, Trash2, Scale, FileText, CloudDownload, MessageSquarePlus 
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  userRole: string | null;
  userName: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  pendingSyncs?: any[];
  isSyncing?: boolean;
  setShowSyncModal?: (show: boolean) => void;
  setShowGreetingsManager?: (show: boolean) => void;
}

export default function Sidebar({
  userRole,
  userName,
  isSidebarOpen,
  setIsSidebarOpen,
  pendingSyncs = [],
  isSyncing = false,
  setShowSyncModal,
  setShowGreetingsManager
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);
  const [isAbonoOpen, setIsAbonoOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Auto-expand submenus based on current path
  useEffect(() => {
    if (pathname.includes('/abono')) {
      setIsBenefitsOpen(true);
      setIsAbonoOpen(true);
    }
    if (pathname.includes('/history') || pathname.includes('/analytics')) setIsHistoryOpen(true);
    if (pathname.includes('/users') || pathname.includes('/deletion-requests')) setIsAdminOpen(true);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* SIDEBAR - MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR - AZUL ESCURO (MARINHO #1A3351) */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 bg-[#1A3351] border-r border-white/10 flex flex-col p-6 lg:p-4 shrink-0 shadow-2xl transition-transform duration-300 transform ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="mb-8 flex flex-col items-center">
          <div className="flex justify-between items-center w-full lg:hidden mb-4">
            <span className="text-white font-black text-xs uppercase">Menu</span>
            <button onClick={() => setIsSidebarOpen(false)}>
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="w-full h-16 mt-2 mb-2 flex items-center justify-center">
            <img src="/images/logo_white.png" alt="SESMT" className="h-14 w-auto object-contain" />
          </div>
          <div className="text-center w-full px-1 mt-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">SESMT SYSTEM</p>
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider truncate whitespace-nowrap">
              Olá, <span className="text-white">{userName}</span>
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
          {userRole !== 'social_assistant' && (
            <>
              <button 
                onClick={() => router.push('/')}
                className={`w-full flex items-center gap-1.5 p-3 rounded-lg transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap ${isActive('/') ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Criar documentos</span>
              </button>

              {userRole !== 'viewer' && (
                <button
                  onClick={() => router.push('/referrals')}
                  className={`w-full flex items-center gap-1.5 p-3 rounded-lg transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap ${isActive('/referrals') ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span>Central de Evidências</span>
                </button>
              )}
            </>
          )}

          {/* BENEFÍCIOS COM SUBMENU CONSOLIDADO */}
          {userRole !== 'viewer' && (
            <div className="space-y-1">
              <button
                onClick={() => setIsBenefitsOpen(!isBenefitsOpen)}
                className="w-full flex items-center justify-between p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
              >
                <div className="flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 shrink-0" />
                  <span>Benefícios</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isBenefitsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isBenefitsOpen && (
                <div className="flex flex-col space-y-1 bg-black/10 rounded-lg p-1">
                  {userRole !== 'social_assistant' && (
                    <>
                      <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/40 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap cursor-not-allowed opacity-50">
                        <Database className="w-3.5 h-3.5 shrink-0" />
                        <span>Auxílio Doença</span>
                      </button>

                      <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/40 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap cursor-not-allowed opacity-50">
                        <FileSearch className="w-3.5 h-3.5 shrink-0" />
                        <span>Readaptação</span>
                      </button>
                    </>
                  )}

                  {userRole !== 'nurse' && userRole !== 'operator' && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setIsAbonoOpen(!isAbonoOpen)}
                        className={`w-full flex items-center justify-between p-2 pl-9 rounded-lg font-bold text-[10px] uppercase tracking-wider group ${pathname.startsWith('/abono') ? 'text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                      >
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-3.5 h-3.5 shrink-0 group-hover:text-indigo-400 transition-colors" />
                          <span>Abono Salarial</span>
                        </div>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isAbonoOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isAbonoOpen && (
                        <div className="flex flex-col space-y-1 pl-4">
                          <button onClick={() => router.push('/abono')} className={`w-full flex items-center gap-2 p-2 pl-9 rounded-lg font-bold text-[9px] uppercase tracking-wider whitespace-nowrap group ${pathname === '/abono' ? 'bg-white/5 text-white border-l-2 border-indigo-500/50' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}>
                            <LayoutDashboard className="w-3 h-3 shrink-0" />
                            <span>Painel de Gestão</span>
                          </button>
                          <button onClick={() => router.push('/abono/portarias')} className={`w-full flex items-center gap-2 p-2 pl-9 rounded-lg font-bold text-[9px] uppercase tracking-wider whitespace-nowrap group ${pathname === '/abono/portarias' ? 'bg-white/5 text-amber-400 border-l-2 border-amber-500/50' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}>
                            <FileText className="w-3 h-3 shrink-0" />
                            <span>Portarias</span>
                          </button>
                          <button onClick={() => router.push('/abono/lei')} className={`w-full flex items-center gap-2 p-2 pl-9 rounded-lg font-bold text-[9px] uppercase tracking-wider whitespace-nowrap group ${pathname === '/abono/lei' ? 'bg-white/5 text-sky-400 border-l-2 border-sky-500/50' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}>
                            <Scale className="w-3 h-3 shrink-0" />
                            <span>Legislação e Regras</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {userRole !== 'social_assistant' && (
                    <button className="w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg text-white/40 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap cursor-not-allowed opacity-50">
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                      <span>Redução de Jornada</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MONITOR DE SINCRONIZAÇÃO - Apenas se não for admin (para admin fica no submenu) */}
          {userRole !== 'admin' && pendingSyncs.length > 0 && setShowSyncModal && (
            <div className="pt-2">
              <button
                onClick={() => setShowSyncModal(true)}
                className="w-full flex items-center justify-between p-3 rounded-lg transition-all font-bold text-xs uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20"
              >
                <div className="flex items-center gap-1.5">
                  <CloudDownload className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>Sincronização</span>
                </div>
                <span className="bg-amber-500 text-black text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">{pendingSyncs.length}</span>
              </button>
            </div>
          )}

          {userRole !== 'social_assistant' && userRole !== 'operator' && userRole !== 'viewer' && (
            <div className="space-y-1">
              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="w-full flex items-center justify-between p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
              >
                <div className="flex items-center gap-1.5">
                  <HistoryIcon className="w-4 h-4 shrink-0" />
                  <span>Histórico</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : ''}`} />
              </button>

              {isHistoryOpen && (
                <div className="flex flex-col space-y-1 bg-black/10 rounded-lg p-1">
                  <button
                    onClick={() => router.push('/history')}
                    className={`w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap ${isActive('/history') ? 'text-white bg-white/5' : 'text-white/60 hover:text-white'}`}
                  >
                    <HistoryIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Log Principal</span>
                  </button>
                  <button
                    onClick={() => router.push('/analytics')}
                    className={`w-full flex items-center gap-1.5 p-2 pl-9 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider whitespace-nowrap ${isActive('/analytics') ? 'text-white bg-white/5' : 'text-white/60 hover:text-white'}`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                    <span>Indicadores BI</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {userRole !== 'social_assistant' && (
            <button
              onClick={() => router.push('/archive')}
              className={`w-full flex items-center gap-1.5 p-3 rounded-lg transition-all font-bold text-xs uppercase tracking-wider whitespace-nowrap ${isActive('/archive') ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Arquivo Médico</span>
            </button>
          )}

          {userRole === 'admin' && (
            <div className="space-y-1">
              <button
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                className="w-full flex items-center justify-between p-3 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
              >
                <div className="flex items-center gap-1.5">
                  <UsersIcon className="w-4 h-4 shrink-0" />
                  <span>Administração</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAdminOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAdminOpen && (
                <div className="flex flex-col space-y-1 bg-black/10 rounded-lg p-1">
                  <button onClick={() => router.push('/users')} className={`w-full flex items-center gap-2 p-2.5 pl-9 rounded-md transition-all font-bold text-[10px] uppercase tracking-wider ${isActive('/users') ? 'text-white bg-white/5' : 'text-white/50 hover:text-white'}`}>
                    <UsersIcon className="w-3.5 h-3.5" />
                    <span>Gestão de Usuários</span>
                  </button>
                  <button onClick={() => router.push('/deletion-requests')} className={`w-full flex items-center gap-2 p-2.5 pl-9 rounded-md transition-all font-bold text-[10px] uppercase tracking-wider ${isActive('/deletion-requests') ? 'text-white bg-white/5' : 'text-white/50 hover:text-white'}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Exclusões Pendentes</span>
                  </button>
                  {setShowGreetingsManager && (
                    <button onClick={() => setShowGreetingsManager(true)} className="w-full flex items-center gap-2 p-2.5 pl-9 rounded-md text-white/50 hover:bg-white/5 hover:text-white transition-all font-bold text-[10px] uppercase tracking-wider">
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>Boas-Vindas</span>
                    </button>
                  )}
                  {setShowSyncModal && (
                    <button 
                      onClick={() => setShowSyncModal(true)} 
                      className={`w-full flex items-center justify-between p-2.5 pl-9 rounded-md transition-all font-bold text-[10px] uppercase tracking-wider ${pendingSyncs.length > 0 ? 'text-amber-500' : 'text-white/50 hover:text-white'}`}
                    >
                      <div className="flex items-center gap-2">
                        <CloudDownload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                        <span>Sincronizar Dados</span>
                      </div>
                      {pendingSyncs.length > 0 && <span className="bg-amber-500 text-black text-[8px] px-1 rounded-full">{pendingSyncs.length}</span>}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="mt-auto space-y-4 px-4 pt-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-1.5 p-2 text-white/30 hover:text-white transition-all font-bold uppercase tracking-widest text-[10px]"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>

          <div className="pl-4 pb-6 flex flex-col pt-2">
            <p className="text-[10px] font-normal text-white/60 leading-none mb-1 text-left">Powered by</p>
            <p className="text-[18px] font-black text-white leading-none tracking-[0.1em] text-left">
              UXBRAS<span className="text-[12px] font-normal align-top ml-0.5 tracking-normal">®</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
