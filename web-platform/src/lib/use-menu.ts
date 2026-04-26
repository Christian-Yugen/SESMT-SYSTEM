import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type { MenuConfig, MenuGroup, MenuItem, Role } from "./menu-types";
import menuConfig from "./menu-config";

export function useMenu(userRole: string | null) {
  const pathname = usePathname();

  const groups = useMemo<MenuGroup[]>(() => {
    // filter groups/items by role for UX only
    if (!userRole) return menuConfig.groups;
      return menuConfig.groups.map((g) => ({
      ...g,
      items: g.items.filter((it) => {
        if (!it.roles || it.roles.length === 0) return true;
        return userRole ? it.roles.includes(userRole as Role) : false;
      }),
    }));
  }, [userRole]);

  const isActive = (item: MenuItem) => {
    if (!item.path) return false;
    if (!pathname) return false;
    const mode = item.match || "exact";
    if (mode === "exact") return pathname === item.path;
    if (mode === "startsWith") return pathname.startsWith(item.path);
    try {
      const re = new RegExp(item.path as string);
      return re.test(pathname);
    } catch {
      return false;
    }
  };

  return { groups, isActive } as const;
}
