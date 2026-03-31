"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart } from "lucide-react";
import type { CidTrendPoint } from "./types";

interface CidClinicalTrendPanelProps {
  points: CidTrendPoint[];
  chapterLabel: string;
}

export default function CidClinicalTrendPanel({
  points,
  chapterLabel,
}: Readonly<CidClinicalTrendPanelProps>) {
  return (
    <section className="bg-white border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1A3351] flex items-center gap-2">
          <LineChart className="w-4 h-4" /> Tendência Clínica (Leve)
        </h4>
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {chapterLabel}
        </span>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <defs>
              <linearGradient id="cidOccurrences" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1A3351" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1A3351" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cidDays" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E31E24" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#E31E24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="competency"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 700, fill: "#7C8899" }}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: "#7C8899" }} />
            <Tooltip
              contentStyle={{
                borderRadius: "0px",
                border: "1px solid #e2e8f0",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            />
            <Area
              type="monotone"
              dataKey="occurrences"
              name="Ocorrências"
              stroke="#1A3351"
              strokeWidth={2}
              fill="url(#cidOccurrences)"
            />
            <Area
              type="monotone"
              dataKey="daysLost"
              name="Dias Perdidos"
              stroke="#E31E24"
              strokeWidth={2}
              fill="url(#cidDays)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
