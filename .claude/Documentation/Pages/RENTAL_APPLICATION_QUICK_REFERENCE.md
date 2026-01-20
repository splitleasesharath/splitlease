# Rental Application Page - Quick Reference

**GENERATED**: 2026-01-20
**PAGE_URL**: `/rental-application?proposal={proposalId}`
**ENTRY_POINT**: `app/src/rental-application.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
rental-application.jsx (Entry Point)
    |
    +-- RentalApplicationPage.jsx (Hollow Component)
            |
            +-- useRentalApplicationPageLogic.js (Business Logic Hook)
            |       +-- Auth validation via checkAuthStatus()
            |       +-- Form state management
            |       +-- Validation logic
            |       +-- Progress tracking
            |       +-- File upload handling
            |       +-- Verification status tracking
            |       +-- Auto-save functionality (localStorage)
            |       +-- User data pre-population (Supabase)
            |       +-- Form submission
            |
            +-- UI Components
                +-- Header.jsx (Site navigation + auth modal)
                +-- Page Header (Icon + title + subtitle)
                +-- Form Container (70% width)
                |       +-- Personal Information Section
                |       +-- Current Address Section
                |       +-- Additional Occupants Section
                |       +-- Employment Information Section
                |       +-- Optional Verification Section
                |       +-- Special Requirements Section
                |       +-- References Section
                |       +-- Signature Section
                |       +-- Submit Button
                +-- Sidebar Status (28% width, sticky)
                |       +-- Application Status (Progress bar)
                |       +-- Verification Summary
                |       +-- Required Documents
                +-- Success Modal
                +-- Footer.jsx
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/rental-application.jsx` | Mounts RentalApplicationPage to #rental-application-page |

### Page Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/RentalApplicationPage.jsx` | Main hollow component (1133 lines) |
| `app/src/islands/pages/useRentalApplicationPageLogic.js` | Core business logic hook (677 lines) |

### HTML Template
| File | Purpose |
|------|---------|
| `app/public/rental-application.html` | HTML entry with div id="rental-application-page" |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/components/rental-application.css` | Complete page styling (1030 lines) |

### Related Navigation
| File | Purpose |
|------|---------|
| `app/src/lib/navigation.js` | `goToRentalApplication(proposalId)` function |
| `app/src/logic/workflows/proposals/navigationWorkflow.js` | `navigateToRentalApplication(proposalId)` |

---

## ### URL_ROUTING ###

```
/rental-application                    # New application (standalone)
/rental-application?proposal={id}      # Application linked to proposal
```

### Route Configuration (routes.config.js)
```javascript
{
  path: '/rental-application',
  file: 'rental-application.html',
  aliases: ['/rental-application.html'],
  protected: true,                    // Requires authentication
  cloudflareInternal: false,
  hasDynamicSegment: false
}
```

### Navigation Functions
```javascript
// From lib/navigation.js
import { goToRentalApplication } from 'lib/navigation.js'
goToRentalApplication(proposalId)  // /rental-application?proposal={proposalId}
goToRentalApplication()            // /rental-application (standalone)

// From workflows
import { navigateToRentalApplication } from 'logic/workflows/proposals/navigationWorkflow.js'
navigateToRentalApplication(proposalId)  // /rental-app-new-design?proposal={proposalId}
// NOTE: navigationWorkflow uses legacy URL /rental-app-new-design
```

---

## ### FORM_SECTIONS ###

### Section 1: Personal Information
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `fullName` | text | Yes | Non-empty |
| `dob` | date | Yes | Valid date |
| `email` | email | Yes | Email regex |
| `phone` | tel | Yes | Min 10 chars |

### Section 2: Current Address
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `currentAddress` | text | Yes | Non-empty |
| `apartmentUnit` | text | No | - |
| `lengthResided` | text | Yes | Non-empty |
| `renting` | radio (yes/no) | Yes | - |

### Section 3: Additional Occupants
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `occupants[]` | array | No | Max 6 total |
| `occupant.name` | text | No | - |
| `occupant.relationship` | select | No | From RELATIONSHIP_OPTIONS |

### Section 4: Employment Information
| Field | Type | Required | Conditional |
|-------|------|----------|-------------|
| `employmentStatus` | select | Yes | From EMPLOYMENT_STATUS_OPTIONS |

#### Conditional Fields by Employment Status:

**Full-time / Part-time / Intern:**
| Field | Type | Required |
|-------|------|----------|
| `employerName` | text | Yes |
| `employerPhone` | tel | Yes |
| `jobTitle` | text | Yes |
| `monthlyIncome` | number | Yes |
| `employmentProof` | file | No |

**Business Owner:**
| Field | Type | Required |
|-------|------|----------|
| `businessName` | text | Yes |
| `businessYear` | number | Yes |
| `businessState` | text | Yes |
| `monthlyIncomeSelf` | number | No |
| `companyStake` | radio | No |
| `slForBusiness` | radio | No |
| `taxForms` | radio | No |
| `alternateGuarantee` | file | No |

**Student / Unemployed / Other:**
| Field | Type | Required |
|-------|------|----------|
| `alternateIncome` | text | No |
| `altGuarantee` | file | No |

### Section 5: Optional Verification
| Service | Button Class | Connected State |
|---------|--------------|-----------------|
| LinkedIn | `.btn-linkedin` | `.connected` |
| Facebook | `.btn-facebook` | `.connected` |
| ID Verification | `.btn-primary` | Verified |
| Income Verification | `.btn-primary` | Verified |

### Section 6: Special Requirements
| Field | Type | Options |
|-------|------|---------|
| `hasPets` | select | yes/no/empty |
| `isSmoker` | select | yes/no/empty |
| `needsParking` | select | yes/no/empty |

### Section 7: References
| Field | Type | Required |
|-------|------|----------|
| `references` | textarea | No |
| `showVisualReferences` | toggle | No |
| `references[]` | files (multiple) | No |
| `showCreditScore` | toggle | No |
| `creditScore` | file | No |

### Section 8: Signature
| Field | Type | Required | Style |
|-------|------|----------|-------|
| `signature` | text | Yes | Cursive (signature-input class) |

---

## ### CONSTANTS ###

### Required Fields
```javascript
const REQUIRED_FIELDS = [
  'fullName',
  'dob',
  'email',
  'phone',
  'currentAddress',
  'lengthResided',
  'employmentStatus',
  'signature',
  'renting'
];
```

### Conditional Required Fields
```javascript
const CONDITIONAL_REQUIRED_FIELDS = {
  'full-time': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'part-time': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'intern': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'business-owner': ['businessName', 'businessYear', 'businessState']
  // student, unemployed, other: no required fields
};
```

### Relationship Options
```javascript
const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Select relationship' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'partner', label: 'Partner' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'roommate', label: 'Roommate' },
  { value: 'other', label: 'Other' }
];
```

### Employment Status Options
```javascript
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Select employment status' },
  { value: 'full-time', label: 'Full-time Employee' },
  { value: 'part-time', label: 'Part-time Employee' },
  { value: 'business-owner', label: 'Business Owner' },
  { value: 'intern', label: 'Intern' },
  { value: 'student', label: 'Student' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'other', label: 'Other' }
];
```

### Other Constants
```javascript
const MAX_OCCUPANTS = 6;
const AUTO_SAVE_DELAY = 500;  // milliseconds
const STORAGE_KEY = 'rentalApplicationData';
const STORAGE_TIMESTAMP_KEY = 'rentalApplicationTimestamp';
```

---

## ### STATE_MANAGEMENT ###

### Form Data State
```javascript
const [formData, setFormData] = useState({
  // Personal Information
  fullName: '',
  dob: '',
  email: '',
  phone: '',
  // Current Address
  currentAddress: '',
  apartmentUnit: '',
  lengthResided: '',
  renting: '',
  // Employment Information
  employmentStatus: '',
  // Employed fields
  employerName: '',
  employerPhone: '',
  jobTitle: '',
  monthlyIncome: '',
  // Self-employed fields
  businessName: '',
  businessYear: '',
  businessState: '',
  monthlyIncomeSelf: '',
  companyStake: '',
  slForBusiness: '',
  taxForms: '',
  // Unemployed/Student fields
  alternateIncome: '',
  // Special requirements (dropdowns: yes/no/empty)
  hasPets: '',
  isSmoker: '',
  needsParking: '',
  // References
  references: '',
  showVisualReferences: false,  // Toggle for visual references upload
  showCreditScore: false,       // Toggle for credit score upload
  // Signature
  signature: ''
});
```

### Occupants State
```javascript
const [occupants, setOccupants] = useState([]);
// Each occupant: { id: string, name: string, relationship: string }
```

### Verification State
```javascript
const [verificationStatus, setVerificationStatus] = useState({
  linkedin: false,
  facebook: false,
  id: false,
  income: false
});

const [verificationLoading, setVerificationLoading] = useState({
  linkedin: false,
  facebook: false,
  id: false,
  income: false
});
```

### File Uploads State
```javascript
const [uploadedFiles, setUploadedFiles] = useState({
  employmentProof: null,       // File object
  alternateGuarantee: null,    // File object
  altGuarantee: null,          // File object
  creditScore: null,           // File object
  references: []               // Array of File objects
});
```

### Validation State
```javascript
const [fieldErrors, setFieldErrors] = useState({});  // { fieldName: 'error message' }
const [fieldValid, setFieldValid] = useState({});    // { fieldName: true/false }
```

### Form State
```javascript
const [isDirty, setIsDirty] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [submitSuccess, setSubmitSuccess] = useState(false);
const [submitError, setSubmitError] = useState(null);
```

---

## ### COMPUTED_VALUES ###

### Progress Calculation
```javascript
const calculateProgress = useCallback(() => {
  const employmentStatus = formData.employmentStatus;
  let totalFields = [...REQUIRED_FIELDS];

  // Add conditional fields based on employment status
  if (employmentStatus && CONDITIONAL_REQUIRED_FIELDS[employmentStatus]) {
    totalFields = [...totalFields, ...CONDITIONAL_REQUIRED_FIELDS[employmentStatus]];
  }

  let completedFields = 0;
  totalFields.forEach(fieldId => {
    const value = formData[fieldId];
    if (value !== undefined && value !== null && value !== '') {
      completedFields++;
    }
  });

  return Math.round((completedFields / totalFields.length) * 100);
}, [formData]);

const progress = calculateProgress();
const canSubmit = progress >= 80;  // 80% threshold for submission
```

### Document Status
```javascript
const documentStatus = {
  employment: uploadedFiles.employmentProof !== null || uploadedFiles.alternateGuarantee !== null,
  creditScore: uploadedFiles.creditScore !== null,
  signature: formData.signature.trim() !== ''
};
```

---

## ### HANDLERS ###

### Input Handlers
```javascript
// Text/select input change
handleInputChange(fieldName, value)

// Input blur (triggers validation)
handleInputBlur(fieldName)

// Toggle switch change
handleToggleChange(fieldName)

// Radio button change
handleRadioChange(fieldName, value)
```

### Occupant Handlers
```javascript
// Add new occupant
addOccupant()  // Max 6 total

// Remove occupant by ID
removeOccupant(occupantId)

// Update occupant field
updateOccupant(occupantId, field, value)
```

### File Handlers
```javascript
// Upload file(s)
handleFileUpload(uploadKey, files, multiple = false)

// Remove file
handleFileRemove(uploadKey, fileIndex = null)
```

### Verification Handlers
```javascript
// Trigger verification flow (simulated)
handleVerification(service)  // 'linkedin' | 'facebook' | 'id' | 'income'
```

### Form Handlers
```javascript
// Submit form
handleSubmit(event)

// Close success modal
closeSuccessModal()  // Navigates to /guest-proposals
```

---

## ### AUTO_SAVE_SYSTEM ###

### Storage Keys
```javascript
const STORAGE_KEY = 'rentalApplicationData';
const STORAGE_TIMESTAMP_KEY = 'rentalApplicationTimestamp';
```

### Auto-Save Logic
```javascript
// Debounced auto-save (500ms delay)
useEffect(() => {
  if (isDirty) {
    clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(autoSave, AUTO_SAVE_DELAY);
  }
  return () => clearTimeout(autoSaveTimeoutRef.current);
}, [isDirty, autoSave]);

// Save to localStorage (excludes File objects - cannot be serialized)
const autoSave = useCallback(() => {
  if (!isDirty) return;
  const dataToSave = { formData, occupants, verificationStatus };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
  setIsDirty(false);
}, [isDirty, formData, occupants, verificationStatus]);
```

### Load Saved Data
```javascript
// On mount, load saved data from localStorage
useEffect(() => {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (!savedData) return;
  const parsed = JSON.parse(savedData);
  if (parsed.formData) setFormData(prev => ({ ...prev, ...parsed.formData }));
  if (parsed.occupants) setOccupants(parsed.occupants);
  if (parsed.verificationStatus) setVerificationStatus(parsed.verificationStatus);
}, []);
```

### Unsaved Changes Warning
```javascript
useEffect(() => {
  const handleBeforeUnload = (event) => {
    if (isDirty) {
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return event.returnValue;
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isDirty]);
```

---

## ### USER_DATA_PRE_POPULATION ###

### Data Source
```javascript
// Fetches from Supabase 'user' table using session ID
const { data: userData, error } = await supabase
  .from('user')
  .select('*')
  .eq('_id', userId)
  .single();
```

### Pre-populated Fields
| Form Field | User Table Field |
|------------|------------------|
| `fullName` | `Name - Full` or `Name - First` + `Name - Last` |
| `email` | `email` or `email as text` |
| `phone` | `Phone Number (as text)` |
| `dob` | `Date of Birth` (formatted to YYYY-MM-DD) |

### Pre-population Logic
```javascript
// Only populate if field is empty (preserve manually entered data)
setFormData(prev => ({
  ...prev,
  fullName: prev.fullName || fullName || '',
  email: prev.email || userEmail || '',
  phone: prev.phone || userData['Phone Number (as text)'] || '',
  dob: prev.dob || dob || ''
}));
```

---

## ### VALIDATION_SYSTEM ###

### Field Validation Rules
```javascript
const validateField = useCallback((fieldName, value) => {
  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  // If empty and not required, skip validation
  const isRequired = REQUIRED_FIELDS.includes(fieldName) ||
    (CONDITIONAL_REQUIRED_FIELDS[formData.employmentStatus] || []).includes(fieldName);

  if (!trimmedValue && !isRequired) {
    return { isValid: true, error: null };
  }

  switch (fieldName) {
    case 'email':
      isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue);
      break;
    case 'phone':
    case 'employerPhone':
      isValid = trimmedValue.length >= 10;
      break;
    case 'dob':
      isValid = trimmedValue !== '' && !isNaN(Date.parse(trimmedValue));
      break;
    case 'monthlyIncome':
    case 'monthlyIncomeSelf':
    case 'businessYear':
      isValid = trimmedValue !== '' && !isNaN(parseFloat(trimmedValue));
      break;
    default:
      isValid = trimmedValue.length > 0;
  }

  return { isValid, error: isValid ? null : `Invalid ${fieldName}` };
}, [formData.employmentStatus]);
```

### Input Class Helper (in component)
```javascript
const getInputClassName = (fieldName) => {
  let className = 'form-input';
  if (fieldValid[fieldName]) className += ' valid';
  if (fieldErrors[fieldName]) className += ' error';
  return className;
};
```

---

## ### CSS_DESIGN_TOKENS ###

```css
:root {
  /* Primary Colors */
  --rental-app-header: #31135D;
  --rental-app-primary: #6D31C2;
  --rental-app-accent: #9780D2;
  --rental-app-linkedin: #0077B5;
  --rental-app-facebook: #1877F2;

  /* Status Colors */
  --rental-app-success: #4CAF50;
  --rental-app-error: #DC3545;
  --rental-app-warning: #FF8B00;

  /* Neutral Colors */
  --rental-app-white: #FFFFFF;
  --rental-app-background: #F5F5F5;
  --rental-app-border: #000000;
  --rental-app-border-light: #E0E0E0;
  --rental-app-text-primary: #3D3D3D;
  --rental-app-text-secondary: #757575;
  --rental-app-placeholder: #757575;
}
```

---

## ### CSS_CLASSES ###

### Layout Classes
| Class | Purpose |
|-------|---------|
| `.rental-app-main-content` | Main container (max-width: 1400px) |
| `.content-wrapper` | Flex container for form + sidebar |
| `.form-container` | Form wrapper (70% width) |
| `.sidebar-status` | Sidebar wrapper (28% width, sticky) |

### Form Section Classes
| Class | Purpose |
|-------|---------|
| `.form-section` | Section wrapper with white bg |
| `.section-title` | Section heading (20px, border-bottom) |
| `.section-description` | Section description text |
| `.form-row` | 2-column grid row |
| `.form-row-three` | 3-column grid row |
| `.form-group` | Individual field wrapper |
| `.form-group.full-width` | Span full width |

### Input Classes
| Class | Purpose |
|-------|---------|
| `.form-input` | Base input styling |
| `.form-input.valid` | Green border on valid |
| `.form-input.error` | Red border on error |
| `.form-textarea` | Textarea variant |
| `.form-select` | Dropdown styling |
| `.signature-input` | Cursive font styling |

### Button Classes
| Class | Purpose | Background |
|-------|---------|------------|
| `.btn-primary` | Primary action | Purple (#6D31C2) |
| `.btn-secondary` | Secondary action | Transparent w/ purple border |
| `.btn-linkedin` | LinkedIn connect | LinkedIn Blue (#0077B5) |
| `.btn-facebook` | Facebook connect | Facebook Blue (#1877F2) |
| `.btn-submit` | Submit form | Green (#28A745) |
| `.connected` | Connected state modifier | Green (#4CAF50) |

### Toggle Classes
| Class | Purpose |
|-------|---------|
| `.toggle-group` | Radio button group |
| `.toggle-option` | Individual radio option |
| `.toggle-switch` | iOS-style toggle |
| `.slider` | Toggle slider element |

### Upload Classes
| Class | Purpose |
|-------|---------|
| `.upload-box` | Dashed border upload area |
| `.upload-box.has-file` | Solid green border when file present |
| `.file-preview` | Uploaded file display |
| `.file-preview-item` | Individual file row |
| `.remove-file` | File remove button |

### Sidebar Classes
| Class | Purpose |
|-------|---------|
| `.sidebar-section` | Sidebar card |
| `.sidebar-title` | Sidebar heading |
| `.sidebar-progress` | Progress section |
| `.progress-bar-wrapper` | Progress bar container |
| `.progress-bar-fill` | Progress bar fill |
| `.verification-list` | Verification items list |
| `.verification-item` | Individual verification row |
| `.verification-item.completed` | Green styling when complete |
| `.documents-list` | Documents list |
| `.document-item` | Individual document row |

### Conditional Classes
| Class | Purpose |
|-------|---------|
| `.conditional-fields` | Animated appearance (fadeIn) |
| `.toggle-reveal-section` | Toggle-controlled section |
| `.toggle-reveal-row` | Toggle row layout |

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `< 1024px` | Content stacks vertically, sidebar moves to top |
| `< 768px` | Form rows become single column, verification buttons stack |

### 1024px Breakpoint
```css
@media (max-width: 1024px) {
  .content-wrapper { flex-direction: column; }
  .form-container, .sidebar-status { flex: 0 0 100%; max-width: 100%; }
  .sidebar-status { position: static; order: -1; }
  .requirements-grid { grid-template-columns: repeat(2, 1fr); }
}
```

### 768px Breakpoint
```css
@media (max-width: 768px) {
  .rental-app-main-content { padding: 15px; }
  .form-row, .form-row-three { grid-template-columns: 1fr; }
  .requirements-grid { grid-template-columns: 1fr; }
  .occupant-row { grid-template-columns: 1fr; }
  .verification-buttons, .verification-actions { flex-direction: column; }
  .page-title { font-size: 22px; }
}
```

---

## ### PROPOSAL_FLOW_INTEGRATION ###

### Status Triggers
The Rental Application page is triggered when proposal status is:
- `Proposal Submitted by guest - Awaiting Rental Application` (Stage 1)
- `Proposal Submitted for guest by Split Lease - Awaiting Rental Application` (Stage 1)

### Status After Submission
After successful rental application submission:
- Status changes to: `Rental Application Submitted` (Stage 2)

### Navigation from Guest Proposals
```javascript
// From proposalStatuses.js
PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP: {
  key: 'Proposal Submitted by guest - Awaiting Rental Application',
  actions: ['submit_rental_app', 'cancel_proposal', 'request_vm', 'send_message']
}

SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP: {
  key: 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
  actions: ['submit_rental_app', 'cancel_proposal', 'request_vm', 'send_message']
}
```

### Action Button Mapping
| Action ID | Button Label | Navigation |
|-----------|--------------|------------|
| `submit_rental_app` | "Submit Rental Application" | `/rental-application?proposal={id}` |

---

## ### KEY_IMPORTS ###

```javascript
// Entry point (rental-application.jsx)
import { createRoot } from 'react-dom/client';
import RentalApplicationPage from './islands/pages/RentalApplicationPage.jsx';
import { checkAuthStatus } from './lib/auth.js';
import './styles/components/rental-application.css';

// Page component (RentalApplicationPage.jsx)
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { useRentalApplicationPageLogic } from './useRentalApplicationPageLogic.js';

// Logic hook (useRentalApplicationPageLogic.js)
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase.js';
import { checkAuthStatus, getSessionId } from '../../lib/auth.js';

// Navigation
import { goToRentalApplication } from 'lib/navigation.js';
import { navigateToRentalApplication } from 'logic/workflows/proposals/navigationWorkflow.js';
```

---

## ### DATA_DEPENDENCIES ###

### Supabase Tables
- `user` - For pre-populating user data (fullName, email, phone, dob)

### LocalStorage
- `rentalApplicationData` - Auto-saved form data
- `rentalApplicationTimestamp` - Last save timestamp

### Authentication
- Requires authenticated session (`checkAuthStatus()`)
- Uses `getSessionId()` for user data fetch

---

## ### FORM_SUBMISSION ###

### Submission Data Structure
```javascript
const submissionData = {
  ...formData,
  occupants,
  verificationStatus,
  hasEmploymentProof: uploadedFiles.employmentProof !== null,
  hasAlternateGuarantee: uploadedFiles.alternateGuarantee !== null,
  hasCreditScore: uploadedFiles.creditScore !== null,
  referenceDocumentCount: uploadedFiles.references.length
};
```

### Success Flow
1. Validate all fields (`validateAllFields()`)
2. Submit to API (TODO: Edge Function - currently simulated)
3. Clear localStorage saved data
4. Show success modal
5. On modal close: navigate to `/guest-proposals`

### Error Handling
```javascript
setSubmitError('Failed to submit application. Please try again.');
// Or for validation errors:
setSubmitError('Please fill in all required fields correctly.');
```

---

## ### COMPONENT_PROPS ###

### RentalApplicationPage Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `requireAuth` | boolean | `false` | Whether to show auth modal if not logged in |
| `isAuthenticated` | boolean | `true` | Whether user is currently authenticated |

### Entry Point Behavior
```javascript
// Entry point passes auth status to component
createRoot(document.getElementById('rental-application-page')).render(
  <RentalApplicationPage requireAuth={true} isAuthenticated={isLoggedIn} />
);
```

---

## ### HOOK_RETURN_VALUES ###

The `useRentalApplicationPageLogic` hook returns:

```javascript
return {
  // Form data
  formData,
  occupants,
  verificationStatus,
  verificationLoading,
  uploadedFiles,

  // Validation
  fieldErrors,
  fieldValid,

  // Computed
  progress,
  canSubmit,
  documentStatus,

  // State
  isDirty,
  isSubmitting,
  submitSuccess,
  submitError,

  // Constants
  maxOccupants: MAX_OCCUPANTS,
  relationshipOptions: RELATIONSHIP_OPTIONS,
  employmentStatusOptions: EMPLOYMENT_STATUS_OPTIONS,

  // Input handlers
  handleInputChange,
  handleInputBlur,
  handleToggleChange,
  handleRadioChange,

  // Occupant handlers
  addOccupant,
  removeOccupant,
  updateOccupant,

  // File handlers
  handleFileUpload,
  handleFileRemove,

  // Verification handlers
  handleVerification,

  // Form handlers
  handleSubmit,
  closeSuccessModal
};
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Form not showing | Verify auth status, check console for auth errors |
| Fields not pre-populating | Check Supabase user data, verify getSessionId() |
| Auto-save not working | Check localStorage permissions, console logs |
| Progress stuck | Verify required fields are filled |
| Submit button disabled | Progress must be >= 80%, check canSubmit computed value |
| Validation not triggering | Check handleInputBlur is called onBlur |
| Employment fields not showing | Check employmentStatus value |
| Styling broken | Verify CSS import in entry point |
| Files not persisting | Files cannot be saved to localStorage, only form data persists |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Logic CLAUDE.md | `app/src/logic/CLAUDE.md` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Routes Config | `app/src/routes.config.js` |
| Navigation Utils | `app/src/lib/navigation.js` |
| Proposal Statuses | `app/src/logic/constants/proposalStatuses.js` |
| Proposal Stages | `app/src/logic/constants/proposalStages.js` |
| Proposal Rules | `app/src/logic/rules/proposals/proposalRules.js` |
| Navigation Workflow | `app/src/logic/workflows/proposals/navigationWorkflow.js` |
| Guest Proposals Reference | `Documentation/Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md` |

---

**VERSION**: 2.0
**LAST_UPDATED**: 2026-01-20
**STATUS**: Comprehensive - Updated to match current implementation
