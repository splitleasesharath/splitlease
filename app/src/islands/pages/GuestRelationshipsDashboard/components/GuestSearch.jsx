/**
 * Guest Search Component
 *
 * Search for guests by name, phone, or email.
 * Converted from TypeScript to JavaScript following Split Lease patterns.
 */

import { useRef, useEffect } from 'react';
import { Search, User as UserIcon, Phone, Mail } from 'lucide-react';

export default function GuestSearch({
  guests,
  selectedGuest,
  nameSearch,
  phoneSearch,
  emailSearch,
  showNameDropdown,
  showPhoneDropdown,
  showEmailDropdown,
  isSearching,
  onNameSearchChange,
  onPhoneSearchChange,
  onEmailSearchChange,
  onGuestSelect,
  onClearGuest,
  setShowNameDropdown,
  setShowPhoneDropdown,
  setShowEmailDropdown,
  formatPhoneNumber
}) {
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (nameRef.current && !nameRef.current.contains(event.target)) {
        setShowNameDropdown(false);
      }
      if (phoneRef.current && !phoneRef.current.contains(event.target)) {
        setShowPhoneDropdown(false);
      }
      if (emailRef.current && !emailRef.current.contains(event.target)) {
        setShowEmailDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowNameDropdown, setShowPhoneDropdown, setShowEmailDropdown]);

  return (
    <div className="grd-section">
      <h2 className="grd-section-title">Select a Guest by only one of the following fields</h2>

      <div className="grd-search-grid">
        {/* Name Search */}
        <div className="grd-search-field" ref={nameRef}>
          <label className="grd-search-label">
            <UserIcon size={16} />
            Search by Name
          </label>
          <div className="grd-search-input-wrapper">
            <Search size={16} className="grd-search-icon" />
            <input
              type="text"
              className="grd-search-input"
              placeholder="Search guest by name..."
              value={nameSearch}
              onChange={(e) => onNameSearchChange(e.target.value)}
              onFocus={() => setShowNameDropdown(true)}
            />
          </div>
          {showNameDropdown && nameSearch && guests.length > 0 && (
            <div className="grd-search-dropdown">
              {guests.slice(0, 10).map(guest => (
                <div
                  key={guest._id}
                  className="grd-dropdown-option"
                  onClick={() => onGuestSelect(guest)}
                >
                  <div className="grd-option-avatar">
                    {guest.profilePhoto ? (
                      <img src={guest.profilePhoto} alt="" />
                    ) : (
                      <UserIcon size={16} />
                    )}
                  </div>
                  <div className="grd-option-info">
                    <span className="grd-option-name">{guest.firstName} {guest.lastName}</span>
                    <span className="grd-option-secondary">{guest.email}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phone Search */}
        <div className="grd-search-field" ref={phoneRef}>
          <label className="grd-search-label">
            <Phone size={16} />
            Search by Phone
          </label>
          <div className="grd-search-input-wrapper">
            <Search size={16} className="grd-search-icon" />
            <input
              type="text"
              className="grd-search-input"
              placeholder="Search guest by phone..."
              value={phoneSearch}
              onChange={(e) => onPhoneSearchChange(e.target.value)}
              onFocus={() => setShowPhoneDropdown(true)}
            />
          </div>
          {showPhoneDropdown && phoneSearch && guests.length > 0 && (
            <div className="grd-search-dropdown">
              {guests.slice(0, 10).map(guest => (
                <div
                  key={guest._id}
                  className="grd-dropdown-option"
                  onClick={() => onGuestSelect(guest)}
                >
                  <div className="grd-option-avatar">
                    {guest.profilePhoto ? (
                      <img src={guest.profilePhoto} alt="" />
                    ) : (
                      <UserIcon size={16} />
                    )}
                  </div>
                  <div className="grd-option-info">
                    <span className="grd-option-name">{formatPhoneNumber(guest.phoneNumber)}</span>
                    <span className="grd-option-secondary">{guest.firstName} {guest.lastName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Search */}
      <div className="grd-email-search-section">
        <span className="grd-or-divider">or Enter an email:</span>
        <div className="grd-search-field" ref={emailRef}>
          <div className="grd-search-input-wrapper">
            <Mail size={16} className="grd-search-icon" />
            <input
              type="email"
              className="grd-search-input"
              placeholder="Choose by email..."
              value={emailSearch}
              onChange={(e) => onEmailSearchChange(e.target.value)}
              onFocus={() => setShowEmailDropdown(true)}
            />
          </div>
          {showEmailDropdown && emailSearch && guests.length > 0 && (
            <div className="grd-search-dropdown">
              {guests.slice(0, 10).map(guest => (
                <div
                  key={guest._id}
                  className="grd-dropdown-option"
                  onClick={() => onGuestSelect(guest)}
                >
                  <div className="grd-option-avatar">
                    {guest.profilePhoto ? (
                      <img src={guest.profilePhoto} alt="" />
                    ) : (
                      <UserIcon size={16} />
                    )}
                  </div>
                  <div className="grd-option-info">
                    <span className="grd-option-name">{guest.email}</span>
                    <span className="grd-option-secondary">{guest.firstName} {guest.lastName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Guest Display */}
      {selectedGuest && (
        <div className="grd-selected-guest-card">
          <div className="grd-selected-guest-header">
            <div className="grd-selected-avatar">
              {selectedGuest.profilePhoto ? (
                <img src={selectedGuest.profilePhoto} alt="" />
              ) : (
                <UserIcon size={32} />
              )}
            </div>
            <div className="grd-selected-info">
              <h3>{selectedGuest.firstName} {selectedGuest.lastName}</h3>
              <p>{selectedGuest.email}</p>
              <p>{formatPhoneNumber(selectedGuest.phoneNumber)}</p>
            </div>
            <button
              className="grd-btn grd-btn-secondary grd-btn-sm"
              onClick={onClearGuest}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isSearching && (
        <div className="grd-search-loading">
          <div className="grd-spinner-sm"></div>
          <span>Searching...</span>
        </div>
      )}
    </div>
  );
}
