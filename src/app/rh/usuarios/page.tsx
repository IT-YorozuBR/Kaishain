import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { UsersTable } from '@/components/tables/UsersTable';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentUser } from '@/lib/auth';
import { USER_ROLES, listUsersFiltersSchema } from '@/lib/validators/user';
import { cn } from '@/lib/utils';
import { listUsers } from '@/server/services/users';

const PAGE_SIZE = 20;

type UsuariosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildPageHref(params: Record<string, string | string[] | undefined>, page: number) {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const current = Array.isArray(value) ? value[0] : value;
    if (current && key !== 'page') {
      nextParams.set(key, current);
    }
  }

  nextParams.set('page', String(page));
  return `/rh/usuarios?${nextParams.toString()}`;
}

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'GESTOR') {
    redirect('/avaliar');
  }

  const params = await searchParams;
  const parsed = listUsersFiltersSchema.safeParse({
    search: getParam(params, 'search'),
    role: getParam(params, 'role'),
    status: getParam(params, 'status'),
    page: getParam(params, 'page'),
  });

  const filters = parsed.success
    ? parsed.data
    : { status: 'active' as const, page: 1, search: undefined, role: undefined };
  const active =
    filters.status === 'inactive' ? false : filters.status === 'all' ? undefined : true;
  const page = Math.max(filters.page, 1);

  const { rows, total } = await listUsers(user, {
    search: filters.search,
    role: filters.role,
    active,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="Usuarios"
          description="Gerencie usuarios de acesso ao sistema."
          actions={
            <Link href="/rh/usuarios/novo" className={cn(buttonVariants(), 'shrink-0')}>
              Novo usuario
            </Link>
          }
        />

        <form
          action="/rh/usuarios"
          method="get"
          className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4 shadow-sm"
        >
          <div className="grid gap-1">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              name="search"
              placeholder="Nome ou e-mail"
              defaultValue={filters.search ?? ''}
              className="w-56"
            />
          </div>

          {user.role === 'ADMIN' ? (
            <div className="grid gap-1">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                defaultValue={filters.role ?? ''}
                className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
              >
                <option value="">Todas</option>
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid gap-1">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={filters.status}
              className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
            >
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="all">Todos</option>
            </select>
          </div>

          <button type="submit" className={buttonVariants()}>
            Filtrar
          </button>
        </form>

        <UsersTable users={rows} />

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Pagina {page} de {totalPages} - {total} usuario(s)
          </span>
          <div className="flex gap-2">
            <Link
              href={buildPageHref(params, Math.max(page - 1, 1))}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                page <= 1 && 'pointer-events-none opacity-50',
              )}
              aria-disabled={page <= 1}
            >
              Anterior
            </Link>
            <Link
              href={buildPageHref(params, Math.min(page + 1, totalPages))}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                page >= totalPages && 'pointer-events-none opacity-50',
              )}
              aria-disabled={page >= totalPages}
            >
              Proxima
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
