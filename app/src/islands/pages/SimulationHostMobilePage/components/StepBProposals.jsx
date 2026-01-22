/**
 * Step B: Receive Proposals Component
 * Creates test guest and 3 proposals
 */

export default function StepBProposals({
  isActive,
  isCompleted,
  isLoading,
  onAction,
  disabled,
  selectedRentalType,
  onSelectRentalType,
  rentalTypes,
  testProposals,
  testGuestName
}) {
  let containerClass = 'simulation-host-step';
  if (isActive) containerClass += ' simulation-host-step--active';
  if (isCompleted) containerClass += ' simulation-host-step--completed';
  if (disabled && !isCompleted) containerClass += ' simulation-host-step--disabled';

  return (
    <div className={containerClass}>
      <div className="simulation-host-step__header">
        <span className="simulation-host-step__number">B</span>
        <h3 className="simulation-host-step__title">Receive Proposals</h3>
        {isCompleted && <span className="simulation-host-step__check">✓</span>}
      </div>

      <p className="simulation-host-step__description">
        A test guest will submit 3 proposals (Weekly, Monthly, Nightly) to your selected listing.
      </p>

      {!isCompleted && isActive && (
        <>
          <div className="simulation-host-rental-types">
            <label className="simulation-host-rental-types__label">
              Primary Rental Type:
            </label>
            <div className="simulation-host-rental-types__options">
              {rentalTypes.map((type) => (
                <button
                  key={type.id}
                  className={`simulation-host-rental-type ${selectedRentalType === type.id ? 'simulation-host-rental-type--selected' : ''}`}
                  onClick={() => onSelectRentalType(type.id)}
                  disabled={isLoading}
                >
                  <span className="simulation-host-rental-type__label">{type.label}</span>
                  <span className="simulation-host-rental-type__description">{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            className="simulation-host-step__button"
            onClick={onAction}
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <>
                <span className="simulation-host-spinner"></span>
                Creating Guest & Proposals...
              </>
            ) : (
              '📥 Receive Test Proposals'
            )}
          </button>
        </>
      )}

      {isCompleted && testProposals.length > 0 && (
        <div className="simulation-host-step__completed-message">
          <p>✅ Received {testProposals.length} proposals from {testGuestName}</p>
          <ul className="simulation-host-proposal-list">
            {testProposals.map((proposal, index) => (
              <li key={proposal.proposalId || index}>
                {proposal.rentalType}: {proposal.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
