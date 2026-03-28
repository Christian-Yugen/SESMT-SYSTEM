"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Lock,
  ShieldCheck,
  Activity,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // O Supabase detecta automaticamente os tokens de recuperação na URL
    // e estabelece a sessão. Vamos monitorar isso.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Recuperação de senha iniciada");
      }
      if (!session && event !== "INITIAL_SESSION") {
        setError(
          "Sessão de recuperação inválida ou expirada. Por favor, solicite um novo e-mail.",
        );
      }
    });

    // Verificação inicial
    const checkInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        // Aguarda um pouco pois o Supabase pode levar um momento para processar a URL
        setTimeout(async () => {
          const {
            data: { session: retrySession },
          } = await supabase.auth.getSession();
          if (!retrySession) {
            setError(
              "Sessão de recuperação inválida ou expirada. Por favor, solicite um novo e-mail.",
            );
          }
        }, 1000);
      }
    };

    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("As senhas digitadas não coincidem.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError("Erro ao atualizar senha: " + error.message);
      setLoading(false);
    } else {
      setSuccess(
        "Senha atualizada com sucesso! Redirecionando para o login...",
      );
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#D3D3D3] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[420px] bg-white border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col transition-all">
        {/* HEADER */}
        <div className="bg-[#B0B0B0] p-8 border-b-[6px] border-[#E31E24] flex flex-col items-center gap-6">
          <div className="w-full h-24 flex items-center justify-center">
            <Image
              src="/images/logo.png"
              alt="PREFEITURA"
              width={200}
              height={80}
              className="h-20 w-auto object-contain"
            />
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h1 className="text-3xl font-bold text-[#1A3351] uppercase tracking-tight leading-none">
              SESMT SYSTEM
            </h1>
            <div className="h-1 w-20 bg-[#E31E24] rounded-none mx-auto mt-0.5"></div>
            <p className="text-[11px] font-bold text-[#1A3351]/70 uppercase tracking-[0.4em] mt-1.5">
              Nova Senha
            </p>
          </div>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          {error && (
            <div className="p-2.5 bg-red-100 border-l-4 border-[#E31E24] text-[11px] font-bold text-[#E31E24] uppercase tracking-wider">
              {error}
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-green-100 border-l-4 border-[#28A745] text-[11px] font-bold text-[#28A745] uppercase tracking-wider">
              {success}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 leading-none text-left block">
                Nova Senha
              </label>
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

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 leading-none text-left block">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className={`w-full px-10 py-2.5 bg-[#E8E8E8] border shadow-inner font-bold text-sm text-[#1A3351] outline-none transition-colors ${password !== confirmPassword && confirmPassword ? "border-red-400" : "border-[#888] focus:border-[#E31E24]"}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1A3351] transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full py-3.5 bg-[#1A3351] text-white font-bold uppercase tracking-widest text-xs shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-blue-950 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Activity className="w-5 h-5" />
                <span>Atualizar Senha</span>
              </>
            )}
          </button>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5 items-center">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-[9px] font-bold text-[#1A3351] hover:text-[#E31E24] uppercase tracking-[0.2em] transition-colors underline underline-offset-4"
            >
              Voltar para o Login
            </button>
          </div>
        </form>

        <div className="bg-[#E8E8E8] p-5 py-4 border-t border-slate-200 flex justify-center">
          <div className="flex flex-col items-start w-fit">
            <p className="text-[10px] font-normal text-slate-400 leading-none mb-1 text-left">
              Powered by
            </p>
            <p className="text-[18px] font-bold text-slate-600 leading-none tracking-[0.1em] text-left">
              UXBRAS
              <span className="text-[12px] font-normal align-top ml-0.5 tracking-normal">
                ®
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
