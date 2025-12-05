/**
 * Edit Listing Details - Shared Island Component
 * Modal component for editing various aspects of a listing
 * Follows the Hollow Component Pattern - UI only, logic in hook
 *
 * @param {Object} props
 * @param {Object} props.listing - The listing data to edit
 * @param {string} props.editSection - The section to edit: 'name' | 'description' | 'neighborhood' | 'location' | 'details' | 'rules' | 'amenities' | 'availability' | 'photos'
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSave - Save handler (receives updated listing)
 * @param {Function} props.updateListing - Function to persist changes to database (id, updates) => Promise<listing>
 */

import { useEditListingDetailsLogic } from './useEditListingDetailsLogic';
import {
  IN_UNIT_AMENITIES,
  BUILDING_AMENITIES,
  HOUSE_RULES,
  SAFETY_FEATURES,
  SPACE_TYPES,
  KITCHEN_TYPES,
  STORAGE_TYPES,
  PARKING_OPTIONS,
  CANCELLATION_POLICIES,
  BEDROOM_OPTIONS,
  BED_OPTIONS,
  BATHROOM_OPTIONS,
  GUEST_OPTIONS
} from './constants';
import '../../../styles/components/edit-listing-details.css';

export function EditListingDetails({ listing, editSection, onClose, onSave, updateListing }) {
  const {
    formData,
    isLoading,
    toast,
    expandedSections,
    inUnitAmenities,
    buildingAmenities,
    selectedRules,
    safetyFeatures,
    photos,
    sectionTitle,
    sectionSubtitle,
    handleInputChange,
    handleCheckboxAutosave,
    handleSave,
    toggleSection,
    loadCommonRules,
    loadCommonSafetyFeatures,
    loadNeighborhoodTemplate,
    addPhotoUrl,
    dismissToast
  } = useEditListingDetailsLogic({
    listing,
    editSection,
    onClose,
    onSave,
    updateListing
  });

  // Property Info Section (Name + Address)
  const renderPropertyInfoSection = () => (
    <div className="eld-collapsible-section">
      <div className="eld-collapsible-header" onClick={() => toggleSection('name')}>
        <div className="eld-collapsible-header-left">
          <span className="eld-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
          </span>
          <h3>Property Info</h3>
        </div>
        <div className={`eld-collapsible-toggle ${expandedSections.name ? 'expanded' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </div>
      </div>
      <div className={`eld-collapsible-content ${!expandedSections.name ? 'collapsed' : ''}`}>
        <div className="eld-form-field">
          <label className="eld-form-label">Listing Name</label>
          <input
            type="text"
            className="eld-form-input"
            placeholder="Enter listing name..."
            value={formData.Name || ''}
            onChange={(e) => handleInputChange('Name', e.target.value)}
          />
        </div>
        <div className="eld-form-grid">
          <div className="eld-form-field">
            <label className="eld-form-label">City</label>
            <input
              type="text"
              className="eld-form-input"
              placeholder="City"
              value={formData['Location - City'] || ''}
              onChange={(e) => handleInputChange('Location - City', e.target.value)}
            />
          </div>
          <div className="eld-form-field">
            <label className="eld-form-label">State</label>
            <input
              type="text"
              className="eld-form-input"
              placeholder="State"
              value={formData['Location - State'] || ''}
              onChange={(e) => handleInputChange('Location - State', e.target.value)}
            />
          </div>
        </div>
        <div className="eld-form-grid">
          <div className="eld-form-field">
            <label className="eld-form-label">Zip Code</label>
            <input
              type="text"
              className="eld-form-input"
              placeholder="Zip Code"
              value={formData['Location - Zip Code'] || ''}
              onChange={(e) => handleInputChange('Location - Zip Code', e.target.value)}
            />
          </div>
          <div className="eld-form-field">
            <label className="eld-form-label">Borough/Neighborhood</label>
            <input
              type="text"
              className="eld-form-input"
              placeholder="Borough"
              value={formData['Location - Borough'] || ''}
              onChange={(e) => handleInputChange('Location - Borough', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Description Section
  const renderDescriptionSection = () => (
    <div className="eld-collapsible-section">
      <div className="eld-collapsible-header" onClick={() => toggleSection('description')}>
        <div className="eld-collapsible-header-left">
          <span className="eld-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </span>
          <h3>Description of Lodging</h3>
        </div>
        <div className={`eld-collapsible-toggle ${expandedSections.description ? 'expanded' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </div>
      </div>
      <div className={`eld-collapsible-content ${!expandedSections.description ? 'collapsed' : ''}`}>
        <div className="eld-form-field">
          <textarea
            className="eld-form-textarea"
            placeholder="Describe your listing in detail..."
            value={formData.Description || ''}
            onChange={(e) => handleInputChange('Description', e.target.value)}
            rows={8}
          />
        </div>
      </div>
    </div>
  );

  // Neighborhood Description Section
  const renderNeighborhoodSection = () => (
    <div className="eld-collapsible-section">
      <div className="eld-collapsible-header" onClick={() => toggleSection('neighborhood')}>
        <div className="eld-collapsible-header-left">
          <span className="eld-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </span>
          <h3>Neighborhood Description</h3>
        </div>
        <div className={`eld-collapsible-toggle ${expandedSections.neighborhood ? 'expanded' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </div>
      </div>
      <div className={`eld-collapsible-content ${!expandedSections.neighborhood ? 'collapsed' : ''}`}>
        <button
          className="eld-btn eld-btn-secondary"
          style={{ marginBottom: '12px' }}
          onClick={loadNeighborhoodTemplate}
        >
          Load Template
        </button>
        <div className="eld-form-field">
          <textarea
            className="eld-form-textarea"
            placeholder="Describe the neighborhood, nearby attractions, transportation..."
            value={formData['Description Neighborhood'] || ''}
            onChange={(e) => handleInputChange('Description Neighborhood', e.target.value)}
            rows={6}
          />
        </div>
      </div>
    </div>
  );

  // Amenities Section with Autosave
  const renderAmenitiesSection = () => (
    <>
      <div className="eld-collapsible-section">
        <div className="eld-collapsible-header" onClick={() => toggleSection('amenities')}>
          <div className="eld-collapsible-header-left">
            <span className="eld-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9,11 12,14 22,4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </span>
            <h3>In-Unit Amenities</h3>
          </div>
          <div className={`eld-collapsible-toggle ${expandedSections.amenities ? 'expanded' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </div>
        </div>
        <div className={`eld-collapsible-content ${!expandedSections.amenities ? 'collapsed' : ''}`}>
          <p className="eld-form-helper" style={{ marginBottom: '12px' }}>
            Changes are saved automatically when you check/uncheck items
          </p>
          <div className="eld-checkbox-grid">
            {IN_UNIT_AMENITIES.map(amenity => (
              <label key={amenity} className="eld-checkbox-item">
                <input
                  type="checkbox"
                  checked={inUnitAmenities.includes(amenity)}
                  onChange={(e) => handleCheckboxAutosave(
                    'Features - Amenities In-Unit',
                    amenity,
                    e.target.checked,
                    'Amenity'
                  )}
                />
                <span>{amenity}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="eld-collapsible-section">
        <div className="eld-collapsible-header" onClick={() => toggleSection('building')}>
          <div className="eld-collapsible-header-left">
            <span className="eld-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </span>
            <h3>Building / Neighborhood Amenities</h3>
          </div>
          <div className={`eld-collapsible-toggle ${expandedSections.building !== false ? 'expanded' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </div>
        </div>
        <div className={`eld-collapsible-content ${expandedSections.building === false ? 'collapsed' : ''}`}>
          <div className="eld-checkbox-grid">
            {BUILDING_AMENITIES.map(amenity => (
              <label key={amenity} className="eld-checkbox-item">
                <input
                  type="checkbox"
                  checked={buildingAmenities.includes(amenity)}
                  onChange={(e) => handleCheckboxAutosave(
                    'Features - Amenities In-Building',
                    amenity,
                    e.target.checked,
                    'Amenity'
                  )}
                />
                <span>{amenity}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  // Rules Section with Autosave Checkboxes
  const renderRulesSection = () => (
    <div className="eld-collapsible-section">
      <div className="eld-collapsible-header" onClick={() => toggleSection('rules')}>
        <div className="eld-collapsible-header-left">
          <span className="eld-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </span>
          <h3>House Rules</h3>
        </div>
        <div className={`eld-collapsible-toggle ${expandedSections.rules ? 'expanded' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </div>
      </div>
      <div className={`eld-collapsible-content ${!expandedSections.rules ? 'collapsed' : ''}`}>
        <p className="eld-form-helper" style={{ marginBottom: '12px' }}>
          Rules are autosaved when checked/unchecked
        </p>
        <button
          className="eld-btn eld-btn-secondary"
          style={{ marginBottom: '16px' }}
          onClick={loadCommonRules}
        >
          Load Common Rules
        </button>
        <div className="eld-checkbox-grid">
          {HOUSE_RULES.map(rule => (
            <label key={rule} className="eld-checkbox-item">
              <input
                type="checkbox"
                checked={selectedRules.includes(rule)}
                onChange={(e) => handleCheckboxAutosave(
                  'Features - House Rules',
                  rule,
                  e.target.checked,
                  'House Rule'
                )}
              />
              <span>{rule}</span>
            </label>
          ))}
        </div>

        <div className="eld-form-grid" style={{ marginTop: '20px' }}>
          <div className="eld-form-field">
            <label className="eld-form-label">Max Guests Allowed</label>
            <select
              className="eld-form-select"
              value={formData['Features - Qty Guests'] ?? ''}
              onChange={(e) => handleInputChange('Features - Qty Guests', e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Select</option>
              {GUEST_OPTIONS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Details Section with Sub-sections
  const renderDetailsSection = () => (
    <>
      {/* Storage and Space Sub-section */}
      <div className="eld-collapsible-section">
        <div className="eld-collapsible-header" onClick={() => toggleSection('storage')}>
          <div className="eld-collapsible-header-left">
            <span className="eld-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </span>
            <h3>Storage and Space</h3>
          </div>
          <div className={`eld-collapsible-toggle ${expandedSections.storage ? 'expanded' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </div>
        </div>
        <div className={`eld-collapsible-content ${!expandedSections.storage ? 'collapsed' : ''}`}>
          <div className="eld-form-grid">
            <div className="eld-form-field">
              <label className="eld-form-label">Est. square footage of room</label>
              <input
                type="number"
                className="eld-form-input"
                placeholder="SQFT"
                value={formData['Features - SQFT Area'] ?? ''}
                onChange={(e) => handleInputChange('Features - SQFT Area', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
            <div className="eld-form-field">
              <label className="eld-form-label">Est. square footage of home</label>
              <input
                type="number"
                className="eld-form-input"
                placeholder="SQFT"
              />
            </div>
          </div>
          <div className="eld-form-field">
            <label className="eld-form-label">What type of storage do you offer?</label>
            <select className="eld-form-select">
              <option value="">Select storage type</option>
              {STORAGE_TYPES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="eld-form-field">
            <label className="eld-form-label">What parking options are available?</label>
            <select className="eld-form-select">
              <option value="">Select parking</option>
              {PARKING_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Safety Features Sub-section with Autosave */}
      <div className="eld-collapsible-section">
        <div className="eld-collapsible-header" onClick={() => toggleSection('safety')}>
          <div className="eld-collapsible-header-left">
            <span className="eld-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </span>
            <h3>Safety Features</h3>
          </div>
          <div className={`eld-collapsible-toggle ${expandedSections.safety ? 'expanded' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </div>
        </div>
        <div className={`eld-collapsible-content ${!expandedSections.safety ? 'collapsed' : ''}`}>
          <p className="eld-form-helper" style={{ marginBottom: '12px' }}>
            Safety features are autosaved when checked
          </p>
          <button
            className="eld-btn eld-btn-secondary"
            style={{ marginBottom: '16px' }}
            onClick={loadCommonSafetyFeatures}
          >
            Load Common Safety Features
          </button>
          <div className="eld-checkbox-grid">
            {SAFETY_FEATURES.map(feature => (
              <label key={feature} className="eld-checkbox-item">
                <input
                  type="checkbox"
                  checked={safetyFeatures.includes(feature)}
                  onChange={(e) => handleCheckboxAutosave(
                    'Features - Safety',
                    feature,
                    e.target.checked,
                    'Safety feature'
                  )}
                />
                <span>{feature}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Space Details Sub-section */}
      <div className="eld-collapsible-section">
        <div className="eld-collapsible-header" onClick={() => toggleSection('space')}>
          <div className="eld-collapsible-header-left">
            <span className="eld-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </span>
            <h3>Space Details</h3>
          </div>
          <div className={`eld-collapsible-toggle ${expandedSections.space ? 'expanded' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </div>
        </div>
        <div className={`eld-collapsible-content ${!expandedSections.space ? 'collapsed' : ''}`}>
          <div className="eld-form-field">
            <label className="eld-form-label">Type of Space</label>
            <select
              className="eld-form-select"
              value={formData['Features - Type of Space'] || ''}
              onChange={(e) => handleInputChange('Features - Type of Space', e.target.value)}
            >
              <option value="">Select type</option>
              {SPACE_TYPES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="eld-form-grid-3">
            <div className="eld-form-field">
              <label className="eld-form-label">Bedrooms*</label>
              <select
                className="eld-form-select"
                value={formData['Features - Qty Bedrooms'] ?? ''}
                onChange={(e) => handleInputChange('Features - Qty Bedrooms', e.target.value !== '' ? parseInt(e.target.value) : null)}
              >
                <option value="">Select</option>
                {BEDROOM_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="eld-form-field">
              <label className="eld-form-label">Beds</label>
              <select
                className="eld-form-select"
                value={formData['Features - Qty Beds'] ?? ''}
                onChange={(e) => handleInputChange('Features - Qty Beds', e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Select</option>
                {BED_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="eld-form-field">
              <label className="eld-form-label">Bathrooms*</label>
              <select
                className="eld-form-select"
                value={formData['Features - Qty Bathrooms'] ?? ''}
                onChange={(e) => handleInputChange('Features - Qty Bathrooms', e.target.value ? parseFloat(e.target.value) : null)}
              >
                <option value="">Select</option>
                {BATHROOM_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="eld-form-field">
            <label className="eld-form-label">Kitchen Style</label>
            <select
              className="eld-form-select"
              value={formData['Kitchen Type'] || ''}
              onChange={(e) => handleInputChange('Kitchen Type', e.target.value)}
            >
              <option value="">Select kitchen style</option>
              {KITCHEN_TYPES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  );

  // Availability Section
  const renderAvailabilitySection = () => (
    <div className="eld-collapsible-section">
      <div className="eld-collapsible-header" onClick={() => toggleSection('availability')}>
        <div className="eld-collapsible-header-left">
          <span className="eld-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </span>
          <h3>Availability Settings</h3>
        </div>
        <div className={`eld-collapsible-toggle ${expandedSections.availability ? 'expanded' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </div>
      </div>
      <div className={`eld-collapsible-content ${!expandedSections.availability ? 'collapsed' : ''}`}>
        <div className="eld-form-field">
          <label className="eld-form-label">Earliest Rent Date</label>
          <input
            type="date"
            className="eld-form-input"
            value={formData['First Available'] || ''}
            onChange={(e) => handleInputChange('First Available', e.target.value)}
          />
        </div>
        <div className="eld-form-grid">
          <div className="eld-form-field">
            <label className="eld-form-label">Minimum Nights</label>
            <input
              type="number"
              className="eld-form-input"
              placeholder="Min"
              value={formData['Minimum Nights'] ?? ''}
              onChange={(e) => handleInputChange('Minimum Nights', e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
          <div className="eld-form-field">
            <label className="eld-form-label">Maximum Nights</label>
            <input
              type="number"
              className="eld-form-input"
              placeholder="Max"
              value={formData['Maximum Nights'] ?? ''}
              onChange={(e) => handleInputChange('Maximum Nights', e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
        </div>
        <div className="eld-form-field">
          <label className="eld-form-label">Cancellation Policy</label>
          <select
            className="eld-form-select"
            value={formData['Cancellation Policy'] || ''}
            onChange={(e) => handleInputChange('Cancellation Policy', e.target.value)}
          >
            <option value="">Select policy</option>
            {CANCELLATION_POLICIES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  // Photos Section
  const renderPhotosSection = () => {
    const isIdFormat = (str) => str && /^\d{10,}x\d+$/.test(str);
    const isUrl = (str) => str && (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('//'));
    const photoUrls = photos.filter(p => isUrl(String(p)));
    const photoIds = photos.filter(p => isIdFormat(String(p)));

    return (
      <div className="eld-collapsible-section">
        <div className="eld-collapsible-header" onClick={() => toggleSection('photos')}>
          <div className="eld-collapsible-header-left">
            <span className="eld-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
            </span>
            <h3>Listing Photos</h3>
          </div>
          <div className={`eld-collapsible-toggle ${expandedSections.photos ? 'expanded' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </div>
        </div>
        <div className={`eld-collapsible-content ${!expandedSections.photos ? 'collapsed' : ''}`}>
          {photoIds.length > 0 && (
            <div className="eld-current-value" style={{ marginBottom: '12px' }}>
              <strong>{photoIds.length} photo(s)</strong> linked from database
            </div>
          )}
          {photoUrls.length > 0 && (
            <div className="eld-images-preview">
              {photoUrls.map((photo, index) => (
                <div key={index} className="eld-image-item">
                  <img
                    src={String(photo)}
                    alt={`Photo ${index + 1}`}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999">Error</text></svg>';
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          {photoUrls.length === 0 && photoIds.length === 0 && (
            <div className="eld-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
              <p>No photos added yet</p>
            </div>
          )}
          <button className="eld-add-rule-btn" onClick={addPhotoUrl}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Photo URL
          </button>
        </div>
      </div>
    );
  };

  const renderSectionContent = () => {
    switch (editSection) {
      case 'name':
      case 'location':
        return renderPropertyInfoSection();
      case 'description':
        return renderDescriptionSection();
      case 'neighborhood':
        return renderNeighborhoodSection();
      case 'amenities':
        return renderAmenitiesSection();
      case 'rules':
        return renderRulesSection();
      case 'details':
        return renderDetailsSection();
      case 'availability':
        return renderAvailabilitySection();
      case 'photos':
        return renderPhotosSection();
      default:
        return (
          <>
            {renderPropertyInfoSection()}
            {renderDescriptionSection()}
            {renderNeighborhoodSection()}
          </>
        );
    }
  };

  return (
    <div className="eld-popup-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="eld-popup-container">
        <div className="eld-popup-header">
          <h2>{sectionTitle}</h2>
          <button className="eld-popup-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {sectionSubtitle && (
          <p className="eld-popup-subtitle">{sectionSubtitle}</p>
        )}

        <div className="eld-popup-body">
          {renderSectionContent()}
        </div>

        <div className="eld-button-group">
          <button className="eld-btn eld-btn-secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button className="eld-btn eld-btn-primary" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`eld-toast eld-toast-${toast.type}`}>
          <button className="eld-toast-close" onClick={dismissToast}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="eld-toast-message">{toast.message}</div>
          {toast.subMessage && (
            <div className="eld-toast-submessage">{toast.subMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default EditListingDetails;
