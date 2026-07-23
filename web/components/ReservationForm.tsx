"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { reserveSeatAction, type ReservationActionState } from "../app/events/[id]/actions";

const initialState: ReservationActionState = {
	ok: false,
	message: "",
};

function SubmitButton() {
	const { pending } = useFormStatus();

	return (
		<button
			type="submit"
			disabled={pending}
			className="inline-flex min-h-12 items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
		>
			{pending ? "Submitting..." : "Reserve seats"}
		</button>
	);
}

type ReservationFormProps = {
	eventId: string;
	eventTitle: string;
};

export default function ReservationForm({ eventId, eventTitle }: Readonly<ReservationFormProps>) {
	const action = reserveSeatAction.bind(null, eventId);
	const [state, formAction, pending] = useActionState(action, initialState);

	return (
		<form action={formAction} className="space-y-5 rounded-4xl border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.08)]">
			<div className="space-y-2">
				<h2 className="text-xl font-semibold text-neutral-950">Reserve seats</h2>
				<p className="text-sm leading-6 text-neutral-600">
					Submit once for {eventTitle}. Inventory is checked live when the reservation request reaches the backend.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<label className="space-y-2 text-sm font-medium text-neutral-800">
					<span>Full name</span>
					<input
						type="text"
						name="fullName"
						autoComplete="name"
						required
						disabled={pending}
						className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-base text-neutral-950 outline-none transition focus:border-neutral-400"
					/>
				</label>

				<label className="space-y-2 text-sm font-medium text-neutral-800">
					<span>Email</span>
					<input
						type="email"
						name="email"
						autoComplete="email"
						required
						disabled={pending}
						className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-base text-neutral-950 outline-none transition focus:border-neutral-400"
					/>
				</label>
			</div>

			<div className="grid gap-4 sm:grid-cols-[140px_1fr]">
				<label className="space-y-2 text-sm font-medium text-neutral-800">
					<span>Seats</span>
					<input
						type="number"
						name="seats"
						min={1}
						max={6}
						defaultValue={1}
						required
						disabled={pending}
						className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-base text-neutral-950 outline-none transition focus:border-neutral-400"
					/>
				</label>

				<label className="space-y-2 text-sm font-medium text-neutral-800">
					<span>Notes</span>
					<textarea
						name="notes"
						rows={4}
						disabled={pending}
						className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-base text-neutral-950 outline-none transition focus:border-neutral-400"
						placeholder="Accessibility, arrival timing, or seating notes"
					/>
				</label>
			</div>

			{state.message ? (
				<div
					className={state.ok ? "rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" : "rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900"}
				>
					<p>{state.message}</p>
					{state.ok && state.reservationId ? (
						<p className="mt-1 text-xs uppercase tracking-[0.18em] text-emerald-700">
							Confirmation {state.reservationId}
						</p>
					) : null}
				</div>
			) : null}

			<div className="flex items-center justify-between gap-4">
				<p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
					{pending ? "Submitting reservation..." : "Secure reservation request"}
				</p>
				<SubmitButton />
			</div>
		</form>
	);
}
