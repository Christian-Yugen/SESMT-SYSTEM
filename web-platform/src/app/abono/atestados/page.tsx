"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Menu } from "lucide-react";

export default function AtestadosPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#D3D3D3] text-black font-sans overflow-x-hidden">
      <Sidebar
        userRole={null}
        userName="Usuário"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <main className="flex-1">
        <section className="bg-[#B0B0B0] px-4 py-3 border-b-[6px] border-[#E31E24]">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold uppercase text-[#1A3351]">
              Atestados
            </h1>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-[#1A3351] rounded-none text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </section>

        <div className="p-6">
          <div className="bg-white p-6 border-2 border-slate-300 shadow-xl">
            <p className="text-sm font-bold text-slate-500">
              Página de Atestados — em desenvolvimento.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
