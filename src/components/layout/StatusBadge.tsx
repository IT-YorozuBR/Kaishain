import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusBadgeProps = {
  status: 'active' | 'inactive' | 'success' | 'pending' | 'danger';
  children: React.ReactNode;
  className?: string;
};

const styles = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  inactive: 'border-slate-200 bg-slate-100 text-slate-600',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(styles[status], className)}>
      {children}
    </Badge>
  );
}
