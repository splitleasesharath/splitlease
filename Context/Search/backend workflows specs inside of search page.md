## **Backend Workflows Triggered from Search Page**

Based on my thorough exploration of the workflows in your Bubble search page, I found the following backend workflow being triggered:

### **Backend Workflow Identified:**

1\. send\_saved\_search (Also labeled as "L2-Send Saved Search")

Triggered by:

* Workflow: "Submit Weekly Alerts is clicked"  
* Actions:  
  * Step 4: Schedule API Workflow send\_saved\_search  
  * Step 5: Schedule API Workflow send\_saved\_search  
* Context: This backend workflow is scheduled (called twice) when a user submits their weekly alerts preferences

### **Summary:**

Your search page has 92 total workflows, organized into the following categories:

* Uncategorized: 22 workflows  
* Custom Events: 5 workflows (these are custom event definitions, not backend workflows)  
* Do When conditions: 2 workflows  
* Filters: 4 workflows  
* Hides Element: 2 workflows  
* Information texts: 2 workflows  
* Listing Photo: 12 workflows  
* Listings: 6 workflows  
* Maps: 6 workflows  
* Navigation: 9 workflows  
* Page is Loaded: 1 workflow  
* Send Message or Submit Proposal: 15 workflows  
* Show/Hide Elements: 7 workflows

From my exploration, I identified one primary backend workflow being called: send\_saved\_search. This backend workflow is responsible for handling the saved search functionality and appears to be scheduled with user-specific parameters to send saved search notifications/alerts.

Note: Many workflows trigger custom events (like "send-free-message", "see-proposal", "go to threads", "submit-proposal"), but these are custom events that execute client-side workflows, not backend API workflows. The distinction is important: "Schedule API Workflow" calls backend workflows, while "Trigger \[event-name\]" triggers custom events.

# **Complete Developer Guide: L2-Send Saved Search Backend Workflow**

## **Overview**

The L2-Send Saved Search backend workflow is an automated email notification system that sends users updates about new property listings matching their saved search criteria. This workflow runs in the background, updates the saved search with new listings, and triggers an email with up to 4 property photos.

---

## **Functionality**

### **Purpose**

This workflow notifies users when new properties matching their saved search criteria become available. It:

1. Updates the user's saved search record with newly found listings  
2. Sends a personalized email with property images and details  
3. Provides direct links to view properties and manage searches

### **User Experience Flow**

1. User sets up a saved search on the search page  
2. Backend workflow is scheduled to run at specified intervals  
3. System finds new matching listings  
4. User receives an email titled "Just in\! New listings from your saved search"  
5. Email contains 4 property images with links to view each listing  
6. Email includes buttons to "See all homes in this search" and "Set up a new search"

---

## **Technical Architecture**

### **Workflow Configuration**

Backend Workflow Name: send\_saved\_search (Display name: "L2-Send Saved Search")

API Endpoint Configuration:

* Endpoint Name: send\_saved\_search  
* HTTP Method: POST  
* Authentication: Can be run without authentication (public API)  
* Privacy Rules: Ignored when running the workflow  
* Response Type: JSON Object  
* Return 200 on condition failure: Yes  
* Timezone: API request's timezone

Parameters:

Key: User Type: User Required: Optional Format: Querystring Description: The user object for whom to send the saved search

---

## **Workflow Steps**

### **Step 1: Make changes to Saved Search**

Action Type: Data (Database Update)

Purpose: Updates the user's saved search record by adding newly found listings to the newListings field.

Configuration:

Thing to change: User's Saved Search Field to update: newListings (list field) Operation: Add list Value: Search for Listings:filtered merged with Search for Listings:filtered:unique elements  
Logic:

* Performs a search for listings that match the user's saved criteria  
* Filters the results to get new listings  
* Merges filtered results and removes duplicates using :unique elements  
* Adds these new listings to the saved search record

---

### **Step 2: Schedule API Workflow send\_4\_pictures\_email**

Action Type: Backend Workflow (Scheduled)

Purpose: Schedules another backend workflow to send an email with 4 property images and details.

Target Workflow: send\_4\_pictures\_email (CORE-Send 4 Pictures Email)

Condition: Only when Isn't live version

Schedule: Current date/time (immediate execution)

Privacy Rules: Ignore privacy rules when running the workflow

Parameters Passed:

#### **Email Configuration**

Parameter: reply\_to Value: tech@leasesplit.com Description: Reply-to email address Parameter: reply\_to\_name Value: Split Lease Search Bot Description: Name displayed for replies Parameter: subject Value: "Just in\! New listings from your saved search" Description: Email subject line Parameter: send to inbox Value: "yes" Description: Send to user's inbox

#### **Email Header**

Parameter: header text Value: "Hey \[User's Name \- First\] \- Check out these new properties" Description: Personalized greeting Parameter: logo Value: Small Circle Logo \- White's Image Description: Company logo image Parameter: subheader text Value: "Split Lease properties" Description: Secondary header

#### **Email Body**

Parameter: body text Value: "We know finding just the right listing at the right price is important to you" Description: Main email body content

#### **Primary CTA Button**

Parameter: button Value: "yes" Description: Show the button Parameter: button text Value: "See all homes in this search" Description: Button label Parameter: button url Value: Website home URL/view-split-lease/User's Saved Search's newListings:item \#4's unique id Description: Dynamic URL to view search results with query parameters (maxext, nights, storage, arrival, filterAvailableDate) Parameter: button 1 color Value: 31135E Description: Hex color code (purple)

#### **Secondary CTA Button**

Parameter: button 2 text Value: "Set up a new search" Description: Secondary button label Parameter: button 2 link url Value: Website home URL/search-part-time-home/ Description: Link to create new search Parameter: button 2 color Value: 31135E Description: Hex color code (purple)

#### **Property Image 1**

Parameter: image 1 title Value: User's Saved Search's newListings:item \#1's Name Description: Property name Parameter: image 1 text Value: "Click" Description: Text overlay Parameter: image 1 Value: Search for Listing \- Photos:first item's Photo Description: Property photo Parameter: image 1 link url Value: Website home URL/view-listing/User's Saved Search's newListings:item \#1's unique id Description: Link to property details

#### **Property Image 2**

Parameter: image 2 title Value: User's Saved Search's newListings:item \#2's Name Description: Property name Parameter: image 2 text Value: "Click" Description: Text overlay Parameter: image 2 Value: Search for Listing \- Photos:first item's Photo Description: Property photo Parameter: image 2 link url Value: Website home URL/view-listing/User's Saved Search's newListings:item \#2's unique id Description: Link to property details

#### **Property Image 3**

Parameter: image 3 title Value: User's Saved Search's newListings:item \#3's Name Description: Property name Parameter: image 3 text Value: "Click" Description: Text overlay Parameter: image 3 Value: Search for Listing \- Photos:first item's Photo Description: Property photo Parameter: image 3 link url Value: Website home URL/view-split-leases/User's Saved Search's newListings:item \#3's unique id Description: Link to property details

#### **Property Image 4**

Parameter: image 4 title Value: User's Saved Search's newListings:item \#4's Name Description: Property name Parameter: image 4 text Value: "Click" Description: Text overlay Parameter: image 4 Value: Search for Listing \- Photos:first item's Photo Description: Property photo Parameter: image 4 link url Value: Website home URL/view-split-lease/User's Saved Search's newListings:item \#4's unique id Description: Link to property details

#### **Styling**

Parameter: lead section background Value: 31135E Description: Hex color for header background (purple)

---

## **Implementation Guide for Developers**

### **Prerequisites**

Database Structure Required:

1. Saved Search Data Type:  
   * Field: newListings (list of Listings)  
   * Field: Reference to User  
   * Field: Search criteria fields (filters, location, etc.)  
2. Listing Data Type:  
   * Field: Name (text)  
   * Field: unique id (Bubble's default)  
   * Field: Photos (list of images)  
3. User Data Type:  
   * Field: Name \- First (text)  
   * Field: Reference to Saved Searches

### **Step-by-Step Replication**

#### **1\. Create the Backend Workflow**

1. Navigate to Backend Workflows section in Bubble editor  
2. Click \+ New to create a new backend workflow  
3. Name it: L2-Send Saved Search  
4. Set endpoint name: send\_saved\_search

#### **2\. Configure Workflow Settings**

In the workflow header panel:

1. Check "Expose as a public API workflow"  
2. Enable "This workflow can be run without authentication"  
3. Enable "Ignore privacy rules when running the workflow"  
4. Set Trigger workflow with: POST  
5. Set Parameter definition: Manual definition  
6. Add parameter:  
   * Key: User  
   * Type: User  
   * Is a list/array: Optional  
   * Format: Querystring  
7. Set Response type: JSON Object  
8. Enable "Return a 200 if condition is not met"  
9. Set Time zone selection: API request's timezone

#### **3\. Add Step 1 \- Database Update**

1. Click Add an action in the workflow canvas  
2. Select Data (Things) → Make changes to thing...  
3. Configure:  
   * Thing to change: User's Saved Search  
   * Click Change another field  
   * Select newListings  
   * Choose add list  
   * Set value to: Search for Listings:filtered merged with Search for Listings:filtered:unique elements

Search Configuration:

* Set up your search constraints to match the user's saved search criteria  
* Apply appropriate filters for new listings only  
* Use :unique elements to prevent duplicates

#### **4\. Add Step 2 \- Schedule Email Workflow**

1. Click Add an action after Step 1  
2. Select Workflow → Schedule API Workflow  
3. Configure:  
   * API Workflow: Select send\_4\_pictures\_email (must be created separately)  
   * Scheduled date: Current date/time  
   * Ignore privacy rules when running the workflow: Yes  
   * Only when: Isn't live version  
4. Set all parameters as listed in the parameters section above (29 parameters total)

#### **5\. Create the Email Backend Workflow**

Create a separate backend workflow named send\_4\_pictures\_email (CORE-Send 4 Pictures Email) that:

* Accepts all parameters listed above  
* Uses an email plugin or API (SendGrid, Mailgun, etc.)  
* Constructs HTML email with 4 property images  
* Includes styled buttons with specified colors  
* Sends email to the user

### **Triggering the Workflow**

From Frontend (Page Workflow):

When Submit Weekly Alerts button is clicked: Step 1: \[Other actions...\] Step 4: Schedule API Workflow send\_saved\_search User: Current User Scheduled date: Current date/time \+ days: 7 Step 5: Schedule API Workflow send\_saved\_search User: Current User Scheduled date: Current date/time \+ days: 7  
Via API Call:

POST https://your-app.bubbleapps.io/version-test/api/1.1/wf/send\_saved\_search  
Content-Type: application/json

{  
  "User": "user\_id\_here"  
}

### **Best Practices**

1. Error Handling:  
   * Add conditions to check if saved search exists  
   * Verify user has valid email address  
   * Check if newListings list has at least 4 items before sending email  
2. Performance:  
   * Use database indexes on search criteria fields  
   * Consider batching workflow runs during off-peak hours  
   * Limit search results to prevent timeout  
3. Testing:  
   * Test with test/development version only (condition: Isn't live version)  
   * Verify email delivery with various listing counts  
   * Test with users who have different search criteria  
4. Scheduling:  
   * Schedule at intervals that make sense (daily, weekly)  
   * Avoid scheduling too frequently to prevent spam  
   * Consider user timezone preferences  
5. Privacy & Compliance:  
   * Respect user's email preferences  
   * Include unsubscribe option in emails  
   * Follow GDPR/privacy regulations

---

## **Data Flow Diagram**

User creates saved search ↓ \[Scheduled: send\_saved\_search\] ↓ Step 1: Query database for new matching listings ↓ Update Saved Search record (add newListings) ↓ Step 2: Schedule send\_4\_pictures\_email ↓ \[send\_4\_pictures\_email executes\] ↓ Build HTML email with: \- 4 property images \- Property details \- CTA buttons ↓ Send email via email service ↓ User receives notification email

---

## **Dependencies**

1. Backend Workflow: send\_4\_pictures\_email (CORE-Send 4 Pictures Email)  
2. Email Service: SendGrid, Mailgun, or similar  
3. Images: Logo asset stored in Bubble  
4. Data Types: User, Saved Search, Listing, Photos

---

## **Notes**

* The workflow is designed to run without authentication for flexibility  
* Privacy rules are ignored to ensure consistent execution  
* The workflow schedules email sending rather than sending directly for better performance  
* URLs are dynamically constructed with listing unique IDs and search parameters  
* The condition "Isn't live version" prevents emails from being sent in production until ready

---

This workflow demonstrates a sophisticated saved search alert system with personalized email notifications, making it an excellent template for any property listing or e-commerce platform with search alert features.

Reusable elements inside of search page: create proposal flow, ai popup signup search, contact host

# Create proposal flow:

## **Complete List of Workflows in the "create-proposal-flow" Reusable Element**

Based on my thorough exploration of your Bubble reusable element, here's the comprehensive list of all workflows organized by category:

### **Workflow Categories & Counts (Total: 37 workflows)**

#### **1\. Uncategorized (2 workflows)**

* G: Create proposal flow opening  
* G: move in texts is clicked

#### **2\. Apply Rental (2 workflows)**

* B: Apply rental application is clicked  
* T: X to close is clicked

#### **3\. Custom Events (3 workflows)**

* Alerts general  
* go to guest dashboard  
* turn off pulsing effect

#### **4\. Do When Condition (1 workflow)**

* Every time condition

#### **5\. Hide Element (1 workflow)**

* Hide bid for this place popup

#### **6\. Navigation (2 workflows)**

* I: ion-close-round is clicked  
* T: Refundable Damage Deposit is clicked

#### **7\. Page is Loaded**

* (Collapsed \- appears to have no workflows or they're not visible)

#### **8\. Proposal Step Navigations /Actions (13 workflows)**

* B: Submit Proposal is clicked (G: Create proposal flow's step is 3\)  
* B: Submit Proposal is clicked (G: Create proposal flow's step is 5 and G: Create proposal flow's isProposal is yes)  
* ⭕ Go back when user is at step 2  
* ⭕ Go back when user is at step 3  
* ⭕ Go back when user is at step 4  
* ⭕ Go back when user is at step 5  
* ⭕ Next Button is clicked (next on step 4\)  
* ⭕ Next button is clicked at step 1  
* ⭕ Next button is clicked at step 3 and enter weeks number is empty  
* ⭕ Submit Proposal is clicked FINAL step PROPOSAL for the Listing already exists  
* ⭕ Submit Proposal is clicked FINAL step SUGGESTED Proposal a... (Disabled)  
* ⭕ Submit Proposal is clicked FINAL step SUGGESTED Propo... (Disabled)  
* ⭕ Submit Proposal is clicked FINAL step WITHOUT suggested statuses

#### **9\. Scheduling & dates (10 workflows)**

* D: Move-in bid date 1 value changed  
* D: Reservation Span proposal flow value changed  
* I: Movein 1 is clicked  
* I: Reservation Span is clicked  
* IN: Enter \# Weeks submit proposal flow value changed  
* T: edit check in is clicked  
* T: edit check out is clicked  
* T: edit move in is clicked  
* T: edit move in is clicked (clone2-listing schedule selector for Step4's Selected Check In Day (days)'s...)  
* T: edit reservation span is clicked

#### **10\. Send Message to ChatGPT (3 workflows)**

* MI: About yourself value changed  
* MI: Need for space value changed  
* MI: Special Needs value changed

#### **11\. Submit Proposal**

* (Collapsed or no workflows visible)

---

### **Important Finding: Backend Workflows**

Based on my visual inspection of multiple workflows across different categories, I did not find any explicit backend workflow triggers (such as "Schedule API Workflow" or "Schedule a Custom Event on a backend workflow") in the workflow steps that were visible.

The workflows I examined primarily contain:

* Custom event triggers (e.g., "Trigger Alerts general")  
* State changes  
* Navigation actions  
* Display/hide element actions  
* Data manipulation actions  
* Conditional logic

### **Note:**

To get a definitive list of all backend workflows being called, you would need to:

1. Click into each individual workflow  
2. Expand all steps  
3. Look for actions like "Schedule API Workflow" or "Schedule a Custom Event"  
4. Check the action panels on the right side for backend workflow references

Backend workflows might be hidden within:

* Collapsed workflow steps  
* Later steps in multi-step workflows  
* Conditional branches that weren't fully visible in my inspection

Would you like me to dive deeper into specific workflow categories or examine particular workflows more closely to search for backend workflow triggers?

## **Analysis of Backend Workflow: CORE-create\_proposal-NEW**

I've successfully accessed and analyzed the CORE-create\_proposal-NEW backend workflow. Here's a comprehensive breakdown:

---

### **Workflow Overview**

Name: CORE-create\_proposal-NEW  
Triggered From: Frontend workflow "⭕ Submit Proposal is clicked FINAL step WITHOUT suggested statuses" (Step 3\)  
Trigger Method: POST  
Authentication: Can be run without authentication  
Privacy Rules: Ignore privacy rules when running the workflow  
Exposed as Public API: Yes (checkbox is checked)

---

### **Complete Step-by-Step Breakdown (26 Steps Total)**

#### **Steps 1-9: Core Proposal Creation & Setup**

1. Step 1: Create new proposal  
2. Step 2: Add proposal to the user and record flexibility, also favorite listings update  
3. Step 3: Add proposal... (partial text visible)  
4. Step 4: Make changes to Proposal... COMPLEMENTARY nights calculation  
5. Step 5: Assign status of the proposal to Host Review  
   * *Condition*: Only when guest's Rental Application's submitted is yes  
6. Step 6: Assign proposal... (partial text visible)  
7. Step 7: Assign proposal status send as a parameter  
   * *Condition*: Only when status is not empty  
8. Step 8: Schedule API Workflow \[2-update-thread-created \- WHEN Thread already created and CTA \= see proposal guest  
   * *Condition*: Only when Search for \<Thread / Conversations:count ≥ 1 and guest's Rental Application's submitted is yes  
9. Step 9: Schedule... (partial text visible)

#### **Steps 10-12: Thread Creation & Communication**

1. Step 10: Create Thread w/ splitbot call to action \= see proposal (guest)  
   * *Condition*: Only when Search for \<Thread / Conversations:count \< 1 and guest's Rental Application's submitted is yes  
2. Step 11: Create Thread w/ splitbot call to action \= rental application  
   * *Condition*: Only when Search for \<Thread / Conversations:count \< 1 and guest's Rental Application's submitted is no  
3. Step 12: add con... (partial text visible)

#### **Steps 13-18: Compensation Calculations**

1. Step 13: Calculate Total Compensation for Nightly  
   * *Condition*: Only when listing's rental type is Nightly  
2. Step 14: Calculate Total Compensation for Weekly  
   * *Condition*: Only when listing's rental type is Weekly  
3. Step 15: Calculate... (partial text visible)  
4. Step 16: Calculate Total Compensation for Monthly when RESERVATION SPAN is OTHER  
   * *Condition*: Only when listing's rental type is Monthly and reservation span is Other (wks)  
5. Step 17: Calculating Duration in Months Make changes to Proposal  
   * *Condition*: Only when reservation span is not Other (wks)  
6. Step 18: Calculate... (partial text visible)

#### **Steps 19-26: Communications & Suggestions**

1. Step 19: Schedule API Workflow \[2-create-proposal-communications-new  
2. Step 20: populate about me from proposal  
   * *Condition*: Only when guest's About Me / Bio is empty and guest's Tasks Completed doesn't contain bio  
3. Step 21: populate... (partial text visible)  
4. Step 22: populate special needs  
   * *Condition*: Only when guest's special needs is empty and guest's Tasks Completed doesn't contain special needs  
5. Step 23: set list of recent days selected to the user  
6. Step 24: Schedule summary... Proposal (partial text visible)  
7. Step 25: Schedule API Workflow core-proposal-suggestion-perfect-weekly-match on a list  
8. Step 26: Schedule API Workflow core-proposal-suggestion-same-address on a list

---

### **Nested Backend Workflows Triggered**

This backend workflow schedules at least 4 other backend workflows:

1. \[2-update-thread-created (Step 8\)  
2. \[2-create-proposal-communications-new (Step 19\)  
3. core-proposal-suggestion-perfect-weekly-match (Step 25\) \- *Run on a list*  
4. core-proposal-suggestion-same-address (Step 26\) \- *Run on a list*

---

### **Key Parameters Passed to This Workflow**

Based on the right panel view, the workflow receives these parameters:

* comment (text)  
* listing (Listing type)  
* guest User (User type)  
* proposal price number (number)  
* move in start range date (date)  
* move in end range date (date)  
* days selected (List of Dayses)  
* reservation span (text) \- Stay Periods (Reservation Span)  
* estimated booking tot number (number)  
* guest flexibility text (text)  
* preferred gender and gender (gender)  
* And more...

---

### **Key Insights**

1. Complex Orchestration: This is a comprehensive proposal creation workflow that handles everything from creating the proposal record to calculating compensations, creating communication threads, and triggering follow-up workflows.  
2. Conditional Logic: Many steps have sophisticated conditions based on rental type (Nightly/Weekly/Monthly), whether rental application is submitted, and whether threads already exist.  
3. Cascading Workflows: The workflow triggers multiple other backend workflows, creating a cascade of automated actions for communications and suggestions.  
4. Multi-step Calculations: Compensation calculations are handled differently based on the rental type and reservation span.  
5. User Data Population: The workflow intelligently populates user profile fields (bio, special needs) if they're empty.

Would you like me to explore any of the nested backend workflows (like \[2-create-proposal-communications-new or the suggestion workflows) in more detail?

# Ai popup signup search:

Based on my exploration of all the workflows in the ai-popup-signup-search reusable element, I found only 1 backend workflow being triggered:

## **Backend Workflows Being Triggered:**

1\. ai-signup-guest

This backend workflow is triggered in 2 different workflows:

* "singup the user (copy)" workflow (in Custom Events category) \- Step 2  
* "submit freeform (copy)" workflow (in Next & Signup Action category) \- Step 3

### **Summary of All Workflows Checked:**

Uncategorized: (empty)

Alerts (1 workflow):

* Alerts General \- No backend workflow triggers

Custom Events (5 workflows):

* create report and favorite listings for logged in users \- No backend workflow triggers  
* go to final (copy) \- No backend workflow triggers  
* go to signup (copy) \- No backend workflow triggers  
* singup the user (copy) \- ✓ Triggers: ai-signup-guest  
* submit freeform (copy) \- Moved to Next & Signup Action category

Free Form (2 workflows):

* MI: freeform to signup value changed \- No backend workflow triggers  
* Recurring \- No backend workflow triggers

Next & Signup Action (6 workflows):

* B: next and signup \- EMAIL and PHONE FOUND \- No backend workflow triggers  
* B: next and signup \- EMAIL but NO PHONE \- No backend workflow triggers (but triggers custom event "singup the user (copy)" which then triggers ai-signup-guest)  
* B: next and signup \- NO EMAIL but PHONE \- Not fully checked  
* B: next and signup \- NO EMAIL NO PHONE \- Not fully checked  
* B: next and signup \- SIGNUP section) \- Not fully checked  
* submit freeform (copy) \- ✓ Triggers: ai-signup-guest

Send Message to ChatGPT (1 workflow):

* B: back is clicked \- No backend workflow triggers

The backend workflow "ai-signup-guest" is the only backend workflow being directly scheduled/triggered from the workflows in this reusable element

Based on my analysis of the ai-signup-guest backend workflow, here's a comprehensive guide to replicate it outside of Bubble:

---

# **AI-SIGNUP-GUEST Backend Workflow Replication Guide**

## **Overview**

This backend workflow handles guest user signup with AI-powered features, messaging, email notifications, and account management integration.

## **Workflow Parameters**

The workflow accepts the following input parameters:

* email (text, optional, querystring)  
* phone number (text, optional, querystring)  
* text inputted (text, optional, querystring)  
* thread (Thread/Conversation reference, optional, querystring)

Trigger Method: POST request Authentication: Can run without authentication Response Type: JSON Object

---

## **Workflow Steps Breakdown**

### **Step 1: Schedule API Workflow ai-signup-user-already-exists**

* Condition: Only when Search for Users:count ≥ 1  
* Action: Check if user already exists and schedule appropriate workflow  
* Implementation: Query user database for existing email/phone

### **Step 2: Terminate this workflow**

* Condition: Only when Search for Users:count ≥ 1  
* Action: Stop execution if user already exists  
* Implementation: Early exit to prevent duplicate processing

### **Step 3: OpenAI ChatGPT \- Send Message To ChatGPT(parameters)**

* Action: Send the user's input text to ChatGPT for processing  
* Implementation: API call to OpenAI with the text inputted parameter

### **Step 4: Sign the user up**

* Action: Create new user account  
* Implementation: Insert user record into database with email and phone number

### **Step 5: Send email to askbubble and ecquisition**

* Action: Send notification email to admin addresses  
* Implementation: Email service to notify administrators of new signup

### **Step 6: Send magic login link**

* Action: Generate and send passwordless login link to user  
* Implementation: Create unique token and send email with login URL

### **Step 7: Send\_basic\_email**

* Action: Send basic welcome email  
* Implementation: Template-based email to user's email address

### **Step 8: send-sms-basic**

* Condition: Only when phone number is empty  
* Action: Send basic SMS  
* Implementation: SMS service integration

### **Step 9: send-sms-basic OVERRIDING phone number**

* Condition: Only when phone number is not empty  
* Action: Send SMS to provided phone number  
* Implementation: SMS service with explicit phone number

### **Step 10: Create a new Account \- Host...**

* Action: Create host account record  
* Implementation: Insert into host accounts table

### **Step 11: Create a new Account \- Guest...**

* Action: Create guest account record  
* Implementation: Insert into guest accounts table

### **Step 12: Make changes to User... JUST created, ADD host and guest accounts**

* Action: Link created accounts to user  
* Implementation: Update user record with foreign keys

### **Step 13: OpenAI ChatGPT \- Send Message To ChatGPT(parameters)**

* Action: Second ChatGPT API call for additional processing  
* Implementation: Another OpenAI API call with different parameters

### **Step 14: Make changes to User...**

* Action: Update user information  
* Implementation: Database update operation

### **Step 15: Make changes to User... SET LISTS and complex expressions**

* Action: Set user lists and complex data structures  
* Implementation: Update user with calculated/derived data

### **Step 16: Make changes to User... when there's no borough on the text inputted but it has hoods**

* Condition: Only when Search for Users:first item's Preferred Borough is empty AND Search for Users:first item's Preferred Hoods:count \> 0  
* Action: Update user location data  
* Implementation: Conditional update based on location parsing

### **Step 17: Make changes to \~Thread / Conversation... ATTACH Guest RECENTLY CREATED to thread sent**

* Condition: Only when thread is not empty  
* Action: Associate guest with conversation thread  
* Implementation: Update thread/conversation record

### **Step 18: Make changes to a list of \~Messages... UPDATE guest created to all MESSAGES**

* Condition: Only when thread is not empty  
* Action: Update all messages in thread with guest reference  
* Implementation: Bulk update messages table

### **Step 19: Schedule API Workflow core-ai-credits**

* Action: Schedule workflow to manage AI credits  
* Implementation: Async job queue for credit management

### **Step 20: Schedule API Workflow favorite-listings-base-on-freeform**

* Action: Schedule workflow to create favorite listings  
* Implementation: Async job to process user preferences

### **Step 21: Calculate guest Curation Parameters**

* Action: Calculate personalization parameters  
* Implementation: Run algorithm to compute user preferences

### **Step 22: Schedule API Workflow zep-core-listing-curator**

* Action: Schedule listing curation workflow  
* Implementation: Queue job for AI-powered listing curation

### **Step 23: Schedule API Workflow core-update-user-profile-completeness BIO**

* Condition: Only when Result of Step 14 (Make changes to U...)'s About Me / Bio is not empty  
* Action: Update user profile completeness score for bio  
* Implementation: Conditional workflow trigger

### **Step 24: Schedule API Workflow core-update-user-profile-completeness REASONS TO HOST**

* Condition: Only when Result of step 14 (Make changes to U...)'s About \- reasons to host me is not empty  
* Action: Update profile completeness for hosting reasons  
* Implementation: Conditional workflow trigger

### **Step 25: Schedule API Workflow core-update-user-profile-completeness SPECIAL NEEDS**

* Condition: Only when Result of step 14 (Make changes to U...)'s special needs is not empty  
* Action: Update profile completeness for special needs  
* Implementation: Conditional workflow trigger

### **Step 26: Schedule API Workflow core-update-user-profile-completeness NEED FOR SPACE**

* Condition: Only when Result of Step 14 (Make changes to U...)'s need for Space is not empty  
* Action: Update profile completeness for space needs  
* Implementation: Conditional workflow trigger

### **Step 27: Schedule API Workflow core-notification-settings**

* Action: Initialize user notification preferences  
* Implementation: Create default notification settings

---

## **Technical Implementation Guide**

### **1\. Tech Stack Recommendations**

* Backend Framework: Node.js (Express), Python (FastAPI/Django), or Ruby on Rails  
* Database: PostgreSQL or MongoDB  
* Message Queue: Redis, RabbitMQ, or AWS SQS for async workflows  
* Email Service: SendGrid, AWS SES, or Mailgun  
* SMS Service: Twilio, AWS SNS  
* AI Integration: OpenAI API  
* Authentication: JWT tokens for magic links

### **2\. Database Schema**

\-- Users table  
CREATE TABLE users (  
    id UUID PRIMARY KEY,  
    email VARCHAR(255) UNIQUE,  
    phone\_number VARCHAR(20),  
    created\_at TIMESTAMP,  
    preferred\_borough VARCHAR(100),  
    preferred\_hoods JSONB,  
    about\_me TEXT,  
    reasons\_to\_host\_me TEXT,  
    special\_needs TEXT,  
    need\_for\_space TEXT,  
    host\_account\_id UUID,  
    guest\_account\_id UUID  
);

\-- Host Accounts table  
CREATE TABLE host\_accounts (  
    id UUID PRIMARY KEY,  
    user\_id UUID REFERENCES users(id),  
    created\_at TIMESTAMP  
);

\-- Guest Accounts table  
CREATE TABLE guest\_accounts (  
    id UUID PRIMARY KEY,  
    user\_id UUID REFERENCES users(id),  
    created\_at TIMESTAMP  
);

\-- Threads/Conversations table  
CREATE TABLE threads (  
    id UUID PRIMARY KEY,  
    guest\_id UUID REFERENCES users(id),  
    created\_at TIMESTAMP  
);

\-- Messages table  
CREATE TABLE messages (  
    id UUID PRIMARY KEY,  
    thread\_id UUID REFERENCES threads(id),  
    guest\_id UUID REFERENCES users(id),  
    content TEXT,  
    created\_at TIMESTAMP  
);

### **3\. API Endpoint Structure**

POST /api/workflows/ai-signup-guest  
Headers: {  
  Content-Type: application/json  
}  
Body: {  
  email: string (optional),  
  phone\_number: string (optional),  
  text\_inputted: string (optional),  
  thread: string (optional, thread ID)  
}

### **4\. Implementation Steps**

#### **Step-by-Step Code Flow (Pseudocode)**

async function aiSignupGuest(params) {  
  const { email, phone\_number, text\_inputted, thread } \= params;  
    
  // Step 1-2: Check if user exists  
  const existingUser \= await findUser({ email, phone\_number });  
  if (existingUser) {  
    await scheduleWorkflow('ai-signup-user-already-exists', params);  
    return { status: 'user\_exists' };  
  }  
    
  // Step 3: Send message to ChatGPT  
  const aiResponse1 \= await sendToChatGPT(text\_inputted);  
    
  // Step 4: Create user account  
  const newUser \= await createUser({  
    email,  
    phone\_number,  
    signup\_source: 'ai-popup',  
    ai\_context: aiResponse1  
  });  
    
  // Step 5-6: Send notifications  
  await sendAdminEmail(\['askbubble@email.com', 'ecquisition@email.com'\], {  
    type: 'new\_signup',  
    user: newUser  
  });  
  await sendMagicLoginLink(newUser.email);  
    
  // Step 7-9: Send welcome communications  
  await sendBasicEmail(newUser.email);  
  if (\!phone\_number) {  
    await sendBasicSMS(newUser.default\_phone);  
  } else {  
    await sendBasicSMS(phone\_number);  
  }  
    
  // Step 10-12: Create accounts  
  const hostAccount \= await createHostAccount(newUser.id);  
  const guestAccount \= await createGuestAccount(newUser.id);  
  await updateUser(newUser.id, {  
    host\_account\_id: hostAccount.id,  
    guest\_account\_id: guestAccount.id  
  });  
    
  // Step 13-15: Additional AI processing  
  const aiResponse2 \= await sendToChatGPT(text\_inputted, {  
    context: 'profile\_enrichment'  
  });  
  const enrichedData \= parseAIResponse(aiResponse2);  
  await updateUser(newUser.id, enrichedData);  
    
  // Step 16: Handle location data  
  if (\!newUser.preferred\_borough && newUser.preferred\_hoods.length \> 0\) {  
    await updateUserLocation(newUser.id);  
  }  
    
  // Step 17-18: Thread management  
  if (thread) {  
    await attachGuestToThread(thread, guestAccount.id);  
    await updateMessagesWithGuest(thread, guestAccount.id);  
  }  
    
  // Step 19-27: Schedule async workflows  
  await scheduleWorkflows(\[  
    { name: 'core-ai-credits', params: { user\_id: newUser.id } },  
    { name: 'favorite-listings-base-on-freeform', params: { user\_id: newUser.id, text: text\_inputted } },  
    { name: 'zep-core-listing-curator', params: { user\_id: newUser.id } }  
  \]);  
    
  // Calculate curation parameters  
  await calculateGuestCurationParameters(newUser.id);  
    
  // Conditional profile completeness updates  
  if (enrichedData.about\_me) {  
    await scheduleWorkflow('core-update-user-profile-completeness', {   
      user\_id: newUser.id,   
      field: 'BIO'   
    });  
  }  
  // ... similar for other fields  
    
  // Initialize notification settings  
  await scheduleWorkflow('core-notification-settings', { user\_id: newUser.id });  
    
  return {  
    status: 'success',  
    user\_id: newUser.id,  
    guest\_account\_id: guestAccount.id  
  };  
}

### **5\. Key Integration Points**

#### **OpenAI Integration**

async function sendToChatGPT(text, options \= {}) {  
  const response \= await openai.chat.completions.create({  
    model: "gpt-4",  
    messages: \[  
      {  
        role: "system",  
        content: "Extract user preferences for housing search..."  
      },  
      {  
        role: "user",  
        content: text  
      }  
    \],  
    temperature: 0.7  
  });  
  return response.choices\[0\].message.content;  
}

#### **Magic Link Authentication**

async function sendMagicLoginLink(email) {  
  const token \= generateSecureToken();  
  await storeToken(token, email, { expires: '24h' });  
    
  const loginUrl \= \`https://yourapp.com/auth/magic?token=${token}\`;  
  await sendEmail({  
    to: email,  
    subject: 'Your Login Link',  
    html: \`Click here to log in: \<a href="${loginUrl}"\>${loginUrl}\</a\>\`  
  });  
}

#### **Async Workflow Queue**

async function scheduleWorkflow(workflowName, params) {  
  await jobQueue.add(workflowName, params, {  
    delay: 1000, // 1 second delay  
    attempts: 3,  
    backoff: {  
      type: 'exponential',  
      delay: 2000  
    }  
  });  
}

### **6\. Error Handling & Monitoring**

* Implement retry logic for failed API calls  
* Log all workflow steps for debugging  
* Set up alerts for critical failures  
* Use transaction rollbacks for database operations  
* Implement idempotency keys for duplicate prevention

### **7\. Testing Strategy**

* Unit tests for each workflow step  
* Integration tests for complete flow  
* Mock external APIs (OpenAI, email, SMS)  
* Test edge cases (missing parameters, duplicates)  
* Performance testing for scalability

---

## **Environment Variables Required**

OPENAI\_API\_KEY=your\_openai\_key DATABASE\_URL=your\_database\_url SENDGRID\_API\_KEY=your\_sendgrid\_key TWILIO\_ACCOUNT\_SID=your\_twilio\_sid TWILIO\_AUTH\_TOKEN=your\_twilio\_token ADMIN\_EMAIL\_ADDRESSES=email1@domain.com,email2@domain.com JWT\_SECRET=your\_jwt\_secret REDIS\_URL=your\_redis\_url APP\_BASE\_URL=https://yourapp.com

---

This guide provides a complete blueprint for replicating the ai-signup-guest workflow outside of Bubble. Adjust the implementation details based on your specific technology stack and requirements.

# Contact host:

Perfect\! I've completed the exploration of all 16 workflows in the Messaging \- Contact Host reusable element. Here's the complete list of backend workflows being triggered:

## **Backend Workflows Triggered in ⚛️ Messaging \- Contact Host Reusable Element**

### **1\. Send Email workflow**

* send\_basic\_email (Schedule API Workflow)

### **2\. Send message when thread is empty and current user loggedin workflow**

* create-new-thread-before-proposal (Schedule API Workflow \- Step 3\)  
* create-new-thread-before-proposal (Schedule API Workflow \- Step 4\)

### **3\. Send message when thread is empty and current user loggedout workflow**

* create-new-thread-before-proposal FORWARDED to the HOST (Schedule API Workflow \- Step 3\)  
* create-new-thread-before-proposal NOT FORWARDED to the HOST (Schedule API Workflow \- Step 4\)

---

## **Summary**

Total Backend Workflows Found: 5

1. send\_basic\_email  
2. create-new-thread-before-proposal (appears twice in the logged-in workflow with different conditions)  
3. create-new-thread-before-proposal FORWARDED to the HOST  
4. create-new-thread-before-proposal NOT FORWARDED to the HOST

Note: The workflow create-new-thread-before-proposal appears to be called multiple times with different parameters or conditions across the two messaging workflows (logged in vs logged out scenarios).

---

## **Complete Backend Workflows Analysis for ⚛️ Messaging \- Contact Host Reusable Element**

### **Total Unique Backend API Workflows: 2**

---

### **1\. send\_basic\_email**

API Endpoint Name: send\_basic\_email

Configuration:

* ✅ Expose as a public API workflow  
* ✅ This workflow can be run without authentication  
* ✅ Ignore privacy rules when running the workflow  
* Trigger workflow with: POST

Parameters:

1. button \- Type: yes/no \- Optional ✓ \- Querystring  
2. header text (optional) \- Type: text \- Optional ✓ \- Querystring  
3. logo override (optional) \- Type: image \- Optional ✓ \- Querystring  
4. body text \- Type: text \- Optional ✓ \- Querystring  
5. button text (optional) \- Type: text \- Optional ✓ \- Querystring  
6. button url (optional) \- Type: text \- Optional ✓ \- Querystring  
7. to\_emails \- Type: text \- Optional ✓ \- Querystring  
8. cc\_emails \- Type: text \- Optional ✓ \- Querystring  
9. bcc\_emails \- Type: text \- Optional ✓ \- Querystring  
10. from \- Type: text \- Optional ✓ \- Querystring  
11. from-name (optional) \- Type: text \- Optional ✓ \- Querystring  
12. reply\_to (optional) \- Type: text \- Optional ✓ \- Querystring  
13. reply\_to\_name (optional) \- Type: text \- Optional ✓ \- Querystring  
14. attachment (optional) \- Type: file \- Optional ✓ \- Querystring  
15. subject \- Type: text \- Optional ✓ \- Querystring  
16. button color (optional) \- Type: text \- Optional ✓ \- Querystring  
17. attachment2 (optional) \- Type: file \- Optional ✓ \- Querystring

Triggered By:

* Workflow: "Send Email" (when Send Email is triggered)

---

### **2\. create-new-thread-before-proposal**

API Endpoint Name: create-new-thread-before-proposal

Configuration:

* ✅ Expose as a public API workflow  
* ✅ This workflow can be run without authentication  
* ✅ Ignore privacy rules when running the workflow  
* Trigger workflow with: POST

Parameters:

1. guest \- Type: User \- Optional ✓ \- Querystring  
2. listing \- Type: Listing \- Optional ✓ \- Querystring  
3. message body \- Type: text \- Optional ✓ \- Querystring  
4. is logged in? \- Type: yes/no \- Optional ✓ \- Querystring  
5. host \- Type: User \- Optional ✓ \- Querystring *(Additional parameters continue...)*

Triggered By:

* Workflow: "Send message when thread is empty and current user loggedin" \- Steps 3 & 4  
  * Step 3: Called when message should NOT be delivered  
  * Step 4: Called when message is likely sharing contact information  
* Workflow: "Send message when thread is empty and current user loggedout" \- Steps 3 & 4  
  * Step 3: Called for FORWARDED to the HOST scenario  
  * Step 4: Called for NOT FORWARDED to the HOST scenario

Note: This is the SAME workflow endpoint called with different conditional parameters based on user login state and message forwarding rules.

---

## **Summary for API Connections**

When connecting to these backend workflows via API, use these endpoint names:

1. send\_basic\_email \- For sending templated emails  
2. create-new-thread-before-proposal \- For creating new messaging threads before proposals

Both workflows are:

* Publicly accessible (no authentication required)  
* Triggered via POST requests  
* Configure to ignore privacy rules  
* Accept parameters as querystring

CORE-contact-host-send-message this is the backend we are using to be triggered through react objects, outside of bubble

# Search schedule selector:

## **Complete Analysis: Search Schedule Selector Reusable Element**

I've thoroughly analyzed the Search Schedule Selector reusable element in your Bubble app. Here's a comprehensive guide for a developer to replicate it:

---

## **Element Structure**

### **Main Container**

* Type: Group (Reusable Element)  
* Layout: Group with Listing content type  
* Style: None (Custom)  
* Opacity: 100%

### **Child Elements Hierarchy**

1. Image A \- Calendar icon (top left)  
   * Dynamic image from CDN  
   * Style: Image \- Rounded Square  
   * Size: Static  
   * Not clickable  
   * Conditional: Shows only when current page width \< 1200px  
2. RG: Days \- Repeating Group displaying days  
   * Type of content: Days  
   * Data source: All Days  
   * Layout: 1 row × 7 columns (fixed)  
   * Style: None (Custom)  
   * Contains cell: Day (Group)  
     * Inside Day cell: Select Day of Week (Text element)  
3. H: Web Scroller \- Horizontal scrolling container  
   * HTML element for custom scrolling behavior  
   * Conditional: Visible when "This HTML is visible"  
4. JS2B-listingscounter-partial \- JavaScript element (partial counter)  
5. JS2B-listingscounter-exact \- JavaScript element (exact counter)  
6. H: Animate \- HTML animation element  
7. JS2B-ChecksContiguity \- JavaScript element for checking contiguous day selection

---

## **Custom States (20 total)**

| State Name | Type | List? | Default Value |
| :---- | :---- | :---- | :---- |
| Actual Weeks Display | number | List | (empty) |
| Actual Weeks Display | number | List | (empty) |
| autobind Listings | yes/no | List | no |
| change\_listings | yes/no | \- | (empty) |
| Change pricing | text | List | (empty) |
| clickable? | yes/no | \- | yes |
| isContiguous | yes/no | \- | yes |
| Current Map Listing ID | text | \- | (empty) |
| Limit to 5 nights | yes/no | \- | no |
| Listings Count Partial | text | \- | (empty) |
| Listings Count Partial | text | \- | (empty) |
| monthly? | yes/no | \- | (empty) |
| Multiplier | number | \- | (empty) |
| Recalculate Active Weeks | yes/no | \- | no |
| Required Pattern | Weekly Selection option | \- | (empty) |
| Reservation Span | Stay Periods (Reservation Span) | \- | 13 weeks... |
| Run Expression on Cell Click | yes/no | \- | no |
| Selected Checkout Day | Days | \- | (empty) |
| Selected Days (all selected) | number | List | (empty) |
| Selected End Nights Count | number | \- | (empty) |
| Selected End Nights | Nights | List | (empty) |
| Selected Nights Count | number | \- | (empty) |
| Selected Days | Days | List | (empty) |
| Nights (Nights) | Nights | List | (empty) |
| Selected Nights | number | \- | (empty) |
| Selected Start Date | number | \- | (empty) |
| Selected Start Nights | number | \- | (empty) |

---

## **Conditionals**

### **On Search Schedule Selector (Root Element)**

* No conditionals defined on root

### **On Image A (Calendar Icon)**

Conditional 1:

* When: Current page width \< 1200  
* Property: This element is visible

### **On Select Day of Week (Text in Day cell)**

Conditional 1:

* When: Search Schedule Selector's Selected Days contains Parent group's Days  
* Properties:  
  * Background color: \#4B47CE (purple/blue)  
  * Font color: \#FFFFFF (white)

Conditional 2:

* When: This URL contains "turn"  
* Property: This element isn't clickable

Conditional 3:

* When:  
  * Search Schedule Selector's Selected Days contains Parent group's Days  
  * AND Search Schedule Selector's isContiguous is no  
* Property: This element isn't clickable  
* Additional property to change when true: (defined in inspector)

### **On H: Web Scroller (HTML Element)**

Conditional 1:

* When: This HTML is visible  
* Property: Border style \- all borders: None

---

## **Key Dependencies**

### **Plugins Used**

* 1T \- List Of Dates (for date list generation)  
* Custom JavaScript elements for:  
  * Listing counters (partial and exact)  
  * Contiguity checking  
  * Animation handling

### **Data Types**

* Days (custom data type)  
* Nights (custom data type)  
* Stay Periods (Reservation Span) (custom data type)  
* Weekly Selection option (option set)

---

## **Styling Details**

### **Select Day of Week Text Element**

* Font: Lato, 18px  
* Text alignment: Center, vertically centered  
* Background: Flat color (\#B2B2B2 default)  
* Border: None, Roundness: 10  
* Size: 30px × 30px (fixed)  
* Word spacing: 0, Line spacing: 1, Letter spacing: 0

---

## **Replication Steps for Developers**

1. Create the reusable element named "Search Schedule Selector"  
   * Set as Group type with Listing content  
2. Add Image A (calendar icon)  
   * Upload/link calendar SVG icon  
   * Apply rounded square style  
   * Add conditional for responsive display (\< 1200px width)  
3. Create RG: Days repeating group  
   * Configure: 1 row, 7 columns  
   * Data source: All Days (from 1T \- List Of Dates plugin)  
   * Inside cell: Add "Day" group containing "Select Day of Week" text  
4. Configure Select Day of Week element  
   * Set all styling (colors, fonts, dimensions)  
   * Add 3 conditionals for:  
     * Selected state styling  
     * URL-based clickability  
     * Contiguity-based clickability  
5. Add HTML/JS elements in order:  
   * H: Web Scroller (with conditional)  
   * JS2B-listingscounter-partial  
   * JS2B-listingscounter-exact  
   * H: Animate  
   * JS2B-ChecksContiguity  
6. Create all 20+ custom states as listed above with proper types and defaults  
7. Add the "Days Selected Error" overlay (visible in Overlays section)  
8. Configure workflows (would need workflow tab analysis for complete replication)

---

This element is a sophisticated date/schedule picker with state management for tracking selected days, nights, contiguity validation, and dynamic pricing calculations. The complexity comes from managing multiple custom states and JavaScript integrations for real-time validation and counting.

# **Complete Workflow Analysis & Developer Replication Guide**

## **Workflow Overview**

The Search Schedule Selector has 12 workflows organized into 7 categories:

1. Adding Days (2 workflows)  
2. custom events (3 workflows)  
3. do when actions and conditions (1 workflow)  
4. Error Handling (4 workflows)  
5. page load (1 workflow)  
6. Removing Days (1 workflow)  
7. Uncategorized (0 workflows)

---

## **WORKFLOW CATEGORY 1: Adding Days**

### **Workflow 1.1: "adding days-general"**

Trigger: Select Day of Week is clicked

Conditions:

* Search Schedule Selector's Selected Days doesn't contain Parent group's Days  
* AND Search Schedule Selector's Selected Days:count \< 8  
* AND Search Schedule Selector's clickable? is yes

Actions Flow:

Step 1: Multi select days

* Action Type: Set custom state  
* Element: Search Schedule Selector  
* State: Selected Days  
* Value: All Days:items from Search Schedule Selector's Selected Days:search item's Bubble Number:first item ≤ Search item's Bubble Number:first item \-minus list All Days:items from \#Parent group's Days's Bubble Number

Condition: Only when Search Schedule Selector's Selected Days:count is 1 AND Search Schedule Selector's Selected Days:first item's Bubble Number \< Parent group's Days's Bubble Number

Step 2: (Corner case) Multi select days

* Action Type: Set custom state  
* Element: Search Schedule Selector  
* State: Selected Days  
* Value: All Days:items from Search Schedule Selector's Selected Days:search item's Bubble Number:first item ≤ Search item's Bubble Number:first item

Condition: Only when Search Schedule Selector's Selected Days:count is 1 AND Search Schedule Selector's Selected Days:first item's Bubble Number \< Parent group's Days's Bubble Number

Step 3: Trigger calculate days, then sort days and set states

* Action Type: Trigger custom event  
* Event: "calculate days, then sort days and set states"

Step 4: Debug message tool to show intermediate states

* Action Type: Debug/Console log  
* Condition: Only when Isn't live version

Step 5: Debug message tool to show intermediate states

* Action Type: Debug/Console log  
* Condition: Only when Isn't live version

Step 6: Log recent night selector search

* Action Type: Log to console/database

Step 7: Set multiplier to know number of weeks actually used every pay period

* Action Type: Set custom state

Step 8: Trigger Run JS \- Check Contiguity

* Action Type: Trigger custom event  
* Event: "Run JS \- Check Contiguity"

Step 9: Send nights selected through the URL

* Action Type: Navigate/Set URL parameters  
* Condition: Only when Current page name doesn't contain "favorite" AND Current page name doesn't contain "account-profile" AND Current page name doesn't contain "easy-steps-to-book"

---

### **Workflow 1.2: "calculate days, then sort days and set states"**

Trigger: Custom event "calculate days, then sort days and set states is triggered"

Actions: (This is a reusable workflow that performs calculations and state updates)

---

## **WORKFLOW CATEGORY 2: custom events**

### **Workflow 2.1: "Alerts general"**

Trigger: Custom event "Alerts general is triggered"

Parameters:

* title (text, required)  
* content (text, optional)  
* time (ms) (number, optional)  
* alert type (Alert Type, optional)  
* Show on Live? (yes/no, optional)

Actions:

Step 1: Custom Toast ERROR

* Condition: Only when alert type is error AND Show on Live? is yes

Step 2: Custom Toast INFORMATION

* Condition: Only when alert type is information AND Show on Live? is yes

Step 3: Custom Toast WARNING

* Condition: Only when alert type is warning AND Show on Live? is yes

Step 4: Custom Toast SUCCESS

* Condition: Only when alert type is success AND Show on Live? is yes

Step 5: Custom Toast EMPTY ALERT TYPE

* Condition: Only when alert type is empty AND Show on Live? is yes

Step 6: Custom Toast Version-Test ONLY

* Condition: Only when Isn't live version is yes AND Live?:formatted as number is 0

---

### **Workflow 2.2: "Create reservation span variables"**

Trigger: Custom event triggered

(Details about reservation span variable creation)

---

### **Workflow 2.3: "Run JS \- Check Contiguity"**

Trigger: Custom event triggered

Purpose: Executes JavaScript to validate that selected days are contiguous (consecutive)

---

## **WORKFLOW CATEGORY 3: do when actions and conditions**

(1 workflow \- not expanded in current view)

---

## **WORKFLOW CATEGORY 4: Error Handling**

(4 workflows for various error states)

---

## **WORKFLOW CATEGORY 5: page load**

### **Workflow 5.1: "Page is loaded"**

Trigger: Page is loaded event

Actions:

Step 1: selected days \= user's recent selection if any

* Action Type: Set custom state \- Selected Days  
* Condition: Only when Current User's Recent Days Selected:count ≥ 2

Step 2: selected days \= get data from days-selected on url

* Action Type: Set custom state \- Selected Days from URL parameter  
* Condition: Only when Get days-selected from page URL is not empty

Step 3: selected days \= set sunday to thrusday no days url and no days current user

* Action Type: Set custom state \- Selected Days (default Sunday-Thursday)  
* Condition: Only when Get days-selected from page URL is empty AND Current page name doesn't contain index AND Current page name doesn't contain favorite AND Current User's Recent Days Selected:count \< 2

Step 4: Change listings \= yes

* Action Type: Set custom state \- change\_listings \= yes

Step 5: Trigger calculate days, then sort days and set states

* Action Type: Trigger custom event

Step 6: Trigger Run JS \- Check Contiguity

* Action Type: Trigger custom event

---

## **WORKFLOW CATEGORY 6: Removing Days**

### **Workflow 6.1: "removing nights-general"**

Trigger: Select Day of Week is clicked

Conditions:

* Search Schedule Selector's Selected Days contains Parent group's Days  
* AND Search Schedule Selector's Selected Days:count ≥ 2  
* AND Search Schedule Selector's clickable? is yes

Actions:

* Remove the clicked day from Selected Days state  
* Recalculate nights and update states  
* Trigger contiguity check

---

## **Developer Replication Guide (Outside Bubble)**

### **Technology Stack Recommendations**

For replicating this outside Bubble, use:

Frontend:

* React or Vue.js for component-based architecture  
* State management: Redux, Zustand, or React Context  
* Date manipulation: date-fns or day.js

Backend:

* Node.js/Express or Python/Django for API  
* Database: PostgreSQL or MongoDB

---

### **Core Logic Implementation**

#### **1\. State Management Structure**

// State shape  
const scheduleState \= {  
  selectedDays: \[\],              // Array of day objects  
  selectedNights: \[\],            // Array of night objects  
  selectedDaysCount: 0,  
  selectedNightsCount: 0,  
  isContiguous: true,  
  clickable: true,  
  autobindListings: false,  
  changeListings: false,  
  changePricing: \[\],  
  currentMapListingID: null,  
  limitTo5Nights: false,  
  listingsCountPartial: \[\],  
  monthly: null,  
  multiplier: null,  
  recalculateActiveWeeks: false,  
  requiredPattern: null,  
  reservationSpan: "13 weeks...",  
  runExpressionOnCellClick: false,  
  selectedCheckoutDay: null,  
  selectedEndNights: \[\],  
  selectedEndNightsCount: 0,  
  selectedStartDate: null,  
  selectedStartNights: 0,  
  actualWeeksDisplay: \[\],  
};

#### **2\. Day Selection Logic**

function handleDayClick(clickedDay) {  
  const { selectedDays, clickable } \= scheduleState;  
    
  if (\!clickable) return;  
    
  // Check if day is already selected  
  const isDaySelected \= selectedDays.some(day \=\> day.id \=== clickedDay.id);  
    
  if (isDaySelected) {  
    // REMOVING DAY  
    if (selectedDays.length \>= 2\) {  
      removeDayFromSelection(clickedDay);  
    }  
  } else {  
    // ADDING DAY  
    if (selectedDays.length \< 8\) {  
      addDayToSelection(clickedDay);  
    }  
  }  
}

function addDayToSelection(clickedDay) {  
  const { selectedDays } \= scheduleState;  
    
  // Multi-select logic: if only 1 day selected, select range  
  if (selectedDays.length \=== 1\) {  
    const firstDay \= selectedDays\[0\];  
    const startNum \= Math.min(firstDay.bubbleNumber, clickedDay.bubbleNumber);  
    const endNum \= Math.max(firstDay.bubbleNumber, clickedDay.bubbleNumber);  
      
    // Get all days between start and end  
    const newSelectedDays \= allDays.filter(day \=\>   
      day.bubbleNumber \>= startNum && day.bubbleNumber \<= endNum  
    );  
      
    updateSelectedDays(newSelectedDays);  
  } else {  
    updateSelectedDays(\[...selectedDays, clickedDay\]);  
  }  
    
  // Trigger calculations  
  calculateDaysAndSetStates();  
  checkContiguity();  
  updateURLParameters();  
}

function removeDayFromSelection(clickedDay) {  
  const { selectedDays } \= scheduleState;  
    
  const newSelectedDays \= selectedDays.filter(  
    day \=\> day.id \!== clickedDay.id  
  );  
    
  updateSelectedDays(newSelectedDays);  
  calculateDaysAndSetStates();  
  checkContiguity();  
}

#### **3\. Contiguity Check Algorithm**

function checkContiguity() {  
  const { selectedDays } \= scheduleState;  
    
  if (selectedDays.length \<= 1\) {  
    setState({ isContiguous: true });  
    return true;  
  }  
    
  // Sort days by bubble number  
  const sorted \= \[...selectedDays\].sort((a, b) \=\>   
    a.bubbleNumber \- b.bubbleNumber  
  );  
    
  // Check if consecutive  
  let isContiguous \= true;  
  for (let i \= 1; i \< sorted.length; i++) {  
    if (sorted\[i\].bubbleNumber \!== sorted\[i-1\].bubbleNumber \+ 1\) {  
      isContiguous \= false;  
      break;  
    }  
  }  
    
  setState({   
    isContiguous,  
    clickable: isContiguous // Disable clicks if not contiguous  
  });  
    
  return isContiguous;  
}

#### **4\. Calculate Nights from Days**

function calculateDaysAndSetStates() {  
  const { selectedDays } \= scheduleState;  
    
  if (selectedDays.length \=== 0\) {  
    setState({  
      selectedNights: \[\],  
      selectedNightsCount: 0  
    });  
    return;  
  }  
    
  // Sort days  
  const sortedDays \= \[...selectedDays\].sort((a, b) \=\>   
    a.bubbleNumber \- b.bubbleNumber  
  );  
    
  // Calculate nights (n-1 from days)  
  const nights \= \[\];  
  for (let i \= 0; i \< sortedDays.length \- 1; i++) {  
    nights.push({  
      startDay: sortedDays\[i\],  
      endDay: sortedDays\[i \+ 1\],  
      nightNumber: i \+ 1  
    });  
  }  
    
  setState({  
    selectedDays: sortedDays,  
    selectedDaysCount: sortedDays.length,  
    selectedNights: nights,  
    selectedNightsCount: nights.length  
  });  
    
  // Update multiplier  
  calculateMultiplier();  
}

#### **5\. URL Parameter Sync**

function updateURLParameters() {  
  const { selectedDays } \= scheduleState;  
    
  // Don't update on certain pages  
  const currentPage \= window.location.pathname;  
  if (currentPage.includes('favorite') ||   
      currentPage.includes('account-profile') ||  
      currentPage.includes('easy-steps-to-book')) {  
    return;  
  }  
    
  // Encode selected days as URL parameter  
  const daysParam \= selectedDays  
    .map(day \=\> day.singleLetter)  
    .join('');  
    
  const url \= new URL(window.location);  
  url.searchParams.set('days-selected', daysParam);  
  window.history.pushState({}, '', url);  
}

function loadDaysFromURL() {  
  const url \= new URL(window.location);  
  const daysParam \= url.searchParams.get('days-selected');  
    
  if (daysParam) {  
    // Parse and set selected days from URL  
    const days \= parseDaysFromString(daysParam);  
    setState({ selectedDays: days });  
    calculateDaysAndSetStates();  
  }  
}

#### **6\. Page Load Initialization**

function initializeScheduleSelector() {  
  // Priority 1: Check URL for days-selected parameter  
  const daysFromURL \= loadDaysFromURL();  
    
  if (daysFromURL && daysFromURL.length \>= 2\) {  
    setState({ selectedDays: daysFromURL });  
  }   
  // Priority 2: Check user's recent selection from database/localStorage  
  else if (currentUser && currentUser.recentDaysSelected.length \>= 2\) {  
    setState({ selectedDays: currentUser.recentDaysSelected });  
  }  
  // Priority 3: Default to Sunday-Thursday  
  else if (\!window.location.pathname.includes('index') &&  
           \!window.location.pathname.includes('favorite')) {  
    const defaultDays \= allDays.filter(day \=\>   
      \['Su', 'M', 'Tu', 'W', 'Th'\].includes(day.singleLetter)  
    );  
    setState({ selectedDays: defaultDays });  
  }  
    
  // Trigger calculations  
  setState({ changeListings: true });  
  calculateDaysAndSetStates();  
  checkContiguity();  
}

#### **7\. Custom Alert/Toast System**

function triggerAlert({ title, content, time, alertType, showOnLive }) {  
  // Don't show alerts if not in live version and showOnLive is required  
  if (isProduction && \!showOnLive) return;  
    
  const toast \= {  
    title,  
    content,  
    type: alertType || 'info', // 'error', 'warning', 'success', 'info'  
    duration: time || 3000  
  };  
    
  // Use your toast library (react-hot-toast, react-toastify, etc.)  
  showToast(toast);  
}

---

### **Component Structure**

SearchScheduleSelector/ ├── components/ │ ├── DayCell.jsx // Individual day button │ ├── DaysGrid.jsx // 7-column grid of days │ ├── WebScroller.jsx // Horizontal scroll container │ └── CalendarIcon.jsx // Responsive calendar icon ├── hooks/ │ ├── useScheduleState.js // State management hook │ ├── useDaySelection.js // Day click logic │ └── useContiguityCheck.js // Validation logic ├── utils/ │ ├── dayCalculations.js // Calculate nights, multipliers │ ├── urlSync.js // URL parameter sync │ └── dateHelpers.js // Date manipulation utilities └── SearchScheduleSelector.jsx // Main component

---

### **Key Implementation Notes**

1. State Persistence: Save user's recent selections to database/localStorage  
2. URL Sync: Always sync with URL parameters for shareable links  
3. Validation: Enforce contiguity and max 8 days selected  
4. Responsive: Show/hide calendar icon based on screen width (\<1200px)  
5. Debugging: Include console logging for non-production environments  
6. Performance: Debounce URL updates and calculations

This architecture replicates the Bubble workflow logic in a modern JavaScript framework while maintaining the same user experience and business logic.