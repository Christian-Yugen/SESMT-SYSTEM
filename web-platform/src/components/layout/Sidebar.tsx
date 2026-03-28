"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  FileSearch,
  HeartPulse,
  LogOut,
  X,
  History as HistoryIcon,
  Users as UsersIcon,
  BarChart3,
  ClipboardList,
  TrendingUp,
  FolderOpen,
  ChevronDown,
  Trash2,
  Scale,
  FileText,
  CloudDownload,
  MessageSquarePlus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ensureISO } from "@/lib/utils";
import { safeGetSession, handleAuthError } from "@/lib/auth-utils";
import SyncModal from "@/components/SyncModal";
import GreetingsManagerModal from "@/components/GreetingsManagerModal";
import WelcomeModal from "@/components/WelcomeModal";
import { PendingSyncRecord } from "@/types";

interface SidebarProps {
  userRole: string | null;
  userName: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({
  userRole,
  userName,
  isSidebarOpen,
  setIsSidebarOpen,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);
  const [isAbonoOpen, setIsAbonoOpen] = useState(false);
  const [, setIsAfastamentosOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // States for Admin Modals (Centralized)
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showGreetingsManager, setShowGreetingsManager] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState<PendingSyncRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Auto-expand submenus and manage sync data
  useEffect(() => {
    if (pathname.includes("/abono")) {
      setIsBenefitsOpen(true);
      setIsAbonoOpen(true);
    }
    if (pathname.includes("/afastamentos")) {
      setIsBenefitsOpen(true);
      setIsAfastamentosOpen(true);
    }
    if (pathname.includes("/referrals")) setIsBenefitsOpen(true);
    if (pathname.includes("/history") || pathname.includes("/analytics"))
      setIsHistoryOpen(true);
    if (
      pathname === "/" ||
      pathname.includes("/users") ||
      pathname.includes("/history/deletions")
    )
      setIsAdminOpen(true);

    // Sync Data Logic (Centralized)
    const loadPendingData = () => {
      const pendingStr = localStorage.getItem("pending_aso_history");
      if (pendingStr) {
        const records = JSON.parse(pendingStr);
        if (Array.isArray(records)) setPendingSyncs(records);
      } else {
        setPendingSyncs([]);
      }
    };

    const getUserId = async () => {
      const { session, error } = await safeGetSession();
      if (error) {
        await handleAuthError(error);
        return;
      }
      if (session) setUserId(session.user.id);
    };

    loadPendingData();
    getUserId();

    const interval = setInterval(loadPendingData, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [pathname]);

  const handleForceSync = async () => {
    if (pendingSyncs.length === 0 || isSyncing) return;
    setIsSyncing(true);

    const remaining = [...pendingSyncs];
    const failedToSync = [];

    for (const record of remaining) {
      try {
        // Higienizar antes de reenviar
        const sanitizedRecord = {
          ...record,
          servidor_nascimento: ensureISO(record.servidor_nascimento),
        };

        const { error } = await supabase
          .from("aso_history")
          .insert(sanitizedRecord);
        if (error) throw error;
      } catch (err) {
        console.error("Erro ao sincronizar:", err);
        failedToSync.push(record);
      }
    }

    localStorage.setItem("pending_aso_history", JSON.stringify(failedToSync));
    setPendingSyncs(failedToSync);
    setIsSyncing(false);

    if (failedToSync.length === 0) {
      setShowSyncModal(false);
    }
  };

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
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 bg-[#1A3351] border-r border-white/10 flex flex-col p-6 lg:p-4 shrink-0 shadow-2xl transition-transform duration-300 transform ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="flex justify-between items-center w-full lg:hidden mb-4">
            <span className="text-white font-bold text-xs uppercase">Menu</span>
            <button onClick={() => setIsSidebarOpen(false)}>
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="w-full h-16 mt-2 mb-2 flex items-center justify-center">
            <Image
              src="/images/logo_white.png"
              alt="SESMT"
              width={160}
              height={56}
              className="h-14 w-auto object-contain"
            />
          </div>
          <div className="text-center w-full px-1 mt-2">
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] mb-1">
              SESMT SYSTEM
            </p>
            <p className="text-xs font-medium text-white/70 uppercase tracking-wider truncate whitespace-nowrap">
              Olá, <span className="text-white font-bold">{userName}</span>
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
          {userRole !== "social_assistant" && (
            <>
              <button
                onClick={() => router.push("/")}
                className={`w-full flex items-center gap-1.5 p-3 transition-all text-xs uppercase tracking-wider whitespace-nowrap ${isActive("/") ? "bg-white/10 text-white font-bold shadow-sm border border-white/5" : "text-white/70 font-medium hover:bg-white/5 hover:text-white"}`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Criar documentos</span>
              </button>

              {userRole !== "viewer" && (
                <button
                  onClick={() => router.push("/referrals")}
                  className={`w-full flex items-center gap-1.5 p-3 transition-all text-xs uppercase tracking-wider whitespace-nowrap ${isActive("/referrals") ? "bg-white/10 text-white font-bold shadow-sm border border-white/5" : "text-white/70 font-medium hover:bg-white/5 hover:text-white"}`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span>Central de Evidências</span>
                </button>
              )}
            </>
          )}

          {/* BENEFÍCIOS COM SUBMENU CONSOLIDADO */}
          {userRole !== "viewer" && (
            <div className="space-y-1">
              <button
                onClick={() => setIsBenefitsOpen(!isBenefitsOpen)}
                className="w-full flex items-center justify-between p-3 text-white/70 hover:bg-white/5 hover:text-white transition-all font-medium text-xs uppercase tracking-wider"
              >
                <div className="flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 shrink-0" />
                  <span>Benefícios</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${isBenefitsOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isBenefitsOpen && (
                <div className="flex flex-col space-y-1 bg-black/10 p-1">
                  {userRole !== "social_assistant" && (
                    <>
                      {(userRole === "admin" || userRole === "nurse") && (
                        <button
                          onClick={() => router.push("/afastamentos")}
                          className={`w-full flex items-center gap-1.5 p-2 pl-9 transition-all text-[10px] uppercase tracking-wider whitespace-nowrap ${pathname.startsWith("/afastamentos") ? "bg-white/5 text-white font-bold border-l-2 border-emerald-500/50" : "text-white/40 font-medium hover:bg-white/5 hover:text-white"}`}
                        >
                          <Database className="w-3.5 h-3.5 shrink-0" />
                          <span>Afastamentos</span>
                        </button>
                      )}

                      <button className="w-full flex items-center gap-1.5 p-2 pl-9 text-white/40 hover:bg-white/5 hover:text-white transition-all font-medium text-[10px] uppercase tracking-wider whitespace-nowrap cursor-not-allowed opacity-50">
                        <FileSearch className="w-3.5 h-3.5 shrink-0" />
                        <span>Readaptação</span>
                      </button>
                    </>
                  )}

                  {userRole !== "nurse" && userRole !== "operator" && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setIsAbonoOpen(!isAbonoOpen)}
                        className={`w-full flex items-center justify-between p-2 pl-9 text-[10px] uppercase tracking-wider group ${pathname.startsWith("/abono") ? "text-white font-bold" : "text-white/60 font-medium hover:bg-white/5 hover:text-white"}`}
                      >
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-3.5 h-3.5 shrink-0 group-hover:text-indigo-400 transition-colors" />
                          <span>Abono Salarial</span>
                        </div>
                        <ChevronDown
                          className={`w-3 h-3 transition-transform duration-200 ${isAbonoOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isAbonoOpen && (
                        <div className="flex flex-col space-y-1 pl-4">
                          <button
                            onClick={() => router.push("/abono")}
                            className={`w-full flex items-center gap-2 p-2 pl-9 font-medium text-[9px] uppercase tracking-wider whitespace-nowrap group ${pathname === "/abono" ? "bg-white/5 text-white font-bold border-l-2 border-indigo-500/50" : "text-white/40 hover:bg-white/5 hover:text-white"}`}
                          >
                            <LayoutDashboard className="w-3 h-3 shrink-0" />
                            <span>Painel de Gestão</span>
                          </button>
                          <button
                            onClick={() => router.push("/abono/portarias")}
                            className={`w-full flex items-center gap-2 p-2 pl-9 font-medium text-[9px] uppercase tracking-wider whitespace-nowrap group ${pathname === "/abono/portarias" ? "bg-white/5 text-amber-400 font-bold border-l-2 border-amber-500/50" : "text-white/40 hover:bg-white/5 hover:text-white"}`}
                          >
                            <FileText className="w-3 h-3 shrink-0" />
                            <span>Portarias</span>
                          </button>
                          <button
                            onClick={() => router.push("/abono/lei")}
                            className={`w-full flex items-center gap-2 p-2 pl-9 font-medium text-[9px] uppercase tracking-wider whitespace-nowrap group ${pathname === "/abono/lei" ? "bg-white/5 text-sky-400 font-bold border-l-2 border-sky-500/50" : "text-white/40 hover:bg-white/5 hover:text-white"}`}
                          >
                            <Scale className="w-3 h-3 shrink-0" />
                            <span>Legislação e Regras</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {userRole !== "social_assistant" && (
                    <button className="w-full flex items-center gap-1.5 p-2 pl-9 text-white/40 hover:bg-white/5 hover:text-white transition-all font-medium text-[10px] uppercase tracking-wider whitespace-nowrap cursor-not-allowed opacity-50">
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                      <span>Redução de Jornada</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MONITOR DE SINCRONIZAÇÃO */}
          {pendingSyncs.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowSyncModal(true)}
                className="w-full flex items-center justify-between p-3 transition-all font-bold text-xs uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20"
              >
                <div className="flex items-center gap-1.5">
                  <CloudDownload
                    className={`w-4 h-4 shrink-0 ${isSyncing ? "animate-bounce" : ""}`}
                  />
                  <span>Sincronização</span>
                </div>
                <span className="bg-amber-500 text-black text-[9px] px-1.5 py-0.5 font-bold rounded-none">
                  {pendingSyncs.length}
                </span>
              </button>
            </div>
          )}

          {userRole !== "social_assistant" &&
            userRole !== "operator" &&
            userRole !== "viewer" && (
              <div className="space-y-1">
                <button
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="w-full flex items-center justify-between p-3 text-white/70 hover:bg-white/5 hover:text-white transition-all font-medium text-xs uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1.5">
                    <HistoryIcon className="w-4 h-4 shrink-0" />
                    <span>Histórico</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isHistoryOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isHistoryOpen && (
                  <div className="flex flex-col space-y-1 bg-black/10 p-1">
                    <button
                      onClick={() => router.push("/history")}
                      className={`w-full flex items-center gap-1.5 p-2 pl-9 transition-all text-[10px] uppercase tracking-wider whitespace-nowrap ${isActive("/history") ? "text-white bg-white/5 font-bold" : "text-white/60 font-medium hover:text-white"}`}
                    >
                      <HistoryIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Log Principal</span>
                    </button>
                    <button
                      onClick={() => router.push("/analytics")}
                      className={`w-full flex items-center gap-1.5 p-2 pl-9 transition-all text-[10px] uppercase tracking-wider whitespace-nowrap ${isActive("/analytics") ? "text-white bg-white/5 font-bold" : "text-white/60 font-medium hover:text-white"}`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                      <span>Indicadores BI</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          {userRole !== "social_assistant" && (
            <button
              onClick={() => router.push("/archive")}
              className={`w-full flex items-center gap-1.5 p-3 transition-all text-xs uppercase tracking-wider whitespace-nowrap ${isActive("/archive") ? "bg-white/10 text-white font-bold shadow-sm border border-white/5" : "text-white/70 font-medium hover:bg-white/5 hover:text-white"}`}
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Arquivo Médico</span>
            </button>
          )}

          {userRole === "admin" && (
            <div className="space-y-1">
              <button
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                className="w-full flex items-center justify-between p-3 text-white/70 hover:bg-white/5 hover:text-white transition-all font-medium text-xs uppercase tracking-wider"
              >
                <div className="flex items-center gap-1.5">
                  <UsersIcon className="w-4 h-4 shrink-0" />
                  <span>Administração</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${isAdminOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isAdminOpen && (
                <div className="flex flex-col space-y-1 bg-black/10 p-1">
                  <button
                    onClick={() => router.push("/users")}
                    className={`w-full flex items-center gap-2 p-2.5 pl-9 transition-all text-[10px] uppercase tracking-wider ${isActive("/users") ? "text-white bg-white/5 font-bold" : "text-white/50 font-medium hover:text-white"}`}
                  >
                    <UsersIcon className="w-3.5 h-3.5" />
                    <span>Gestão de Usuários</span>
                  </button>
                  <button
                    onClick={() => router.push("/deletion-requests")}
                    className={`w-full flex items-center gap-2 p-2.5 pl-9 transition-all text-[10px] uppercase tracking-wider ${isActive("/deletion-requests") ? "text-white bg-white/5 font-bold" : "text-white/50 font-medium hover:text-white"}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Exclusões Pendentes</span>
                  </button>
                  <button
                    onClick={() => setShowGreetingsManager(true)}
                    className="w-full flex items-center gap-2 p-2.5 pl-9 text-white/50 hover:bg-white/5 hover:text-white transition-all font-medium text-[10px] uppercase tracking-wider"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    <span>Boas-Vindas</span>
                  </button>
                  <button
                    onClick={() => setShowSyncModal(true)}
                    className={`w-full flex items-center justify-between p-2.5 pl-9 transition-all text-[10px] uppercase tracking-wider ${pendingSyncs.length > 0 ? "text-amber-500 font-bold" : "text-white/50 font-medium hover:text-white"}`}
                  >
                    <div className="flex items-center gap-2">
                      <CloudDownload
                        className={`w-3.5 h-3.5 ${isSyncing ? "animate-bounce" : ""}`}
                      />
                      <span>Sincronizar Dados</span>
                    </div>
                    {pendingSyncs.length > 0 && (
                      <span className="bg-amber-500 text-black text-[8px] px-1 font-bold rounded-none">
                        {pendingSyncs.length}
                      </span>
                    )}
                  </button>
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
            <p className="text-[10px] font-normal text-white/60 leading-none mb-1 text-left">
              Powered by
            </p>
            <p className="text-[18px] font-bold text-white leading-none tracking-[0.1em] text-left">
              UXBRAS
              <span className="text-[12px] font-normal align-top ml-0.5 tracking-normal">
                ®
              </span>
            </p>
          </div>
        </div>
      </aside>

      {/* ADMIN MODALS (Centralized) */}
      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        pendingSyncs={pendingSyncs}
        isSyncing={isSyncing}
        onForceSync={handleForceSync}
      />

      {userId && (
        <GreetingsManagerModal
          isOpen={showGreetingsManager}
          onClose={() => setShowGreetingsManager(false)}
          userId={userId}
        />
      )}

      <WelcomeModal userName={userName} />
    </>
  );
}
