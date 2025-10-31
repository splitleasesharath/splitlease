# **Complete Search Option Sets Spec**

## **1\. DAYS OPTION SET**

### **Attributes:**

* Associated Night: Nights (option set reference)  
* Bubble Number: number  
* Bubble Number (Text): text  
* First 3 letters: text  
* Next Day: Days (option set reference)  
* Previous Night: Nights (option set reference)  
* Single Letter: text  
* Display: text (Built-in attribute)

### **Options:**

Option: Sunday

* Display: Sunday  
* Bubble Number: 1  
* Bubble Number (Text): 1  
* First 3 letters: Sun  
* Single Letter: S  
* Next Day: Monday  
* Previous Night: Saturday  
* Associated Night: Sunday (Nights)

Option: Monday

* Display: Monday  
* Bubble Number: 2  
* Bubble Number (Text): 2  
* First 3 letters: Mon  
* Single Letter: M  
* Next Day: Tuesday  
* Previous Night: Sunday  
* Associated Night: Monday (Nights)

Option: Tuesday

* Display: Tuesday  
* Bubble Number: 3  
* Bubble Number (Text): 3  
* First 3 letters: Tue  
* Single Letter: T  
* Next Day: Wednesday  
* Previous Night: Monday  
* Associated Night: Tuesday (Nights)

Option: Wednesday

* Display: Wednesday  
* Bubble Number: 4  
* Bubble Number (Text): 4  
* First 3 letters: Wed  
* Single Letter: W  
* Next Day: Thursday  
* Previous Night: Tuesday  
* Associated Night: Wednesday (Nights)

Option: Thursday

* Display: Thursday  
* Bubble Number: 5  
* Bubble Number (Text): 5  
* First 3 letters: Thu  
* Single Letter: T  
* Next Day: Friday  
* Previous Night: Wednesday  
* Associated Night: Thursday (Nights)

Option: Friday

* Display: Friday  
* Bubble Number: 6  
* Bubble Number (Text): 6  
* First 3 letters: Fri  
* Single Letter: F  
* Next Day: Saturday  
* Previous Night: Thursday  
* Associated Night: Friday (Nights)

Option: Saturday

* Display: Saturday  
* Bubble Number: 7  
* Bubble Number (Text): 7  
* First 3 letters: Sat  
* Single Letter: S  
* Next Day: Sunday  
* Previous Night: Friday  
* Associated Night: Saturday (Nights)

---

## **2\. FILTER \- PRICEONSEARCH OPTION SET**

### **Attributes:**

* Price Max: number  
* Price Min: number  
* Display: text (Built-in attribute)

### **Options:**

Option: \< $200/night

* Display: \< $200/night  
* Price Min: 20  
* Price Max: 200

Option: $200-$350/night

* Display: $200-$350/night  
* Price Min: 200  
* Price Max: 350

Option: $350-$500/night

* Display: $350-$500/night  
* Price Min: 350  
* Price Max: 500

Option: $500+/night

* Display: $500+/night  
* Price Min: 500  
* Price Max: 999999

Option: All Prices

* Display: All Prices  
* Price Min: 0  
* Price Max: 999999

---

## **3\. SORTBYPROPERTIESSEARCH OPTION SET**

### **Attributes:**

* Decending: yes / no  
* fieldName: text  
* mobiledisplay: text  
* Display: text (Built-in attribute)

### **Options:**

Option: Our Recommendations

* Display: Our Recommendations  
* fieldName: (custom sort field)  
* Decending: no  
* mobiledisplay: Our Recommendations

Option: Price-Lowest to Highest

* Display: Price-Lowest to Highest  
* fieldName: price  
* Decending: no  
* mobiledisplay: Price (Low to High)

Option: Most viewed

* Display: Most viewed  
* fieldName: view\_count  
* Decending: yes  
* mobiledisplay: Most Viewed

Option: Recently Added

* Display: Recently Added  
* fieldName: Created Date  
* Decending: yes  
* mobiledisplay: Recently Added

---

## **4\. WEEKLY SELECTION OPTIONS OPTION SET**

### **Attributes:**

* Display mobile: text  
* num weeks during 4 ca: number  
* period: number  
* short display: text  
* shown to hosts?: yes / no  
* Display: text (Built-in attribute)

### **Options:**

Option: Every week

* Display: Every week  
* short display: Every week  
* Display mobile: Every week  
* period: 1  
* num weeks during 4 ca: 4  
* shown to hosts?: yes

Option: One week on, one week off

* Display: One week on, one week off  
* short display: 1 on, 1 off  
* Display mobile: 1 week on/off  
* period: 2  
* num weeks during 4 ca: 2  
* shown to hosts?: yes

Option: Two weeks on, two weeks off

* Display: Two weeks on, two weeks off  
* short display: 2 on, 2 off  
* Display mobile: 2 weeks on/off  
* period: 4  
* num weeks during 4 ca: 2  
* shown to hosts?: yes

Option: One week on, three weeks off

* Display: One week on, three weeks off  
* short display: 1 on, 3 off  
* Display mobile: 1 week on/3 off  
* period: 4  
* num weeks during 4 ca: 1  
* shown to hosts?: (varies)

