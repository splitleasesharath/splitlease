# Days Selected Error Element - Interface & Workflows Report

## 1. INTERFACE OVERVIEW

### Element Name
**💥Days Selected Error** (Custom Modal Element)

### Purpose
An informational modal dialog that provides guidance to users about selecting a split lease schedule (days of the week). The modal educates users on how to properly set up a schedule and offers both example selection and help resources.

### Element Type
Modal Dialog / Overlay Component

---

## 2. USER INTERFACE STRUCTURE

### Modal Layout

#### Header Section
- **Title**: "How to set a split schedule"
- **Close Button**: X button in top-right corner
- **Modal Width**: Full center display with semi-transparent overlay

#### Content Sections

##### 2.1 Introductory Text
- **Text**: "For example: to stay Monday – Friday you would select Monday, Tuesday, Wednesday, Thursday, and Friday"
- **Purpose**: Explains basic selection logic

##### 2.2 Promotional Content
- **Visual**: Building icon graphic (blue/purple building illustration)
- **Headline**: "Stay 2-5 nights a week, save up to 50% off of a comparable Airbnb."
- **Subheading**: "Select your check-in through your check-out."
- **Purpose**: Value proposition and incentive messaging

##### 2.3 Selection Guide
- **Subtitle**: "Select your check-in through your check-out."
- **Example Text**: "For example, here is a Monday – Friday selection"
- **Day Selection UI**: Interactive day-of-week selector
  - **Days Displayed**: Su, M, Tu, W, Th, F, Sa (abbreviated format)
  - **Active Selection State**: Su (grayed), M (purple), Tu (purple), W (purple), Th (purple), F (purple), Sa (grayed)
  - **Example Shows**: Monday through Friday selection
  - **Border**: Red outline box around the selection example

#### Action Buttons

| Button | Style | Position | Purpose |
|--------|-------|----------|---------|
| Okay | Primary (Purple) | Center | Close modal and confirm understanding |
| Take me to FAQ | Secondary (Outlined) | Below Okay | Navigate to FAQ page for more help |

---

## 3. WORKFLOWS DOCUMENTATION

### Complete Workflow Summary
| # | Workflow Name | Trigger Type | Actions | Purpose |
|---|---|---|---|---|
| 1 | alert for testing (copy) | Custom Event | 3 AirAlert actions | Testing/demonstration alert system |
| 2 | B: Okay is clicked | Button Click | 1 action | Hide the Days Selected Error modal |
| 3 | B: Take me to FAQ is clicked | Button Click | 1 action | Navigate to FAQ page |
| 4 | C: Dont Show value changed | Data Change | 1 action | Update user preference (don't show modal again) |
| 5 | error-alert (copy) (copy) | Custom Event | 2 toast actions | Display error alert notifications |
| 6 | I:Close Password Reset is clicked | Button Click | 1 action | Hide modal (alternative close method) |
| 7 | information-alert (copy) (copy) | Custom Event | 2 toast actions | Display information notifications |
| 8 | purple alert (copy) | Custom Event | 1 action | Display custom purple alert |
| 9 | warning-alert (copy) (copy) | Custom Event | 2 toast actions | Display warning notifications |

---

## 4. DETAILED WORKFLOW SPECIFICATIONS

### Workflow 1: **alert for testing (copy)**
**Type**: Custom Event Handler  
**Trigger**: Custom event "alert for testing (copy) is triggered"

**Parameters**:
- `content` (Text, required)
- `title` (Text, required)
- `warning (red alert)` (Yes/No, optional)
- `success (green alert)` (Yes/No, optional)

**Actions**:
1. **Step 1** - AirAlert - Custom DEFAULT
   - Condition: `isn't live version is yes AND warning (red alert) formatted as number is 0 AND success (green alert) formatted as number is 0`
   - Action: Displays a default alert

2. **Step 2** - AirAlert - Custom WARNING red alert
   - Condition: `isn't live version is yes AND warning (red alert) is yes`
   - Action: Displays red warning alert

3. **Step 3** - AirAlert - Custom SUCCESS green alert
   - Condition: `isn't live version is yes AND success (green alert) is yes`
   - Action: Displays green success alert

---

### Workflow 2: **B: Okay is clicked**
**Type**: Button Click Event  
**Trigger**: Okay button click  
**Element**: B: Okay

**Actions**:
1. **Step 1** - Hide Days Selected Error
   - Action: Closes and hides the modal from view

---

### Workflow 3: **B: Take me to FAQ is clicked**
**Type**: Button Click Event  
**Trigger**: "Take me to FAQ" button click  
**Element**: B: Take me to FAQ

**Actions**:
1. **Step 1** - Go to page faq
   - Action: Navigates user to FAQ page

---

### Workflow 4: **C: Dont Show value changed**
**Type**: Data Change Event  
**Trigger**: "Don't Show" checkbox value changes  
**Element**: C: Dont Show

**Actions**:
1. **Step 1** - Make changes to User...
   - Action: Updates user record with "don't show this modal again" preference

---

### Workflow 5: **error-alert (copy) (copy)**
**Type**: Custom Event Handler  
**Trigger**: Custom event "error-alert (copy) (copy) is triggered"

**Parameters**:
- `title` (Text, required)
- `content` (Text, optional)
- `time (ms)` (Number, optional)

**Actions**:
1. **Step 1** - Custom Toast
   - Condition: `time (ms) is empty`
   - Action: Display error toast with no timeout

2. **Step 2** - Custom Toast
   - Condition: `time (ms) is not empty`
   - Action: Display error toast with specified duration

---

### Workflow 6: **I:Close Password Reset is clicked**
**Type**: Button Click Event  
**Trigger**: Close button click  
**Element**: I:Close Password Reset

**Actions**:
1. **Step 1** - Hide Days Selected Error
   - Action: Hides the modal when close button is clicked

---

### Workflow 7: **information-alert (copy) (copy)**
**Type**: Custom Event Handler  
**Trigger**: Custom event "information-alert (copy) (copy) is triggered"

**Parameters**:
- `title` (Text, required)
- `content` (Text, optional)
- `time (ms)` (Number, optional)

**Actions**:
1. **Step 1** - Custom Toast
   - Condition: `time (ms) is empty`
   - Action: Display info toast without timeout

2. **Step 2** - Custom Toast
   - Condition: `time (ms) is not empty`
   - Action: Display info toast with specified duration

---

### Workflow 8: **purple alert (copy)**
**Type**: Custom Event Handler  
**Trigger**: Custom event "purple alert (copy) is triggered"

**Parameters**:
- `content` (Text, required)
- `title` (Text, required)

**Actions**:
1. **Step 1** - AirAlert - Custom
   - Action: Displays custom purple alert with provided content and title

---

### Workflow 9: **warning-alert (copy) (copy)**
**Type**: Custom Event Handler  
**Trigger**: Custom event "warning-alert (copy) (copy) is triggered"

**Parameters**:
- `title` (Text, required)
- `content` (Text, optional)
- `time (ms)` (Number, optional)

**Actions**:
1. **Step 1** - Custom Toast
   - Condition: `time (ms) is empty`
   - Action: Display warning toast without timeout

2. **Step 2** - Custom Toast
   - Condition: `time (ms) is not empty`
   - Action: Display warning toast with specified duration

---

## 5. INTERACTION FLOW DIAGRAM
┌─────────────────────────────────────────────┐ │ Days Selected Error Modal Opens │ │ (User needs guidance on day selection) │ └────────────────┬────────────────────────────┘ │ ┌────────┴────────┐ │ │ ┌────▼─────┐ ┌────▼──────┐ │ User │ │ Checkbox: │ │ Reads │ │ Don't Show │ │ Guide │ │ Again │ │ │ │ │ └────┬─────┘ └────┬───────┘ │ │ │ ┌────────▼────────┐ │ │ C: Dont Show │ │ │ value changed │ │ │ (updates user) │ │ └─────────────────┘ │ └────────────┬──────────────┐ │ │ ┌────────▼────────┐ ┌─▼──────────────┐ │ OKAY CLICKED │ │ FAQ CLICKED │ └────────┬────────┘ └─┬──────────────┘ │ │ ┌────────────▼┐ ┌──▼──────────┐ │ Hide Modal │ │ Navigate to │ │ B: Okay │ │ FAQ Page │ │ clicked │ │ │ └────────────┘ └─────────────┘

--- ## 6. UI COMPONENTS BREAKDOWN ### Modal Frame Properties - **Position**: Centered overlay - **Background**: Semi-transparent dark overlay - **Modal Container**: White background box - **Padding**: Adequate spacing around content - **Close Icon**: X button, top-right ### Text Components | Component | Font Weight | Size | Color | Purpose | |-----------|------------|------|-------|---------| | Main Title | Bold | Large | Black | Primary heading | | Intro Text | Regular | Medium | Gray | Explanation | | Section Header | Bold | Medium | Black | Section title | | Example Text | Regular | Small | Gray | Supporting text | ### Interactive Elements - **Day Selector**: 7 day buttons (Su-Sa) - Inactive days: Gray/light background - Active days: Purple background with white text - Minimum: 1 day selection - Maximum: 7 days (full week) - **Okay Button**: - Color: Purple (#7C3AED or similar) - Width: Full width - State: Enabled by default - **FAQ Button**: - Color: White with purple border - Width: Full width - State: Enabled by default --- ## 7. CONDITIONAL LOGIC & ALERTS ### Alert System Architecture | Alert Type | Color | Use Case | Parameters | |-----------|-------|----------|-----------| | **Success** | Green | Operation successful | title, content, time (ms) optional | | **Error** | Red | Operation failed | title, content, time (ms) optional | | **Warning** | Yellow | Caution/warning state | title, content, time (ms) optional | | **Information** | Blue | Informational messages | title, content, time (ms) optional | | **Purple** | Purple | Custom/testing | content, title (required) | | **Default** | Gray | Default alert type | Based on testing mode | ### Conditional Rendering - **Test Mode Alerts**: All AirAlert variants check `isn't live version is yes` - **Time-based Toasts**: Conditional timeout based on `time (ms)` parameter - **Warning/Success Logic**: Specific conditions for color variation --- ## 8. USER JOURNEY 1. **Modal Display Trigger** - User navigates to schedule selection section - Modal appears with educational content 2. **User Interaction Options** - **Option A**: Read content and click "Okay" - Modal hides - User proceeds to actual selection - **Option B**: Need more help, click "Take me to FAQ" - Navigate away to FAQ page - **Option C**: Check "Don't Show Again" - User preference saved - Future modal displays suppressed - Can still close normally 3. **Modal Close Actions** - Primary: Okay button - Alternative: X close button (I:Close Password Reset) - Both result in modal hiding --- ## 9. DATA & STATE MANAGEMENT ### User Preferences Tracked - **"Don't Show Again" State**: Stored in User record - **Preference Update**: Triggered by C: Dont Show value changed - **Persistence**: Survives page refreshes ### Alert System State - **Custom Events**: Can be triggered programmatically from anywhere - **Toast Duration**: Optional (default vs. custom time) - **Test Mode Flag**: Controls alert display in development/staging --- ## 10. DESIGN PATTERNS ### Pattern 1: Educational Modal - Introduces feature functionality - Provides visual examples - Offers value proposition - Includes "don't show again" option ### Pattern 2: Alert/Toast System - Reusable custom event handlers - Multiple alert types for different scenarios - Configurable duration - Test mode support ### Pattern 3: Navigation Integration - Modal supports navigation to external help (FAQ) - Maintains context when returning --- ## 11. COMPONENT DEPENDENCIES ### Element References - **Okay Button**: B: Okay - **Take me to FAQ Button**: B: Take me to FAQ - **Close Button**: I:Close Password Reset (alternative close) - **Don't Show Checkbox**: C: Dont Show - **Modal Container**: Days Selected Error ### External Pages Referenced - **FAQ Page**: `page faq` ### Alert Components Used - Custom Toast (multiple color variants) - AirAlert system (for test mode alerts) --- ## 12. RESPONSIVE CONSIDERATIONS ### Layout Structure - Modal appears centered on screen - Content stacks vertically on mobile - Day selector displays in single row (responsive wrapping) - Buttons stack full width on narrow viewports --- ## 13. ACCESSIBILITY & USABILITY FEATURES ### User Experience Enhancements - **Clear Instructions**: Step-by-step guidance - **Visual Example**: Shows actual day selection UI - **Value Proposition**: Explains benefits - **Multiple Exit Paths**: Okay, Close X, or FAQ link - **Don't Show Again**: Respects user preference to prevent repetition - **Day Selection Preview**: Demonstrates feature before user engages --- ## 14. TECHNICAL NOTES ### Workflow Composition - Mix of button events and custom events - Data change events for user preferences - Navigation capabilities - Alert/notification system integration ### Code Reusability - Alert workflows are "copy" versions (duplicated for customization) - Suggests these may have been cloned from other elements - Allows independent modification without affecting source ### Testing Infrastructure - Test-specific alerts controlled by "isn't live version" flag - AirAlert system for development feedback - Custom event triggering capability for debugging