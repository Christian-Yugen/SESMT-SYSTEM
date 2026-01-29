"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Lock, User, ShieldCheck } from "lucide-react";

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

            {/* CARD DE LOGIN - SEGUINDO ESTILO DA TELA INICIAL */}
            <div className="w-full max-w-md bg-white border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col scale-[1.02] transition-transform">

                {/* HEADER DO CARD (CINZA COM LINHA VERMELHA) */}
                <div className="bg-[#B0B0B0] p-8 border-b-[6px] border-[#E31E24] flex flex-col items-center gap-4">
                    <div className="relative w-48 h-16">
                        <Image src="/images/logo_white.png" alt="Logo" fill className="object-contain brightness-0 opacity-80" priority />
                    </div>
                    <div className="flex flex-col items-center">
                        <h1 className="text-2xl font-black text-[#1A3351] uppercase tracking-tighter">
                            {mode === "login" ? "Acesso ao Sistema" : "Novo Cadastro"}
                        </h1>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">SESMT SYSTEM v1.2</p>
                    </div>
                </div>

                {/* FORMULÁRIO */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">

                    {error && (
                        <div className="p-3 bg-red-100 border-l-4 border-[#E31E24] text-[11px] font-black text-[#E31E24] uppercase tracking-wider animate-shake">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-100 border-l-4 border-[#28A745] text-[11px] font-black text-[#28A745] uppercase tracking-wider">
                            {success}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    placeholder="SEU@EMAIL.GOV.BR"
                                    className="w-full px-10 py-3 bg-[#E8E8E8] border border-[#888] shadow-inner font-bold text-sm text-[#1A3351] outline-none focus:border-[#E31E24] uppercase transition-colors"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full px-10 py-3 bg-[#E8E8E8] border border-[#888] shadow-inner font-bold text-sm text-[#1A3351] outline-none focus:border-[#E31E24] transition-colors"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {mode === "signup" && (
                            <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className={`w-full px-10 py-3 bg-[#E8E8E8] border shadow-inner font-bold text-sm text-[#1A3351] outline-none transition-colors ${password !== confirmPassword && confirmPassword ? 'border-red-400' : 'border-[#888] focus:border-[#E31E24]'}`}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold mt-1 pl-1 italic">* Digite a mesma senha para confirmar</p>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#1A3351] text-white font-black uppercase tracking-widest text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 border-b-4 border-blue-950"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Activity className="w-5 h-5" />
                                <span>{mode === "login" ? "Autenticar Usuário" : "Finalizar Cadastro"}</span>
                            </>
                        )}
                    </button>

                    <div className="pt-4 border-t border-slate-100 flex flex-col gap-3 items-center">
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === "login" ? "signup" : "login");
                                setError(null);
                                setSuccess(null);
                            }}
                            className="text-[10px] font-black text-[#1A3351] hover:text-[#E31E24] uppercase tracking-widest transition-colors underline underline-offset-4"
                        >
                            {mode === "login" ? "Não tem conta? Cadastre-se aqui" : "Já tem conta? Clique para entrar"}
                        </button>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] text-center max-w-[200px]">
                            Acesso restrito para servidores autorizados do departamento SESMT
                        </p>
                    </div>
                </form>

                {/* FOOTER DO CARD */}
                <div className="bg-[#E8E8E8] py-4 border-t border-slate-200">
                    <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest">
                        Powered by <span className="font-black text-slate-600">UXBRAS®</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
