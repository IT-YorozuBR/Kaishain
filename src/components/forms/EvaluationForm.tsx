'use client';

import { Minus, Plus, Save } from 'lucide-react';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { evaluateEmployee, type EvaluationFormState } from '@/server/actions/evaluations';

type ChecklistItem = {
  id: string;
  label: string;
  description: string | null;
};

type ChecklistResult = {
  checklistItemId: string;
  checked: boolean;
};

type EvaluationFormProps = {
  employeeId: string;
  initialScore?: number;
  initialNote?: string | null;
  checklistItems: ChecklistItem[];
  checklistResults: ChecklistResult[];
};

const initialState: EvaluationFormState = {};

export function EvaluationForm({
  employeeId,
  initialScore = 0,
  initialNote,
  checklistItems,
  checklistResults,
}: EvaluationFormProps) {
  const [state, formAction, pending] = useActionState(evaluateEmployee, initialState);
  const [score, setScore] = useState(initialScore);
  const checkedChecklistItems = new Set(
    checklistResults.filter((result) => result.checked).map((result) => result.checklistItemId),
  );

  function updateScore(nextScore: number) {
    setScore(Math.min(10, Math.max(0, nextScore)));
  }

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="employeeId" value={employeeId} />

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Checklist do dia</legend>
        <div className="grid gap-3">
          {checklistItems.map((item) => (
            <label
              key={item.id}
              className="bg-card flex gap-3 rounded-lg border p-3 text-sm shadow-sm"
            >
              <input type="hidden" name="checklistItemId" value={item.id} />
              <input
                type="checkbox"
                name="checkedChecklistItemId"
                value={item.id}
                defaultChecked={checkedChecklistItems.has(item.id)}
                className="accent-primary mt-1 size-4"
              />
              <span className="grid gap-1">
                <span className="font-medium">{item.label}</span>
                {item.description ? (
                  <span className="text-muted-foreground">{item.description}</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.checklistResults ? (
          <p className="text-destructive text-sm">{state.fieldErrors.checklistResults[0]}</p>
        ) : null}
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="score">Nota</Label>
        <div className="flex max-w-48 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => updateScore(score - 1)}
          >
            <Minus />
          </Button>
          <Input
            id="score"
            name="score"
            type="number"
            min={0}
            max={10}
            value={score}
            onChange={(event) => updateScore(Number(event.target.value))}
            className="text-center"
            aria-invalid={Boolean(state.fieldErrors?.score)}
            required
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => updateScore(score + 1)}
          >
            <Plus />
          </Button>
        </div>
        {state.fieldErrors?.score ? (
          <p className="text-destructive text-sm">{state.fieldErrors.score[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="note">Observacao</Label>
        <textarea
          id="note"
          name="note"
          defaultValue={initialNote ?? ''}
          rows={5}
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-28 w-full rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Registre contexto importante sobre a avaliacao do dia."
          aria-invalid={Boolean(state.fieldErrors?.note)}
        />
        {state.fieldErrors?.note ? (
          <p className="text-destructive text-sm">{state.fieldErrors.note[0]}</p>
        ) : null}
      </div>

      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
      {state.success ? <p className="text-muted-foreground text-sm">{state.success}</p> : null}

      <Button type="submit" className="w-fit" disabled={pending}>
        <Save data-icon="inline-start" />
        {pending ? 'Salvando...' : 'Salvar avaliacao'}
      </Button>
    </form>
  );
}
