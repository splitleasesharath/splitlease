/**
 * CreateDocumentPage - Admin page for creating and assigning documents to hosts
 *
 * This is a HOLLOW COMPONENT - all logic lives in useCreateDocumentPageLogic.js
 *
 * Features:
 * - Select a policy document template from Bubble
 * - Customize the document title
 * - Assign to a host user
 * - Creates a record in the documentssent table
 */

import React from 'react';
import { useCreateDocumentPageLogic } from './useCreateDocumentPageLogic.js';
import DocumentForm from './components/DocumentForm.jsx';
import { useToast } from '../../shared/Toast.jsx';

export default function CreateDocumentPage() {
  const { showToast } = useToast();
  const logic = useCreateDocumentPageLogic({ showToast });

  // Loading state during initialization
  if (logic.isInitializing) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Unauthorized state
  if (!logic.isAuthorized) {
    return (
      <div style={styles.container}>
        <div style={styles.unauthorizedContainer}>
          <h2 style={styles.unauthorizedTitle}>Access Denied</h2>
          <p style={styles.unauthorizedText}>
            You are not authorized to view this page. Admin access required.
          </p>
          <a href="/" style={styles.homeLink}>Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>Create Document</h1>
        <p style={styles.subtitle}>
          Select a policy document and assign it to a host user
        </p>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Error Banner */}
        {logic.error && (
          <div style={styles.errorBanner}>
            <span>{logic.error}</span>
            <button onClick={logic.handleRetry} style={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {/* Document Form */}
        <DocumentForm
          policyDocuments={logic.policyDocuments}
          hostUsers={logic.hostUsers}
          formState={logic.formState}
          formErrors={logic.formErrors}
          isLoading={logic.isLoading}
          isSubmitting={logic.isSubmitting}
          onFieldChange={logic.handleFieldChange}
          onSubmit={logic.handleSubmit}
        />

        {/* Success Message */}
        {logic.lastCreatedDocument && (
          <div style={styles.successMessage}>
            <span style={styles.successIcon}>✓</span>
            <span>Document successfully created and assigned!</span>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '2rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    gap: '1rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  unauthorizedContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    gap: '1rem',
    textAlign: 'center'
  },
  unauthorizedTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  unauthorizedText: {
    color: '#6b7280',
    margin: 0
  },
  homeLink: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    borderRadius: '0.375rem',
    textDecoration: 'none',
    fontWeight: '500',
    marginTop: '1rem'
  },
  header: {
    maxWidth: '600px',
    margin: '0 auto 2rem',
    textAlign: 'center'
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 0.5rem'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: 0
  },
  main: {
    maxWidth: '600px',
    margin: '0 auto'
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '0.375rem',
    marginBottom: '1.5rem',
    color: '#991b1b'
  },
  retryButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '0.375rem',
    marginTop: '1.5rem',
    color: '#166534'
  },
  successIcon: {
    fontSize: '1.25rem',
    fontWeight: '700'
  }
};
