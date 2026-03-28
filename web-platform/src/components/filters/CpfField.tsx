"use client";
import React from "react";

interface Props {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}

export default function CpfField({ value, onChange, placeholder }: Props) {
    return (
        <input
            type="text"
            placeholder={placeholder || "CPF..."}
            className="w-full h-10 px-10 border border-[#888] shadow-inner text-xs font-bold bg-[#E8E8E8] outline-none uppercase rounded-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}
