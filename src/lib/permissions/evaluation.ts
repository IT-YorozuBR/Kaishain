import type { CurrentUser } from '@/lib/auth';
import type { employees } from '@/lib/db/schema';

type EmployeeForPermission = Pick<typeof employees.$inferSelect, 'managerId'>;

export function canEvaluate(user: CurrentUser, employee: EmployeeForPermission) {
  if (user.role === 'ADMIN') {
    return true;
  }

  return user.role === 'GESTOR' && employee.managerId === user.id;
}
