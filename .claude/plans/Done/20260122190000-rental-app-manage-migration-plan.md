# Migration Plan: _rental-app-manage → Split Lease Monorepo

**Created**: 2026-01-22 19:00:00
**Status**: Planning
**Source**: https://github.com/splitleasesharath/_rental-app-manage.git
**Target**: Split Lease Monorepo (Islands Architecture)

---

## Executive Summary

This plan details the migration of the standalone rental application management dashboard from an external repository into the Split Lease monorepo. The migration requires significant architectural transformation from a React SPA with mock data to an Islands Architecture page with real Supabase backend integration.

---

## Part 1: Architecture Comparison & Gap Analysis

### 1.1 High-Level Architecture Differences

| Aspect | Source (_rental-app-manage) | Target (Split Lease) | Migration Effort |
|--------|----------------------------|---------------------|------------------|
| **Build System** | Vite SPA | Vite Islands (MPA) | Medium |
| **Language** | TypeScript | JavaScript (JSX) | Medium |
| **State Management** | React Context (2 providers) | Hollow Component + Logic Hook | High |
| **Data Layer** | Mock in-memory API | Supabase + Edge Functions | High |
| **Authentication** | None | Supabase Auth + Admin Check | Medium |
| **Routing** | None (single page) | Route Registry | Low |
| **Styling** | Plain CSS (7 files) | CSS Modules/Scoped CSS | Low |
| **Components** | 5 main components | Hollow pattern required | Medium |

### 1.2 Component Mapping

| Source Component | Target Location | Transformation Required |
|-----------------|-----------------|------------------------|
| `RentalAppManagePage.tsx` | `islands/pages/ManageRentalApplicationsPage/ManageRentalApplicationsPage.jsx` | Convert to hollow component |
| `ApplicationContext.tsx` | `useManageRentalApplicationsPageLogic.js` | Merge into logic hook |
| `AlertContext.tsx` | Use existing `ToastProvider` | Replace with existing |
| `SearchFilters.tsx` | `components/SearchFilters.jsx` | Convert to JSX, remove Context |
| `ApplicationsTable.tsx` | `components/ApplicationsTable.jsx` | Convert to JSX, props-based |
| `ApplicationDetailView.tsx` | `components/ApplicationDetailView.jsx` | Convert to JSX, props-based |
| `EditPanel.tsx` | `modals/EditApplicationModal.jsx` | Convert to JSX, props-based |
| `AlertNotification.tsx` | Remove (use existing Toast) | Delete |

### 1.3 Data Model Comparison

The source uses TypeScript interfaces. We need to map these to Supabase table structures.

**Source TypeScript Types** → **Target Supabase Tables**:

| Source Type | Supabase Table | Notes |
|-------------|---------------|-------|
| `RentalApplication` | `rental_applications` | Main entity - needs schema creation |
| `User` (guest) | `profiles` or `users` | Existing auth users table |
| `PersonalInfo` | Embedded in `rental_applications` | JSONB column |
| `Address` | Embedded or separate `addresses` table | Decision needed |
| `Employment` | `rental_application_employment` | One-to-many |
| `Reference` | `rental_application_references` | One-to-many |
| `Occupant` | `rental_application_occupants` | One-to-many |
| `Accessibility` | Embedded in `rental_applications` | JSONB column |

---

## Part 2: Detailed Migration Tasks

### Phase 1: Infrastructure Setup (Foundation)

#### Task 1.1: Create Route Entry
**File**: `app/src/routes.config.js`

Add new route configuration:
```javascript
{
  path: '/_internal/manage-rental-applications',
  file: 'manage-rental-applications.html',
  aliases: ['/_internal/manage-rental-applications.html'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'manage-rental-applications-view',
  hasDynamicSegment: false
}
```

**Post-task**: Run `bun run generate-routes`

#### Task 1.2: Create HTML Shell
**File**: `app/public/manage-rental-applications.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Manage Rental Applications | Split Lease</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/manage-rental-applications.jsx"></script>
</body>
</html>
```

#### Task 1.3: Create Entry Point
**File**: `app/src/manage-rental-applications.jsx`

```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import ManageRentalApplicationsPage from './islands/pages/ManageRentalApplicationsPage/ManageRentalApplicationsPage.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';
import { ToastProvider } from './islands/shared/Toast';

import './styles/main.css';
import './styles/pages/manage-rental-applications.css';
import './lib/config.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <ManageRentalApplicationsPage />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
```

---

### Phase 2: Database Schema (Supabase)

#### Task 2.1: Create rental_applications Table

**Migration**: `supabase/migrations/YYYYMMDDHHMMSS_create_rental_applications.sql`

```sql
-- Core rental applications table
CREATE TABLE rental_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_id TEXT UNIQUE NOT NULL,  -- Human-readable ID like "RA-XXXXXX-YYYY"

  -- Foreign keys
  guest_id UUID REFERENCES auth.users(id),
  listing_id UUID REFERENCES listings(id),  -- If applicable

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'in-progress', 'submitted', 'under-review',
    'approved', 'conditionally-approved', 'denied', 'withdrawn', 'expired'
  )),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  is_completed BOOLEAN DEFAULT FALSE,

  -- Personal info (JSONB for flexibility)
  personal_info JSONB DEFAULT '{}',
  current_address JSONB DEFAULT '{}',
  previous_addresses JSONB DEFAULT '[]',
  accessibility JSONB DEFAULT '{}',
  emergency_contact JSONB DEFAULT '{}',

  -- Financial
  monthly_income NUMERIC(10,2) DEFAULT 0,
  additional_income NUMERIC(10,2) DEFAULT 0,
  total_monthly_income NUMERIC(10,2) GENERATED ALWAYS AS (monthly_income + COALESCE(additional_income, 0)) STORED,

  -- Background checks
  has_eviction BOOLEAN DEFAULT FALSE,
  has_felony BOOLEAN DEFAULT FALSE,
  has_bankruptcy BOOLEAN DEFAULT FALSE,

  -- Consents
  background_check_consent BOOLEAN DEFAULT FALSE,
  credit_check_consent BOOLEAN DEFAULT FALSE,
  terms_accepted BOOLEAN DEFAULT FALSE,
  signature_date TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_rental_applications_guest_id ON rental_applications(guest_id);
CREATE INDEX idx_rental_applications_status ON rental_applications(status);
CREATE INDEX idx_rental_applications_unique_id ON rental_applications(unique_id);
CREATE INDEX idx_rental_applications_created_at ON rental_applications(created_at DESC);

-- Updated trigger
CREATE TRIGGER update_rental_applications_updated_at
  BEFORE UPDATE ON rental_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Task 2.2: Create Related Tables

**Employment Table**:
```sql
CREATE TABLE rental_application_employment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES rental_applications(id) ON DELETE CASCADE,
  employer_name TEXT,
  position TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  monthly_income NUMERIC(10,2),
  supervisor_name TEXT,
  supervisor_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employment_application_id ON rental_application_employment(application_id);
```

**References Table**:
```sql
CREATE TABLE rental_application_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES rental_applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  email TEXT,
  years_known INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_references_application_id ON rental_application_references(application_id);
```

**Occupants Table**:
```sql
CREATE TABLE rental_application_occupants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES rental_applications(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  relationship TEXT,
  is_applicant BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_occupants_application_id ON rental_application_occupants(application_id);
```

#### Task 2.3: RLS Policies

```sql
-- Admin can read all applications
CREATE POLICY "Admins can view all applications"
  ON rental_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can update all applications
CREATE POLICY "Admins can update all applications"
  ON rental_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Guests can view their own applications
CREATE POLICY "Guests can view own applications"
  ON rental_applications FOR SELECT
  TO authenticated
  USING (guest_id = auth.uid());
```

---

### Phase 3: Edge Function (Backend API)

#### Task 3.1: Create rental-applications Edge Function
**File**: `supabase/functions/rental-applications/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, payload } = await req.json();

    switch (action) {
      case 'list': {
        // Paginated list with filters
        const { filters, sort, pagination } = payload;
        let query = supabase
          .from('rental_applications')
          .select('*, guest:profiles!guest_id(email, full_name)', { count: 'exact' });

        // Apply filters
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.isCompleted !== undefined) query = query.eq('is_completed', filters.isCompleted);
        if (filters?.name) query = query.ilike('personal_info->>firstName', `%${filters.name}%`);
        if (filters?.email) query = query.ilike('guest.email', `%${filters.email}%`);
        if (filters?.uniqueId) query = query.ilike('unique_id', `%${filters.uniqueId}%`);
        if (filters?.minIncome) query = query.gte('total_monthly_income', filters.minIncome);

        // Apply sorting
        if (sort?.field) {
          query = query.order(sort.field, { ascending: sort.direction === 'asc' });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        // Apply pagination
        const page = pagination?.page || 1;
        const pageSize = pagination?.pageSize || 20;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            data,
            pagination: {
              page,
              pageSize,
              total: count,
              totalPages: Math.ceil((count || 0) / pageSize)
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        // Get single application with related data
        const { id } = payload;

        const [appResult, employmentResult, referencesResult, occupantsResult] = await Promise.all([
          supabase
            .from('rental_applications')
            .select('*, guest:profiles!guest_id(email, full_name)')
            .eq('id', id)
            .single(),
          supabase
            .from('rental_application_employment')
            .select('*')
            .eq('application_id', id)
            .order('is_current', { ascending: false }),
          supabase
            .from('rental_application_references')
            .select('*')
            .eq('application_id', id),
          supabase
            .from('rental_application_occupants')
            .select('*')
            .eq('application_id', id)
        ]);

        if (appResult.error) throw appResult.error;

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...appResult.data,
              employment: employmentResult.data || [],
              references: referencesResult.data || [],
              occupants: occupantsResult.data || []
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { id, updates } = payload;

        const { data, error } = await supabase
          .from('rental_applications')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_status': {
        const { id, status } = payload;

        const { data, error } = await supabase
          .from('rental_applications')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'add_occupant': {
        const { applicationId, occupant } = payload;

        const { data, error } = await supabase
          .from('rental_application_occupants')
          .insert({ application_id: applicationId, ...occupant })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_occupant': {
        const { occupantId } = payload;

        const { error } = await supabase
          .from('rental_application_occupants')
          .delete()
          .eq('id', occupantId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### Phase 4: Frontend Components (Islands Architecture)

#### Task 4.1: Create Page Directory Structure

```
app/src/islands/pages/ManageRentalApplicationsPage/
├── ManageRentalApplicationsPage.jsx      # Hollow component
├── useManageRentalApplicationsPageLogic.js  # All logic
├── components/
│   ├── SearchFilters.jsx
│   ├── ApplicationsTable.jsx
│   └── ApplicationDetailView.jsx
└── modals/
    └── EditApplicationModal.jsx
```

#### Task 4.2: Create Hollow Page Component
**File**: `app/src/islands/pages/ManageRentalApplicationsPage/ManageRentalApplicationsPage.jsx`

```javascript
import React from 'react';
import { useManageRentalApplicationsPageLogic } from './useManageRentalApplicationsPageLogic.js';
import SearchFilters from './components/SearchFilters.jsx';
import ApplicationsTable from './components/ApplicationsTable.jsx';
import ApplicationDetailView from './components/ApplicationDetailView.jsx';
import EditApplicationModal from './modals/EditApplicationModal.jsx';

export default function ManageRentalApplicationsPage() {
  const logic = useManageRentalApplicationsPageLogic();

  // Loading state
  if (logic.isInitializing) {
    return (
      <div className="manage-rental-apps__loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // Unauthorized
  if (!logic.isAuthorized) {
    return (
      <div className="manage-rental-apps__unauthorized">
        <p>You are not authorized to view this page.</p>
      </div>
    );
  }

  return (
    <div className="manage-rental-apps">
      <header className="manage-rental-apps__header">
        <h1>Manage Rental Applications</h1>
      </header>

      <main className="manage-rental-apps__main">
        {logic.error && (
          <div className="manage-rental-apps__error-banner">
            {logic.error}
          </div>
        )}

        <SearchFilters
          filters={logic.filters}
          onUpdateFilters={logic.handleUpdateFilters}
          onClearFilters={logic.handleClearFilters}
        />

        {logic.viewMode === 'list' ? (
          <ApplicationsTable
            applications={logic.applications}
            isLoading={logic.isLoading}
            pagination={logic.pagination}
            sort={logic.sort}
            onSelectApplication={logic.handleSelectApplication}
            onUpdateSort={logic.handleUpdateSort}
            onChangePage={logic.handleChangePage}
            onChangePageSize={logic.handleChangePageSize}
          />
        ) : (
          <ApplicationDetailView
            application={logic.selectedApplication}
            isLoading={logic.isLoadingDetail}
            onBack={logic.handleBackToList}
            onEdit={logic.handleOpenEditModal}
            onUpdateStatus={logic.handleUpdateStatus}
          />
        )}
      </main>

      {logic.isEditModalOpen && (
        <EditApplicationModal
          application={logic.selectedApplication}
          editSection={logic.editSection}
          onClose={logic.handleCloseEditModal}
          onSave={logic.handleSaveEdit}
          onAddOccupant={logic.handleAddOccupant}
          onDeleteOccupant={logic.handleDeleteOccupant}
        />
      )}
    </div>
  );
}
```

#### Task 4.3: Create Logic Hook
**File**: `app/src/islands/pages/ManageRentalApplicationsPage/useManageRentalApplicationsPageLogic.js`

```javascript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { checkAuthStatus, getUserType } from '../../../lib/auth.js';
import { useToast } from '../../shared/Toast/index.js';

const DEFAULT_FILTERS = {
  name: '',
  email: '',
  uniqueId: '',
  status: '',
  isCompleted: 'all',
  minIncome: ''
};

const DEFAULT_SORT = {
  field: 'created_at',
  direction: 'desc'
};

const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
};

export function useManageRentalApplicationsPageLogic() {
  const { showToast } = useToast();

  // Auth state
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Data state
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState(null);

  // UI state
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);

  // Check authorization on mount
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const isLoggedIn = await checkAuthStatus();
        if (!isLoggedIn) {
          window.location.href = '/';
          return;
        }

        const userType = getUserType();
        // TODO: Implement proper admin check
        // For now, allow all authenticated users
        setIsAuthorized(true);
      } catch (err) {
        console.error('Auth check failed:', err);
        setIsAuthorized(false);
      } finally {
        setIsInitializing(false);
      }
    };

    verifyAccess();
  }, []);

  // Fetch applications when filters/sort/pagination change
  const fetchApplications = useCallback(async () => {
    if (!isAuthorized) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('rental-applications', {
        body: {
          action: 'list',
          payload: {
            filters: {
              ...filters,
              isCompleted: filters.isCompleted === 'all' ? undefined : filters.isCompleted === 'true'
            },
            sort,
            pagination: {
              page: pagination.page,
              pageSize: pagination.pageSize
            }
          }
        }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      setApplications(data.data);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      }));
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setError('Failed to load applications. Please try again.');
      showToast({ type: 'error', message: 'Failed to load applications' });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, filters, sort, pagination.page, pagination.pageSize, showToast]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Handlers
  const handleUpdateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleUpdateSort = useCallback((field) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleChangePage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handleChangePageSize = useCallback((pageSize) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const handleSelectApplication = useCallback(async (id) => {
    setIsLoadingDetail(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('rental-applications', {
        body: {
          action: 'get',
          payload: { id }
        }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      setSelectedApplication(data.data);
      setViewMode('detail');
    } catch (err) {
      console.error('Failed to fetch application:', err);
      showToast({ type: 'error', message: 'Failed to load application details' });
    } finally {
      setIsLoadingDetail(false);
    }
  }, [showToast]);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedApplication(null);
  }, []);

  const handleOpenEditModal = useCallback((section) => {
    setEditSection(section);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditSection(null);
  }, []);

  const handleSaveEdit = useCallback(async (updates) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('rental-applications', {
        body: {
          action: 'update',
          payload: {
            id: selectedApplication.id,
            updates
          }
        }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      setSelectedApplication(prev => ({ ...prev, ...data.data }));
      showToast({ type: 'success', message: 'Application updated successfully' });
      handleCloseEditModal();
    } catch (err) {
      console.error('Failed to update application:', err);
      showToast({ type: 'error', message: 'Failed to update application' });
    }
  }, [selectedApplication, showToast, handleCloseEditModal]);

  const handleUpdateStatus = useCallback(async (status) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('rental-applications', {
        body: {
          action: 'update_status',
          payload: {
            id: selectedApplication.id,
            status
          }
        }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      setSelectedApplication(prev => ({ ...prev, status: data.data.status }));
      showToast({ type: 'success', message: `Status updated to ${status}` });
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast({ type: 'error', message: 'Failed to update status' });
    }
  }, [selectedApplication, showToast]);

  const handleAddOccupant = useCallback(async (occupant) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('rental-applications', {
        body: {
          action: 'add_occupant',
          payload: {
            applicationId: selectedApplication.id,
            occupant
          }
        }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      setSelectedApplication(prev => ({
        ...prev,
        occupants: [...prev.occupants, data.data]
      }));
      showToast({ type: 'success', message: 'Occupant added' });
    } catch (err) {
      console.error('Failed to add occupant:', err);
      showToast({ type: 'error', message: 'Failed to add occupant' });
    }
  }, [selectedApplication, showToast]);

  const handleDeleteOccupant = useCallback(async (occupantId) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('rental-applications', {
        body: {
          action: 'delete_occupant',
          payload: { occupantId }
        }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      setSelectedApplication(prev => ({
        ...prev,
        occupants: prev.occupants.filter(o => o.id !== occupantId)
      }));
      showToast({ type: 'success', message: 'Occupant removed' });
    } catch (err) {
      console.error('Failed to delete occupant:', err);
      showToast({ type: 'error', message: 'Failed to remove occupant' });
    }
  }, [showToast]);

  return {
    // Auth
    isInitializing,
    isAuthorized,

    // Data
    applications,
    selectedApplication,
    isLoading,
    isLoadingDetail,
    error,

    // UI
    viewMode,
    filters,
    sort,
    pagination,
    isEditModalOpen,
    editSection,

    // Handlers
    handleUpdateFilters,
    handleClearFilters,
    handleUpdateSort,
    handleChangePage,
    handleChangePageSize,
    handleSelectApplication,
    handleBackToList,
    handleOpenEditModal,
    handleCloseEditModal,
    handleSaveEdit,
    handleUpdateStatus,
    handleAddOccupant,
    handleDeleteOccupant
  };
}
```

---

### Phase 5: Component Conversion (TypeScript → JavaScript)

#### Task 5.1: Convert SearchFilters
**Source**: `src/components/SearchFilters.tsx`
**Target**: `app/src/islands/pages/ManageRentalApplicationsPage/components/SearchFilters.jsx`

**Key Changes**:
1. Remove TypeScript types
2. Convert from Context-based to props-based
3. Use existing Split Lease form components if available
4. Remove `interface SearchFiltersProps`

#### Task 5.2: Convert ApplicationsTable
**Source**: `src/components/ApplicationsTable.tsx`
**Target**: `app/src/islands/pages/ManageRentalApplicationsPage/components/ApplicationsTable.jsx`

**Key Changes**:
1. Remove TypeScript
2. Props instead of Context
3. Use existing table styles
4. Map `formatDate`, `formatCurrency`, `getStatusColor` to Split Lease utilities

#### Task 5.3: Convert ApplicationDetailView
**Source**: `src/components/ApplicationDetailView.tsx`
**Target**: `app/src/islands/pages/ManageRentalApplicationsPage/components/ApplicationDetailView.jsx`

**Key Changes**:
1. Remove TypeScript
2. Props instead of Context
3. Map icons (Lucide → existing icon system or keep Lucide)
4. Adapt data structure to Supabase schema (JSONB fields)

#### Task 5.4: Convert EditPanel to Modal
**Source**: `src/components/EditPanel.tsx`
**Target**: `app/src/islands/pages/ManageRentalApplicationsPage/modals/EditApplicationModal.jsx`

**Key Changes**:
1. Remove TypeScript
2. Use existing Modal pattern from Split Lease
3. Props-based instead of Context

---

### Phase 6: Styling Migration

#### Task 6.1: Create Page Stylesheet
**File**: `app/src/styles/pages/manage-rental-applications.css`

Consolidate and adapt styles from:
- `RentalAppManagePage.css`
- `SearchFilters.css`
- `ApplicationsTable.css`
- `ApplicationDetailView.css`
- `EditPanel.css`

**Adaptations**:
- Use CSS custom properties from `variables.css`
- Follow Split Lease naming conventions
- Remove AlertNotification styles (using Toast)
- Ensure responsive design matches existing patterns

---

## Part 3: Discrepancy Resolution

### 3.1 Data Structure Discrepancies

| Source Field | Target Field | Transformation |
|--------------|--------------|----------------|
| `guest.firstName` + `guest.lastName` | `profiles.full_name` | May need to split or use combined |
| `personalInfo` (object) | `personal_info` (JSONB) | Direct mapping, snake_case |
| `currentAddress` | `current_address` | Direct mapping, snake_case |
| `previousAddresses[]` | `previous_addresses` (JSONB array) | Direct mapping |
| `monthlyIncome` | `monthly_income` | Numeric type |
| `createdAt` (Date) | `created_at` (TIMESTAMPTZ) | ISO format |
| `uniqueId` pattern | `unique_id` generation | Need function to generate |

### 3.2 API Discrepancies

| Source API | Target Implementation |
|------------|----------------------|
| Mock `getApplications()` | Edge Function `action: 'list'` |
| Mock `getApplicationById(id)` | Edge Function `action: 'get'` |
| Mock `updateApplication(id, updates)` | Edge Function `action: 'update'` |
| Mock `addOccupant()` | Edge Function `action: 'add_occupant'` |
| Mock `deleteOccupant()` | Edge Function `action: 'delete_occupant'` |
| Mock `updateStatus()` | Edge Function `action: 'update_status'` |

### 3.3 Authentication Discrepancies

| Source | Target |
|--------|--------|
| No auth | Supabase Auth required |
| No role check | Admin role check required |
| Public access | `adminOnly: true` in routes |

### 3.4 State Management Discrepancies

| Source (Context) | Target (Logic Hook) |
|------------------|---------------------|
| `ApplicationContext.applications` | `useLogic().applications` |
| `ApplicationContext.filters` | `useLogic().filters` |
| `ApplicationContext.fetchApplications()` | Internal to hook, auto-triggered |
| `ApplicationContext.updateFilters()` | `useLogic().handleUpdateFilters()` |
| `AlertContext.showAlert()` | `useToast().showToast()` |

### 3.5 Utility Function Mapping

| Source Util | Target Location | Notes |
|-------------|-----------------|-------|
| `formatDate()` | `lib/formatters.js` or inline | Check if exists |
| `formatCurrency()` | `lib/formatters.js` or inline | Check if exists |
| `getStatusColor()` | Inline in component | CSS classes |
| `getInitials()` | Inline or utility | Simple function |

---

## Part 4: Testing & Validation

### 4.1 Pre-Migration Checklist

- [ ] Verify database schema with Supabase MCP
- [ ] Confirm RLS policies are correct
- [ ] Test Edge Function locally
- [ ] Verify auth integration works

### 4.2 Post-Migration Checklist

- [ ] Route loads at `/_internal/manage-rental-applications`
- [ ] Authentication redirects unauthorized users
- [ ] List view displays applications
- [ ] Filters work correctly
- [ ] Sorting works correctly
- [ ] Pagination works correctly
- [ ] Detail view loads application
- [ ] Edit modal opens and saves
- [ ] Add/remove occupant works
- [ ] Status update works
- [ ] Toast notifications display
- [ ] Mobile responsiveness works
- [ ] No console errors

---

## Part 5: File Reference Index

### Source Files (External Repo)
```
_rental-app-manage/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── AlertNotification.tsx
│   │   ├── ApplicationsTable.tsx
│   │   ├── ApplicationDetailView.tsx
│   │   ├── EditPanel.tsx
│   │   └── SearchFilters.tsx
│   ├── context/
│   │   ├── ApplicationContext.tsx
│   │   └── AlertContext.tsx
│   ├── hooks/
│   │   └── useUrlParams.ts
│   ├── pages/
│   │   └── RentalAppManagePage.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── mockData.ts
│   ├── styles/
│   │   └── *.css (7 files)
│   ├── types/
│   │   └── rental-application.types.ts
│   └── utils/
│       └── formatters.ts
└── package.json
```

### Target Files (Split Lease)
```
Split Lease/
├── app/
│   ├── public/
│   │   └── manage-rental-applications.html (NEW)
│   ├── src/
│   │   ├── manage-rental-applications.jsx (NEW)
│   │   ├── routes.config.js (MODIFY)
│   │   ├── islands/pages/
│   │   │   └── ManageRentalApplicationsPage/ (NEW)
│   │   │       ├── ManageRentalApplicationsPage.jsx
│   │   │       ├── useManageRentalApplicationsPageLogic.js
│   │   │       ├── components/
│   │   │       │   ├── SearchFilters.jsx
│   │   │       │   ├── ApplicationsTable.jsx
│   │   │       │   └── ApplicationDetailView.jsx
│   │   │       └── modals/
│   │   │           └── EditApplicationModal.jsx
│   │   └── styles/pages/
│   │       └── manage-rental-applications.css (NEW)
├── supabase/
│   ├── migrations/
│   │   └── YYYYMMDDHHMMSS_create_rental_applications.sql (NEW)
│   └── functions/
│       └── rental-applications/ (NEW)
│           └── index.ts
```

---

## Part 6: Execution Order

### Recommended Implementation Sequence

1. **Phase 2**: Database Schema (can be done independently)
2. **Phase 3**: Edge Function (depends on Phase 2)
3. **Phase 1**: Infrastructure Setup (routes, HTML, entry point)
4. **Phase 4.3**: Logic Hook (core functionality)
5. **Phase 4.2**: Hollow Component (depends on 4.3)
6. **Phase 5**: Component Conversion (can be parallelized)
7. **Phase 6**: Styling Migration
8. **Testing & Validation**

### Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1 | 3 | Low |
| Phase 2 | 3 | Medium |
| Phase 3 | 1 | High |
| Phase 4 | 3 | High |
| Phase 5 | 4 | Medium |
| Phase 6 | 1 | Low |
| Testing | - | Medium |

---

## Decision Points Requiring User Input

1. **Database Design**: Should addresses be stored as JSONB in the main table or as a separate `rental_application_addresses` table?

2. **Admin Role Check**: What field/table defines admin users? Is there a `profiles.role` column or similar?

3. **Unique ID Generation**: Should the `RA-XXXXXX-YYYY` pattern be generated by:
   - Database trigger?
   - Edge Function?
   - Client-side before submit?

4. **Listing Association**: Should rental applications be linked to specific listings? (The source doesn't have this, but it may be needed)

5. **Icon Library**: Keep Lucide React icons or replace with existing Split Lease icon system?

6. **URL Parameters**: Support loading a specific application via URL query param (like source's `?id=`)?

---

**End of Migration Plan**
