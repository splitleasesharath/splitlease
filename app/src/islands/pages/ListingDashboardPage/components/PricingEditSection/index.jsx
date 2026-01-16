import { useCallback, useRef } from 'react';
import { PricingForm } from './PricingForm.jsx';
import { NightlyRateDisplay } from './NightlyRateDisplay.jsx';
import { PricingPreview } from './PricingPreview.jsx';
import { usePricingLogic } from './usePricingLogic.js';
import InformationalText from '../../../../shared/InformationalText';
import { ConfirmModal } from '../../../HostOverviewPage/components/HostOverviewModals';

/**
 * PricingEditSection - Main component for pricing and lease style editing
 * Orchestrates sub-components and handles save/close logic
 */
export default function PricingEditSection({
  listing,
  onClose,
  onSave,
  isOwner = true,
}) {
  // Use custom hook for all pricing logic
  const pricingLogic = usePricingLogic(listing, isOwner);

  const {
    selectedRentalType,
    selectedNights,
    damageDeposit,
    maintenanceFee,
    nightlyPricing,
    weeksOffered,
    weeklyRate,
    monthlyRate,
    minNights,
    maxNights,
    isSaving,
    setIsSaving,
    activeInfoTooltip,
    setActiveInfoTooltip,
    showConfirmModal,
    setShowConfirmModal,
    hasChanges,
    isFormValid,
    getSaveButtonText,
    getChangeSummary,
    handleInfoClick,
    calculateNightlyRate,
    formatCurrency,
  } = pricingLogic;

  // Refs for informational text tooltips
  const pricingControlsInfoRef = useRef(null);

  // Informational text content
  const infoContent = {
    pricingControls: {
      title: 'Pricing Controls',
      content: 'Set your pricing preferences for your listing based on your chosen rental style. Your rates determine how much you earn when guests book.',
    },
  };

  // Handle back button click - show confirmation if changes exist
  const handleBackClick = useCallback(() => {
    console.log('🔙 Back button clicked, hasChanges:', hasChanges);
    if (hasChanges) {
      console.log('📋 Showing confirmation modal');
      setShowConfirmModal(true);
    } else {
      console.log('✅ No changes, closing directly');
      onClose();
    }
  }, [hasChanges, onClose, setShowConfirmModal]);

  // Handle confirmation modal confirm (discard changes)
  const handleConfirmDiscard = useCallback(() => {
    setShowConfirmModal(false);
    onClose();
  }, [onClose, setShowConfirmModal]);

  // Handle save
  const handleSave = async () => {
    if (!isFormValid()) return;

    setIsSaving(true);
    try {
      // Get change summary before saving
      const changeSummary = getChangeSummary();

      const updates = {
        'rental type': selectedRentalType,
        '💰Damage Deposit': damageDeposit,
        '💰Cleaning Cost / Maintenance Fee': maintenanceFee,
        'Minimum Nights': minNights,
        'Maximum Nights': maxNights,
      };

      // Add rental-type specific fields
      if (selectedRentalType === 'Nightly') {
        // Convert night IDs to JS 0-indexed format (0=Sunday...6=Saturday)
        // Database now uses JS standard format natively
        const nightMap = {
          sunday: 0,
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6,
        };
        const dayIndices = selectedNights.map((n) => nightMap[n]).sort((a, b) => a - b);
        updates['Days Available (List of Days)'] = JSON.stringify(dayIndices);

        // Preserve 1-night rate if available (primarily set during listing creation)
        // Note: Dashboard currently doesn't have UI to edit 1-night rate directly
        if (listing?.pricing?.[1]) {
          updates['💰Nightly Host Rate for 1 night'] = listing.pricing[1];
        }

        // Calculate nightly rates from weekly compensation
        updates['💰Nightly Host Rate for 2 nights'] = calculateNightlyRate(
          nightlyPricing[2],
          2
        );
        updates['💰Nightly Host Rate for 3 nights'] = calculateNightlyRate(
          nightlyPricing[3],
          3
        );
        updates['💰Nightly Host Rate for 4 nights'] = calculateNightlyRate(
          nightlyPricing[4],
          4
        );
        updates['💰Nightly Host Rate for 5 nights'] = calculateNightlyRate(
          nightlyPricing[5],
          5
        );
        updates['💰Nightly Host Rate for 6 nights'] = calculateNightlyRate(
          nightlyPricing[5],
          6
        ); // Use 5-night rate for 6
        updates['💰Nightly Host Rate for 7 nights'] = calculateNightlyRate(
          nightlyPricing[5],
          7
        ); // Use 5-night rate for 7
      } else if (selectedRentalType === 'Weekly') {
        updates['Weeks offered'] = weeksOffered;
        updates['💰Weekly Host Rate'] = weeklyRate;
      } else if (selectedRentalType === 'Monthly') {
        updates['💰Monthly Host Rate'] = monthlyRate;
      }

      await onSave(updates);

      // Show success toast with change summary
      const toastContent = changeSummary.length > 0
        ? changeSummary.slice(0, 3).join(' • ') + (changeSummary.length > 3 ? ` (+${changeSummary.length - 3} more)` : '')
        : 'Pricing settings saved';

      window.showToast?.({
        title: 'Pricing Updated!',
        content: toastContent,
        type: 'success'
      });

      onClose();
    } catch (error) {
      console.error('Error saving pricing:', error);
      window.showToast?.({
        title: 'Save Failed',
        content: 'Failed to save pricing. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pricing-edit-overlay">
      <div className="pricing-edit-container">
        {/* Header with back button */}
        <div className="pricing-edit-header">
          <button className="pricing-edit-back" onClick={handleBackClick}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Go Back</span>
          </button>
        </div>

        {/* Main content */}
        <div className="pricing-edit-content">
          {/* Title and Save */}
          <div className="pricing-edit-title-row">
            <div className="pricing-edit-title">
              <h2>Pricing Controls</h2>
              <button
                ref={pricingControlsInfoRef}
                className="pricing-edit-help"
                onClick={handleInfoClick('pricingControls')}
                aria-label="Learn more about pricing controls"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            </div>
            <button
              className={`pricing-edit-save ${!isFormValid() ? 'pricing-edit-save--disabled' : ''}`}
              onClick={handleSave}
              disabled={!isFormValid() || isSaving}
            >
              {isSaving ? 'Saving...' : getSaveButtonText()}
            </button>
          </div>

          {/* Pricing Form - All inputs */}
          <PricingForm pricingLogic={pricingLogic} isOwner={isOwner} />

          {/* Nightly Rate Display - Shows rate calculations */}
          {selectedRentalType === 'Nightly' && (
            <NightlyRateDisplay
              nightlyPricing={nightlyPricing}
              calculateNightlyRate={calculateNightlyRate}
              formatCurrency={formatCurrency}
              selectedNights={selectedNights}
            />
          )}

          {/* Pricing Preview - Summary before save */}
          <PricingPreview
            selectedRentalType={selectedRentalType}
            damageDeposit={damageDeposit}
            maintenanceFee={maintenanceFee}
            nightlyPricing={nightlyPricing}
            weeklyRate={weeklyRate}
            monthlyRate={monthlyRate}
            formatCurrency={formatCurrency}
            calculateNightlyRate={calculateNightlyRate}
            selectedNights={selectedNights}
          />

          {/* Bottom Save Button - More intuitive placement */}
          <div className="pricing-edit-footer">
            <button
              className={`pricing-edit-save-bottom ${!isFormValid() ? 'pricing-edit-save-bottom--disabled' : ''}`}
              onClick={handleSave}
              disabled={!isFormValid() || isSaving}
            >
              {isSaving ? 'Saving...' : getSaveButtonText()}
            </button>
          </div>
        </div>
      </div>

      {/* Informational Text Tooltip for main section */}
      <InformationalText
        isOpen={activeInfoTooltip === 'pricingControls'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={pricingControlsInfoRef}
        title={infoContent.pricingControls.title}
        content={infoContent.pricingControls.content}
      />

      {/* Unsaved changes confirmation modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDiscard}
        title="Discard Changes?"
        message="Are you sure you want to go back? Any unsaved changes will be lost."
        confirmText="Yes, Discard"
        cancelText="No, Keep Editing"
        variant="danger"
      />
    </div>
  );
}
