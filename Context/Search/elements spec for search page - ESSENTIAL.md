# **Search Page Elements Specification (Essential)**

## **1\. PAGE STRUCTURE**

Page Container  
├─ HeaderNav (z-index: 9999\)  
├─ SearchOverlay (z-index: 10000\) \- conditional display  
│   ├─ MapContainer (left 50%, 720px width)  
│   └─ ResultsList (right 50%, 720px width)  
└─ FilterSheet (z-index: 1000, static/frozen position)

**Container**: 1440px width, centered

---

## **2\. MAP SPECIFICATIONS**

### **Dimensions & Scale**

* Width: 720px (50% of 1440px container)  
* Height: calc(100vh \- 80px) \- accounts for header  
* Initial zoom: 12  
* Center: First result's lat/long or search query location

### **Map Markers**

**Marker Display**:

* Icon: Custom pin SVG (24px × 36px)  
* Price label: Overlaid on pin  
  * Font: 12px, 700 weight  
  * Color: \#FFFFFF  
  * Background: \#059669  
  * Padding: 4px 8px  
  * Border-radius: 4px  
  * Position: Centered on pin icon

**Marker States**:

* Default: \#059669 background  
* Hover: \#047857 background, scale(1.1)  
* Selected: \#047857 background, scale(1.15), z-index \+1

**Clustering**:

* Zoom \< 10: Group markers, show count  
* Zoom ≥ 10: Individual markers with prices

### **Map Interactions**

* Click marker → highlight corresponding ListingCard  
* Pan/zoom → update search bounds, re-query results  
* Debounce: 300ms on pan/zoom

---

## **3\. FILTER SHEET**

### **Position & Behavior**

* **Position**: Static/frozen, always visible  
* **Location**: Left sidebar OR top bar (specify based on layout)  
* **Width**: 300px (if sidebar) OR 100% height 120px (if top bar)  
* **Background**: \#FFFFFF  
* **Border**: 1px solid \#E5E7EB  
* **Padding**: 24px

### **Filter Components**

**Price Range**:

Label: "Price" (14px, 600 weight)  
RangeSlider:  
  \- Min: 0  
  \- Max: 5000  
  \- Step: 50  
  \- Display: $\[price\_min\] \- $\[price\_max\]

**Room Type**:

Label: "Room Type"  
Checkboxes (vertical stack, gap 12px):  
  \- Private room  
  \- Shared room  
  \- Studio

**Amenities**:

Label: "Amenities"  
Checkboxes (vertical stack, gap 12px):  
  \- WiFi  
  \- Parking  
  \- Laundry  
  \- Furnished  
  \- Pet friendly

**Date Range**:

Label: "Available Date"  
DateRangePicker:  
  \- Start date  
  \- End date  
  \- Format: MM/DD/YYYY

**Actions**:

Button: "Clear all" (secondary, text style)  
Button: "Apply filters" (primary, full width)  
  \- Shows count: "Show \[X\] results"

### **Filter States (Page-level)**

price\_min (number, default: 0\)  
price\_max (number, default: 5000\)  
selected\_amenities (list of texts)  
selected\_room\_types (list of texts)  
date\_start (date)  
date\_end (date)  
active\_filter\_count (number) \- calculated

---

## **4\. SEARCH CONSTRAINTS & HIERARCHY**

### **Search Logic**

Do a search for Listings:  
Priority 1 \- Text Match:  
  location's address contains search\_query  
  OR title contains search\_query  
  OR description contains search\_query

Priority 2 \- Price:  
  AND price ≥ price\_min  
  AND price ≤ price\_max

Priority 3 \- Dates:  
  AND available\_date ≤ date\_end  
  AND available\_date ≥ date\_start

Priority 4 \- Room Type:  
  AND (if selected\_room\_types:count \> 0\)  
    room\_type is in selected\_room\_types

Priority 5 \- Amenities:  
  AND (if selected\_amenities:count \> 0\)  
    amenities intersects with selected\_amenities

Priority 6 \- Geography:  
  AND (if map bounds exist)  
    latitude within map bounds  
    longitude within map bounds

Sort by:  
  price\_low: price (ascending)  
  price\_high: price (descending)  
  date: available\_date (ascending)  
  relevance: Created Date (descending)

### **Workflow Trigger**

On any filter change:  
1\. Wait 500ms (debounce)  
2\. Execute search with all constraints  
3\. Update results\_count  
4\. Update map markers

---

## **5\. RESULTS LIST**

### **Container**

* Width: 720px (50% of 1440px)  
* Height: calc(100vh \- 80px)  
* Overflow-y: scroll  
* Background: \#FFFFFF  
* Padding: 24px

### **Header**

Group (sticky top, background \#FFFFFF)  
├─ Text: "\[results\_count\] rooms found" (16px, 600 weight)  
└─ Dropdown: Sort by  
    \- Price: Low to High  
    \- Price: High to Low  
    \- Available Date  
    \- Most Recent

### **RepeatingGroup: SearchResults**

* Layout: Vertical scroll, Full list  
* Cell min-height: 180px  
* Cell padding: 20px  
* Separator: 1px solid \#E5E7EB  
* Data source: Search results (20 items per load)

---

## **6\. LISTING CARD**

### **Dimensions**

* Width: 100% (parent, 680px effective)  
* Min-height: 180px  
* Padding: 20px  
* Background: \#FFFFFF  
* Hover: Background \#F9FAFB

### **Layout**

Horizontal flex row:  
├─ Image (200px × 150px)  
│   \- Border-radius: 8px  
│   \- Object-fit: cover  
│  
└─ Content (flex-grow: 1, padding-left: 20px)  
    ├─ Text: Title (18px, 700 weight, \#111827)  
    ├─ Text: Location (14px, \#6B7280)  
    ├─ Text: Price (20px, 700 weight, \#059669)  
    │   \- Format: $\[price\]/month  
    ├─ Group: Tags (horizontal flex, gap 8px)  
    │   └─ Badges: amenities (12px, \#E5E7EB bg, 2px radius)  
    └─ Text: Available date (12px, \#9CA3AF)

### **States**

* `hover_active` (yes/no) \- triggers background change  
* `is_selected` (yes/no) \- when map marker clicked

### **Click Behavior**

* Navigate to /listing/:id  
* Pass listing data as parameter

---

## **7\. DATA STRUCTURE**

### **Listing Fields (Display & Filter)**

**Required for Display**:

id (text, unique)  
title (text)  
price (number)  
location (geographic address)  
latitude (number)  
longitude (number)  
available\_date (date)  
images (list of images) \- first image shown in card  
room\_type (text: "private" | "shared" | "studio")

**Required for Filtering**:

amenities (list of texts)  
  \- Options: "WiFi", "Parking", "Laundry", "Furnished", "Pet friendly"  
created\_date (date) \- for sorting by relevance

**Optional Display**:

description (text) \- searchable but not shown in card  
tags (list of texts) \- shown as badges  
lease\_length\_months (number)

---

## **8\. LAZY LOADING**

### **Implementation**

RepeatingGroup settings:  
\- Items per load: 20  
\- Scroll behavior: Load more on scroll to bottom  
\- Threshold: 200px from bottom

Image loading:  
\- Use Bubble's native lazy load (enabled by default)  
\- Placeholder: Solid \#E5E7EB rectangle while loading

Map markers:  
\- Load all markers initially (up to 200\)  
\- Beyond 200: Cluster at zoom \< 10  
\- Cluster number: Count of listings in cluster

### **Performance**

* Debounce search input: 500ms  
* Debounce map pan/zoom: 300ms  
* Cache search results: Store last 5 searches (custom state)

---

## **9\. COLORS (Essential Only)**

Primary: \#059669 (buttons, prices, markers)  
Text Dark: \#111827 (titles, headings)  
Text Light: \#6B7280 (secondary text)  
Border: \#E5E7EB (dividers, filter borders)  
Background: \#FFFFFF (cards, containers)  
Background Hover: \#F9FAFB (card hover state)

---

## **10\. CUSTOM STATES (Page-level)**

search\_active (yes/no) \- shows/hides overlay  
search\_query (text) \- current search input  
sort\_by (text) \- current sort selection  
results\_count (number) \- total results found  
results\_loading (yes/no) \- shows skeleton loaders  
selected\_listing\_id (text) \- highlighted card/marker  
map\_bounds (geographic address) \- current visible area

Filter states (see section 3\)

---

## **11\. KEY MEASUREMENTS**

### **Typography**

Card title: 18px, 700 weight  
Card price: 20px, 700 weight, \#059669  
Card location: 14px, 400 weight, \#6B7280  
Card date: 12px, 400 weight, \#9CA3AF  
Results count: 16px, 600 weight  
Filter labels: 14px, 600 weight  
Badge text: 12px, 400 weight

### **Spacing**

Card padding: 20px  
Content gap (image to text): 20px  
Tag gap: 8px  
Filter section gap: 24px  
Container padding: 24px

### **Borders & Radius**

Card border-radius: 0 (flat)  
Image border-radius: 8px  
Badge border-radius: 2px  
Filter inputs: 4px

---

## **IMPLEMENTATION ORDER**

1. Set up page custom states (11 states)  
2. Create FilterSheet (static position, all inputs)  
3. Create MapContainer (720px, markers with price labels)  
4. Create ResultsList RepeatingGroup  
5. Create ListingCard cell (200×150 image, content layout)  
6. Wire search constraints (6-level hierarchy)  
7. Connect filter changes → search trigger (500ms debounce)  
8. Connect map interactions → highlight cards  
9. Connect card hover → highlight map marker  
10. Add lazy loading to RepeatingGroup (20 items/load)  
11. Test with 100+ listings for performance

