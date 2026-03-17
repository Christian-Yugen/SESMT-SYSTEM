"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, Lock, User, ShieldCheck, Activity, Eye, EyeOff } from "lucide-react";
import { syncProfile } from "@/lib/auth-utils";

export default function LoginPage() {
    const [mode, setMode] = useState<"login" | "signup" | "forgot-password">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.push("/");
            }
        };
        checkUser();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (mode === "signup") {
            if (password !== confirmPassword) {
                setError("As senhas digitadas não coincidem.");
                setLoading(false);
                return;
            }

            if (!email.toLowerCase().endsWith("@treslagoas.ms.gov.br")) {
                setError("Apenas e-mails corporativos @treslagoas.ms.gov.br são permitidos.");
                setLoading(false);
                return;
            }
        }

        if (mode === "login") {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError("Credenciais inválidas. Verifique seu e-mail e senha.");
                setLoading(false);
            } else if (data.session) {
                // Sincroniza o perfil imediatamente após o login
                await syncProfile(data.session);
                router.push("/");
            }
        } else if (mode === "signup") {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login`
                }
            });

            if (error) {
                setError(error.message === "User already registered" ? "Este e-mail já possui cadastro." : error.message);
                setLoading(false);
            } else {
                // Se o Supabase já criou a sessão (e-mail confirmation off), sincroniza e entra
                if (data.session) {
                    await syncProfile(data.session);
                    setSuccess("Cadastro realizado com sucesso! Redirecionando...");
                    setTimeout(() => router.push("/"), 1500);
                } else {
                    setSuccess("Cadastro realizado! Verifique seu e-mail para confirmar seu acesso (se necessário) e faça login.");
                    setMode("login");
                    setPassword("");
                    setConfirmPassword("");
                    setLoading(false);
                }
            }
        } else if (mode === "forgot-password") {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                setError("Erro ao enviar e-mail de recuperação: " + error.message);
                setLoading(false);
            } else {
                setSuccess("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#D3D3D3] flex items-center justify-center p-4 font-sans">

            {/* CARD DE LOGIN - CABEÇALHO AMPLIADO COM LOGO MAIOR */}
            <div className="w-full max-w-[420px] bg-white border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col transition-all">

                {/* HEADER DO CARD - GRANDE E IMPACTANTE */}
                <div className="bg-[#B0B0B0] p-8 border-b-[6px] border-[#E31E24] flex flex-col items-center gap-6">
                    <div className="w-full h-24 flex items-center justify-center">
                        <img src="/images/logo.png" alt="PREFEITURA" className="h-20 w-auto object-contain" />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center">
                        <h1 className="text-3xl font-black text-[#1A3351] uppercase tracking-tight leading-none">
                            SESMT SYSTEM
                        </h1>
                        <div className="h-1 w-20 bg-[#E31E24] rounded-full mx-auto mt-0.5"></div>
                        <p className="text-[11px] font-black text-[#1A3351]/70 uppercase tracking-[0.4em] mt-1.5">
                            {mode === "login" ? "Acesso ao Sistema" : mode === "signup" ? "Novo Cadastro" : "Recuperar Senha"}
                        </p>
                    </div>
                </div>

                {/* FORMULÁRIO COM FONTES MELHORADAS */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">

                    {error && (
                        <div className="p-2.5 bg-red-100 border-l-4 border-[#E31E24] text-[11px] font-black text-[#E31E24] uppercase tracking-wider animate-shake">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-2.5 bg-green-100 border-l-4 border-[#28A745] text-[11px] font-black text-[#28A745] uppercase tracking-wider">
                            {success}
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none text-left block">E-mail Corporativo</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    placeholder="SEU@EMAIL.GOV.BR"
                                    className="w-full px-10 py-2.5 bg-[#E8E8E8] border border-[#888] shadow-inner font-bold text-sm text-[#1A3351] outline-none focus:border-[#E31E24] uppercase transition-colors"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                                />
                            </div>
                            {mode === "signup" && (
                                <p className="text-[9px] text-slate-400 font-bold mt-1 pl-1 italic">
                                    * Use apenas seu e-mail @treslagoas.ms.gov.br
                                </p>
                            )}
                        </div>

                        {mode !== "forgot-password" && (
                            <div className="space-y-1">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none text-left block">Senha de Acesso</label>
                                    {mode === "login" && (
                                        <button
                                            type="button"
                                            onClick={() => setMode("forgot-password")}
                                            className="text-[9px] font-bold text-[#E31E24] hover:underline"
                                        >
                                            ESQUECI A SENHA
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        className="w-full px-10 py-2.5 bg-[#E8E8E8] border border-[#888] shadow-inner font-bold text-sm text-[#1A3351] outline-none focus:border-[#E31E24] transition-colors"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1A3351] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === "signup" && (
                            <div className="space-y-1 animate-in slide-in-from-top-1 duration-300">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none text-left block">Confirmar Senha</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        className={`w-full px-10 py-2.5 bg-[#E8E8E8] border shadow-inner font-bold text-sm text-[#1A3351] outline-none transition-colors ${password !== confirmPassword && confirmPassword ? 'border-red-400' : 'border-[#888] focus:border-[#E31E24]'}`}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1A3351] transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-[#1A3351] text-white font-black uppercase tracking-widest text-xs shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-blue-950"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Activity className="w-5 h-5" />
                                <span>
                                    {mode === "login" 
                                        ? "Entrar no Sistema" 
                                        : mode === "signup" 
                                            ? "Finalizar Cadastro" 
                                            : "Enviar E-mail de Recuperação"}
                                </span>
                            </>
                        )}
                    </button>

                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5 items-center">
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === "login" ? "signup" : "login");
                                setError(null);
                                setSuccess(null);
                            }}
                            className="text-[9px] font-black text-[#1A3351] hover:text-[#E31E24] uppercase tracking-[0.2em] transition-colors underline underline-offset-4"
                        >
                            {mode === "login" ? "Cadastrar Novo Usuário" : "Voltar para o Login"}
                        </button>
                    </div>
                </form>

                {/* FOOTER DO CARD - PADRÃO OFICIAL UXBRAS */}
                <div className="bg-[#E8E8E8] p-5 py-4 border-t border-slate-200 flex justify-center">
                    <div className="flex flex-col items-start w-fit">
                        <p className="text-[10px] font-normal text-slate-400 leading-none mb-1 text-left">Powered by</p>
                        <p className="text-[18px] font-black text-slate-600 leading-none tracking-[0.1em] text-left">
                            UXBRAS<span className="text-[12px] font-normal align-top ml-0.5 tracking-normal">®</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
