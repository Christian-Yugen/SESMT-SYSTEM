"use client";
import React from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function SearchField({
  value,
  onChange,
  placeholder,
  onKeyDown,
}: Readonly<Props>) {
  return (
    <input
      type="text"
      placeholder={placeholder || "Pesquisar..."}
      className="w-full h-10 px-10 border border-[#888] shadow-inner text-xs font-bold bg-[#E8E8E8] outline-none uppercase rounded-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}
