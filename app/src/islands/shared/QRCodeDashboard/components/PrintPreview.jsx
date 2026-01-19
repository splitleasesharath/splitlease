/**
 * PrintPreview Component
 *
 * Displays selected QR codes in a print-optimized layout.
 * Uses react-to-print for browser printing functionality.
 */

import { useRef, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import { getUseCaseById } from '../qrCodeUseCases.js';

/**
 * PrintableContent Component (forwardRef for react-to-print)
 */
const PrintableContent = forwardRef(({ qrCodes, houseManualName }, ref) => (
  <div ref={ref} className="qrcd-print__content">
    {/* Print header */}
    <div className="qrcd-print__header">
      <h1 className="qrcd-print__title">{houseManualName || 'House Manual'}</h1>
      <p className="qrcd-print__subtitle">QR Codes for Guest Access</p>
    </div>

    {/* QR Code Grid */}
    <div className="qrcd-print__grid">
      {qrCodes.map(qrCode => {
        const useCase = getUseCaseById(qrCode.useCaseId);
        return (
          <div key={qrCode.id} className="qrcd-print__item">
            <div className="qrcd-print__qr">
              {qrCode.qrImageUrl ? (
                <img
                  src={qrCode.qrImageUrl}
                  alt={`QR code for ${qrCode.title}`}
                  className="qrcd-print__qr-image"
                />
              ) : (
                <QRCodeSVG
                  value={qrCode.content || 'https://splitlease.com'}
                  size={150}
                  level="H"
                  includeMargin={false}
                />
              )}
            </div>
            <div className="qrcd-print__label">
              <h3 className="qrcd-print__item-title">{qrCode.title}</h3>
              <p className="qrcd-print__item-category">
                {useCase?.category || 'Other'}
              </p>
            </div>
          </div>
        );
      })}
    </div>

    {/* Print footer */}
    <div className="qrcd-print__footer">
      <p>Scan QR codes with your smartphone camera for instructions</p>
      <p className="qrcd-print__branding">Powered by Split Lease</p>
    </div>
  </div>
));

PrintableContent.displayName = 'PrintableContent';

PrintableContent.propTypes = {
  qrCodes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.string,
      qrImageUrl: PropTypes.string,
      useCaseId: PropTypes.string
    })
  ).isRequired,
  houseManualName: PropTypes.string
};

/**
 * PrintPreview Component
 */
const PrintPreview = ({
  qrCodes = [],
  houseManualName,
  onBack,
  onPrintComplete
}) => {
  const printRef = useRef(null);

  // Setup print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `QR Codes - ${houseManualName || 'House Manual'}`,
    onAfterPrint: () => {
      if (onPrintComplete) {
        onPrintComplete();
      }
    }
  });

  // Handle back button
  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  // Empty state
  if (qrCodes.length === 0) {
    return (
      <div className="qrcd-print">
        <div className="qrcd-print__empty">
          <p>No QR codes selected for printing</p>
          <button
            type="button"
            className="qrcd-print__back-btn"
            onClick={handleBack}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="qrcd-print">
      {/* Toolbar */}
      <div className="qrcd-print__toolbar">
        <button
          type="button"
          className="qrcd-print__toolbar-btn qrcd-print__toolbar-btn--back"
          onClick={handleBack}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Dashboard
        </button>

        <div className="qrcd-print__toolbar-info">
          <span>{qrCodes.length} QR code{qrCodes.length !== 1 ? 's' : ''} ready to print</span>
        </div>

        <button
          type="button"
          className="qrcd-print__toolbar-btn qrcd-print__toolbar-btn--print"
          onClick={handlePrint}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print
        </button>
      </div>

      {/* Preview Container */}
      <div className="qrcd-print__preview">
        <div className="qrcd-print__paper">
          <PrintableContent
            ref={printRef}
            qrCodes={qrCodes}
            houseManualName={houseManualName}
          />
        </div>
      </div>

      {/* Tips */}
      <div className="qrcd-print__tips">
        <h4>Printing Tips</h4>
        <ul>
          <li>Use a color printer for best results</li>
          <li>Print on quality paper for durability</li>
          <li>Consider laminating for long-term use</li>
          <li>Place QR codes where guests can easily scan them</li>
        </ul>
      </div>
    </div>
  );
};

PrintPreview.propTypes = {
  qrCodes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.string,
      qrImageUrl: PropTypes.string,
      useCaseId: PropTypes.string
    })
  ),
  houseManualName: PropTypes.string,
  onBack: PropTypes.func.isRequired,
  onPrintComplete: PropTypes.func
};

export default PrintPreview;
