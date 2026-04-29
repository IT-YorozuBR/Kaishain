import { cache } from 'react';

import { auth } from '@/auth';
import type { UserRole } from '@/lib/db/schema';

export type CurrentUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
});
