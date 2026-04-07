"use client";

import { useActionState } from "react";
import { Button } from "@/app/ui/button";
import type { NewTaskState } from "@/app/lib/actions";
import { createBodealerTask } from "@/app/lib/actions";
import HandPicker from "@/app/ui/hand-picker";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-2 text-sm text-red-700">{errors.join(" ")}</p>;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-gray-200 bg-gray-50 p-4"
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className="mt-4">{children}</div>
    </details>
  );
}

function RestrictionBlock({
  title,
  prefix,
  defaultOpen = false,
}: {
  title: string;
  prefix: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-gray-200 bg-gray-50 p-4"
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500 transition-transform group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${prefix}.hcpMin`}
            className="block text-sm font-medium text-gray-900"
          >
            HCP min
          </label>
          <input
            id={`${prefix}.hcpMin`}
            name={`${prefix}.hcpMin`}
            type="number"
            min={0}
            max={37}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor={`${prefix}.hcpMax`}
            className="block text-sm font-medium text-gray-900"
          >
            HCP max
          </label>
          <input
            id={`${prefix}.hcpMax`}
            name={`${prefix}.hcpMax`}
            type="number"
            min={0}
            max={37}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor={`${prefix}.spadesMin`}
            className="block text-sm font-medium text-gray-900"
          >
            Spades min
          </label>
          <input
            id={`${prefix}.spadesMin`}
            name={`${prefix}.spadesMin`}
            type="number"
            min={0}
            max={13}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor={`${prefix}.spadesMax`}
            className="block text-sm font-medium text-gray-900"
          >
            Spades max
          </label>
          <input
            id={`${prefix}.spadesMax`}
            name={`${prefix}.spadesMax`}
            type="number"
            min={0}
            max={13}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor={`${prefix}.heartsMin`}
            className="block text-sm font-medium text-gray-900"
          >
            Hearts min
          </label>
          <input
            id={`${prefix}.heartsMin`}
            name={`${prefix}.heartsMin`}
            type="number"
            min={0}
            max={13}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor={`${prefix}.heartsMax`}
            className="block text-sm font-medium text-gray-900"
          >
            Hearts max
          </label>
          <input
            id={`${prefix}.heartsMax`}
            name={`${prefix}.heartsMax`}
            type="number"
            min={0}
            max={13}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor={`${prefix}.diamondsMin`}
            className="block text-sm font-medium text-gray-900"
          >
            Diamonds min
          </label>
          <input
            id={`${prefix}.diamondsMin`}
            name={`${prefix}.diamondsMin`}
            type="number"
            min={0}
            max={13}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor={`${prefix}.diamondsMax`}
            className="block text-sm font-medium text-gray-900"
          >
            Diamonds max
          </label>
          <input
            id={`${prefix}.diamondsMax`}
            name={`${prefix}.diamondsMax`}
            type="number"
            min={0}
            max={13}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor={`${prefix}.clubsMin`}
            className="block text-sm font-medium text-gray-900"
          >
            Clubs min
          </label>
          <input
            id={`${prefix}.clubsMin`}
            name={`${prefix}.clubsMin`}
            type="number"
            min={0}
            max={13}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor={`${prefix}.clubsMax`}
            className="block text-sm font-medium text-gray-900"
          >
            Clubs max
          </label>
          <input
            id={`${prefix}.clubsMax`}
            name={`${prefix}.clubsMax`}
            type="number"
            min={0}
            max={13}
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-gray-900">
        <input
          type="checkbox"
          name={`${prefix}.noSixCardSuit`}
          value="true"
          className="rounded border-gray-300"
        />
        No 6+ card suit
      </label>
    </details>
  );
}

export default function NewBoardForm() {
  const initialState: NewTaskState = { message: null, errors: {} };
  const [state, formAction, pending] = useActionState(
    createBodealerTask,
    initialState
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <CollapsibleSection title="Board info" defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-900"
            >
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
            <FieldError errors={state?.errors?.name} />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-900"
            >
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
            <FieldError errors={state?.errors?.description} />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Our hand" defaultOpen={true}>
        <p className="mt-1 text-sm text-gray-600">
          Click cards to build the hand. Example:{" "}
          <span className="font-mono">102 A1093 KJ2 A982</span>
        </p>

        <div className="mt-3">
          <HandPicker />
        </div>

        <FieldError errors={state?.errors?.hand} />
      </CollapsibleSection>

      <CollapsibleSection title="Restrictions" defaultOpen={false}>
        <div className="space-y-4">
          <RestrictionBlock
            title="Partner"
            prefix="partner"
            defaultOpen={false}
          />
          <RestrictionBlock title="LHO" prefix="lho" defaultOpen={false} />
          <RestrictionBlock title="RHO" prefix="rho" defaultOpen={false} />
        </div>
      </CollapsibleSection>

      <Section title="Run settings">
        <label
          htmlFor="boardsK"
          className="block text-sm font-medium text-gray-900"
        >
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
            className="w-32 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">e.g. 10 = 10,000</span>
        </div>

        <FieldError errors={state?.errors?.boardsK} />
      </Section>

      {state?.message ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
          {state?.message}
          <FieldError errors={state?.errors?.general} />
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Starting…" : "Start"}
        </Button>
      </div>
    </form>
  );
}
