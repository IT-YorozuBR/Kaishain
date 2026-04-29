import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center py-10 text-center">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-md">{description}</CardDescription>
        {action ? <div className="pt-2">{action}</div> : null}
      </CardHeader>
    </Card>
  );
}
