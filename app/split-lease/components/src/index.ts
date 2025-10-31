/**
 * SplitLease Component Library
 *
 * Barrel export for all components following Atomic Design principles.
 *
 * Usage:
 *   import { Button, SearchBar, Header } from '@components'
 */

// ============================================================================
// Existing Components
// ============================================================================
export { default as SearchScheduleSelector } from './SearchScheduleSelector';
export { Footer } from './Footer';
export { Header } from './Header';

export { ListingImageGrid } from './ListingImageGrid';
export type { ListingImage, ListingImageGridProps } from './ListingImageGrid';

export { ProposalMenu } from './ProposalMenu';
export type {
  WeekDay,
  PricingInfo,
  ReservationSpanOption,
  HostPreferences,
  ProposalMenuProps,
  ProposalData,
} from './ProposalMenu';

// ============================================================================
// Atomic Components
// ============================================================================
// TODO: Export atomic components as they are created
// export { Button } from './atomic/Button';
// export { Input } from './atomic/Input';
// export { Icon } from './atomic/Icon';
// export { Text } from './atomic/Text';

// ============================================================================
// Molecular Components
// ============================================================================
export { ListingCard } from './molecules/ListingCard';
export type { ListingCardProps, Listing } from './molecules/ListingCard';

// ============================================================================
// Organism Components
// ============================================================================
export { HeroSection } from './organisms/HeroSection';
export type { HeroSectionProps } from './organisms/HeroSection';

export { BenefitsSection } from './organisms/BenefitsSection';
export type { BenefitsSectionProps, Benefit } from './organisms/BenefitsSection';

export { ScheduleTypeCards } from './organisms/ScheduleTypeCards';
export type { ScheduleTypeCardsProps, ScheduleType } from './organisms/ScheduleTypeCards';

export { PopularListings } from './organisms/PopularListings';
export type { PopularListingsProps } from './organisms/PopularListings';

export { SupportSection } from './organisms/SupportSection';
export type { SupportSectionProps, SupportOption } from './organisms/SupportSection';

// ============================================================================
// Template Components
// ============================================================================
// TODO: Export template components as they are created
// export { MainLayout } from './templates/MainLayout';
// export { DashboardLayout } from './templates/DashboardLayout';

// Component library version
export const version = '0.1.0';


