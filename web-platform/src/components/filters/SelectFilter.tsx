"use client";
import React from "react";

interface Props {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    labelDefault?: string;
    className?: string;
    renderOption?: (opt: string) => React.ReactNode;
}

export default function SelectFilter({ value, onChange, options, labelDefault, className, renderOption }: Props) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${className || ''} h-10 px-4 bg-[#E8E8E8] border border-[#888] text-[10px] font-bold uppercase outline-none focus:border-[#1A3351] rounded-none`}
        >
            <option value="all">{labelDefault || 'SELECIONE'}</option>
            {options.filter(o => o !== 'all').map(opt => (
                <option key={opt} value={opt}>{renderOption ? renderOption(opt) : opt}</option>
            ))}
        </select>
    );
}
