/**
 * NotificationCategoryRow - Single category row with SMS/Email toggles
 */

import React from 'react';
import NotificationToggle from './NotificationToggle.jsx';

const styles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0',
    borderBottom: '1px solid #F0F0F0',
  },
  rowLast: {
    borderBottom: 'none',
  },
  labelSection: {
    flex: 1,
    marginRight: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#000000',
    marginBottom: '4px',
  },
  description: {
    fontSize: '12px',
    color: '#666666',
    lineHeight: '1.4',
  },
  toggleSection: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
  },
  toggleWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '51px', // Match header label width for alignment
  },
};

export default function NotificationCategoryRow({
  category,
  smsEnabled,
  emailEnabled,
  onToggleSms,
  onToggleEmail,
  smsPending = false,
  emailPending = false,
  isLast = false,
}) {
  return (
    <div style={{ ...styles.row, ...(isLast ? styles.rowLast : {}) }}>
      <div style={styles.labelSection}>
        <div style={styles.label}>{category.label}</div>
        <div style={styles.description}>{category.description}</div>
      </div>
      <div style={styles.toggleSection}>
        <div style={styles.toggleWrapper}>
          <NotificationToggle
            checked={smsEnabled}
            onChange={onToggleSms}
            disabled={smsPending}
            ariaLabel={`${category.label} SMS notifications`}
          />
        </div>
        <div style={styles.toggleWrapper}>
          <NotificationToggle
            checked={emailEnabled}
            onChange={onToggleEmail}
            disabled={emailPending}
            ariaLabel={`${category.label} Email notifications`}
          />
        </div>
      </div>
    </div>
  );
}
