Button Conditionals \- Guest Proposals Page

\====================================  
REQUEST VIRTUAL MEETING (8 Conditionals)  
\====================================

Conditional 1:  
When: Parent group’s Proposal’s virtual meeting’s requested by is not Current User and Parent group’s Proposal’s virtual meeting is not empty

- Label: Respond to Virtual Meeting Request  
- \- Letter spacing: \-0.35

Conditional 2:  
When: Parent group’s Proposal’s virtual meeting’s requested by is Current User

- Label: Virtual Meeting Requested

Conditional 3:  
When: This Button is pressed

- Horizontal offset: 0  
- \- Boxshadow style: Inset

Conditional 4:  
When: Parent group’s Proposal’s virtual meeting’s booked date is not empty and Parent group’s Proposal’s virtual meeting’s confirmedBySplitLease is no

- Label: Virtual Meeting Accepted

Conditional 5:  
When: Parent group’s Proposal’s virtual meeting’s booked date is not empty and Parent group’s Proposal’s virtual meeting’s confirmedBySplitLease is yes

- Label: Meeting confirmed

Conditional 6:  
When: Parent group’s Proposal’s virtual meeting’s meeting declined is yes

- Label: Virtual Meeting Declined  
- \- Bold: checked  
- \- Font color: \#DB2E2E

Conditional 7:  
When: Parent group’s Proposal’s Status is Proposal Rejected by Host or Parent group’s Proposal’s Status is Proposal Cancelled by Split Lease or Parent group’s Proposal’s Status is Initial Payment Submitted / Lease activated

- This element is visible: unchecked (hidden)

Conditional 8:  
When: Parent group’s Proposal’s Status is Proposal Submitted for guest by Split Lease \- Awaiting Rental Application or Parent group’s Proposal’s Status is Proposal Submitted for guest by Split Lease \- Pending Confirmation

- This element is visible: unchecked (hidden)

\====================================  
GUEST ACTION 1 (10 Conditionals)  
\====================================

Conditional 1:  
When: Parent group’s Proposal’s Status is not empty

- This element is visible: checked

Conditional 2:  
When: Parent group’s Proposal’s Status’s Guest Action 1 is Invisible

- This element is visible: unchecked (hidden)

Conditional 3:  
When: Parent group’s Proposal’s guest documents review finalized? Is yes and Parent group’s Proposal’s Status is Lease Documents Sent for Review

- This element is visible: unchecked (hidden)

Conditional 4:  
When: Parent group’s Proposal’s Status’s Guest Action 1 is Remind Split Lease and Parent group’s Proposal’s remindersByGuest (number) ≥ 3

- This element is visible: unchecked (hidden)

Conditional 5:  
When: Parent group’s Proposal’s Status is not empty

- Label: Parent group’s Proposal’s Status’s Guest Action 1  
- \- This element is visible: checked

Conditional 6:  
When: Parent group’s Proposal’s Status’s Guest Action 1 is Invisible

- This element is visible: unchecked (hidden)

Conditional 7:  
When: Parent group’s Proposal’s guest documents review finalized? Is yes and Parent group’s Proposal’s Status is Lease Documents Sent for Review

- This element is visible: unchecked (hidden)

Conditional 8:  
When: Parent group’s Proposal’s Status’s Guest Action 1 is Go to Leases

Conditional 9:  
When: Parent group’s Proposal’s Status’s Guest Action 1 is Remind Split Lease and Parent group’s Proposal’s remindersByGuest (number) ≥ 3

- This element is visible: unchecked (hidden)

Conditional 10:  
When: Parent group’s Proposal’s Status is Proposal Rejected by Host

- Label: Delete Proposal  
- \- Background color: \#EF4444  
- \- This element is visible: unchecked (hidden)

\====================================  
GUEST ACTION 2 (5 Conditionals)  
\====================================

Conditional 1:  
When: Parent group’s Proposal’s Status’s Guest Action 2 is Invisible

- This element is visible: unchecked (hidden)

Conditional 2:  
When: Parent group’s Proposal’s Guest’s ID documents submitted? Is yes and Parent group’s Proposal’s Status is Lease Documents Sent for Review

- This element is visible: unchecked (hidden)

Conditional 3:  
When: Parent group’s Proposal’s Status is not empty

- Label: Parent group’s Proposal’s Status’s Guest Action 2

Conditional 4:  
When: Parent group’s Proposal’s Status’s Guest Action 2 is Invisible

- This element is visible: unchecked (hidden)

Conditional 5:  
When: Parent group’s Proposal’s Guest’s ID documents submitted? Is yes and Parent group’s Proposal’s Status is Lease Documents Sent for Review

- This element is visible: unchecked (hidden)

\====================================  
CANCEL PROPOSAL (6 Conditionals)  
\====================================

Conditional 1:  
When: Parent group’s Proposal’s Status is Proposal Rejected by Host

- Label: Proposal Rejected  
- \- This element is visible: unchecked (hidden)

Conditional 2:  
When: Parent group’s Proposal’s Status is Host Counteroffer Submitted / Awaiting Guest Review

- Label: Reject Modified Terms

Conditional 3:  
When: Parent group’s Proposal’s Status’s Usual Order \> 5

- This element is visible: checked

Conditional 4:  
When: Parent group’s Proposal’s Status is Proposal Cancelled by Split Lease or Parent group’s Proposal’s Status is Proposal Cancelled by Guest or Parent group’s Proposal’s Status is Proposal Rejected by Host

- Label: Delete Proposal

Conditional 5:  
When: Parent group’s Proposal’s Status’s Usual Order \> 5 and Parent group’s Proposal’s Listing’s House manual is not empty

- Label: See House Manual  
- \- Background color: \#6D31C2  
- \- This element is visible: checked  
- \- This element isn’t clickable: checked

Conditional 6:  
When: Parent group’s Proposal’s Status is Proposal Submitted for guest by Split Lease \- Awaiting Rental Application or Parent group’s Proposal’s Status is Proposal Submitted for guest by Split Lease \- Pending Confirmation

- Label: Reject Proposal  
- \- This element is visible: checked