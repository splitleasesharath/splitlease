/**
 * DaySelector Component - Usage Examples
 *
 * This file demonstrates various ways to use the DaySelector component
 */

import { useState } from 'preact/hooks';
import DaySelector from './DaySelector.jsx';
import { SCHEDULE_PATTERNS } from '../../lib/constants.js';

// ============================================================================
// Example 1: Basic Usage - Simple day selector with state
// ============================================================================
function BasicExample() {
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Monday-Friday

  return (
    <div>
      <h3>Basic Day Selector</h3>
      <DaySelector
        selected={selectedDays}
        onChange={setSelectedDays}
      />
      <p>Selected days: {selectedDays.join(', ')}</p>
    </div>
  );
}

// ============================================================================
// Example 2: With Label - Day selector with descriptive label
// ============================================================================
function LabeledExample() {
  const [selectedDays, setSelectedDays] = useState([0, 6]); // Sunday and Saturday

  return (
    <div>
      <DaySelector
        selected={selectedDays}
        onChange={setSelectedDays}
        label="Select your preferred days:"
      />
    </div>
  );
}

// ============================================================================
// Example 3: Pre-configured Patterns - Using constants for common patterns
// ============================================================================
function PatternExample() {
  // Convert 1-based Bubble API days to 0-based JavaScript days
  const weeknightPattern = SCHEDULE_PATTERNS.WEEKNIGHT.map(day => day - 1); // [0,1,2,3,4]
  const [selectedDays, setSelectedDays] = useState(weeknightPattern);

  const applyWeeknight = () => {
    const pattern = SCHEDULE_PATTERNS.WEEKNIGHT.map(day => day - 1);
    setSelectedDays(pattern);
  };

  const applyWeekend = () => {
    const pattern = SCHEDULE_PATTERNS.WEEKEND.map(day => day - 1);
    setSelectedDays(pattern);
  };

  const applyAllDays = () => {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  };

  return (
    <div>
      <h3>Pre-configured Patterns</h3>
      <div className="pattern-buttons">
        <button onClick={applyWeeknight}>Weeknight</button>
        <button onClick={applyWeekend}>Weekend</button>
        <button onClick={applyAllDays}>Monthly (All Days)</button>
      </div>
      <DaySelector
        selected={selectedDays}
        onChange={setSelectedDays}
        label="Your schedule:"
      />
    </div>
  );
}

// ============================================================================
// Example 4: URL Parameter Sync - Sync with URL parameters
// ============================================================================
function URLSyncExample() {
  const [selectedDays, setSelectedDays] = useState(() => {
    // Initialize from URL parameter
    const params = new URLSearchParams(window.location.search);
    const daysParam = params.get('days-selected');

    if (daysParam) {
      // Parse from URL (1-based) and convert to 0-based
      return daysParam.split(',').map(d => parseInt(d.trim()) - 1);
    }

    return [1, 2, 3, 4, 5]; // Default: Monday-Friday
  });

  const handleDayChange = (newDays) => {
    setSelectedDays(newDays);

    // Update URL parameter (convert to 1-based)
    const params = new URLSearchParams(window.location.search);
    const bubbleDays = newDays.map(day => day + 1);
    params.set('days-selected', bubbleDays.join(','));

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  return (
    <div>
      <h3>URL Parameter Sync</h3>
      <DaySelector
        selected={selectedDays}
        onChange={handleDayChange}
        label="Select days (syncs with URL):"
      />
      <p className="hint">Check the URL bar - it updates as you select days!</p>
    </div>
  );
}

// ============================================================================
// Example 5: With Validation - Enforce minimum selection
// ============================================================================
function ValidatedExample() {
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [error, setError] = useState('');

  const handleDayChange = (newDays) => {
    if (newDays.length < 2) {
      setError('Please select at least 2 days');
      return;
    }

    setError('');
    setSelectedDays(newDays);
  };

  return (
    <div>
      <h3>Validated Day Selector</h3>
      <DaySelector
        selected={selectedDays}
        onChange={handleDayChange}
        label="Select at least 2 days:"
      />
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

// ============================================================================
// Example 6: Read-only Display - Show selected days without interaction
// ============================================================================
function ReadOnlyExample() {
  const selectedDays = [1, 2, 3, 4, 5]; // Monday-Friday (static)

  return (
    <div>
      <h3>Read-only Display</h3>
      <DaySelector
        selected={selectedDays}
        onChange={null} // No onChange = read-only
        label="Your current schedule:"
        className="readonly"
      />
    </div>
  );
}

// ============================================================================
// Example 7: Full Integration - Complete form with submission
// ============================================================================
function FullFormExample() {
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Convert to 1-based for Bubble API
    const bubbleDays = selectedDays.map(day => day + 1);

    console.log('Submitting with days:', bubbleDays);

    // Redirect to search with selected days
    const searchUrl = `https://app.split.lease/search?days-selected=${bubbleDays.join(',')}`;
    window.location.href = searchUrl;
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selectedDayNames = selectedDays.map(day => dayNames[day]).join(', ');

  return (
    <form onSubmit={handleSubmit}>
      <h3>Find Your Perfect Split Lease</h3>

      <DaySelector
        selected={selectedDays}
        onChange={setSelectedDays}
        label="Which days would you like to stay?"
      />

      <div className="selection-summary">
        <p><strong>Selected:</strong> {selectedDayNames}</p>
        <p><strong>Total nights:</strong> {selectedDays.length} per week</p>
      </div>

      <button type="submit" className="submit-btn">
        Explore Rentals
      </button>
    </form>
  );
}

// ============================================================================
// Export all examples
// ============================================================================
export default function DaySelectorExamples() {
  return (
    <div className="examples-container">
      <h1>DaySelector Component Examples</h1>

      <section className="example">
        <BasicExample />
      </section>

      <section className="example">
        <LabeledExample />
      </section>

      <section className="example">
        <PatternExample />
      </section>

      <section className="example">
        <URLSyncExample />
      </section>

      <section className="example">
        <ValidatedExample />
      </section>

      <section className="example">
        <ReadOnlyExample />
      </section>

      <section className="example">
        <FullFormExample />
      </section>
    </div>
  );
}
