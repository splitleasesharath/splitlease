/**
 * Represents a day of the week for weekly schedule
 */
export interface WeekDay {
  id: string;
  label: string;
  index: number;
}

/**
 * Pricing information for the proposal
 */
export interface PricingInfo {
  perNight: number;
  fourWeekRent?: number;
  reservationTotal?: number;
}

/**
 * Reservation span option
 */
export interface ReservationSpanOption {
  value: number;
  label: string;
}

/**
 * Host preferences for the listing
 */
export interface HostPreferences {
  minWeeks: number;
  maxWeeks: number;
  idealDays?: number;
}

/**
 * Props for the ProposalMenu component
 */
export interface ProposalMenuProps {
  pricing: PricingInfo;
  hostPreferences: HostPreferences;
  onProposalChange?: (proposal: ProposalData) => void;
  className?: string;
  initialMoveInDate?: string;
  initialSelectedDays?: number[];
  initialReservationSpan?: number;
}

/**
 * Complete proposal data
 */
export interface ProposalData {
  moveInDate: string;
  strictMoveIn: boolean;
  selectedDays: number[];
  reservationSpan: number;
  customWeeks?: number;
  fourWeekRent: number;
  reservationTotal: number;
}
