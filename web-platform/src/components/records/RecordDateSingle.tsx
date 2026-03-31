"use client";

interface RecordDateSingleProps {
  label?: string;
  date: string;
  expanded?: boolean;
}

export default function RecordDateSingle({
  label = "Registro",
  date,
  expanded = false,
}: Readonly<RecordDateSingleProps>) {
  return (
    <div className="flex flex-col items-end leading-none shrink-0">
      <span className="text-[8px] font-bold text-slate-400 uppercase mb-0.5 tracking-widest">
        {label}
      </span>
      <span
        className={`font-bold text-slate-800 transition-all tabular-nums ${
          expanded ? "text-sm" : "text-[10px] lg:text-xs"
        }`}
      >
        {date}
      </span>
    </div>
  );
}
