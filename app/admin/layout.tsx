"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  History,
  UtensilsCrossed,
  MessageSquare,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Order Queue", icon: ClipboardList },
  { href: "/admin/history", label: "Order History", icon: History },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
];

function NavLinks({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onClose }: { onClose?: () => void }) {
  return (
    <div className="mt-auto space-y-1">
      <div className="flex items-center justify-between rounded-lg px-3 py-1">
        <span className="text-xs font-medium text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>
      <Link
        href="/chat"
        onClick={onClose}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        Customer Chat
      </Link>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <Link href="/chat" className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-600 text-lg text-primary-foreground shadow-sm">
            🍔
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Juicito</p>
            <p className="text-[11px] text-muted-foreground">Admin Console</p>
          </div>
        </Link>
        <NavLinks pathname={pathname} />
        <SidebarFooter />
      </aside>

      {/* ── Mobile top bar ───────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <Link href="/chat" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-orange-600 text-sm text-primary-foreground shadow-sm">
            🍔
          </div>
          <span className="text-sm font-bold">Juicito Admin</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ── Mobile drawer ────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-card p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 px-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-600 text-lg text-primary-foreground shadow-sm">
                  🍔
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">Juicito</p>
                  <p className="text-[11px] text-muted-foreground">Admin Console</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks pathname={pathname} onClose={() => setMobileOpen(false)} />
            <SidebarFooter onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Page content ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 pt-[4.5rem] md:p-6 md:pt-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
