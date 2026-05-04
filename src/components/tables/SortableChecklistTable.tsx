'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  reorderChecklistItemsAction,
  toggleChecklistItemActiveAction,
} from '@/server/actions/checklist';

type ChecklistItem = {
  id: string;
  label: string;
  description: string | null;
};

function SortableRow({ item }: { item: ChecklistItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [toggling, startToggle] = useTransition();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function handleDeactivate() {
    startToggle(async () => {
      await toggleChecklistItemActiveAction(item.id);
    });
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-50')}>
      <TableCell className="w-10">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{item.label}</TableCell>
      <TableCell className="max-w-xs truncate text-muted-foreground">
        {item.description ?? '-'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Link
            href={`/rh/checklist/${item.id}/editar`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Pencil className="size-3.5" />
            Editar
          </Link>
          <Button variant="outline" size="sm" disabled={toggling} onClick={handleDeactivate}>
            {toggling ? 'Desativando...' : 'Desativar'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

type SortableChecklistTableProps = {
  initialItems: ChecklistItem[];
};

export function SortableChecklistTable({ initialItems }: SortableChecklistTableProps) {
  const [items, setItems] = useState(initialItems);
  const [, startReorder] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    const previous = items; // snapshot before optimistic update

    setItems(reordered);
    startReorder(async () => {
      const result = await reorderChecklistItemsAction(reordered.map((item) => item.id));
      if (result.error) {
        setItems(previous); // rollback on failure
      }
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Label</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Nenhum item ativo. Crie o primeiro item.
                </TableCell>
              </TableRow>
            ) : (
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((item) => (
                  <SortableRow key={item.id} item={item} />
                ))}
              </SortableContext>
            )}
          </TableBody>
        </Table>
      </div>
    </DndContext>
  );
}
