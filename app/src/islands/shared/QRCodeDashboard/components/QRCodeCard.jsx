/**
 * QRCodeCard Component
 *
 * Displays a single QR code card with selection, edit, and delete actions.
 * Uses qrcode.react for live QR code generation.
 */

import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import { getUseCaseById } from '../qrCodeUseCases.js';

/**
 * Icon mapping for use case icons.
 */
const UseCaseIcon = ({ icon, className }) => {
  const iconMap = {
    key: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
    wifi: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    kitchen: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z" />
        <path d="M21 15v7" />
      </svg>
    ),
    laundry: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <rect x="2" y="2" width="20" height="20" rx="2" />
        <circle cx="12" cy="13" r="5" />
        <path d="M6 6h.01" />
        <path d="M10 6h.01" />
      </svg>
    ),
    trash: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
    tv: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
        <polyline points="17 2 12 7 7 2" />
      </svg>
    ),
    star: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    rules: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    car: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
        <circle cx="6.5" cy="16.5" r="2.5" />
        <circle cx="16.5" cy="16.5" r="2.5" />
      </svg>
    ),
    map: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
    qr: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="4" height="4" />
        <path d="M21 14h-3v3h3" />
        <path d="M18 21v-3" />
        <path d="M21 21h-3" />
      </svg>
    ),
    'star-logout': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  };

  return iconMap[icon] || iconMap.qr;
};

UseCaseIcon.propTypes = {
  icon: PropTypes.string.isRequired,
  className: PropTypes.string
};

/**
 * QRCodeCard Component
 */
const QRCodeCard = ({
  qrCode,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  disabled = false
}) => {
  const useCase = getUseCaseById(qrCode.useCaseId);

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(qrCode.id);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(qrCode);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete && window.confirm('Are you sure you want to delete this QR code?')) {
      onDelete(qrCode.id);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(qrCode.id);
    }
  };

  return (
    <div
      className={`qrcd-card ${isSelected ? 'qrcd-card--selected' : ''} ${disabled ? 'qrcd-card--disabled' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
    >
      {/* Selection Checkbox */}
      <div className="qrcd-card__checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          disabled={disabled}
          aria-label={`Select ${qrCode.title}`}
        />
      </div>

      {/* QR Code Display */}
      <div className="qrcd-card__qr">
        {qrCode.qrImageUrl ? (
          <img
            src={qrCode.qrImageUrl}
            alt={`QR code for ${qrCode.title}`}
            className="qrcd-card__qr-image"
          />
        ) : (
          <QRCodeSVG
            value={qrCode.content || 'https://splitlease.com'}
            size={120}
            level="M"
            includeMargin={false}
            className="qrcd-card__qr-svg"
          />
        )}
      </div>

      {/* Card Info */}
      <div className="qrcd-card__info">
        <div className="qrcd-card__header">
          <div className="qrcd-card__icon">
            <UseCaseIcon icon={useCase?.icon || 'qr'} className="qrcd-card__icon-svg" />
          </div>
          <h3 className="qrcd-card__title">{qrCode.title}</h3>
        </div>

        <p className="qrcd-card__category">{useCase?.category || 'Other'}</p>

        <p className="qrcd-card__url" title={qrCode.content}>
          {qrCode.shortUrl || qrCode.content || 'No URL'}
        </p>

        {qrCode.isScanned && (
          <span className="qrcd-card__scanned-badge">Scanned</span>
        )}
      </div>

      {/* Actions */}
      <div className="qrcd-card__actions">
        <button
          type="button"
          className="qrcd-card__action qrcd-card__action--edit"
          onClick={handleEdit}
          disabled={disabled}
          aria-label="Edit QR code"
          title="Edit"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          type="button"
          className="qrcd-card__action qrcd-card__action--delete"
          onClick={handleDelete}
          disabled={disabled}
          aria-label="Delete QR code"
          title="Delete"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  );
};

QRCodeCard.propTypes = {
  qrCode: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.string,
    shortUrl: PropTypes.string,
    qrImageUrl: PropTypes.string,
    useCaseId: PropTypes.string,
    useCaseName: PropTypes.string,
    isScanned: PropTypes.bool
  }).isRequired,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  disabled: PropTypes.bool
};

export default QRCodeCard;
