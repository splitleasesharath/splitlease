# Split Lease Progress Bar Status Conditionals Documentation

Overview

The guest-proposals page contains a progress bar that tracks the proposal lifecycle through six stages. Each stage has visual indicators (circles/dots) and connecting progress lines that change color based on the proposal status. This document details all conditional logic for color changes in each element.

Color Legend

Purple (\#6D31C2): Completed stage \- indicates the process has passed this milestone  
Green (\#1F8E16): Current/Active stage \- indicates the stage is in progress or action needed  
Red (\#DB2E2E): Cancelled/Rejected \- indicates the proposal was cancelled or rejected  
Gray/Light Purple (\#B6B7E9): Pending/Waiting state  
Default (no condition): Inactive/Future stage

Progress Bar Stages (In Order)

1. Proposal Submitted  
2. 2\. Rental App Submitted  
3. 3\. Host Review  
4. 4\. Review Documents  
5. 5\. Lease Documents  
6. 6\. Initial Payment

DETAILED ELEMENT CONDITIONALS

1. G: proposal submitted (Container Group)

Element Type: Group container holding Stage 1 indicator and children  
Conditionals (2):

Condition 1:  
When: This Group is visible  
Property Changed: Border style \- all borders \= None

Condition 2:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: This element isn’t clickable \= TRUE

2. Shape A (Stage 1 Circle Indicator \- “Proposal Submitted”)

Element Type: Circle/Shape representing the first stage dot  
Conditionals (3):

Condition 1:  
When: Parent group’s Proposal’s Status is empty  
Property Changed: This element is visible \= TRUE (unchecked/hidden by default, shows when empty)

Condition 2:  
When: Parent group’s Proposal’s Status is “Proposal Cancelled by Guest” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: Background color \= \#DB2E2E (RED)

Condition 3:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host”  
Property Changed: Background color \= \#DB2E2E (RED)

3. S: features Progress (Progress Line 1 \- Between Stage 1 and 2\)

Element Type: Progress line/bar connecting Proposal Submitted to Rental App Submitted  
Conditionals (2):

Condition 1:  
When: Parent group’s Proposal’s Status is “Proposal Cancelled by Guest” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: Background color \= \#DB2E2E (RED)

Condition 2:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host”  
Property Changed: Background color \= \#DB2E2E (RED)

4. S: rental app or own proposal (Stage 2 Indicator \- “Rental App Submitted”)

Element Type: Circle/Shape representing the second stage dot  
Conditionals (5):

Condition 1:  
When: Parent group’s Proposal’s rental application is empty  
Property Changed: Background color \= \#1F8E16 (GREEN), This element isn’t clickable \= TRUE

Condition 2:  
When: Parent group’s Proposal’s Status is “Proposal Submitted for guest by Split Lease \- Awaiting Rental Application” OR Parent group’s Proposal’s Status is “Proposal Submitted for guest by Split Lease \- Pending Confirmation”  
Property Changed: Background color \= \#1F8E16 (GREEN), This element isn’t clickable \= TRUE

Condition 3:  
When: Parent group’s Proposal’s Status’s Usual Order \>= 1  
Property Changed: Background color \= \#6D31C2 (PURPLE), This element isn’t clickable \= TRUE

Condition 4:  
When: Parent group’s Proposal’s Status is “Proposal Cancelled by Guest” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: Background color \= \#DB2E2E (RED), This element isn’t clickable \= TRUE

Condition 5:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host”  
Property Changed: Background color \= \#DB2E2E (RED), This element isn’t clickable \= TRUE

5. S: features Progress copy (Progress Line 2 \- Between Stage 2 and 3\)

Element Type: Progress line/bar connecting Rental App Submitted to Host Review  
Conditionals (3):

Condition 1:  
When: Parent group’s Proposal’s Status’s Usual Order \>= 1  
Property Changed: Background color \= \#6D31C2 (PURPLE), This element isn’t clickable \= TRUE

Condition 2:  
When: Parent group’s Proposal’s Status is “Proposal Cancelled by Guest” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: Background color \= \#DB2E2E (RED)

Condition 3:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host”  
Property Changed: Background color \= \#DB2E2E (RED)

6. S: host review or counteroffer (Stage 3 Indicator \- “Host Review”)

Element Type: Circle/Shape representing the third stage dot  
Conditionals (5):

Condition 1:  
When: Parent group’s Proposal’s Status is “Host Review” AND Parent group’s Proposal’s rental application’s submitted is yes  
Property Changed: Background color \= \#1F8E16 (GREEN), This element isn’t clickable \= TRUE

Condition 2:  
When: Parent group’s Proposal’s Status’s Usual Order \>= 3  
Property Changed: Background color \= \#6D31C2 (PURPLE), This element isn’t clickable \= TRUE

Condition 3:  
When: Parent group’s Proposal’s Status is “Host Counteroffer Submitted / Awaiting Guest Review”  
Property Changed: Background color \= \#1F8E16 (GREEN), This element isn’t clickable \= FALSE

Condition 4:  
When: Parent group’s Proposal’s Status is “Proposal Cancelled by Guest” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: Background color \= \#DB2E2E (RED), This element isn’t clickable \= TRUE

Condition 5:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host”  
Property Changed: Background color \= \#DB2E2E (RED), This element isn’t clickable \= TRUE

7. S: features Progress (Progress Line 3 \- Between Stage 3 and 4\)

Element Type: Progress line/bar connecting Host Review to Review Documents  
Conditionals (3):

Condition 1:  
When: Parent group’s Proposal’s Status’s Usual Order \>= 3  
Property Changed: Background color \= \#6D31C2 (PURPLE)

Condition 2:  
When: Parent group’s Proposal’s Status is “Proposal Cancelled by Guest” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: Background color \= \#DB2E2E (RED)

Condition 3:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host”  
Property Changed: Background color \= \#DB2E2E (RED)

8. S: review documents (Stage 4 Indicator \- “Review Documents”)

Element Type: Circle/Shape representing the fourth stage dot  
Conditionals (5):

Condition 1:  
When: Parent group’s Proposal’s Status is “Lease Documents Sent for Review”  
Property Changed: Background color \= \#1F8E16 (GREEN), This element isn’t clickable \= TRUE

Condition 2:  
When: Parent group’s Proposal’s host documents review finalized? Is yes  
Property Changed: Background color \= \#B6B7E9 (LIGHT PURPLE/GRAY), This element isn’t clickable \= TRUE

Condition 3:  
When: Parent group’s Proposal’s Status’s Usual Order \>= 5  
Property Changed: Background color \= \#6D31C2 (PURPLE), This element isn’t clickable \= TRUE

Condition 4:  
When: Parent group’s Proposal’s Status is “Proposal Cancelled by Guest” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: Background color \= \#DB2E2E (RED), This element isn’t clickable \= TRUE

Condition 5:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host”  
Property Changed: Background color \= \#DB2E2E (RED), This element isn’t clickable \= TRUE

9. S: features Progress (Progress Line 4 \- Between Stage 4 and 5\)

Element Type: Progress line/bar connecting Review Documents to Lease Documents  
Conditionals (3):

Condition 1:  
When: Parent group’s Proposal’s Status’s Usual Order \>= 5  
Property Changed: Background color \= \#6D31C2 (PURPLE)

Condition 2:  
When: Parent group’s Proposal’s Status is “Proposal Cancelled by Guest” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: Background color \= \#DB2E2E (RED)

Condition 3:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host”  
Property Changed: Background color \= \#DB2E2E (RED)

10. S: lease docs sent for signature (Stage 5 Indicator \- “Lease Documents”)

Element Type: Circle/Shape representing the fifth stage dot  
Conditionals (4):

Condition 1:  
When: Parent group’s Proposal’s Status’s Usual Order \>= 6  
Property Changed: Background color \= \#6D31C2 (PURPLE)

Condition 2:  
When: Parent group’s Proposal’s Status is “Lease Documents Sent for Signatures”  
Property Changed: Background color \= \#1F8E16 (GREEN), This element isn’t clickable \= TRUE

Condition 3:  
When: Parent group’s Proposal’s Status is “Proposal Cancelled by Guest” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: Background color \= \#DB2E2E (RED)

Condition 4:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host”  
Property Changed: Background color \= \#DB2E2E (RED)

11. S: features Progress (Progress Line 5 \- Between Stage 5 and 6\)

Element Type: Progress line/bar connecting Lease Documents to Initial Payment  
Conditionals (3):

Condition 1:  
When: Parent group’s Proposal’s Status’s Usual Order \>= 6  
Property Changed: Background color \= \#6D31C2 (PURPLE)

Condition 2:  
When: Parent group’s Proposal’s Status is “Proposal Cancelled by Guest” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: Background color \= \#DB2E2E (RED)

Condition 3:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host”  
Property Changed: Background color \= \#DB2E2E (RED)

12. S: initial payment submitted (Stage 6 Indicator \- “Initial Payment”)

Element Type: Circle/Shape representing the sixth and final stage dot  
Conditionals (4):

Condition 1:  
When: Parent group’s Proposal’s Status is “Lease Documents Signed / Awaiting Initial payment”  
Property Changed: Background color \= \#1F8E16 (GREEN), This element isn’t clickable \= TRUE

Condition 2:  
When: Parent group’s Proposal’s Status is “Initial Payment Submitted / Lease activated”  
Property Changed: Background color \= \#6D31C2 (PURPLE)

Condition 3:  
When: Parent group’s Proposal’s Status is “Proposal Cancelled by Guest” OR Parent group’s Proposal’s Status is “Proposal Cancelled by Split Lease”  
Property Changed: Background color \= \#DB2E2E (RED)

Condition 4:  
When: Parent group’s Proposal’s Status is “Proposal Rejected by Host”  
Property Changed: Background color \= \#DB2E2E (RED)

STATUS FLOW SUMMARY

The “Usual Order” field in the Proposal’s Status is a numeric indicator used to determine progression through stages:

Status Usual Order Values:

- Order \>= 1: Past Rental App Submitted stage  
- \- Order \>= 3: Past Host Review stage  
- \- Order \>= 5: Past Review Documents stage  
- \- Order \>= 6: Past Lease Documents stage (at Initial Payment)

Key Status Values Referenced:

NORMAL FLOW STATUSES:

- Proposal Submitted for guest by Split Lease \- Awaiting Rental Application  
- \- Proposal Submitted for guest by Split Lease \- Pending Confirmation  
- \- Host Review  
- \- Host Counteroffer Submitted / Awaiting Guest Review  
- \- Lease Documents Sent for Review  
- \- Lease Documents Sent for Signatures  
- \- Lease Documents Signed / Awaiting Initial payment  
- \- Initial Payment Submitted / Lease activated

TERMINATION STATUSES:

- Proposal Cancelled by Guest  
- \- Proposal Cancelled by Split Lease  
- \- Proposal Rejected by Host

COLOR BEHAVIOR BY SCENARIO:

Normal Progression:

- Completed stages turn PURPLE (\#6D31C2)  
- \- Current/Active stage turns GREEN (\#1F8E16)  
- \- Future stages remain default (gray/inactive)

Cancellation/Rejection:

- ALL elements turn RED (\#DB2E2E) when proposal is cancelled or rejected  
- \- This applies to both stage indicators and progress lines  
- \- Elements become non-clickable