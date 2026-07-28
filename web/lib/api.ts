import { EventCatalogEntry, EventListItem } from "./types";

const eventCatalog: EventCatalogEntry[] = [
	{
		id: "harbor-jazz-night",
		slug: "harbor-jazz-night",
		title: "Harbor Jazz Night",
		venue: "Pier 48 Listening Room",
		city: "Seattle, WA",
		startIso: "2026-08-14T19:30:00-07:00",
		blurb: "Small-room jazz set with reserved seating and a post-show vinyl pop-up.",
		description:
			"A tight three-set evening built for an MVP launch: intimate room, assigned seating, and a simple reservation flow that is confirmed against live inventory when the form is submitted.",
		capacityLabel: "48 reserved seats",
		priceLabel: "$32 per seat",
		availabilityMessage:
			"Reservations are first-come, first-served. Live seat availability is confirmed when you submit.",
	},
	{
		id: "sunset-food-lab",
		slug: "sunset-food-lab",
		title: "Sunset Food Lab",
		venue: "Glasshouse Test Kitchen",
		city: "Portland, OR",
		startIso: "2026-08-22T18:00:00-07:00",
		blurb: "Chef-led tasting session with limited communal seating.",
		description:
			"A five-course experimental dinner with one communal table, a short intro from the chef, and a reservation cap that makes it easy to seed in Cosmos for launch week.",
		capacityLabel: "24 reserved seats",
		priceLabel: "$58 per seat",
		availabilityMessage:
			"Seats are limited and inventory is checked in real time during reservation submission.",
	},
	{
		id: "midnight-film-club",
		slug: "midnight-film-club",
		title: "Midnight Film Club",
		venue: "Northside Micro Cinema",
		city: "Austin, TX",
		startIso: "2026-09-03T21:00:00-05:00",
		blurb: "Late screening, director Q&A, and a deliberately tiny house.",
		description:
			"A cult-classic screening designed for the smallest viable production flow: one event page, one reservation form, and backend-enforced seat inventory.",
		capacityLabel: "36 reserved seats",
		priceLabel: "$18 per seat",
		availabilityMessage:
			"Availability can change quickly. Your seats are only held after the reservation API confirms success.",
	},
];

export function listEvents(): EventListItem[] {
	return eventCatalog as EventListItem[];
}

export function getEventById(id: string): EventCatalogEntry | undefined {
	return eventCatalog.find((event) => event.id === id || event.slug === id);
}

export function formatEventDate(startIso: string): string {
	return new Intl.DateTimeFormat("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(startIso));
}
