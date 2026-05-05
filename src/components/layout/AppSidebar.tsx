'use client';

import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Network,
  UserCog,
  Users,
} from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';

import { Button } from '@/components/ui/button';
import type { UserRole } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

type AppSidebarProps = {
  user: {
    name?: string | null;
    email?: string | null;
    role: UserRole;
  };
  signOutAction: () => Promise<void>;
};

type SidebarItemConfig = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: UserRole[];
};

const items: SidebarItemConfig[] = [
  { href: '/avaliar', label: 'Avaliar', icon: CalendarCheck, roles: ['GESTOR', 'ADMIN'] },
  { href: '/historico', label: 'Histórico', icon: History, roles: ['GESTOR'] },
  { href: '/funcionarios', label: 'Funcionários', icon: Users, roles: ['RH', 'ADMIN'] },
  { href: '/rh/departamentos', label: 'Departamentos', icon: Network, roles: ['RH', 'ADMIN'] },
  { href: '/rh/usuarios', label: 'Usuários', icon: UserCog, roles: ['RH', 'ADMIN'] },
  { href: '/rh/checklist', label: 'Checklist', icon: ListChecks, roles: ['RH', 'ADMIN'] },
  { href: '/rh/historico', label: 'Avaliações', icon: ClipboardList, roles: ['RH', 'ADMIN'] },
  {
    href: '/rh/avaliacoes-do-dia',
    label: 'Avaliações do dia',
    icon: LayoutDashboard,
    roles: ['RH', 'ADMIN'],
  },
];

export function AppSidebar({ user, signOutAction }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return localStorage.getItem('kaishain-sidebar-collapsed') === 'true';
  });

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem('kaishain-sidebar-collapsed', String(next));
      return next;
    });
  }

  const visibleItems = useMemo(
    () => items.filter((item) => item.roles.includes(user.role)),
    [user.role],
  );

  return (
    <aside
      className={cn(
        'border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 hidden h-dvh shrink-0 border-r shadow-xl shadow-slate-950/10 transition-[width] duration-200 lg:flex lg:flex-col',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      <div className="border-sidebar-border flex h-16 items-center gap-3 border-b px-4">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold">
          K
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Kaishain</div>
            <div className="text-sidebar-foreground/65 truncate text-xs">Gestão interna</div>
          </div>
        ) : null}
      </div>

      <nav className="grid gap-1 px-3 py-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
                active && 'bg-sidebar-accent text-sidebar-accent-foreground',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-sidebar-border mt-auto grid gap-3 border-t p-3">
        {!collapsed ? (
          <div className="min-w-0 rounded-lg bg-white/5 p-3">
            <div className="truncate text-sm font-medium">{user.name ?? user.email}</div>
            <div className="text-sidebar-foreground/60 truncate text-xs">{user.role}</div>
          </div>
        ) : null}
        <div className={cn('flex gap-2', collapsed && 'grid')}>
          <Button
            type="button"
            variant="ghost"
            size={collapsed ? 'icon-sm' : 'sm'}
            className="text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
            {!collapsed ? 'Recolher' : null}
          </Button>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size={collapsed ? 'icon-sm' : 'sm'}
              className="text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Sair"
            >
              <LogOut />
              {!collapsed ? 'Sair' : null}
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
