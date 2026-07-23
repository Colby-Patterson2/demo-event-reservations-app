export type ReserveSeatRequest = {
  eventId: string;
  fullName: string;
  email: string;
  seats: number;
  notes?: string;
};

export type ReservationRecord = {
  id: string;
  type: "reservation";
  eventId: string;
  fullName: string;
  email: string;
  seats: number;
  notes?: string;
  createdAt: string;
};

export type EventInventory = {
  id: string;
  type: "eventInventory";
  eventId: string;
  title: string;
  totalSeats: number;
  availableSeats: number;
  updatedAt: string;
};
