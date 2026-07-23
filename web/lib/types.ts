export type EventCatalogEntry = {
	id: string;
	slug: string;
	title: string;
	venue: string;
	city: string;
	startIso: string;
	blurb: string;
	description: string;
	capacityLabel: string;
	priceLabel: string;
	availabilityMessage: string;
};

export type EventListItem = Pick<
	EventCatalogEntry,
	| "id"
	| "slug"
	| "title"
	| "venue"
	| "city"
	| "startIso"
	| "blurb"
	| "priceLabel"
	| "availabilityMessage"
>;

export type ReserveSeatResponse = {
	message: string;
	reservationId: string;
	eventId: string;
	seatsReserved: number;
	remainingSeats: number;
};
