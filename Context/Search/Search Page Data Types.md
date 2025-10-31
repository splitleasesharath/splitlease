## **Complete List of Data Types Used on the Search Page**

Based on my comprehensive analysis of both the Design and Workflow sections, here is the complete list of all data types used on the search page:

### **Core Data Types:**

1. User \- Current user information, authentication, profile data  
2. Listing \- Property listings displayed in search results  
3. Listing \- Photo \- Photos associated with listings  
4. Proposal \- Guest proposals referenced in "View Active Proposals" button  
5. pricing\_list \- Pricing information for listings

### **Location & Geographic Data:**

1. ZAT-Geo-Borough-Top Level \- Borough selection/filtering (Manhattan, Brooklyn, etc.)  
2. ZAT-Geo-Hood-Medium Level \- Neighborhood data shown on the map  
3. ZAT-Location \- Location data for listings and searches

### **Feature & Configuration Types:**

1. ZAT-Features \- Type of Space \- Space type labels (bedroom, entire apartment, etc.)  
2. ZAT-Features \- Amenity \- Amenity options for filtering  
3. ZAT-Features \- Listing Type \- Categorization of listing types  
4. ZAT-Features \- Parking Options \- (Referenced in filters)  
5. ZAT-Features \- Storage Options \- (Referenced in filters)  
6. ZAT-Features \- HouseRule \- (Referenced in filters)  
7. ZAT-Features \- Cancellation Policy \- (Referenced in filters)

### **Search & Notification Types:**

1. Saved Search \- Created when users submit weekly alerts  
2. Notification Settings OS(lists) \- Email/SMS notification preferences  
3. Data Collection \- Search Logging \- Tracks search behavior (background)

### **Temporal Data:**

1. Days \- Used in schedule selectors for check-in/check-out  
2. Nights Available \- Available nights data for bookings

### **Additional Supporting Types:**

1. Email \- Email communications (workflow: "Send email")  
2. \~Message \- Messaging functionality (workflows: "send-free-message")  
3. \~Thread / Conversation \- Message threading (implied from message workflows)

### **Summary:**

The search page uses 23 distinct data types, with the primary focus on:

* Listing (core search results)  
* User (authentication and personalization)  
* ZAT-Geo-\* types (location filtering and mapping)  
* ZAT-Features-\* types (filtering amenities and space characteristics)  
* Proposal, Saved Search, and Notification Settings (user interactions and alerts)

