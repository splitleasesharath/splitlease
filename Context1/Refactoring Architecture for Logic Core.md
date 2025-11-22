

# **Architectural Blueprint: The Logic Core Framework for Split Lease**

## **1\. Strategic Architectural Vision and Executive Summary**

### **1.1. The Imperative for Structural Evolution**

The Split Lease platform stands at a critical inflection point in its engineering lifecycle. Currently architected as a monolithic application utilizing an ESM-only stack with React Islands, the system has successfully supported the initial product phase, delivering a high-performance experience via Cloudflare Pages and Supabase.1 However, the trajectory of the platform—scaling from a concise set of 6 core pages to a projected ecosystem of over 30 pages and complex reusable components—demands a rigorous re-evaluation of how business logic is managed, distributed, and maintained.1 The existing coupling between the User Interface (UI) rendering layer and the underlying business domain logic presents a growing risk to scalability, testability, and the effective integration of AI-assisted development workflows (ADW).

The primary friction point in the current architecture is the entanglement of "what the app looks like" with "how the app thinks." Analysis of the codebase reveals that critical decision-making algorithms—such as the complex pricing tiers in priceCalculations.js 1 and the contiguous day validation in availabilityValidation.js 1—are often consumed directly by UI components like ListingScheduleSelector.jsx.1 This coupling forces React components to manage state, validation, and data transformation simultaneously, obscuring the semantic intent of the code and making it difficult for both human developers and AI agents to perform targeted semantic searches or isolated unit tests.

To address these challenges, this report defines the comprehensive specification for the **Logic Core Framework**. This architectural paradigm shift introduces a distinct, framework-agnostic layer (src/logic) designed to serve as the application's central nervous system. By extracting the "brain" of the application from the "skin" of the React Islands, we achieve a separation of concerns that elevates the maintainability of the codebase and aligns perfectly with the project's strict "No Fallback" philosophy.1

### **1.2. The "No Fallback" Principle as an Architectural Constraint**

A defining and non-negotiable characteristic of the Split Lease engineering culture is the "No Fallback Mechanism Enforcement System".1 This principle mandates a development ethos of "building for truth," explicitly forbidding defensive programming patterns that mask data integrity issues, such as defaulting to empty arrays (||), utilizing silent try-catch blocks, or employing hardcoded mock data when API calls fail.1

In the current architecture, the enforcement of this principle relies heavily on developer discipline within the implementation details of data fetchers and UI components. For example, the listingDataFetcher.js module 1 performs significant heavy lifting—resolving foreign key lookups, parsing JSONB fields, and handling geo-privacy offsets—but creates a risk where data transformation errors might be caught and suppressed to prevent UI crashes, inadvertently violating the "No Fallback" rule.

The Logic Core Framework institutionalizes the "No Fallback" principle by introducing **Data Processors** (Pillar III). These processors serve as strict Anti-Corruption Layers (ACLs) that stand between the raw data sources (Supabase, Bubble.io) and the application's internal state. A Processor is contractually obligated to "fail loud"; if a required field such as listing is missing or malformed, the Processor must throw an explicit, descriptive error rather than returning a safe default.1 This ensures that the UI layer—the React Islands—never receives ambiguous or corrupted data, allowing components to focus exclusively on their primary directive: visual presentation.

### **1.3. Architectural Goals and Scope**

The transformation outlined in this report preserves the foundational technology stack—Vite, Cloudflare Pages, and Supabase—while radically restructuring the internal organization of the app/src directory. The objective is to transition from the current structure, where business logic is scattered across src/lib and src/islands, to a target structure where all domain logic resides in src/logic.

**Table 1: Architectural Transition Goals**

| Dimension | Current State (Monolithic Mix) | Target State (Logic Core) |
| :---- | :---- | :---- |
| **Logic Location** | Scattered in src/lib/\*.js and inside .jsx components. | Centralized in src/logic/ under strict semantic pillars. |
| **Component Role** | "Smart" Islands that fetch, validate, and render. | "Hollow" Islands that only render props and dispatch events. |
| **Data Integrity** | Defensive coding in UI to handle potential nulls. | Strict "Processors" that guarantee data shape before UI render. |
| **Searchability** | Generic names (utils.js, handler) make semantic search difficult. | Intent-based naming (calculateRent, isScheduleContiguous). |
| **Testability** | Requires mounting React components to test logic. | Pure JS/TS unit tests for Logic Core (100% coverage target). |

This architectural upgrade is designed to make the codebase "AI-native." By organizing logic into small, single-purpose functions with intent-based names, we create a codebase that is highly indexable by semantic search engines, allowing AI agents to rapidly locate, understand, and modify business rules without parsing the visual complexity of React components.

---

## **2\. The Logic Core Framework: Structural Specification**

The Logic Core is not merely a directory; it is a rigorous pattern of organization that categorizes code by its *nature*—what it is—rather than its *feature*—what it does. This distinction is crucial for creating a predictable, navigable codebase where the location of any given piece of logic is intuitive.

### **2.1. The Four Pillars of the Logic Core**

The src/logic directory acts as the "Brain" of the application. It must be entirely decoupled from the UI framework; files within this directory must not import react, react-dom, or contain any JSX. This strictly enforces the separation of concerns and ensures that business logic remains portable and testable.

The structure consists of four distinct pillars, each with a specific responsibility and set of coding conventions:

app/src/logic/  
├── calculators/ \# PILLAR I: Pure Math & Quantifiable Logic  
│ ├── pricing/ \# Pricing engines, discounts, fee calculations  
│ ├── scheduling/ \# Date math, duration logic, calendar offsets  
│ └── geo/ \# Coordinate math, distance calculations  
├── rules/ \# PILLAR II: Business Predicates (Boolean Logic)  
│ ├── proposals/ \# Permissions for proposal creation/editing  
│ ├── scheduling/ \# Validation of check-in dates, contiguous days  
│ └── users/ \# Role-based access control (Host vs. Guest)  
├── processors/ \# PILLAR III: Data Transformation (The "Truth" Layer)  
│ ├── listing/ \# Normalization of Supabase listing rows  
│ ├── user/ \# Sanitization of user profiles from Auth  
│ └── external/ \# Adapters for Bubble.io or 3rd party APIs  
└── workflows/ \# PILLAR IV: State Machines & Orchestration  
├── booking/ \# Complex flows like "Create Proposal" or "Accept Offer"  
├── auth/ \# Login, Logout, and Session validation sequences  
└── messaging/ \# Orchestration of cross-platform messaging

### **2.2. Pillar I: Calculation Engines (The "Math" Layer)**

**Role:** The Calculators pillar is responsible for all quantitative logic within the application. This includes financial algorithms, temporal mathematics (date calculations), and spatial computations. Code in this pillar represents the immutable laws of the business domain—how a price is derived or how a duration is measured.

Conventions for Semantic Search:  
To optimize for semantic search, calculator functions must adhere to strict purity and naming standards.

* **Purity:** Functions must be referentially transparent. The same input must always produce the same output. Calculators are forbidden from accessing global state, making database calls, or reading the DOM.  
* **Granularity:** Functions should be concise, ideally under 20 lines of code. Complex calculations must be composed of smaller, named sub-functions.  
* **Naming:** Function names must use a "Verb-Noun" format that explicitly describes the output (e.g., calculateTotalRent, computeProratedFees).

Migration Case Study: Pricing Logic  
Currently, the priceCalculations.js file in src/lib 1 contains functions like calculate4WeekRent. While functional, it exists in a generic "lib" folder. In the new architecture, this logic moves to src/logic/calculators/pricing/.  
*Current Implementation (Generic Lib):*

JavaScript

// from app/src/lib/priceCalculations.js  
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {  
  if (\!nightlyPrice ||\!nightsPerWeek) return 0;  
  return nightlyPrice \* nightsPerWeek \* 4;  
}

*Target Implementation (Logic Core):*

JavaScript

// src/logic/calculators/pricing/calculateFourWeekRent.js  
/\*\*  
 \* Calculates the baseline rent for a standard 4-week period.  
 \* Intent: Determine the recurring monthly cost basis before fees.  
 \* @param {object} params \- Named parameters for clarity.  
 \* @param {number} params.nightlyRate \- The base cost per night in USD.  
 \* @param {number} params.frequency \- The number of nights per week (2-7).  
 \* @returns {number} The total rent for a 4-week cycle.  
 \*/  
export function calculateFourWeekRent({ nightlyRate, frequency }) {  
    // Enforcement of No Fallback: Inputs must be valid numbers.  
    if (typeof nightlyRate\!== 'number' |

| typeof frequency\!== 'number') {  
        throw new Error('calculateFourWeekRent expects numeric inputs');  
    }  
    return nightlyRate \* frequency \* 4;  
}

The shift to named parameters ({ nightlyRate, frequency }) improves readability and allows semantic search tools to better understand the function's signature.2

### **2.3. Pillar II: Rule Engines (The "Conditional" Layer)**

**Role:** The Rules pillar encapsulates the "Predicate Functions" of the domain. These are functions that return a strict boolean (true or false) indicating whether a specific condition is met. They represent business rules, permissions, and validity checks.

**Conventions for Semantic Search:**

* **Naming:** Function names must begin with a predicate verb: should, can, is, has, allows. This naming convention allows developers (and AI agents) to instantly identify the function's purpose as a check, not an action.  
* **Isolation:** Rules never perform actions (like redirecting a user or mutating data). They only provide the verdict on whether an action is permissible.

Migration Case Study: Schedule Validation  
The logic for checking if selected days are contiguous currently resides in availabilityValidation.js.1 This is a critical business rule that ensures bookings make sense logistically.  
*Target Implementation (Logic Core):*

JavaScript

// src/logic/rules/scheduling/isScheduleContiguous.js  
/\*\*  
 \* Validates if a set of selected days forms a contiguous block.  
 \* Intent: Enforce the business rule that split lease stays must be consecutive.  
 \* Handles complex week wrap-around scenarios (e.g., Fri-Sat-Sun).  
 \* @param {object} context \- The validation context.  
 \* @param {number} context.selectedDayIndices \- Array of 0-based day indices.  
 \* @returns {boolean} True if the schedule is valid and contiguous.  
 \*/  
export function isScheduleContiguous({ selectedDayIndices }) {  
    if (\!selectedDayIndices |

| selectedDayIndices.length \=== 0) return false;  
      
    // Sort indices to handle out-of-order selection  
    const sorted \=.sort((a, b) \=\> a \- b);  
      
    // Logic handling linear sequences and wrap-arounds  
    //... implementation...  
}

### **2.4. Pillar III: Data Processors (The "Truth" Layer)**

**Role:** This pillar is the operational heart of the "No Fallback" principle. Processors act as the gateway and sanitizer for all data entering the application from the "Outside World" (Supabase, Bubble API, URL parameters). Their responsibility is to validate, normalize, and transform raw data into a "truthful" internal shape.

**Conventions for Semantic Search:**

* **Explicit Assertion:** Processors must be aggressive about data validity. If a critical field is missing, the processor must throw a specific error (e.g., MissingListingIdError). It must never return null or undefined for required fields, as this propagates uncertainty into the UI.  
* **Normalization:** External data often has messy keys (e.g., Supabase's listing). Processors transform these into clean, camelCase properties (e.g., pricing.nightlyRate), decoupling the UI from the database schema.

Migration Case Study: Listing Data Transformation  
Currently, listingDataFetcher.js 1 mixes the act of fetching data with the logic of parsing it. The Logic Core separates these concerns.  
*Target Implementation (Logic Core):*

JavaScript

// src/logic/processors/listing/processListingDetail.js  
/\*\*  
 \* Transforms a raw Supabase listing row into a verified Listing entity.  
 \* Intent: create a safe, typed object for UI consumption, enforcing data integrity.  
 \*/  
export function processListingDetail({ rawListing }) {  
    // No Fallback enforcement: The application cannot function without listing data.  
    if (\!rawListing) throw new Error('Listing data is missing');  
    if (\!rawListing.\_id) throw new Error('Listing missing critical ID');

    return {  
        id: rawListing.\_id,  
        title: rawListing.Name,  
        // Transformation of messy DB keys to clean internal state  
        location: {  
            borough: rawListing |

| 'Unknown',  
            neighborhood: rawListing\['Location \- Hood'\],  
            // Use a Calculator to derive privacy offset if needed  
            coordinates: normalizeCoordinates(rawListing),   
        },  
        pricing: {  
            nightlyRate: validateMoney(rawListing),  
            securityDeposit: validateMoney(rawListing),  
        },  
        features: {  
            // Parse JSONB fields explicitly using helper utilities  
            amenities: parseJsonArray(rawListing\['Features \- Amenities In-Unit'\]),  
        }  
    };  
}

function validateMoney(value) {  
    if (value \=== undefined |

| value \=== null) {  
        // Fail loud if pricing is essential  
        throw new Error('Critical pricing data is missing for listing');  
    }  
    return Number(value);  
}

This processor utilizes the parseJsonArray utility 1 to safely handle Supabase's double-encoded JSON strings, ensuring that the output is always a valid array or an explicit failure, never an ambiguous state.

### **2.5. Pillar IV: Workflow Orchestrators (The "Flow" Layer)**

**Role:** Workflows manage complex, multi-step operations that coordinate the interaction between Calculators, Rules, and Processors. They are the "conductors" of the application, replacing the complex useEffect chains often found in large React components.

**Conventions for Semantic Search:**

* **State Machine Logic:** Workflows should be defined as a series of discrete steps or states.  
* **Composition:** Workflows should ideally contain very little raw logic; instead, they should call functions from the other three pillars.

Migration Case Study: Authentication Flow  
The auth.js file 1 currently handles a mix of cookie parsing, token validation, and migration from legacy storage. This should be modeled as a workflow.  
*Target Implementation (Logic Core):*

JavaScript

// src/logic/workflows/auth/validateSessionWorkflow.js  
import { isSessionExpired } from '../../rules/auth/isSessionExpired.js';  
import { getSecureAuthToken } from '../../../lib/secureStorage.js';

/\*\*  
 \* Orchestrates the validation of a user session.  
 \* Intent: Determine if the user is authenticated and if the session requires refresh.  
 \*/  
export async function validateSessionWorkflow() {  
    // Step 1: Retrieve Token  
    const token \= await getSecureAuthToken();  
      
    // Step 2: Check Existence (Rule)  
    if (\!token) return { isAuthenticated: false };

    // Step 3: Check Expiration (Rule)  
    if (isSessionExpired(token)) {  
        return { isAuthenticated: false, reason: 'expired' };  
    }

    // Step 4: Return Valid State  
    return { isAuthenticated: true, token };  
}

---

## **3\. Semantic Code Conventions for AI Discoverability**

The success of the Logic Core depends on the strict adherence to naming conventions that facilitate **Semantic Search**. AI agents and search algorithms rely on "Language of Intent" to find relevant code. Generic names obscure this intent; specific names reveal it.1

### **3.1. The "Intent-Based Naming Convention" (IBNC)**

Files and functions must be named based on the *business value* they provide, not their technical implementation.

**Table 2: Semantic Naming Transformation**

| Generic / Technical Name (Avoid) | Intent-Based Name (Adopt) | Semantic Search Benefit |
| :---- | :---- | :---- |
| utils.js | dateFormatter.js, currencyFormatter.js | Removes the "junk drawer" problem; allows targeted search for "date" or "currency". |
| handleData(data) | submitRentalApplication(application) | Explicitly identifies the business action (submitting an application). |
| check(user) | canUserMessageHost(user) | Defines the permission boundary clearly. |
| calc(a, b) | calculateProratedRent(rent, days) | Makes the mathematical operation self-documenting. |
| validate(obj) | assertProposalValidity(proposal) | Clarifies *what* is being validated and *why*. |

### **3.2. Function Structure and Exports**

To maximize the effectiveness of semantic analysis:

* **Short Functions:** Functions should aim for 10-20 lines of logic. This provides a concise context window for LLMs to analyze.  
* **Named Exports:** Use export function name() {} instead of export default. Named exports ensure that the function name is preserved in import statements, creating a clear dependency graph that is easier to traverse and analyze.3  
* **JSDoc for Business Context:** Every exported function in the Logic Core must include a JSDoc block. This block should describe the **Intent** (why this exists) and **Rules** (business constraints), not just the parameters.4

JavaScript

/\*\*  
 \* @function determineCheckOutDay  
 \* @intent Calculates the calendar day a guest must vacate based on their selected schedule.  
 \* @rule Check\-out is always the morning after the last selected night.  
 \* @rule Handles week wrap-arounds (e.g., if staying Sat-Sun, checkout is Mon).  
 \*/  
export function determineCheckOutDay(lastSelectedDay) {... }

---

## **4\. The Presentation Layer: Redefining React Islands**

In the Logic Core architecture, React Islands undergo a fundamental shift in responsibility. They cease to be "smart components" that contain business logic and become "Visual Renderers" or "Hollow Islands." Their sole responsibility is the **Look, Feel, and Polish** of the application.

### **4.1. The "Hollow Island" Pattern**

A "Hollow Island" is a React component that contains no calculations, no complex validation logic, and no direct data transformations. It receives pre-validated, pre-calculated data via props and renders it. User interactions are captured and immediately delegated to Logic Core workflows.5

Case Study: Transforming ListingScheduleSelector.jsx  
Currently, ListingScheduleSelector.jsx 1 and its hook useScheduleSelector.js 1 are heavily coupled with logic. They calculate prices, check for contiguous days, and manage error states internally.  
*Refactoring to Hollow Island:*

1. **Remove Logic:** The component should not import calculatePrice or isContiguous.  
2. **Receive State:** It should accept priceBreakdown and validationState as props.  
3. **Delegate Actions:** When a day is clicked, it calls an injected onDayToggle handler.

JavaScript

// app/src/islands/shared/ListingScheduleSelector.jsx (Hollow)  
import { DayButton } from './DayButton.jsx';  
import { PriceDisplay } from './PriceDisplay.jsx';

export default function ListingScheduleSelector({   
    // Props are now pure data/callbacks  
    daysGrid,           // Array of day objects (pre-calculated availability)  
    priceBreakdown,     // Pre-calculated price object  
    validationError,    // Error string or null  
    onDayToggle         // Callback function  
}) {  
    return (  
        \<div className\="selector-container"\>  
            \<div className\="day-grid"\>  
                {daysGrid.map(day \=\> (  
                    \<DayButton   
                        key\={day.id}  
                        day\={day}  
                        onClick\={() \=\> onDayToggle(day.id)}   
                    /\>  
                ))}  
            \</div\>  
              
            {/\* UI Responsibility: Displaying the error state visually \*/}  
            {validationError && (  
                \<div className\="error-banner"\>{validationError}\</div\>  
            )}

            {/\* UI Responsibility: Rendering the price formatting \*/}  
            \<PriceDisplay breakdown\={priceBreakdown} /\>  
        \</div\>  
    );  
}

In this model, the complex logic of *determining* if a day is available or calculating the new price happens *outside* the component, likely in a parent container or a custom hook that strictly orchestrates Logic Core functions.

### **4.2. CSS and Styling Architecture**

With logic removed, the src/styles/ directory 1 becomes the primary domain of the React Islands. The separation allows for cleaner CSS organization.

* **Co-location:** Styles specific to a component (e.g., listing-schedule-selector.css 1) should remain tightly coupled to the JSX.  
* **Global Variables:** The variables.css 1 remains the source of truth for the visual system (colors, spacing), ensuring consistency.  
* **Visual Hierarchy:** By removing logic code, developers can focus on the file's visual structure. The "Hollow Island" file becomes a clear map of the DOM structure, making it easier to apply design principles like those found in "Refactoring UI" 1 (e.g., establishing hierarchy, spacing, and typography) without wading through calculation code.

---

## **5\. Infrastructure & Integration Strategy**

The distinction between src/lib and src/logic is vital. src/lib represents the **Infrastructure Layer**—code that knows how to talk to the outside world but knows nothing about the business domain. src/logic represents the **Domain Layer**—code that knows the business rules but is agnostic to where data comes from.

### **5.1. Supabase and Data Fetching**

The supabase.js file 1 in src/lib configures the client. The Logic Core uses this client but wraps it in **Processors**.

* **Fetcher (Lib):** Executes the raw SQL query. supabase.from('listing').select('\*').  
* **Processor (Logic):** processListingDetail \[Pillar III\] takes the raw JSON response. It validates that mandatory fields like \_id and Name exist. It normalizes the Features \- Amenities JSONB array using parseJsonArray.1 It returns a clean Listing object.  
* **UI (Island):** Receives the clean Listing object. It does not need to check if (listing && listing.Name). It assumes valid data.

### **5.2. Bubble.io Integration and Anti-Corruption**

The application interacts with Bubble.io for messaging and AI workflows.1 The Logic Core must act as an Anti-Corruption Layer for these external APIs.

* **Context:** Bubble.io APIs often use 1-based day indexing, while the internal JS app uses 0-based indexing.1  
* **Logic Core Solution:** A specific processor src/logic/processors/external/adaptBubbleRequest.js should handle this conversion.  
* **No Fallback:** If the Bubble API returns an unexpected error format, the processor must throw a standardized ExternalServiceError rather than failing silently or passing raw error JSON to the UI.

### **5.3. Secure Storage and Authentication**

The secureStorage.js module 1 implements a secure, session-based storage mechanism using encryption. This is infrastructure code (src/lib). However, the *decision* of whether a user is authenticated is a business rule.

* **Workflow:** src/logic/workflows/auth/checkAuthStatus.js orchestrates the check. It calls secureStorage.getAuthToken() (Infrastructure), then validates the token's expiration (Rule), and finally determines the user's role (Processor).

---

## **6\. Comprehensive Migration Plan**

Transitioning a live application requires a surgical "Strangler Fig" approach. We will migrate the system piece by piece, starting with the most critical and entangled logic.

### **Phase 1: The Pricing Engine (High Value, High Risk)**

**Goal:** Extract the complex pricing logic from priceCalculations.js and ListingScheduleSelector.

1. **Scaffold:** Create src/logic/calculators/pricing/.  
2. **Migrate:** Move calculate4WeekRent and calculatePricingBreakdown from src/lib/priceCalculations.js 1 to the new directory.  
3. **Refactor:** Convert arguments to named parameters. Ensure strict type checking (throw on NaN).  
4. **Update:** Modify ListingScheduleSelector.jsx 1 and EditProposalModal.jsx 1 to import from the new Logic Core.  
5. **Verify:** Run unit tests to ensure pricing outputs match the legacy system exactly.

### **Phase 2: The Scheduling Validator (Core Logic)**

**Goal:** Decouple the validation logic that prevents invalid bookings.

1. **Scaffold:** Create src/logic/rules/scheduling/.  
2. **Migrate:** Extract isContiguousSelection from availabilityValidation.js.1  
3. **Refactor:** Rename to isScheduleContiguous.js. Ensure it returns a simple boolean. Remove any UI-specific error messages strings from the logic function; let the UI decide the error text.  
4. **Update:** Refactor useScheduleSelector.js 1 to use this new rule. This hook should now be a thin wrapper that holds state (selectedDays) and calls the Logic Core for validation.

### **Phase 3: Guest Proposal Workflow (Complex State)**

**Goal:** Refactor the GuestProposalsPage.jsx 1, which manages a complex 6-stage proposal journey.

1. **Scaffold:** Create src/logic/workflows/booking/.  
2. **Analyze:** The page currently handles "Original Terms" vs. "Counteroffer Terms" logic inside the component.  
3. **Migrate:** Create determineProposalStage.js (Rule) to calculate the current stage (1-6) based on proposal status fields.  
4. **Migrate:** Create processProposalDisplay.js (Processor) to normalize the dual-state proposal object (merging original and counteroffer fields into a single "current terms" object).  
5. **Update:** Simplify GuestProposalsPage.jsx. It should now fetch the proposal, pass it to processProposalDisplay, and then render the ProposalCard with the clean data.

### **Phase 4: Listing Data "Truth" Layer**

**Goal:** Enforce "No Fallback" on the primary data object.

1. **Scaffold:** Create src/logic/processors/listing/.  
2. **Migrate:** Extract the transformation logic from fetchListingComplete in listingDataFetcher.js.1  
3. **Create:** processListingDetail.js. Implement the strict "Fail Loud" checks for ID, Name, and Pricing.  
4. **Update:** Modify ViewSplitLeasePage.jsx 1 to use the new fetcher-processor pipeline. The component can now remove checks like if (listing && listing.price) because the processor guarantees that if the listing exists, the price exists.

---

## **7\. Operational Excellence and Validation**

To ensure the new architecture persists and does not degrade over time, we must implement automated enforcement and testing strategies.

### **7.1. Static Analysis Enforcement**

We will configure ESLint to enforce the architectural boundaries:

* **Rule:** src/logic must not import from src/islands, src/components, or react. This prevents UI dependencies from leaking into the business domain.  
* **Rule:** src/lib must not import from src/logic. Infrastructure should not depend on business rules.  
* **Rule:** All imports in src/logic must use explicit extensions (.js), aligning with the ESM-only requirement.1

### **7.2. Testing Strategy**

The separation of logic enables a high-velocity testing strategy.

* **Unit Tests (Logic Core):** We can now achieve 100% code coverage on business logic using fast, headless runners like Vitest. We can test calculateFourWeekRent with hundreds of permutations without ever rendering a React component.  
* **Integration Tests (Processors):** We will write tests that specifically feed "bad data" (missing IDs, malformed JSON) to Processors to verify they throw the expected errors, validating the "No Fallback" safety net.  
* **E2E Tests (Playwright):** As detailed in test\_e2e.md 1, end-to-end tests will continue to verify the critical user paths (e.g., "User can select 3 contiguous days"). These tests now serve as the final verification that the UI correctly binds to the Logic Core.

## **8\. Conclusion**

The transition to the **Logic Core Framework** is a necessary evolution for the Split Lease platform. By disentangling the "Brain" from the "View," we create a system that is robust, testable, and ready for scale. The new architecture honors the "No Fallback" principle by moving data integrity checks from ad-hoc UI logic to a dedicated Processor layer. It empowers AI agents to maintain the codebase by providing semantically named, isolated functions that clearly express business intent. Ultimately, this upgrade transforms the React Islands into their ideal form: lightweight, high-performance visual layers that simply reflect the state of a verifiable, truthful business domain. This structure provides the solid foundation required to scale from 6 pages to 30, ensuring that complexity is managed through architecture, not discipline alone.

#### **Works cited**

1. ARCHITECTURE\_GUIDE\_ESM+REACT\_ISLAND.md  
2. Guidelines for writing JavaScript code examples \- MDN Web Docs, accessed November 22, 2025, [https://developer.mozilla.org/en-US/docs/MDN/Writing\_guidelines/Code\_style\_guide/JavaScript](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Code_style_guide/JavaScript)  
3. Choosing between naming conventions and semantics with Node.js module imports, accessed November 22, 2025, [https://stackoverflow.com/questions/44961473/choosing-between-naming-conventions-and-semantics-with-node-js-module-imports](https://stackoverflow.com/questions/44961473/choosing-between-naming-conventions-and-semantics-with-node-js-module-imports)  
4. Google JavaScript Style Guide, accessed November 22, 2025, [https://google.github.io/styleguide/jsguide.html](https://google.github.io/styleguide/jsguide.html)  
5. Islands Architecture in React: A Complete Practical Guide \- DhiWise, accessed November 22, 2025, [https://www.dhiwise.com/post/islands-architecture-in-react-a-complete-practical-guide](https://www.dhiwise.com/post/islands-architecture-in-react-a-complete-practical-guide)  
6. Path To A Clean(er) React Architecture (Part 6\) \- Business Logic Separation, accessed November 22, 2025, [https://profy.dev/article/react-architecture-business-logic-and-dependency-injection](https://profy.dev/article/react-architecture-business-logic-and-dependency-injection)