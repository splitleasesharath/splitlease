/**
 * PriceEditModal - Modal for editing listing pricing fields
 *
 * Allows editing of all pricing-related fields:
 * - Unit markup
 * - Weekly/monthly host rates
 * - Nightly rates (2-7 nights)
 * - Cleaning cost, damage deposit
 * - Price override, extra charges
 */

export default function PriceEditModal({
  listing,
  formData,
  onChange,
  onSave,
  onClose,
  isLoading,
}) {
  const handleInputChange = (field) => (e) => {
    onChange(field, e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="price-edit-modal__overlay" onClick={onClose}>
      <div className="price-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="price-edit-modal__header">
          <h2 className="price-edit-modal__title">Edit Pricing</h2>
          <button
            className="price-edit-modal__close-btn"
            onClick={onClose}
            type="button"
            aria-label="Close modal"
          >
            {/* Protocol: Close icon 32x32, strokeWidth 2.5 */}
            <svg
              className="price-edit-modal__close-icon"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="price-edit-modal__listing-info">
          <span className="price-edit-modal__listing-name">{listing.name}</span>
          <span className="price-edit-modal__listing-location">
            {listing.borough}{listing.neighborhood ? `, ${listing.neighborhood}` : ''}
          </span>
        </div>

        <form className="price-edit-modal__form" onSubmit={handleSubmit}>
          {/* Main Rates Section */}
          <div className="price-edit-modal__section">
            <h3 className="price-edit-modal__section-title">Main Rates</h3>
            <div className="price-edit-modal__grid">
              <div className="price-edit-modal__field">
                <label className="price-edit-modal__label" htmlFor="weeklyHostRate">
                  Weekly Host Rate
                </label>
                <div className="price-edit-modal__input-wrapper">
                  <span className="price-edit-modal__currency">$</span>
                  <input
                    id="weeklyHostRate"
                    type="number"
                    className="price-edit-modal__input"
                    value={formData.weeklyHostRate}
                    onChange={handleInputChange('weeklyHostRate')}
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              <div className="price-edit-modal__field">
                <label className="price-edit-modal__label" htmlFor="monthlyHostRate">
                  Monthly Host Rate
                </label>
                <div className="price-edit-modal__input-wrapper">
                  <span className="price-edit-modal__currency">$</span>
                  <input
                    id="monthlyHostRate"
                    type="number"
                    className="price-edit-modal__input"
                    value={formData.monthlyHostRate}
                    onChange={handleInputChange('monthlyHostRate')}
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              <div className="price-edit-modal__field">
                <label className="price-edit-modal__label" htmlFor="unitMarkup">
                  Unit Markup
                </label>
                <div className="price-edit-modal__input-wrapper">
                  <span className="price-edit-modal__currency">$</span>
                  <input
                    id="unitMarkup"
                    type="number"
                    className="price-edit-modal__input"
                    value={formData.unitMarkup}
                    onChange={handleInputChange('unitMarkup')}
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              <div className="price-edit-modal__field">
                <label className="price-edit-modal__label" htmlFor="priceOverride">
                  Price Override
                </label>
                <div className="price-edit-modal__input-wrapper">
                  <span className="price-edit-modal__currency">$</span>
                  <input
                    id="priceOverride"
                    type="number"
                    className="price-edit-modal__input price-edit-modal__input--highlight"
                    value={formData.priceOverride}
                    onChange={handleInputChange('priceOverride')}
                    min="0"
                    step="1"
                    placeholder="Leave empty for none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Nightly Rates Section */}
          <div className="price-edit-modal__section">
            <h3 className="price-edit-modal__section-title">Nightly Host Rates</h3>
            <div className="price-edit-modal__grid price-edit-modal__grid--compact">
              {[2, 3, 4, 5, 6, 7].map((nights) => (
                <div key={nights} className="price-edit-modal__field">
                  <label className="price-edit-modal__label" htmlFor={`nightlyRate${nights}`}>
                    {nights} nights
                  </label>
                  <div className="price-edit-modal__input-wrapper">
                    <span className="price-edit-modal__currency">$</span>
                    <input
                      id={`nightlyRate${nights}`}
                      type="number"
                      className="price-edit-modal__input"
                      value={formData[`nightlyRate${nights}`]}
                      onChange={handleInputChange(`nightlyRate${nights}`)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fees Section */}
          <div className="price-edit-modal__section">
            <h3 className="price-edit-modal__section-title">Fees & Deposits</h3>
            <div className="price-edit-modal__grid">
              <div className="price-edit-modal__field">
                <label className="price-edit-modal__label" htmlFor="cleaningCost">
                  Cleaning Cost
                </label>
                <div className="price-edit-modal__input-wrapper">
                  <span className="price-edit-modal__currency">$</span>
                  <input
                    id="cleaningCost"
                    type="number"
                    className="price-edit-modal__input"
                    value={formData.cleaningCost}
                    onChange={handleInputChange('cleaningCost')}
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              <div className="price-edit-modal__field">
                <label className="price-edit-modal__label" htmlFor="damageDeposit">
                  Damage Deposit
                </label>
                <div className="price-edit-modal__input-wrapper">
                  <span className="price-edit-modal__currency">$</span>
                  <input
                    id="damageDeposit"
                    type="number"
                    className="price-edit-modal__input"
                    value={formData.damageDeposit}
                    onChange={handleInputChange('damageDeposit')}
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              <div className="price-edit-modal__field">
                <label className="price-edit-modal__label" htmlFor="extraCharges">
                  Extra Charges
                </label>
                <div className="price-edit-modal__input-wrapper">
                  <span className="price-edit-modal__currency">$</span>
                  <input
                    id="extraCharges"
                    type="number"
                    className="price-edit-modal__input"
                    value={formData.extraCharges}
                    onChange={handleInputChange('extraCharges')}
                    min="0"
                    step="1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="price-edit-modal__actions">
            <button
              type="button"
              className="price-edit-modal__btn price-edit-modal__btn--cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="price-edit-modal__btn price-edit-modal__btn--save"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
