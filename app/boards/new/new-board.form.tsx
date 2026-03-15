'use client';

import { useActionState } from 'react';
import {Button} from '@/app/ui/button';
import type { NewTaskState } from '@/app/lib/actions';
import { createBodealerTask } from '@/app/lib/actions';
import HandPicker from '@/app/ui/hand-picker';

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-2 text-sm text-red-700">{errors.join(' ')}</p>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function NewBoardForm() {
  const initialState: NewTaskState = { message: null, errors: {} };
  const [state, formAction, pending] = useActionState(createBodealerTask, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <Section title="Board info">
     <div className="space-y-4">
      <div>
      <label htmlFor="name" className="block text-sm font-medium text-gray-900">
        Name
      </label>
      <input
        id="name"
        name="name"
        type="text"
        defaultValue=""
        placeholder="For example: 4H slam try after weak two"
        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
      <FieldError errors={state.errors.name} />
    </div>

    <div>
      <label htmlFor="description" className="block text-sm font-medium text-gray-900">
        Description
      </label>
      <textarea
        id="description"
        name="description"
        rows={3}
        defaultValue=""
        placeholder="Optional notes about the bidding, lead problem, assumptions, etc."
        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
      <FieldError errors={state.errors.description} />
    </div>
  </div>
      </Section>

      <Section title="Deal">
        <label className="block text-sm font-medium text-gray-900">North hand</label>
          <p className="mt-1 text-sm text-gray-600">
            Click cards to build the hand. Example: <span className="font-mono">102 A1093 KJ2 A982</span>
          </p>

        <div className="mt-3">
          <HandPicker />
        </div>

        <FieldError errors={state.errors.hand} />
      </Section>

      <Section title="Run settings">
        <label htmlFor="boardsK" className="block text-sm font-medium text-gray-900">
          Boards (thousands)
        </label>

        <div className="mt-2 flex items-center gap-3">
          <input
            id="boardsK"
            name="boardsK"
            type="number"
            min={1}
            max={200}
            defaultValue={10}
            className="w-32 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm
                       outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">e.g. 10 = 10,000</span>
        </div>

        <FieldError errors={state.errors.boardsK} />
      </Section>

      {state.message ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
          {state.message}
          <FieldError errors={state.errors.general} />
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Starting…' : 'Start'}
        </Button>
      </div>
    </form>
  );
}
