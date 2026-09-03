/**
 * F-01 read-only input port. In production this reads a Projection sourced
 * from the Malino Connector (appointment.scheduled / working_hours.defined
 * events, per V1_EVENT_CONTRACT_CATALOG.md group A). Wave 1 provides an
 * in-memory implementation (the Mock specified in this Feature's
 * ACCEPTANCE_AND_MOCKS.md) — real wiring to Foundation/Connector comes later
 * without this interface changing.
 */
export interface WorkingHoursSlot {
  eventId: string;
  organizationId: string;
  entityRef: string; // Core Entity ref for the clinic/resource this slot belongs to
  date: string; // ISO date, e.g. '2026-08-20'
  totalMinutes: number;
  historicalAverageBookedMinutes: number; // average booked minutes for this date/resource historically
}

export interface AppointmentSlot {
  eventId: string;
  organizationId: string;
  entityRef: string;
  date: string;
  bookedMinutes: number;
}

export interface CapacityRepository {
  getWorkingHoursForOpenDates(organizationId: string): Promise<WorkingHoursSlot[]>;
  getBookedMinutesForDate(organizationId: string, date: string, entityRef: string): Promise<number>;
}

export class InMemoryCapacityRepository implements CapacityRepository {
  constructor(
    private readonly workingHours: WorkingHoursSlot[] = [],
    private readonly appointments: AppointmentSlot[] = [],
  ) {}

  async getWorkingHoursForOpenDates(organizationId: string): Promise<WorkingHoursSlot[]> {
    return this.workingHours.filter((w) => w.organizationId === organizationId);
  }

  async getBookedMinutesForDate(
    organizationId: string,
    date: string,
    entityRef: string,
  ): Promise<number> {
    return this.appointments
      .filter(
        (a) => a.organizationId === organizationId && a.date === date && a.entityRef === entityRef,
      )
      .reduce((sum, a) => sum + a.bookedMinutes, 0);
  }
}
