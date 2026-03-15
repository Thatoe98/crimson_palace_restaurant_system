"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Armchair, LayoutDashboard, UtensilsCrossed, Monitor, ChefHat, Package, QrCode, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Menu Admin", href: "/admin/menu", icon: UtensilsCrossed },
  { name: "QR Codes", href: "/admin/qr", icon: QrCode },
  { name: "POS", href: "/pos", icon: Monitor },
  { name: "Kitchen", href: "/kitchen", icon: ChefHat },
  { name: "Tables", href: "/tables", icon: Armchair },
  { name: "Inventory", href: "/inventory", icon: Package },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-64 flex-col bg-slate-900 text-white h-screen fixed left-0 top-0 z-50">
      <div className="p-6">
        <h1 className="text-xl font-bold text-[hsl(347,90%,46%)] font-sans tracking-tight">Crimson Palace</h1>
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-1",
                isActive
                  ? "bg-[hsl(347,90%,46%)] text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {link.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400">
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </div>
        <div className="mt-4 px-3 text-xs text-slate-500 font-mono">
            System: May 1, 2026
        </div>
      </div>
    </div>
  );
}
