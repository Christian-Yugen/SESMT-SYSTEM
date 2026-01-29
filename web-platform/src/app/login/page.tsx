"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Erro ao fazer login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A111C] p-4 relative overflow-hidden">
            {/* Elementos Decorativos de Fundo */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-500">
                {/* Card de Login com Glassmorphism */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                    <div className="flex flex-col items-center mb-10">
                        <div className="relative w-48 h-20 mb-4">
                            <Image
                                src="/images/logo_white.png"
                                alt="SESMT Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <div className="h-1 w-12 bg-[#E31E24] rounded-full mb-4" />
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">SESMT - System</h1>
                        <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold">Acesso ao Sistema</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-200 text-sm animate-shake">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[#E31E24] transition-colors" />
                                <input
                                    type="email"
                                    placeholder="Seu E-mail"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-[#E31E24] focus:bg-white/10 transition-all placeholder:text-white/20"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[#E31E24] transition-colors" />
                                <input
                                    type="password"
                                    placeholder="Sua Senha"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-[#E31E24] focus:bg-white/10 transition-all placeholder:text-white/20"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#E31E24] hover:bg-[#ff2d34] text-white font-black py-4 rounded-2xl shadow-xl shadow-red-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Entrar no Sistema
                                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 flex justify-center">
                        <div className="flex flex-col items-start">
                            <p className="text-[14px] font-normal text-white/60 leading-none mb-1 text-left">Powered by</p>
                            <p className="text-[18px] font-black text-white leading-none tracking-[0.1em] text-left">
                                UXBRAS<span className="text-[12px] font-normal align-top ml-0.5 tracking-normal">®</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
