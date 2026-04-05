"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useRef } from "react";
import {
  LayoutDashboard,
  Database,
  FileSearch,
  HeartPulse,
  Baby,
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
  Brain,
  Activity,
  Wallet,
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
  const [isAfastamentosOpen, setIsAfastamentosOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // GLOBAL Exclusive Accordion Logic
  const handleToggleBenefits = () => {
    setIsBenefitsOpen(!isBenefitsOpen);
    if (!isBenefitsOpen) {
      setIsHistoryOpen(false);
      setIsAdminOpen(false);
    }
  };

  const handleToggleAfastamentos = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAfastamentosOpen(!isAfastamentosOpen);
    if (!isAfastamentosOpen) {
      setIsAbonoOpen(false);
      // Ensure parent section is focused
      setIsBenefitsOpen(true);
      setIsHistoryOpen(false);
      setIsAdminOpen(false);
    }
  };

  const handleToggleAbono = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAbonoOpen(!isAbonoOpen);
    if (!isAbonoOpen) {
      setIsAfastamentosOpen(false);
      // Ensure parent section is focused
      setIsBenefitsOpen(true);
      setIsHistoryOpen(false);
      setIsAdminOpen(false);
    }
  };

  const handleToggleHistory = () => {
    setIsHistoryOpen(!isHistoryOpen);
    if (!isHistoryOpen) {
      setIsBenefitsOpen(false);
      setIsAfastamentosOpen(false);
      setIsAbonoOpen(false);
      setIsAdminOpen(false);
    }
  };

  const handleToggleAdmin = () => {
    setIsAdminOpen(!isAdminOpen);
    if (!isAdminOpen) {
      setIsBenefitsOpen(false);
      setIsAfastamentosOpen(false);
      setIsAbonoOpen(false);
      setIsHistoryOpen(false);
    }
  };

  const handleCollapseAll = () => {
    setIsBenefitsOpen(false);
    setIsAfastamentosOpen(false);
    setIsAbonoOpen(false);
    setIsHistoryOpen(false);
    setIsAdminOpen(false);
  };

  // States for Admin Modals (Centralized)
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showGreetingsManager, setShowGreetingsManager] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState<PendingSyncRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Auto-expand submenus and manage sync data
  useEffect(() => {
    // Accordion Logic on Navigation
    if (pathname.startsWith("/afastamentos/maternidade")) {
      setIsBenefitsOpen(true);
      setIsAfastamentosOpen(false);
      setIsAbonoOpen(false);
      setIsHistoryOpen(false);
      setIsAdminOpen(false);
    } else if (pathname.startsWith("/afastamentos")) {
      setIsBenefitsOpen(true);
      setIsAfastamentosOpen(true);
      setIsAbonoOpen(false);
      setIsHistoryOpen(false);
      setIsAdminOpen(false);
    } else if (pathname.includes("/abono")) {
      setIsBenefitsOpen(true);
      setIsAbonoOpen(true);
      setIsAfastamentosOpen(false);
      setIsHistoryOpen(false);
    } else if (pathname.includes("/referrals")) {
      setIsBenefitsOpen(true);
      setIsAfastamentosOpen(false);
      setIsAbonoOpen(false);
    } else if (pathname.includes("/history") || pathname.includes("/analytics")) {
      setIsHistoryOpen(true);
      setIsBenefitsOpen(false);
      setIsAfastamentosOpen(false);
      setIsAbonoOpen(false);
    }
    if (
      pathname === "/" ||
      pathname.includes("/users") ||
      pathname.includes("/history/deletions") ||
      pathname === "/referrals"
    ) {
      if (pathname === "/" || pathname === "/referrals") {
        handleCollapseAll();
      } else {
        setIsAdminOpen(true);
      }
    }

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

  // Auto-scroll when submenus open
  useEffect(() => {
    if (isAfastamentosOpen || isAbonoOpen || isHistoryOpen || isAdminOpen) {
      setTimeout(() => {
        const activeElement = document.querySelector(".is-active-folder");
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    }
  }, [isAfastamentosOpen, isAbonoOpen, isHistoryOpen, isAdminOpen]);

  return (
    <>
      <style jsx global>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none !important;
        }
        .scrollbar-none {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>
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
        fixed lg:sticky top-0 left-0 z-50 w-72 lg:w-60 bg-[#1A3351] border-r border-white/10 flex flex-col h-screen shrink-0 shadow-2xl transition-transform duration-300 transform ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="mb-4 flex flex-col items-center p-4">
          <div className="flex justify-between items-center w-full lg:hidden mb-4">
            <span className="text-white font-bold text-xs uppercase">Menu</span>
            <button onClick={() => setIsSidebarOpen(false)}>
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="w-full flex items-center justify-center mb-1 overflow-hidden">
            <Image
              src="/images/logo_white.png"
              alt="SESMT"
              width={256}
              height={120}
              className="h-36 w-auto object-contain"
            />
          </div>
          <div className="text-center w-full px-1 -mt-1">
            <p className="text-[14px] font-black text-white/70 uppercase tracking-[0.5em] leading-none mb-1">
              SESMT SYSTEM
            </p>
            <p className="text-xs font-medium text-white/80 uppercase tracking-wider truncate whitespace-nowrap leading-tight">
              Olá, <span className="text-white font-medium">{userName}</span>
            </p>
          </div>
        </div>

        <nav 
          ref={sidebarRef}
          className="flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-none"
        >
          {userRole !== "social_assistant" && (
            <>
              <button
                onClick={() => {
                  handleCollapseAll();
                  router.push("/");
                }}
                className={`w-full flex items-center gap-1.5 p-2.5 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[11px] uppercase tracking-wider whitespace-nowrap ${isActive("/") ? "bg-white/10 text-white font-medium shadow-sm border border-white/5" : "text-white/70 font-medium hover:bg-white/5 hover:text-white"}`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Criar documentos</span>
              </button>

              {userRole !== "viewer" && (
                <button
                  onClick={() => {
                    handleCollapseAll();
                    router.push("/referrals");
                  }}
                  className={`w-full flex items-center gap-1.5 p-2.5 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[11px] uppercase tracking-wider whitespace-nowrap ${isActive("/referrals") ? "bg-white/10 text-white font-medium shadow-sm border border-white/5" : "text-white/70 font-medium hover:bg-white/5 hover:text-white"}`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span>Central de Evidências</span>
                </button>
              )}
            </>
          )}

          {/* BENEFÍCIOS COM SUBMENU CONSOLIDADO */}
          {(userRole !== "viewer" || pathname.includes("/afastamentos") || userRole === "analytic_manager") && (
            <div className="space-y-1">
              <button
                onClick={handleToggleBenefits}
                className="w-full flex items-center justify-between p-2.5 text-white/70 hover:bg-white/5 hover:text-white active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left font-medium text-[11px] uppercase tracking-wider"
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
                      {(userRole === "admin" || userRole === "nurse" || userRole === "analytic_manager" || userRole === "doctor") && (
                        <div className="space-y-1">
                          <button
                            onClick={handleToggleAfastamentos}
                            className={`w-full flex items-center justify-between p-2 pl-9 text-[10px] uppercase tracking-wider group active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left is-active-folder ${pathname.startsWith("/afastamentos") ? "text-white font-medium" : "text-white/60 font-medium hover:bg-white/5 hover:text-white"}`}
                          >
                            <div className="flex items-center gap-2">
                              <Database className="w-3.5 h-3.5 shrink-0 group-hover:text-emerald-400" />
                              <span>Afastamentos</span>
                            </div>
                            <ChevronDown
                              className={`w-3 h-3 transition-transform duration-200 ${isAfastamentosOpen ? "rotate-180" : ""}`}
                            />
                          </button>

                          {isAfastamentosOpen && (
                            <div className="flex flex-col space-y-1 pl-4 bg-white/5 mx-1 py-1">
                              <button
                                onClick={() => router.push("/afastamentos")}
                                className={`w-full flex items-center gap-1.5 py-1.5 pl-8 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[9px] uppercase tracking-wider whitespace-nowrap ${pathname === "/afastamentos" ? "bg-white/15 text-white font-medium shadow-sm" : "text-white/40 font-medium hover:text-white"}`}
                              >
                                <LayoutDashboard className="w-3 h-3 shrink-0" />
                                <span>Listagem Geral</span>
                              </button>

                              <button
                                onClick={() => router.push("/afastamentos/cid-analytics")}
                                className={`w-full flex items-center gap-1.5 py-1.5 pl-8 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[9px] uppercase tracking-wider whitespace-nowrap ${pathname.startsWith("/afastamentos/cid-analytics") ? "bg-emerald-500/20 text-emerald-300 font-medium shadow-sm" : "text-white/40 font-medium hover:text-white"}`}
                              >
                                <BarChart3 className="w-3 h-3 shrink-0" />
                                <span>CID Analytics</span>
                              </button>

                              <button
                                onClick={() => router.push("/afastamentos/epidemiologia")}
                                className={`w-full flex items-center gap-1.5 py-1.5 pl-8 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[9px] uppercase tracking-wider whitespace-nowrap ${pathname.startsWith("/afastamentos/epidemiologia") ? "bg-red-500/20 text-[#E31E24] font-medium shadow-sm" : "text-white/40 font-medium hover:text-white"}`}
                              >
                                <TrendingUp className="w-3 h-3 shrink-0" />
                                <span>Epidemiologia</span>
                              </button>

                              <button
                                onClick={() => router.push("/afastamentos/psychosocial-analytics")}
                                className={`w-full flex items-center gap-1.5 py-1.5 pl-8 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[9px] uppercase tracking-wider whitespace-nowrap ${pathname.startsWith("/afastamentos/psychosocial-analytics") ? "bg-purple-500/20 text-purple-300 font-medium shadow-sm" : "text-white/40 font-medium hover:text-white"}`}
                              >
                                <Brain className="w-3 h-3 shrink-0" />
                                <span>Psicossocial</span>
                              </button>

                              <button
                                onClick={() => router.push("/afastamentos/ergonomia-analytics")}
                                className={`w-full flex items-center gap-1.5 py-1.5 pl-8 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[9px] uppercase tracking-wider whitespace-nowrap ${pathname.startsWith("/afastamentos/ergonomia-analytics") ? "bg-amber-500/20 text-amber-300 font-medium shadow-sm" : "text-white/40 font-medium hover:text-white"}`}
                              >
                                <Activity className="w-3 h-3 shrink-0" />
                                <span>Ergonomia</span>
                              </button>
                            </div>
                          )}

                          {/* ABONO SALARIAL (NÍVEL 2) - Bloqueio Médico para versão padrão */}
                          {userRole !== "nurse" &&
                            userRole !== "operator" &&
                            userRole !== "doctor" && (
                            <div className="space-y-1 mt-1">
                              <button
                                onClick={handleToggleAbono}
                                className={`w-full flex items-center justify-between p-2 pl-9 text-[10px] uppercase tracking-wider group active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left is-active-folder ${pathname.startsWith("/abono") ? "text-white font-medium" : "text-white/60 font-medium hover:bg-white/5 hover:text-white"}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Wallet className="w-3.5 h-3.5 shrink-0 group-hover:text-emerald-400" />
                                  <span>Abono Salarial</span>
                                </div>
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform duration-200 ${isAbonoOpen ? "rotate-180" : ""}`}
                                />
                              </button>
                              {/* Centralizado para evitar duplicidade de submenus no código original */}
                              {isAbonoOpen && (
                                <div className="flex flex-col space-y-1 pl-4 bg-white/5 mx-1 py-1">
                                  <button
                                    onClick={() => router.push("/abono")}
                                    className={`w-full flex items-center gap-1.5 py-1.5 pl-8 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[9px] uppercase tracking-wider whitespace-nowrap ${pathname === "/abono" ? "bg-white/15 text-white font-medium shadow-sm" : "text-white/40 font-medium hover:text-white"}`}
                                  >
                                    <LayoutDashboard className="w-3 h-3 shrink-0" />
                                    <span>Painel de Gestão</span>
                                  </button>
                                  <button
                                    onClick={() => router.push("/abono/portarias")}
                                    className={`w-full flex items-center gap-1.5 py-1.5 pl-8 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[9px] uppercase tracking-wider whitespace-nowrap ${pathname === "/abono/portarias" ? "bg-amber-500/20 text-amber-300 font-medium shadow-sm" : "text-white/40 font-medium hover:text-white"}`}
                                  >
                                    <FileText className="w-3 h-3 shrink-0" />
                                    <span>Portarias</span>
                                  </button>
                                  <button
                                    onClick={() => router.push("/abono/lei")}
                                    className={`w-full flex items-center gap-1.5 py-1.5 pl-8 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[9px] uppercase tracking-wider whitespace-nowrap ${pathname === "/abono/lei" ? "bg-sky-500/20 text-sky-300 font-medium shadow-sm" : "text-white/40 font-medium hover:text-white"}`}
                                  >
                                    <Scale className="w-3 h-3 shrink-0" />
                                    <span>Legislação e Regras</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ABONO SALARIAL (MÉDICO - VIEW ONLY) */}
                          {userRole === "doctor" && (
                            <div className="space-y-1 mt-1">
                              <button
                                onClick={handleToggleAbono}
                                className={`w-full flex items-center justify-between p-2 pl-9 text-[10px] uppercase tracking-wider group active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left is-active-folder ${pathname.startsWith("/abono") ? "text-white font-medium" : "text-white/60 font-medium hover:bg-white/5 hover:text-white"}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Wallet className="w-3.5 h-3.5 shrink-0 group-hover:text-emerald-400" />
                                  <span>Abono Salarial</span>
                                </div>
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform duration-200 ${isAbonoOpen ? "rotate-180" : ""}`}
                                />
                              </button>
                              {isAbonoOpen && (
                                <div className="flex flex-col space-y-1 pl-4 bg-white/5 mx-1 py-1">
                                  <button
                                    onClick={() => router.push("/abono")}
                                    className={`w-full flex items-center gap-1.5 py-1.5 pl-8 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[9px] uppercase tracking-wider whitespace-nowrap ${pathname === "/abono" ? "bg-white/15 text-white font-medium shadow-sm" : "text-white/40 font-medium hover:text-white"}`}
                                  >
                                    <LayoutDashboard className="w-3 h-3 shrink-0" />
                                    <span>Consulta de Abonos</span>
                                  </button>
                                  <button
                                    onClick={() => router.push("/abono/lei")}
                                    className={`w-full flex items-center gap-1.5 py-1.5 pl-8 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[9px] uppercase tracking-wider whitespace-nowrap ${pathname === "/abono/lei" ? "bg-sky-500/20 text-sky-300 font-medium shadow-sm" : "text-white/40 font-medium hover:text-white"}`}
                                  >
                                    <Scale className="w-3 h-3 shrink-0" />
                                    <span>Legislação e Regras</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}


                           {/* Lic. Maternidade - Admin/Nurse (Full), Analytic_Manager (View) and Doctor (View) */}
                           {(userRole === "nurse" ||
                             userRole === "admin" ||
                             userRole === "analytic_manager" ||
                             userRole === "doctor") && (
                             <button
                               onClick={() => {
                                 setIsAfastamentosOpen(false);
                                 setIsAbonoOpen(false);
                                 router.push("/afastamentos/maternidade");
                               }}
                               className={`w-full flex items-center gap-1.5 py-1.5 pl-9 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[10px] uppercase tracking-wider whitespace-nowrap is-active-folder ${pathname.startsWith("/afastamentos/maternidade") ? "bg-pink-500/20 text-pink-300 font-medium shadow-md border-l-2 border-pink-500/50" : "text-white/40 font-medium hover:bg-white/5 hover:text-white"}`}
                             >
                               <Baby className="w-3 h-3 shrink-0" />
                               <span>Lic. Maternidade</span>
                             </button>
                           )}
                        </div>
                      )}

                      {(userRole === "admin" ||
                        userRole === "analytic_manager" ||
                        userRole === "doctor") && (
                        <div className="space-y-1">
                          <button className={`w-full flex items-center gap-1.5 p-2 pl-9 text-white/40 hover:bg-white/5 hover:text-white active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left font-medium text-[10px] uppercase tracking-wider whitespace-nowrap ${userRole === "doctor" ? "cursor-default" : "cursor-not-allowed opacity-50"}`}>
                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                            <span>Redução de Jornada</span>
                          </button>
                          <button className={`w-full flex items-center gap-1.5 p-2 pl-9 text-white/40 hover:bg-white/5 hover:text-white active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left font-medium text-[10px] uppercase tracking-wider whitespace-nowrap ${userRole === "doctor" ? "cursor-default" : "cursor-not-allowed opacity-50"}`}>
                            <FileSearch className="w-3.5 h-3.5 shrink-0" />
                            <span>Readaptação</span>
                          </button>
                        </div>
                      )}
                    </>
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
                className="w-full flex items-center justify-between p-3 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left font-medium text-xs uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20"
              >
                <div className="flex items-center gap-1.5">
                  <CloudDownload
                    className={`w-4 h-4 shrink-0 ${isSyncing ? "animate-bounce" : ""}`}
                  />
                  <span>Sincronização</span>
                </div>
                <span className="bg-amber-500 text-black text-[9px] px-1.5 py-0.5 font-medium rounded-none">
                  {pendingSyncs.length}
                </span>
              </button>
            </div>
          )}

          {(userRole === "admin" ||
            userRole === "nurse" ||
            userRole === "social_assistant" ||
            userRole === "analytic_manager" ||
            userRole === "doctor" ||
            pathname.includes("/afastamentos")) && (
            <div className="space-y-1">
                <button
                  onClick={handleToggleHistory}
                  className="w-full flex items-center justify-between p-3 text-white/70 hover:bg-white/5 hover:text-white active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left font-medium text-xs uppercase tracking-wider"
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
                      className={`w-full flex items-center gap-1.5 p-2 pl-9 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[10px] uppercase tracking-wider whitespace-nowrap ${isActive("/history") ? "text-white bg-white/5 font-medium" : "text-white/60 font-medium hover:text-white"}`}
                    >
                      <HistoryIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Log Principal</span>
                    </button>
                    <button
                      onClick={() => router.push("/analytics")}
                      className={`w-full flex items-center gap-1.5 p-2 pl-9 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[10px] uppercase tracking-wider whitespace-nowrap ${isActive("/analytics") ? "text-white bg-white/5 font-medium" : "text-white/60 font-medium hover:text-white"}`}
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
              className={`w-full flex items-center gap-1.5 p-3 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-xs uppercase tracking-wider whitespace-nowrap ${isActive("/archive") ? "bg-white/10 text-white font-medium shadow-sm border border-white/5" : "text-white/70 font-medium hover:bg-white/5 hover:text-white"}`}
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Arquivo Médico</span>
            </button>
          )}

          {(userRole === "admin" || userRole === "analytic_manager") && (
            <div className="space-y-1">
              <button
                onClick={handleToggleAdmin}
                className="w-full flex items-center justify-between p-3 text-white/70 hover:bg-white/5 hover:text-white active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left font-medium text-xs uppercase tracking-wider"
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
                    className={`w-full flex items-center gap-2 p-2.5 pl-9 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[10px] uppercase tracking-wider ${isActive("/users") ? "text-white bg-white/5 font-medium" : "text-white/50 font-medium hover:text-white"}`}
                  >
                    <UsersIcon className="w-3.5 h-3.5" />
                    <span>Gestão de Usuários</span>
                  </button>
                  <button
                    onClick={() => router.push("/deletion-requests")}
                    className={`w-full flex items-center gap-2 p-2.5 pl-9 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[10px] uppercase tracking-wider ${isActive("/deletion-requests") ? "text-white bg-white/5 font-medium" : "text-white/50 font-medium hover:text-white"}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Exclusões Pendentes</span>
                  </button>
                  <button
                    onClick={() => setShowGreetingsManager(true)}
                    className="w-full flex items-center gap-2 p-2.5 pl-9 text-white/50 hover:bg-white/5 hover:text-white active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left font-medium text-[10px] uppercase tracking-wider"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    <span>Boas-Vindas</span>
                  </button>
                  <button
                    onClick={() => setShowSyncModal(true)}
                    className={`w-full flex items-center justify-between p-2.5 pl-9 active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left text-[10px] uppercase tracking-wider ${pendingSyncs.length > 0 ? "text-amber-500 font-medium" : "text-white/50 font-medium hover:text-white"}`}
                  >
                    <div className="flex items-center gap-2">
                      <CloudDownload
                        className={`w-3.5 h-3.5 ${isSyncing ? "animate-bounce" : ""}`}
                      />
                      <span>Sincronizar Dados</span>
                    </div>
                    {pendingSyncs.length > 0 && (
                      <span className="bg-amber-500 text-black text-[8px] px-1 font-medium rounded-none">
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
            className="w-full flex items-center gap-1.5 p-2 text-white/30 hover:text-white active:scale-95 hover:scale-[1.08] transition-all duration-200 origin-left font-medium uppercase tracking-widest text-[10px]"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>

          <div className="pl-4 pb-6 flex flex-col pt-2">
            <p className="text-[10px] font-normal text-white/60 leading-none mb-1 text-left">
              Powered by
            </p>
            <p className="text-[18px] font-medium text-white leading-none tracking-[0.1em] text-left">
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
