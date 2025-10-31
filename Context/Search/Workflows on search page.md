\================================================================================  
SPLIT LEASE BUBBLE WORKFLOWS \- PLAIN TEXT BREAKDOWN  
\================================================================================

Total Workflows: 93  
Categories: 11  
Extraction Date: 2025-10-23

\================================================================================  
CATEGORY SUMMARY  
\================================================================================

Custom Events: 3 workflows

Do When conditions: 2 workflows

Filters: 4 workflows

Hides Element: 2 workflows

Information texts: 3 workflows

Listing Photo: 12 workflows

Maps: 6 workflows

Page is Loaded: 1 workflows

Send Message or Submit Proposal: 15 workflows

Show/Hide Elements: 7 workflows

Uncategorized: 38 workflows

\================================================================================  
DETAILED WORKFLOW BREAKDOWN  
\================================================================================

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\# CATEGORY: Custom Events  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\--------------------------------------------------------------------------------  
Name: T: explaining price tier is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Click  
  Element: T: explaining price tier  
  Event: Click

ACTIONS (1 steps):  
  Step 1: Trigger Custom Event  
    → Trigger Display-Informational-Texts (copy) from ⚛️ Informational text  
      • reusable\_element: ⚛️ Informational text  
      • custom\_event: Display-Informational-Texts (copy)  
      \[Only when: Click\]

NOTES: Triggers an informational text display when the price tier explanation element is clicked

\--------------------------------------------------------------------------------  
Name: T: 🔘sign in is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Click  
  Element: T: 🔘sign in  
  Event: Click

ACTIONS (1 steps):  
  Step 1: Show  
    → Show ♻️💥Sign up & Login A  
      • element: ♻️💥Sign up & Login A  
      \[Only when: Click\]

NOTES: Shows the sign up & login popup when the sign in button is clicked

\--------------------------------------------------------------------------------  
Name: 🔘Listing Photo Previous MAP CARD is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Click  
  Element: 🔘Listing Photo Previous MAP CARD  
  Event: Click

ACTIONS (2 steps):  
  Step 1: Set State  
    → Set states Image Counter... of 🔘Show Listing Photos RG Listing  
      • element: 🔘Show Listing Photos RG Listing  
      • custom\_state: Image Counter  
      • value: 🔘Show Listing Photos RG Listing's Image Counter \- 1  
      \[Only when: 🔘Show Listing Photos RG Listing's Image Counter \> 0\]  
  Step 2: Set State  
    → Set states Image Counter... of 🔘Show Listing Photos RG Listing  
      • element: 🔘Show Listing Photos RG Listing  
      • custom\_state: Image Counter  
      • value: Parent group's Listing's Features \- Photos:count  
      \[Only when: 🔘Show Listing Photos RG Listing's Image Counter is 0\]

NOTES: Handles previous photo navigation in the map card listing photo gallery. Decrements counter if \> 0, otherwise wraps to last photo.

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\# CATEGORY: Do When conditions  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\--------------------------------------------------------------------------------  
Name: Just once condition  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Do when condition is true  
  Element: N/A  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Hide

NOTES: This workflow runs only once when the condition 'Current User is logged in' becomes true. It hides the sign up/login interface element since the user is now authenticated.

\--------------------------------------------------------------------------------  
Name: 🔘Submit Weekly Alerts is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Click  
  Element: 🔘Submit Weekly Alerts  
  Event: Click

ACTIONS (10 steps):  
  Step 1: Create a new thing  
    → Create a new Saved Search...  
      • type: Saved Search  
      \[Only when: Click\]  
  Step 2: Hide  
    → Hide \*P: 💥Send email  
  Step 3: Plugin Action  
    → Simple Toast \- Email Notification SignUp  
  Step 4: Schedule API Workflow  
    → Schedule API Workflow send\_saved\_search  
  Step 5: Schedule API Workflow  
    → Schedule API Workflow send\_saved\_search  
  Step 6: Create a new thing  
    → Create New Notification Settings for both SMS and Email  
      \[Only when: Current User's Notification Settings OS(lisits) is empty\]  
  Step 7: Make changes to a thing  
    → Make changes to current user  
      \[Only when: Current User's Notification Settings OS(lisits) is empty\]  
  Step 8: Make changes to a list  
    → Make changes to Notification Settings OS(lists)...  
  Step 9: Email  
    → Send email to activation channel  
  Step 10: Navigation  
    → HOTJARtag \- Go to page properties-search

NOTES: Complex workflow for submitting weekly search alerts. Creates saved search, schedules API workflows, manages notification settings, and navigates to properties page.

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\# CATEGORY: Filters  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\--------------------------------------------------------------------------------  
Name: IN: ✍️price options value selected  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An input's value is changed  
  Element: IN: ✍️price options  
  Event: N/A

ACTIONS (3 steps):  
  Step 1: Make changes to current user  
    → Update current user's Price Tier field  
  Step 2: Trigger custom event  
    → Trigger Alerts general VERSION TEST  
  Step 3: Navigate to page  
    → Go to page search

\--------------------------------------------------------------------------------  
Name: IN: ✍️Search Borough value selected  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An input's value is changed  
  Element: IN: ✍️Search Borough  
  Event: N/A

ACTIONS (3 steps):  
  Step 1: Set map center  
    → set center MP: googlemap(bdk) DESKTOP  
  Step 2: Make changes to current user  
    → Update current user's Preferred Borough field  
  Step 3: Navigate to page  
    → Go to page search

\--------------------------------------------------------------------------------  
Name: IN: ✍️Sorting Options value selected  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An input's value is changed  
  Element: IN: ✍️Sorting Options  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Navigate to page  
    → Go to page search

\--------------------------------------------------------------------------------  
Name: ✍️Search Hoods value changed  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An input's value is changed  
  Element: ✍️Search Hoods  
  Event: N/A

ACTIONS (2 steps):  
  Step 1: Make changes to current user  
    → Update current user's Preferred Hoods field  
  Step 2: Navigate to page  
    → Go to page search

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\# CATEGORY: Hides Element  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\--------------------------------------------------------------------------------  
Name: Icon fa fa-close is clicked- Hides G: Listing info selected on map  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I: Close  
  Event: N/A

ACTIONS (2 steps):  
  Step 1: Hide  
  Step 2: Reset

\--------------------------------------------------------------------------------  
Name: Sign up & Login A is closed- Shows P: Send Email  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: A popup is closed  
  Element: ♻️💥Sign up & Login A  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Show

NOTES: This workflow shows a send email popup when the Sign up & Login popup is closed, but only if the current user is logged in.

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\# CATEGORY: Information texts  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\--------------------------------------------------------------------------------  
Name: G: starting nightly price and question mark ORIGINAL is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: starting nightly price and question mark ORIGINAL  
  Event: Click

ACTIONS (2 steps):  
  Step 1: Trigger Custom Event  
    → Trigger Display-Informational-Texts (copy) from ⚛️ Informational text  
      \[Only when: Click\]  
  Step 2: Scroll to Entry  
    → Scroll to entry of RG: 📜Listings  
      \[Only when: Click\]

NOTES: This workflow displays informational text about nightly pricing when the starting nightly price question mark is clicked, then scrolls to the corresponding listing entry in the repeating group.

\--------------------------------------------------------------------------------  
Name: G: starting nightly price and question mark ORIGINAL is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: starting nightly price and question mark ORIGINAL  
  Event: Click

ACTIONS (2 steps):  
  Step 1: Trigger Custom Event  
    → Trigger Display-Informational-Texts (copy) from ⚛️ Informational text  
      \[Only when: Click\]  
  Step 2: Scroll to Entry  
    → Scroll to entry of RG: 📜Listings NO RESULTS on main group  
      \[Only when: Click\]

NOTES: This workflow is similar to workflow 35 but targets a different repeating group element ('RG: 📜Listings NO RESULTS on main group' instead of 'RG: 📜Listings'). The parameter 'PriceStarts' also differs slightly from workflow 35 ('Price Starts' with a space).

\--------------------------------------------------------------------------------  
Name: I: 🔘Listing Photo Previous RG Search Properties is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Click  
  Element: I: 🔘Listing Photo Previous RG Search Properties  
  Event: Click

CONDITIONS:  
  IM: 🔘Show Listing Photos RG Listing MAIN's Image Counter \> 1

ACTIONS (1 steps):  
  Step 1: Set State  
    → Set states Image Counter... of IM: 🔘Show Listing Photos RG Listing MAIN  
      • element: IM: 🔘Show Listing Photos RG Listing MAIN  
      • custom\_state: Image Counter  
      • value: IM: 🔘Show Listing Photos RG Listing MAIN's Image Counter \- 1  
      \[Only when: Click\]

NOTES: Handles previous photo navigation in the search results listing photo gallery. Decrements counter when \> 1\.

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\# CATEGORY: Listing Photo  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\--------------------------------------------------------------------------------  
Name: I: 🔘Listing Photo Previous RG Search Properties is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I: 🔘Listing Photo Previous RG Search Properties  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Decrements image counter by 1 when counter is greater than 1 for MAIN view

\--------------------------------------------------------------------------------  
Name: I: 🔘Listing Photo Previous RG Search Properties is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I: 🔘Listing Photo Previous RG Search Properties  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Wraps counter to last photo when at first photo for MAIN view

\--------------------------------------------------------------------------------  
Name: I: 🔘Listing Photo Previous RG Search Properties is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I: 🔘Listing Photo Previous RG Search Properties  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Decrements image counter by 1 when counter is greater than 1 for NO RESULTS view

\--------------------------------------------------------------------------------  
Name: I: 🔘Listing Photo Previous RG Search Properties is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I: 🔘Listing Photo Previous RG Search Properties  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Wraps counter to last photo when at first photo for NO RESULTS view

\--------------------------------------------------------------------------------  
Name: I: 🔘Listing Photo Previous RG Search Properties MAP CARD is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I: 🔘Listing Photo Previous RG Search Properties MAP CARD  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Decrements image counter by 1 when counter is greater than 1 for MAP CARD view

\--------------------------------------------------------------------------------  
Name: I: 🔘Listing Photo Previous RG Search Properties MAP CARD is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I: 🔘Listing Photo Previous RG Search Properties MAP CARD  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Wraps counter to last photo when at first photo for MAP CARD view

\--------------------------------------------------------------------------------  
Name: I:🔘Listing Photo Next RG Search Properties is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I:🔘Listing Photo Next RG Search Properties  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Increments image counter by 1 when counter is less than photo count for MAIN view

\--------------------------------------------------------------------------------  
Name: I:🔘Listing Photo Next RG Search Properties is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I:🔘Listing Photo Next RG Search Properties  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Resets counter to 1 (wraps to first photo) when at last photo for MAIN view

\--------------------------------------------------------------------------------  
Name: I:🔘Listing Photo Next RG Search Properties is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I:🔘Listing Photo Next RG Search Properties  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Increments image counter by 1 when counter is less than photo count for NO RESULTS view

\--------------------------------------------------------------------------------  
Name: I:🔘Listing Photo Next RG Search Properties is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I:🔘Listing Photo Next RG Search Properties  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Resets counter to 1 (wraps to first photo) when at last photo for NO RESULTS view

\--------------------------------------------------------------------------------  
Name: I:🔘Listing Photo Next RG Search Properties MAP CARD is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I:🔘Listing Photo Next RG Search Properties MAP CARD  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Increments image counter by 1 when counter is less than photo count for MAP CARD view

\--------------------------------------------------------------------------------  
Name: I:🔘Listing Photo Next RG Search Properties MAP CARD is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: An element is clicked  
  Element: I:🔘Listing Photo Next RG Search Properties MAP CARD  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Set state

NOTES: Resets counter to 1 (wraps to first photo) when at last photo for MAP CARD view

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\# CATEGORY: Maps  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\--------------------------------------------------------------------------------  
Name: B: map viewing is clicked- Pans to selected Location and Shows P: Maps for unique listing  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: T: Location Manhattan1  
  Event: is clicked

ACTIONS (4 steps):  
  Step 1: pan to location  
  Step 2: Display data  
  Step 3: Display data  
  Step 4: Show

NOTES: This workflow pans the map to a selected listing location and displays the listing information in map UI elements

\--------------------------------------------------------------------------------  
Name: B: map viewing is clicked- Pans to selected Location and Shows P: Maps for unique listing  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: T: Location Manhattan1  
  Event: is clicked

ACTIONS (4 steps):  
  Step 1: pan to location  
  Step 2: Display data  
  Step 3: Display data  
  Step 4: Show

NOTES: This workflow is identical to workflow 55 \- appears to be a duplicate with the same trigger, actions, and configuration

\--------------------------------------------------------------------------------  
Name: B: map viewing is clicked- Pans to selected Location and Shows P: Maps for unique listing MAIN CARD  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: T: Location Manhattan1  
  Event: is clicked

ACTIONS (4 steps):  
  Step 1: pan to location  
    → pan to location MP: googlemap(bdk) desktop  
  Step 2: Display data  
    → Display data using current listing  
  Step 3: Display data  
    → Display data in G: listing selected on marker map  
  Step 4: Show  
    → Show G: Listing info selected on map

\--------------------------------------------------------------------------------  
Name: B: map viewing is clicked- Pans to selected Location and Shows P: Maps for unique listing MAIN CARD (copy)  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: T: Location Manhattan1  
  Event: is clicked

ACTIONS (7 steps):  
  Step 1: Display data  
    → Display data in P: 💥Maps BDK MOBILE newww  
  Step 2: Show  
    → Show P: 💥Maps BDK MOBILE newww  
  Step 3: Pause  
    → Add a pause before next action  
  Step 4: Set state  
    → Set states center searched... of MP: googlemap(bdk) MOBILE DETAILS  
  Step 5: Set state  
    → Set states center searched... of MP: googlemap(bdk) MOBILE DETAILS  
  Step 6: pan to location  
    → pan to location MP: googlemap(bdk) MOBILE DETAILS  
  Step 7: Display markers  
    → Display markers on MP: Map A

\--------------------------------------------------------------------------------  
Name: googlemap(bdk) desktop marker 1 clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: MP: googlemap(bdk) desktop  
  Event: marker 1 clicked

ACTIONS (5 steps):  
  Step 1: Scroll  
    → Scroll to entry of RG: 📜Listings  
  Step 2: Display data  
    → Display data using MARKER 1  
  Step 3: Display data  
    → Display data in G: listing selected on marker map  
  Step 4: Show  
    → Show G: Listing info selected on map  
  Step 5: pan to location  
    → pan to location MP: googlemap(bdk) desktop

\--------------------------------------------------------------------------------  
Name: MP: googlemap(bdk) desktop marker 2 clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: MP: googlemap(bdk) desktop  
  Event: marker 2 clicked

ACTIONS (5 steps):  
  Step 1: Scroll  
    → Scroll to entry of RG: 📜Listings  
  Step 2: Display data  
    → Display data using MARKER 2  
  Step 3: Display data  
    → Display data in G: listing selected on marker map  
  Step 4: Show  
    → Show G: Listing info selected on map  
  Step 5: pan to location  
    → pan to location MP: googlemap(bdk) desktop

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\# CATEGORY: Page is Loaded  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\--------------------------------------------------------------------------------  
Name: Page is loaded  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Page is loaded  
  Element: None  
  Event: N/A

ACTIONS (5 steps):  
  Step N/A: Element action  
  Step N/A: Element action  
  Step N/A: Custom event  
  Step N/A: Plugin action  
  Step N/A: Element action

NOTES: \['This workflow runs when the page is loaded', "Action 1 is labeled as 'DISABLE FOR NOW' \- suggesting it may be temporarily disabled", 'Action 2 sets the map center based on searched results', 'Action 3 triggers a custom alert event with test content', 'Action 4 runs JavaScript to adjust photo alignment based on screen size', 'Action 5 sets a custom state on the signup/login reusable element to prevent redirect'\]

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\# CATEGORY: Send Message or Submit Proposal  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages DEFAULT RG  
Bubble ID: cukjV0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages DEFAULT RG  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count \> 0", 'Current User is logged in'\]

ACTIONS (1 steps):  
  Step 1: N/A  
      • listing: Parent group's Listing  
      • user\_guest: Current User

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages DEFAULT RG  
Bubble ID: cukjc0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages DEFAULT RG  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count \> 0", 'Current User is logged in'\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages DEFAULT RG  
Bubble ID: cukjm0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages DEFAULT RG  
  Event: is clicked

CONDITIONS:  
  \['Current User is logged out'\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages DEFAULT RG  
Bubble ID: cukjt0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages DEFAULT RG  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count is 0", 'Current User is logged in'\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages DEFAULT RG  
Bubble ID: culSk0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages DEFAULT RG  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count is 0", 'Current User is logged in', "Current User's Chat \- Threads:filtered:count \>= 1"\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages MAIN RG  
Bubble ID: csXaK  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages MAIN RG  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count \> 0", 'Current User is logged in'\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages MAIN RG  
Bubble ID: csXaD  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages MAIN RG  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count \> 0", 'Current User is logged in'\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages MAIN RG  
Bubble ID: csXZw  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages MAIN RG  
  Event: is clicked

CONDITIONS:  
  \['Current User is logged out'\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages MAIN RG  
Bubble ID: csXZm  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages MAIN RG  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count is 0", 'Current User is logged in'\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages MAIN RG  
Bubble ID: culSr0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages MAIN RG  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count is 0", 'Current User is logged in', "Current User's Chat \- Threads:filtered:count \>= 1"\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages MAP CARD  
Bubble ID: cucaA3  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages MAP CARD  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count \> 0", 'Current User is logged in'\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages MAP CARD  
Bubble ID: cucaK3  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages MAP CARD  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count \> 0", 'Current User is logged in'\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages MAP CARD  
Bubble ID: cucaR3  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages MAP CARD  
  Event: is clicked

CONDITIONS:  
  \['Current User is logged out'\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages MAP CARD  
Bubble ID: cucaY3  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages MAP CARD  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count is 0", 'Current User is logged in'\]

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: B:SendFreeMessages MAP CARD  
Bubble ID: culSy0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: SendFreeMessages MAP CARD  
  Event: is clicked

CONDITIONS:  
  \["Current User's Proposals List:filtered:count is 0", 'Current User is logged in', "Current User's Chat \- Threads:filtered:count \>= 1"\]

ACTIONS (1 steps):  
  Step 1: N/A

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\# CATEGORY: Show/Hide Elements  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\--------------------------------------------------------------------------------  
Name: B: Email me new Listings is clicked- Show P: Send Email (copy)  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: Email me new Listings  
  Event: is clicked

ACTIONS (2 steps):  
  Step 1: Set state  
  Step 2: Show

\--------------------------------------------------------------------------------  
Name: B: Email me new Listings is clicked- Show P: Send Email (copy)  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: Email me new Listings  
  Event: is clicked

ACTIONS (2 steps):  
  Step 1: Set state  
  Step 2: Show

\--------------------------------------------------------------------------------  
Name: G: filters collapsing and displaying is clicked- Shows G: Filters  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: filters collapsing and displaying  
  Event: is clicked

ACTIONS (1 steps):  
  Step 1: Show

\--------------------------------------------------------------------------------  
Name: G: Stay with Us is clicked- Shows G: Menu Stay with us  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: Stay with Us Menu  
  Event: is clicked

ACTIONS (1 steps):  
  Step 1: Toggle

\--------------------------------------------------------------------------------  
Name: I: Close is clicked- Hides P: Send Email  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: I: Close  
  Event: is clicked

ACTIONS (1 steps):  
  Step 1: Hide

\--------------------------------------------------------------------------------  
Name: T: Sign In / Sign Up is clicked- Shows Signup& Login  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: T: Sign In / Sign Up  
  Event: is clicked

ACTIONS (2 steps):  
  Step 1: Show  
  Step 2: Hide

\--------------------------------------------------------------------------------  
Name: 🔘Signup for Alerts is clicked- Shows Sign Up & Login  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: 🔘Signup for Alerts  
  Event: is clicked

ACTIONS (3 steps):  
  Step 1: Show  
  Step 2: Set state  
  Step 3: Set state

\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#  
\# CATEGORY: Uncategorized  
\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

\--------------------------------------------------------------------------------  
Name: B: Sed message and Proposal MapCard is clicked  
Bubble ID: cuoAy0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: Sed message and Proposal MapCard

CONDITIONS:  
  Current User's Proposals List:filtered:count is 0 and Current User is logged in

ACTIONS (1 steps):  
  Step 1: Trigger send-free-message  
    → Trigger send-free-message custom event

\--------------------------------------------------------------------------------  
Name: B: Sed message and Proposal MapCard is clicked  
Bubble ID: cuoBI0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: Sed message and Proposal MapCard

CONDITIONS:  
  Current User is logged out

ACTIONS (1 steps):  
  Step 1: Trigger send-free-message  
    → Trigger send-free-message custom event

\--------------------------------------------------------------------------------  
Name: B: Sed message and Proposal MapCard is clicked  
Bubble ID: cuoBP0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: Sed message and Proposal MapCard

CONDITIONS:  
  Current User's Proposals List:filtered:count \> 0 and Current User is logged in

ACTIONS (1 steps):  
  Step 1: Trigger submit-proposal  
    → Trigger submit-proposal custom event

\--------------------------------------------------------------------------------  
Name: B: Sed message and Proposal MapCard is clicked  
Bubble ID: cuoBW0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: B: Sed message and Proposal MapCard

CONDITIONS:  
  Current User's Proposals List:filtered:count \> 0 and Current User is logged in

ACTIONS (1 steps):  
  Step 1: Trigger see-proposal  
    → Trigger see-proposal custom event

\--------------------------------------------------------------------------------  
Name: G: hide filters is clicked  
Bubble ID: curAy4  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: hide filters

CONDITIONS:  
  Click

ACTIONS (1 steps):  
  Step 1: Hide FG: 📜Filters  
    → Hide the Filters element

\--------------------------------------------------------------------------------  
Name: G: location label is clicked  
Bubble ID: cunzu0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: location label

CONDITIONS:  
  Click

ACTIONS (7 steps):  
  Step 1: Display data in P: 💥Maps BDK MOBILE newww  
    → Display data in mobile maps popup  
  Step 2: Show P: 💥Maps BDK MOBILE newww  
    → Show mobile maps popup  
  Step 3: Add a pause before next action  
    → Pause execution before next step  
  Step 4: Set states center searched... of MP: googlemap(bdk) MOBILE DETAILS  
    → Set map center state  
  Step 5: Set states center searched... of MP: googlemap(bdk) MOBILE DETAILS  
    → Set map center state again  
  Step 6: pan to location MP: googlemap(bdk) MOBILE DETAILS  
    → Pan map to location  
  Step 7: Display markers on MP: Map A  
    → Display map markers

\--------------------------------------------------------------------------------  
Name: G: location label is clicked  
Bubble ID: cuoAO0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: location label

CONDITIONS:  
  G:🔘Go to Listing (listing card) map single card's card expanded? is no

ACTIONS (1 steps):  
  Step 1: Set states card expanded?... of G:🔘Go to Listing (listing card) map single card  
    → Set card expanded state to true

\--------------------------------------------------------------------------------  
Name: G: location label is clicked  
Bubble ID: cuoAY0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: location label

CONDITIONS:  
  G:🔘Go to Listing (listing card) map single card's card expanded? is yes

ACTIONS (1 steps):  
  Step 1: Set states card expanded?... of G:🔘Go to Listing (listing card) map single card  
    → Set card expanded state to false (toggle)

\--------------------------------------------------------------------------------  
Name: G:🔘Go to Listing (listing card) map single card is clicked  
Bubble ID: cunze0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G:🔘Go to Listing (listing card) map single card

CONDITIONS:  
  Click

ACTIONS (4 steps):  
  Step 1: update click count  
    → Update listing click count  
  Step 2: update click counts  
    → Update click counts (Only when Current User is not Parent group's Listing's Creator)  
  Step 3: update click to view ratio  
    → Update listing click to view ratio metric  
  Step 4: open new page with lots of URL conditions  
    → Navigate to listing detail page with URL parameters

\--------------------------------------------------------------------------------  
Name: googlemap(bdk) desktop marker 1 clicked  
Bubble ID: cunyy0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: MP: googlemap(bdk) MOBILE DETAILS

CONDITIONS:  
  Click

ACTIONS (6 steps):  
  Step 1: Display data using MARKER 1  
    → Display listing data for clicked marker  
  Step 2: Set states center searched... of MP: googlemap(bdk) MOBILE DETAILS  
    → Set map center state  
  Step 3: Set states center searched... of MP: googlemap(bdk) MOBILE DETAILS  
    → Set map center state again  
  Step 4: Show G:🔘Go to Listing (listing card) map single card  
    → Show listing card element  
  Step 5: pan to location MP: googlemap(bdk) MOBILE DETAILS  
    → Pan map to marker location  
  Step 6: Set states card expanded?... of G:🔘Go to Listing (listing card) map single card  
    → Set card expanded state

\--------------------------------------------------------------------------------  
Name: Group Listing is clicked  
Bubble ID: cuoBg0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: Group Listing

CONDITIONS:  
  Click

ACTIONS (4 steps):  
  Step 1: update click count  
    → Update listing click count  
  Step 2: update click counts  
    → Update click counts (Only when Current User is not Parent group's Listing's Creator)  
  Step 3: update click to view ratio  
    → Update listing click to view ratio metric  
  Step 4: open new page with lots of URL conditions  
    → Navigate to listing detail page with URL parameters

\--------------------------------------------------------------------------------  
Name: I: Filters is clicked  
Bubble ID: cuXAC1  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: I: Filters

CONDITIONS:  
  FG: 📜Filters isn't visible

ACTIONS (1 steps):  
  Step 1: Show FG: 📜Filters  
    → Show the Filters element

\--------------------------------------------------------------------------------  
Name: I: Filters is clicked  
Bubble ID: cuchk2  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: I: Filters

CONDITIONS:  
  FG: 📜Filters is visible

ACTIONS (1 steps):  
  Step 1: Hide FG: 📜Filters  
    → Hide the Filters element

\--------------------------------------------------------------------------------  
Name: I: 🔘Close 💥Map NEW POPUP is clicked  
Bubble ID: cunym0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: I: 🔘Close 💥Map NEW POPUP

CONDITIONS:  
  Click

ACTIONS (3 steps):  
  Step 1: Hide P: 💥Maps BDK MOBILE newww  
    → Hide the map popup element  
  Step 2: Set states center searched... of MP: googlemap(bdk) MOBILE DETAILS  
    → Reset map center state  
  Step 3: Reset G:🔘Go to Listing (listing card) map single card  
    → Reset listing card element

\--------------------------------------------------------------------------------  
Name: I:White logo (Desktop Header) is clicked  
Bubble ID: cuWzs1  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: I:White logo (Desktop Header)

CONDITIONS:  
  Click

ACTIONS (1 steps):  
  Step 1: Go to page index  
    → Navigate to home page

\--------------------------------------------------------------------------------  
Name: Image D is clicked  
Bubble ID: cuXAJ1  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: Image D

CONDITIONS:  
  Click

ACTIONS (1 steps):  
  Step 1: Open an external website  
    → Navigate to external URL

\--------------------------------------------------------------------------------  
Name: MP: googlemap(bdk) MOBILE DETAILS marker 2 clicked  
Bubble ID: cunzQ0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: MP: googlemap(bdk) MOBILE DETAILS

CONDITIONS:  
  Click

ACTIONS (5 steps):  
  Step 1: Display data using MARKER 2  
    → Display listing data for second marker  
  Step 2: Set states center searched... of MP: googlemap(bdk) MOBILE DETAILS  
    → Set map center state  
  Step 3: Set states center searched... of MP: googlemap(bdk) MOBILE DETAILS  
    → Set map center state again  
  Step 4: Show G:🔘Go to Listing (listing card) map single card  
    → Show listing card  
  Step 5: pan to location MP: googlemap(bdk) MOBILE DETAILS  
    → Pan map to marker location

\--------------------------------------------------------------------------------  
Name: 🔘Listing Photo Next MAP CARD is clicked  
Bubble ID: cuoAq0  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: 🔘Listing Photo Next MAP CARD

CONDITIONS:  
  Click

ACTIONS (2 steps):  
  Step 1: set state: add one to the counter until the last photo  
    → Increment photo counter (Only when Parent group's Listing's Features \- Photos:count \+ 1 \> 🔘Show Listing Photos RG Listing's Image Counter)  
  Step 2: set state: current photo is the last photo. so show the first photo  
    → Reset to first photo (Only when 🔘Show Listing Photos RG Listing's Image Counter \> Parent group's Listing's Features \- Photos:count)

\--------------------------------------------------------------------------------  
Name: Alerts general  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: A custom event is triggered  
  Element: N/A  
  Event: N/A

ACTIONS (6 steps):  
  Step 1: Custom Toast ERROR  
  Step 2: Custom Toast INFORMATION  
  Step 3: Custom Toast WARNING  
  Step 4: Custom Toast SUCCESS  
  Step 5: Custom Toast EMPTY ALERT TYPE  
  Step 6: Custom Toast Version-Test ONLY

NOTES: This workflow displays different types of toast notifications based on the alert type parameter. It uses conditional logic to show appropriate toast messages (error, information, warning, success, or empty) with different styling. The workflow includes 6 steps total, each configured as a Custom Toast with specific conditions.

\--------------------------------------------------------------------------------  
Name: go to threads  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: A custom event is triggered  
  Element: N/A  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Go to page

NOTES: This workflow navigates to the messaging-app page with a thread parameter. It filters the current user's chat threads and passes the first item's unique ID as a parameter.

\--------------------------------------------------------------------------------  
Name: see-proposal  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: A custom event is triggered  
  Element: N/A  
  Event: N/A

ACTIONS (1 steps):  
  Step 1: Go to page

NOTES: This workflow navigates to the guest-proposals page with a proposal parameter. It uses the user guest parameter to find their proposals and passes the first filtered proposal's unique ID as a page parameter.

\--------------------------------------------------------------------------------  
Name: send-free-message  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: A custom event is triggered  
  Element: N/A  
  Event: N/A

ACTIONS (2 steps):  
  Step 1: Set state  
  Step 2: Show

NOTES: This workflow sets up and displays a contact form popup for sending a free message to a listing's host. Step 1 sets multiple custom states on the popup including the sender (current user), recipient (listing's host), subject (listing name), listing reference, and a prefilled message. Step 2 then shows the popup.

\--------------------------------------------------------------------------------  
Name: submit-proposal  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: A custom event is triggered  
  Element: N/A  
  Event: N/A

ACTIONS (7 steps):  
  Step 1: Set state  
    → Set state DEFAULTS with PREVIOUS USER'S DATA (Proposals already created)  
  Step 2: Set state  
    → Set state WHEN RESERVATION SPAN is OTHER  
  Step 3: Set state  
    → Set state WHEN first proposal \- DEFAULT of reservation span and selector data  
  Step 4: Set state  
    → Set state WHEN first proposal \- DEFAULT of reservation span 13 weeks and selector data  
  Step 5: Set state  
    → Set state FIRST PROPOSAL  
  Step 6: Set state  
    → Set state MORE THAN one proposal  
  Step 7: Show

NOTES: This is a complex workflow that initializes and displays the proposal creation flow. It has conditional logic to handle different scenarios: 1\) Users with existing proposals (uses their last proposal data), 2\) First-time proposal with existing reservation span preference, 3\) First-time proposal with default 13 weeks, and 4\) Special handling for 'Other' reservation span type. The workflow sets up extensive custom states on the popup before displaying it.

\--------------------------------------------------------------------------------  
Name: D: Select Week Pattern value selected  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: D: Select Week Pattern  
  Event: value selected

ACTIONS (2 steps):  
  Step 1: Make changes to current user  
    → Make changes to current user  
      • field: Preferred weekly schedule  
      • operator: \=  
      • value: This LabelledDropdown's Value  
  Step 2: Go to page search  
    → Navigate to search page with parameters  
      • destination: search  
      • data\_to\_send: Click  
      • send\_current\_page\_parameters: False  
      • send\_more\_parameters: True  
      • url\_parameters: \[{'key': 'weekly-frequency', 'value': "This LabelledDropdown's Value's Display"}\]

\--------------------------------------------------------------------------------  
Name: G: Favorite Listings is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: Favorite Listings  
  Event: is clicked

ACTIONS (1 steps):  
  Step 1: Go to page favorite-listings  
    → Navigate to favorite listings page  
      • destination: favorite-listings  
      • data\_to\_send: Click  
      • open\_in\_new\_tab: False  
      • send\_current\_page\_parameters: False  
      • send\_more\_parameters: False

\--------------------------------------------------------------------------------  
Name: G: Get newest listings is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: Get newest listings  
  Event: is clicked

ACTIONS (1 steps):  
  Step 1: Show ai-popup-signup-search A  
    → Display signup popup for search  
      • element: ai-popup-signup-search A

\--------------------------------------------------------------------------------  
Name: G: Get newest listings is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: Get newest listings  
  Event: is clicked

ACTIONS (1 steps):  
  Step 1: Show ai-popup-signup-search A  
    → Display signup popup for search  
      • element: ai-popup-signup-search A

\--------------------------------------------------------------------------------  
Name: G: 🔘Go to Listing (listing card) is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: 🔘Go to Listing (listing card)  
  Event: is clicked

ACTIONS (6 steps):  
  Step 1: Make changes to Listing  
    → Increment click counter for listing analytics  
      • thing\_to\_change: Current cell's Listing  
      • field: Metrics \- Click Counter  
      • operator: \=  
      • value: This Listing's Metrics \- Click Counter \+ 1  
  Step 2: Make changes to Listing  
    → Add current user to clickers list and update click counter  
      • thing\_to\_change: Current cell's Listing  
  Step 3: Make changes to Listing  
    → Calculate clicks-to-view ratio for listing analytics  
      • thing\_to\_change: Current cell's Listing  
      • field: ClicksToViewRatio  
      • operator: \=  
      • value: Current cell's Listing's Metrics \- Click Counter / Current cell's Listing's Viewers:count  
  Step 4: Run javascript  
    → DISABLED \- JavaScript action (not executed)  
  Step 5: Go to page view-split-lease  
    → Navigate non-host users to view listing details page with search parameters  
      • destination: view-split-lease  
      • data\_to\_send: Current cell's Listing  
      • open\_in\_new\_tab: False  
      • send\_current\_page\_parameters: False  
      • send\_more\_parameters: True  
      • url\_parameters: \[{'key': 'area', 'value': 'Get area from page URL'}, {'key': 'arrival', 'value': 'Get arrival from page URL'}, {'key': 'duration', 'value': "13 weeks (3 months)'s Display"}, {'key': 'nights', 'value': 'Get nights from page URL'}, {'key': 'guests', 'value': 'Get guests from page URL'}, {'key': 'storage', 'value': 'Get storage from page URL'}, {'key': 'type', 'value': 'Get type from page URL'}, {'key': 'days-selected', 'value': "⛴ Search Schedule Selector's Selected Days:each item's Bubble Number (Text)"}\]  
  Step 6: Go to page preview-split-lease  
    → Navigate host users to preview their own listing  
      • destination: preview-split-lease  
      • data\_to\_send: Current cell's Listing  
      • open\_in\_new\_tab: False  
      • send\_current\_page\_parameters: False  
      • send\_more\_parameters: False

\--------------------------------------------------------------------------------  
Name: G: 🔘Go to Listing (listing card) NO RESULTS is clicked  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: Element Event  
  Element: G: 🔘Go to Listing (listing card) NO RESULTS  
  Event: is clicked

ACTIONS (6 steps):  
  Step 1: Make changes to Listing  
    → Increment click counter for listing analytics  
      • thing\_to\_change: Current cell's Listing  
      • field: Metrics \- Click Counter  
      • operator: \=  
      • value: This Listing's Metrics \- Click Counter \+ 1  
  Step 2: Make changes to Listing  
    → Add current user to clickers list and update click counter  
      • thing\_to\_change: Current cell's Listing  
  Step 3: Make changes to Listing  
    → Calculate clicks-to-view ratio for listing analytics  
      • thing\_to\_change: Current cell's Listing  
      • field: ClicksToViewRatio  
      • operator: \=  
      • value: Current cell's Listing's Metrics \- Click Counter / Current cell's Listing's Viewers:count  
  Step 4: Run javascript  
    → DISABLED \- JavaScript action (not executed)  
  Step 5: Go to page view-split-lease  
    → Navigate non-host users to view listing details page with search parameters  
      • destination: view-split-lease  
      • data\_to\_send: Current cell's Listing  
      • open\_in\_new\_tab: False  
      • send\_current\_page\_parameters: False  
      • send\_more\_parameters: True  
      • url\_parameters: \[{'key': 'area', 'value': 'Get area from page URL'}, {'key': 'arrival', 'value': 'Get arrival from page URL'}, {'key': 'duration', 'value': "13 weeks (3 months)'s Display"}, {'key': 'nights', 'value': 'Get nights from page URL'}, {'key': 'guests', 'value': 'Get guests from page URL'}, {'key': 'storage', 'value': 'Get storage from page URL'}, {'key': 'type', 'value': 'Get type from page URL'}, {'key': 'days-selected', 'value': "⛴ Search Schedule Selector's Selected Days:each item's Bubble Number (Text)"}\]  
  Step 6: Go to page preview-split-lease  
    → Navigate host users to preview their own listing  
      • destination: preview-split-lease  
      • data\_to\_send: Current cell's Listing  
      • open\_in\_new\_tab: False  
      • send\_current\_page\_parameters: False  
      • send\_more\_parameters: False

\--------------------------------------------------------------------------------  
Name: B: view proposals- Navigate to guest-dashboard  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: N/A  
  Element: N/A

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: I:White logo (Desktop Header) is clicked-Navigate to index  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: N/A  
  Element: N/A

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: T: 3 Easy Steps To Book is clicked- Navigate to easy-steps-to-book  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: N/A  
  Element: N/A

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: T: Explore FAQ is clicked-Navigate to faq  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: N/A  
  Element: N/A

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: T: Rental Application is clicked-Navigate to rental-application  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: N/A  
  Element: N/A

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: T: Success Stories is clicked-Navigate to success-stories-guest  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: N/A  
  Element: N/A

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: T: Understand Split Lease is clicked-Navigate to understand-split-lease-guest  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: N/A  
  Element: N/A

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: Text \[left\]Split Lease\[/l is clicked- Navigate to index  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: N/A  
  Element: N/A

ACTIONS (1 steps):  
  Step 1: N/A

\--------------------------------------------------------------------------------  
Name: 🔘B: Open Notifications is clicked- Navigate to account-profile  
\--------------------------------------------------------------------------------

TRIGGER:  
  Type: N/A  
  Element: N/A

ACTIONS (1 steps):  
  Step 1: N/A

