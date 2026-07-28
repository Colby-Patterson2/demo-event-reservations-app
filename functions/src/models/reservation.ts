export interface ReserveSeatRequest {
  eventId: string;
  fullName: string;
  email: string;
  seats: number;
  notes?: string;
}

export interface ReservationRecord {
  id: string;
  type: "reservation";
  eventId: string;
  fullName: string;
  email: string;
  seats: number;
  notes?: string;
  createdAt: string;
}

export interface EventInventory {
  id: string;
  type: "eventInventory";
  eventId: string;
  title: string;
  totalSeats: number;
  availableSeats: number;
  createdAt: string;
  updatedAt: string;
}
