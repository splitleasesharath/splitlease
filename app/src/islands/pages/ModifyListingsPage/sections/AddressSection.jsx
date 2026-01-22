/**
 * AddressSection - Space Snapshot section for address and property basics
 *
 * @param {object} props - Component props
 * @param {object} props.listing - Current listing data
 * @param {function} props.onUpdate - Partial update callback
 * @param {function} [props.onVerifyAddress] - Address verification callback
 */

import { FormInput, FormDropdown, SectionContainer } from '../shared';
import {
  spaceTypes,
  bedrooms,
  beds,
  bathrooms,
  kitchenTypes,
  parkingTypes
} from '../data';

export default function AddressSection({
  listing,
  onUpdate,
  onVerifyAddress,
  isSaving,
  onSave,
  lastSaved
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onUpdate({ [name]: value });
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    const currentAddress = listing['Location - Address'] || {};
    onUpdate({
      'Location - Address': {
        ...currentAddress,
        [name]: value
      }
    });
  };

  const handleVerifyClick = () => {
    if (onVerifyAddress) {
      const address = listing['Location - Address']?.address || '';
      onVerifyAddress(address);
    }
  };

  const address = listing['Location - Address'] || {};

  return (
    <SectionContainer
      title="Space Snapshot"
      onSave={onSave}
      isSaving={isSaving}
      lastSaved={lastSaved}
    >
      <div style={styles.grid}>
        {/* Listing Name */}
        <div style={styles.fullWidth}>
          <FormInput
            label="Listing Name"
            name="Name"
            value={listing['Name']}
            onChange={handleChange}
            maxLength={35}
            placeholder="e.g., Cozy Studio in Brooklyn"
            helpText="Maximum 35 characters"
          />
        </div>

        {/* Full Address */}
        <div style={styles.fullWidth}>
          <FormInput
            label="Full Address"
            name="address"
            value={address.address}
            onChange={handleAddressChange}
            placeholder="123 Main St, Brooklyn, NY 11201"
          />
          {onVerifyAddress && (
            <button
              type="button"
              onClick={handleVerifyClick}
              style={styles.verifyButton}
            >
              Verify Address
            </button>
          )}
        </div>

        {/* Street Number and Street Name */}
        <FormInput
          label="Street Number"
          name="number"
          value={address.number}
          onChange={handleAddressChange}
          placeholder="123"
        />
        <FormInput
          label="Street Name"
          name="street"
          value={address.street}
          onChange={handleAddressChange}
          placeholder="Main St"
        />

        {/* State and Zip */}
        <FormInput
          label="State"
          name="Location - State"
          value={listing['Location - State']}
          onChange={handleChange}
          placeholder="New York"
        />
        <FormInput
          label="Zip Code"
          name="Location - Zip Code"
          value={listing['Location - Zip Code']}
          onChange={handleChange}
          placeholder="11201"
        />

        {/* Neighborhood */}
        <div style={styles.fullWidth}>
          <FormInput
            label="Neighborhood (manual input)"
            name="neighborhood (manual input by user)"
            value={listing['neighborhood (manual input by user)']}
            onChange={handleChange}
            placeholder="Park Slope"
          />
        </div>

        {/* Type of Space */}
        <FormDropdown
          label="Type of Space"
          name="Features - Type of Space"
          value={listing['Features - Type of Space']}
          onChange={handleChange}
          options={spaceTypes}
          placeholder="Select type..."
        />

        {/* Bedrooms */}
        <FormDropdown
          label="Bedrooms"
          name="Features - Qty Bedrooms"
          value={listing['Features - Qty Bedrooms']}
          onChange={handleChange}
          options={bedrooms}
          placeholder="Select..."
        />

        {/* Beds */}
        <FormDropdown
          label="Beds"
          name="Features - Qty Beds"
          value={listing['Features - Qty Beds']}
          onChange={handleChange}
          options={beds}
          placeholder="Select..."
        />

        {/* Bathrooms */}
        <FormDropdown
          label="Bathrooms"
          name="Features - Qty Bathrooms"
          value={listing['Features - Qty Bathrooms']}
          onChange={handleChange}
          options={bathrooms}
          placeholder="Select..."
        />

        {/* Kitchen Type */}
        <FormDropdown
          label="Kitchen Type"
          name="Kitchen Type"
          value={listing['Kitchen Type']}
          onChange={handleChange}
          options={kitchenTypes}
          placeholder="Select..."
        />

        {/* Parking Type */}
        <FormDropdown
          label="Parking Type"
          name="Features - Parking type"
          value={listing['Features - Parking type']}
          onChange={handleChange}
          options={parkingTypes}
          placeholder="Select..."
        />
      </div>

      {/* Coordinates display (read-only) */}
      {(address.lat || address.lng) && (
        <div style={styles.coordinatesDisplay}>
          <span style={styles.coordinatesLabel}>Coordinates:</span>
          <span style={styles.coordinatesValue}>
            {address.lat?.toFixed(6)}, {address.lng?.toFixed(6)}
          </span>
          {address.validated && (
            <span style={styles.validatedBadge}>Verified</span>
          )}
        </div>
      )}
    </SectionContainer>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem'
  },
  fullWidth: {
    gridColumn: '1 / -1'
  },
  verifyButton: {
    marginTop: '0.5rem',
    padding: '0.5rem 1rem',
    fontSize: '0.8125rem',
    fontWeight: '500',
    color: '#52ABEC',
    backgroundColor: 'transparent',
    border: '1px solid #52ABEC',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  coordinatesDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.375rem',
    fontSize: '0.8125rem'
  },
  coordinatesLabel: {
    color: '#6b7280',
    fontWeight: '500'
  },
  coordinatesValue: {
    color: '#374151',
    fontFamily: 'monospace'
  },
  validatedBadge: {
    padding: '0.125rem 0.5rem',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    fontSize: '0.75rem',
    fontWeight: '500',
    borderRadius: '9999px'
  }
};
