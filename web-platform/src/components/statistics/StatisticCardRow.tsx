"use client";

import type { StatisticCardRowProps } from "./types";

const COLUMN_CLASS_MAP: Record<
  NonNullable<StatisticCardRowProps["columns"]>,
  string
> = {
  2: "grid-cols-1 min-[390px]:grid-cols-2",
  3: "grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-5",
  6: "grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-6",
};

export default function StatisticCardRow({
  children,
  columns = 4,
  className = "",
}: Readonly<StatisticCardRowProps>) {
  const columnsClass = COLUMN_CLASS_MAP[columns];

  return (
    <div className={`StatisticCardRow grid ${columnsClass} gap-2 lg:gap-3 ${className}`}>
      {children}
    </div>
  );
}
