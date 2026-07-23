import Link from "next/link";
import { formatEventDate, listEvents } from "../lib/api";

export default function Home() {
  const events = listEvents();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffd6a5_0%,#fff4dd_28%,#f7fbff_62%,#ffffff_100%)] px-6 py-10 text-neutral-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <section className="grid gap-8 rounded-[2.5rem] bg-[#111827] px-8 py-10 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.22em] text-amber-200">Fast MVP reservations</p>
            <h1 className="max-w-2xl text-5xl font-semibold tracking-tight sm:text-6xl">
              Launch the first live reservation flow before building the rest of the platform.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-300">
              This MVP keeps inventory validation in the Azure Function and uses a tiny in-repo event catalog so the web app can ship without a new read API.
            </p>
          </div>

          <div className="grid gap-4 self-end rounded-4xl bg-white/6 p-6 backdrop-blur-sm sm:grid-cols-3 lg:grid-cols-1">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Flow</p>
              <p className="mt-2 text-lg font-medium text-white">Landing page to reservation success</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Backend</p>
              <p className="mt-2 text-lg font-medium text-white">Existing Azure Function only</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Inventory</p>
              <p className="mt-2 text-lg font-medium text-white">Cosmos-enforced seat counts</p>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Public events</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Choose an event to reserve</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-neutral-600">
              The catalog is static for speed. Reservation success still depends on live inventory in Cosmos when the form is submitted.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {events.map((event) => (
              <article key={event.id} className="flex h-full flex-col rounded-4xl border border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.08)]">
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">{formatEventDate(event.startIso)}</p>
                  <h3 className="text-2xl font-semibold tracking-tight text-neutral-950">{event.title}</h3>
                  <p className="text-sm font-medium text-neutral-700">{event.venue} · {event.city}</p>
                  <p className="text-base leading-7 text-neutral-600">{event.blurb}</p>
                </div>

                <div className="mt-6 space-y-4">
                  <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">{event.availabilityMessage}</p>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-neutral-900">{event.priceLabel}</span>
                    <Link
                      href={`/events/${event.slug}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-950 px-5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-950 hover:text-white"
                    >
                      View event
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
