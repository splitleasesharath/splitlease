/**
 * ApplicationsTable - Table display of rental applications
 *
 * Props:
 * - applications: Array of application objects
 * - isLoading: Loading state
 * - pagination: { page, pageSize, total, totalPages }
 * - sort: { field, direction }
 * - onSelectApplication: Handler when clicking a row
 * - onUpdateSort: Handler for changing sort
 * - onChangePage: Handler for page changes
 * - onChangePageSize: Handler for page size changes
 */

import React, { useCallback } from 'react';

// Format currency
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Format date
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Get status badge class
function getStatusClass(status) {
  const statusMap = {
    'draft': 'status-badge--draft',
    'in-progress': 'status-badge--in-progress',
    'submitted': 'status-badge--submitted',
    'under-review': 'status-badge--under-review',
    'approved': 'status-badge--approved',
    'conditionally-approved': 'status-badge--conditionally-approved',
    'denied': 'status-badge--denied',
    'withdrawn': 'status-badge--withdrawn',
    'expired': 'status-badge--expired'
  };
  return statusMap[status] || 'status-badge--default';
}

// Format status display text
function formatStatus(status) {
  return status
    ? status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : '-';
}

// Get applicant name from application
function getApplicantName(app) {
  if (app.personal_info?.firstName && app.personal_info?.lastName) {
    return `${app.personal_info.firstName} ${app.personal_info.lastName}`;
  }
  if (app.guest?.full_name) {
    return app.guest.full_name;
  }
  return 'Unknown';
}

// Get applicant email
function getApplicantEmail(app) {
  return app.personal_info?.email || app.guest?.email || '-';
}

// Sort icon component
function SortIcon({ field, currentSort }) {
  const isActive = currentSort.field === field;
  const isAsc = isActive && currentSort.direction === 'asc';

  return (
    <span className={`sort-icon ${isActive ? 'sort-icon--active' : ''}`}>
      {isActive ? (isAsc ? '↑' : '↓') : '↕'}
    </span>
  );
}

export default function ApplicationsTable({
  applications,
  isLoading,
  pagination,
  sort,
  onSelectApplication,
  onUpdateSort,
  onChangePage,
  onChangePageSize
}) {
  const handleRowClick = useCallback((id) => {
    onSelectApplication(id);
  }, [onSelectApplication]);

  const handleKeyDown = useCallback((e, id) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectApplication(id);
    }
  }, [onSelectApplication]);

  // Column definitions
  const columns = [
    { key: 'unique_id', label: 'ID', sortable: true },
    { key: 'applicant', label: 'Applicant', sortable: false },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'completion_percentage', label: 'Progress', sortable: true },
    { key: 'total_monthly_income', label: 'Income', sortable: true },
    { key: 'created_at', label: 'Submitted', sortable: true }
  ];

  // Empty state
  if (!isLoading && applications.length === 0) {
    return (
      <div className="applications-table__empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3>No applications found</h3>
        <p>Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className="applications-table-wrapper">
      <table className="applications-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={col.sortable ? 'sortable' : ''}
                onClick={col.sortable ? () => onUpdateSort(col.key) : undefined}
              >
                {col.label}
                {col.sortable && <SortIcon field={col.key} currentSort={sort} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            // Loading skeleton rows
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="skeleton-row">
                {columns.map(col => (
                  <td key={col.key}>
                    <div className="skeleton-cell" />
                  </td>
                ))}
              </tr>
            ))
          ) : (
            applications.map(app => (
              <tr
                key={app.id}
                onClick={() => handleRowClick(app.id)}
                onKeyDown={(e) => handleKeyDown(e, app.id)}
                tabIndex={0}
                role="button"
                className="clickable-row"
              >
                <td className="id-cell">
                  <span className="application-id">{app.unique_id || app.id?.slice(0, 8)}</span>
                </td>
                <td>
                  <div className="applicant-cell">
                    <span className="applicant-name">{getApplicantName(app)}</span>
                    <span className="applicant-email">{getApplicantEmail(app)}</span>
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${getStatusClass(app.status)}`}>
                    {formatStatus(app.status)}
                  </span>
                </td>
                <td>
                  <div className="progress-cell">
                    <div className="progress-bar">
                      <div
                        className="progress-bar__fill"
                        style={{ width: `${app.completion_percentage || 0}%` }}
                      />
                    </div>
                    <span className="progress-text">{app.completion_percentage || 0}%</span>
                  </div>
                </td>
                <td className="income-cell">
                  {formatCurrency(app.total_monthly_income || app.monthly_income)}
                </td>
                <td className="date-cell">
                  {formatDate(app.submitted_at || app.created_at)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="applications-table__pagination">
          <div className="pagination-info">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} applications
          </div>

          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => onChangePage(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </button>

            <span className="pagination-current">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              className="pagination-btn"
              onClick={() => onChangePage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </button>
          </div>

          <div className="pagination-size">
            <label htmlFor="page-size">Show:</label>
            <select
              id="page-size"
              value={pagination.pageSize}
              onChange={(e) => onChangePageSize(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
