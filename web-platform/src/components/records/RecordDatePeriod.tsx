"use client";

interface RecordDatePeriodProps {
  startLabel?: string;
  endLabel?: string;
  startDate: string;
  endDate: string;
  endColor?: string;
  situacao?: string;
  finalizadoDate?: string;
}

export default function RecordDatePeriod({
  startLabel = "Último Início",
  endLabel = "Próximo Término",
  startDate,
  endDate,
  endColor = "text-slate-800",
  situacao,
  finalizadoDate,
}: Readonly<RecordDatePeriodProps>) {
  const effectiveEndColor =
    situacao === "FINALIZADO" ? "text-slate-400" : endColor;

  return (
    <div className="hidden md:flex flex-col items-end shrink-0">
      <div className="flex items-stretch bg-slate-100/80 px-3 h-10 border border-slate-200">
        <div className="flex flex-col justify-center leading-none min-w-[72px]">
          <p className="text-[7px] font-bold text-slate-400 uppercase mb-0.5 tracking-widest">
            {startLabel}
          </p>
          <p className="text-[10px] font-bold text-[#1A3351] tabular-nums">
            {startDate}
          </p>
        </div>
        <div className="w-px bg-slate-200 mx-2.5 my-1.5" />
        <div className="flex flex-col justify-center leading-none min-w-[72px]">
          <p className="text-[7px] font-bold text-slate-400 uppercase mb-0.5 tracking-widest">
            {endLabel}
          </p>
          <p
            className={`text-[10px] font-bold tabular-nums ${effectiveEndColor}`}
          >
            {endDate}
          </p>
        </div>
      </div>

      {situacao === "FINALIZADO" && finalizadoDate && (
        <div className="mt-1 w-full">
          <p className="text-[10px] text-slate-500 font-bold uppercase text-right">
            Finalizado em {finalizadoDate}
          </p>
        </div>
      )}
    </div>
  );
}
