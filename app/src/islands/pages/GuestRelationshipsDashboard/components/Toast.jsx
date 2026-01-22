/**
 * Toast Notification Component
 *
 * Simple toast notification for success/error/info messages.
 */

import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function Toast({ message, type = 'info' }) {
  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />
  };

  return (
    <div className={`grd-toast grd-toast-${type}`}>
      {icons[type] || icons.info}
      <span>{message}</span>
    </div>
  );
}
