import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarCheck,
  ClipboardList,
  History,
  LayoutDashboard,
  UserCog,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { signOut } from '@/auth';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import type { UserRole } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

type AppShellProps = {
  children: React.ReactNode;
};

type MobileItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: UserRole[];
};

const mobileItems: MobileItem[] = [
  { href: '/avaliar', label: 'Avaliar', icon: CalendarCheck, roles: ['GESTOR', 'ADMIN'] },
  { href: '/historico', label: 'Histórico', icon: History, roles: ['GESTOR'] },
  { href: '/funcionarios', label: 'Funcionários', icon: Users, roles: ['RH', 'ADMIN'] },
  { href: '/rh/usuarios', label: 'Usuários', icon: UserCog, roles: ['RH', 'ADMIN'] },
  { href: '/rh/historico', label: 'Histórico', icon: ClipboardList, roles: ['RH', 'ADMIN'] },
  {
    href: '/rh/avaliacoes-do-dia',
    label: 'Avaliações do dia',
    icon: LayoutDashboard,
    roles: ['RH', 'ADMIN'],
  },
];

export async function AppShell({ children }: AppShellProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  async function signOutAction() {
    'use server';

    await signOut({ redirectTo: '/login' });
  }

  return (
    <div className="bg-background min-h-dvh lg:flex">
      <AppSidebar user={user} signOutAction={signOutAction} />
      <div className="min-w-0 flex-1">
        <div className="border-sidebar-border bg-sidebar text-sidebar-foreground border-b px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground grid size-9 place-items-center rounded-lg text-sm font-semibold">
                K
              </div>
              <div>
                <div className="text-sm font-semibold">Kaishain</div>
                <div className="text-sidebar-foreground/60 text-xs">{user.role}</div>
              </div>
            </div>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                Sair
              </Button>
            </form>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {mobileItems
              .filter((item) => item.roles.includes(user.role))
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'text-sidebar-foreground/75 flex shrink-0 items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                  </Link>
                );
              })}
          </nav>
        </div>
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
