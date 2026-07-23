import Link from "next/link";
import { notFound } from "next/navigation";
import ReservationForm from "../../../components/ReservationForm";
import { formatEventDate, getEventById } from "../../../lib/api";

type EventPageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function EventPage({ params }: Readonly<EventPageProps>) {
	const { id } = await params;
	const event = getEventById(id);

	if (!event) {
		notFound();
	}

	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,#f3efe7_0%,#fffaf4_46%,#ffffff_100%)] px-6 py-10 text-neutral-950">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
				<Link href="/" className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500 transition hover:text-neutral-900">
					Back to events
				</Link>

				<section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
					  <div className="space-y-8 rounded-4xl bg-[#101828] px-8 py-10 text-white shadow-[0_30px_80px_rgba(16,24,40,0.22)]">
						<div className="space-y-4">
							<p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Featured event</p>
							<h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">{event.title}</h1>
							<p className="max-w-2xl text-lg leading-8 text-slate-300">{event.description}</p>
						</div>

						<dl className="grid gap-4 sm:grid-cols-2">
							<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
								<dt className="text-xs uppercase tracking-[0.18em] text-slate-400">When</dt>
								<dd className="mt-2 text-lg font-medium text-white">{formatEventDate(event.startIso)}</dd>
							</div>
							<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
								<dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Where</dt>
								<dd className="mt-2 text-lg font-medium text-white">{event.venue}</dd>
								<dd className="text-sm text-slate-300">{event.city}</dd>
							</div>
							<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
								<dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Capacity</dt>
								<dd className="mt-2 text-lg font-medium text-white">{event.capacityLabel}</dd>
							</div>
							<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
								<dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Price</dt>
								<dd className="mt-2 text-lg font-medium text-white">{event.priceLabel}</dd>
							</div>
						</dl>

						<div className="rounded-3xl bg-cyan-300 px-5 py-4 text-sm font-medium text-cyan-950">
							{event.availabilityMessage}
						</div>
					</div>

					<div className="space-y-6">
						<ReservationForm eventId={event.id} eventTitle={event.title} />
						<div className="rounded-4xl border border-black/10 bg-[#f6f3ee] p-6 text-sm leading-7 text-neutral-700">
							Reservations call the existing backend directly. If the seeded Cosmos inventory is exhausted, the API returns a conflict and the form shows that error without leaving the page.
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
