"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Lock, User, ShieldCheck, Activity } from "lucide-react";

export default function LoginPage() {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (mode === "signup" && password !== confirmPassword) {
            setError("As senhas digitadas não coincidem.");
            setLoading(false);
            return;
        }

        if (mode === "login") {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError("Credenciais inválidas. Verifique seu e-mail e senha.");
                setLoading(false);
            } else {
                router.push("/");
            }
        } else {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });

            if (error) {
                setError(error.message === "User already registered" ? "Este e-mail já possui cadastro." : error.message);
                setLoading(false);
            } else {
                setSuccess("Cadastro realizado! Você já pode entrar.");
                setMode("login");
                setPassword("");
                setConfirmPassword("");
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#D3D3D3] flex items-center justify-center p-4 font-sans">

            {/* CARD DE LOGIN - EQUILIBRIO ENTRE TAMANHO E VISIBILIDADE */}
            <div className="w-full max-w-[400px] bg-white border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col transition-all">

                {/* HEADER DO CARD */}
                <div className="bg-[#B0B0B0] p-4 border-b-[4px] border-[#E31E24] flex flex-col items-center gap-2">
                    <div className="relative w-56 h-16 drop-shadow-sm">
                        <Image
                            src="/images/logo.png"
                            alt="Logo Prefeitura"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="flex flex-col items-center">
                        <h1 className="text-xl font-black text-[#1A3351] uppercase tracking-tighter leading-none">
                            SESMT SYSTEM
                        </h1>
                        <p className="text-[9px] font-black text-[#1A3351]/60 uppercase tracking-[0.4em]">
                            {mode === "login" ? "Acesso ao Sistema" : "Novo Cadastro"}
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
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none text-left block">Senha de Acesso</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full px-10 py-2.5 bg-[#E8E8E8] border border-[#888] shadow-inner font-bold text-sm text-[#1A3351] outline-none focus:border-[#E31E24] transition-colors"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {mode === "signup" && (
                            <div className="space-y-1 animate-in slide-in-from-top-1 duration-300">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none text-left block">Confirmar Senha</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className={`w-full px-10 py-2.5 bg-[#E8E8E8] border shadow-inner font-bold text-sm text-[#1A3351] outline-none transition-colors ${password !== confirmPassword && confirmPassword ? 'border-red-400' : 'border-[#888] focus:border-[#E31E24]'}`}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
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
                                <span>{mode === "login" ? "Entrar no Sistema" : "Finalizar Cadastro"}</span>
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
                            {mode === "login" ? "Cadastrar Novo Operador" : "Voltar para o Login"}
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
