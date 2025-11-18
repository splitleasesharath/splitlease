# Days Available Field Analysis

## Query Results Summary

Total listings returned: 22 Manhattan "Every week" listings

## Key Findings

### Issue Identified: ALL LISTINGS HAVE SPECIFIC DAYS DEFINED

**None of the listings have null/empty days_available fields!**

This explains the discrepancy:
- Database shows: 22 listings
- Client filter shows: 12 listings
- Missing: 10 listings

### Breakdown by Days Available:

#### Listings with ALL 7 DAYS (12 listings - these PASS the Mon-Fri filter):
1. `1637766464825x314904261795779140` - Harlem Hideaway Parlor Apartment
2. `1690309054367x709388074557112300` - Large 2 Bed/1 Bath (East Village)
3. `1690310213454x892807361055162400` - Large 1 Bed, 1 Bath
4. `1690313575906x293284747808079900` - STUNNING STUDIO (Financial District)
5. `1701115344294x620453327586984000` - Fully furnished 1bdr in Harlem
6. `1701200559378x425368324389994500` - Downtown 2 Bedroom in Two Bridges
7. `1586447992720x748691103167545300` - One Platt | Studio
8. `1692381527820x598601515821170700` - Harlem Beautiful Studio
9. `1701107772942x447054126943830000` - Pied-à-terre 2 BR Apartment
10. `1701196985127x160157906679627780` - Furnished Studio Apt
11. `1637349462975x979571797111503900` - Furnished Room in East Harlem
12. `1707849911333x454438286651293700` - Metropolitan Serenity (Civic Center)
13. `1743790812920x538927313033625600` - Sunny, Spacious One-Bedroom (Harlem)
14. `1755561917260x292277449215705100` - Modern 3BR Condo (Financial District)
15. `1755643682257x738145455864021000` - Modern 3BR Condo (Financial District)

#### Listings MISSING Sunday (6 listings - these PASS Mon-Fri filter):
1. `1637349440736x622780446630946800` - 1 bedroom in East Harlem - Has: Mon-Sat
2. `1637766465197x598529624673451800` - SUPER CUTE LOFT (Tribeca) - Has: Mon-Sat
3. `1655828589260x266041618201313280` - Cozy Private Room in Tribeca - Has: Tue-Sat
4. `1707849799514x971102594326593500` - Downtown Charm (Civic Center) - Has: Mon-Sat
5. `1717515108287x333408151758176260` - Exquisite Residence at 321 Park Ave - Has: Mon-Sat

Wait, that's only 5... let me recount.

Actually looking at the data:
- Total with all 7 days: 10 listings
- Missing Sunday only (Mon-Sat): 6 listings
- Missing specific weekdays that EXCLUDE Mon-Fri requirements: 6 listings

#### Listings that FAIL the Mon-Fri filter (10 listings):

**Missing Friday:**
1. `1655828589260x266041618201313280` - Cozy Private Room in Tribeca
   - Has: ["Saturday", "Friday", "Thursday", "Wednesday", "Tuesday"]
   - Missing: Monday, Sunday

**Missing Monday:**
2. `1692811003339x451849759330148900` - Private Room in 2-Bdrm in Brooklyn
   - Has: ["Sunday", "Tuesday", "Saturday", "Monday"]
   - Missing: Wednesday, Thursday, Friday

**Missing weekdays (Mon-Fri incomplete):**
3. `1701658222257x936218888647475200` - Upper east side studio
   - Has: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
   - Missing: Saturday, Sunday
   - **WAIT - This one HAS all Mon-Fri! Should PASS!**

Let me reanalyze...

## Corrected Analysis:

### SHOULD PASS Mon-Fri Filter (has all of Mon, Tue, Wed, Thu, Fri):

**All 7 days (10 listings):**
- 1637766464825x314904261795779140
- 1690309054367x709388074557112300
- 1690310213454x892807361055162400
- 1690313575906x293284747808079900
- 1701115344294x620453327586984000
- 1701200559378x425368324389994500
- 1586447992720x748691103167545300
- 1692381527820x598601515821170700
- 1701107772942x447054126943830000
- 1701196985127x160157906679627780
- 1637349462975x979571797111503900
- 1707849911333x454438286651293700
- 1743790812920x538927313033625600
- 1755561917260x292277449215705100
- 1755643682257x738145455864021000

Count: 15 (not 10!)

**Mon-Sat (missing Sunday only - 4 listings):**
- 1637349440736x622780446630946800
- 1637766465197x598529624673451800
- 1707849799514x971102594326593500
- 1717515108287x333408151758176260

Count: 4

**Mon-Fri only (2 listings):**
- 1701658222257x936218888647475200

Count: 1

**Total that SHOULD PASS: 15 + 4 + 1 = 20 listings**

### SHOULD FAIL Mon-Fri Filter (missing at least one weekday):

**Tue-Sat (missing Monday):**
- 1655828589260x266041618201313280 - Has: Sat, Fri, Thu, Wed, Tue

**Random days (missing Wed, Thu, Fri):**
- 1692811003339x451849759330148900 - Has: Sun, Tue, Sat, Mon

**Total that SHOULD FAIL: 2 listings**

## The Discrepancy Explained:

- Database total: 22 listings
- Should pass Mon-Fri filter: 20 listings
- Client shows: 12 listings
- **Missing from client: 8 listings**

The client-side filter is incorrectly excluding 8 listings that have all Mon-Fri days!
