/**
 * Service Area Zip Codes
 *
 * Complete list of valid zip codes for the Split Lease service area:
 * - NYC 5 boroughs (Manhattan, Brooklyn, Queens, Bronx, Staten Island)
 * - Hudson County, NJ (Jersey City, Hoboken, Weehawken, Union City, etc.)
 *
 * Used for address validation in the listing creation flow.
 */

export const NYC_ZIP_CODES = {
  manhattan: [
    '10001', '10002', '10003', '10004', '10005', '10006', '10007', '10009',
    '10010', '10011', '10012', '10013', '10014', '10016', '10017', '10018',
    '10019', '10020', '10021', '10022', '10023', '10024', '10025', '10026',
    '10027', '10028', '10029', '10030', '10031', '10032', '10033', '10034',
    '10035', '10036', '10037', '10038', '10039', '10040', '10044', '10065',
    '10069', '10075', '10103', '10110', '10111', '10112', '10115', '10119',
    '10128', '10152', '10153', '10154', '10162', '10165', '10167', '10168',
    '10169', '10170', '10171', '10172', '10173', '10174', '10177', '10199',
    '10271', '10278', '10279', '10280', '10282'
  ],

  brooklyn: [
    '11201', '11203', '11204', '11205', '11206', '11207', '11208', '11209',
    '11210', '11211', '11212', '11213', '11214', '11215', '11216', '11217',
    '11218', '11219', '11220', '11221', '11222', '11223', '11224', '11225',
    '11226', '11228', '11229', '11230', '11231', '11232', '11233', '11234',
    '11235', '11236', '11237', '11238', '11239', '11241', '11242', '11243',
    '11249', '11252', '11256'
  ],

  queens: [
    '11004', '11005', '11101', '11102', '11103', '11104', '11105', '11106',
    '11109', '11351', '11354', '11355', '11356', '11357', '11358', '11359',
    '11360', '11361', '11362', '11363', '11364', '11365', '11366', '11367',
    '11368', '11369', '11370', '11371', '11372', '11373', '11374', '11375',
    '11377', '11378', '11379', '11385', '11411', '11412', '11413', '11414',
    '11415', '11416', '11417', '11418', '11419', '11420', '11421', '11422',
    '11423', '11426', '11427', '11428', '11429', '11430', '11432', '11433',
    '11434', '11435', '11436', '11451', '11690', '11691', '11692', '11693',
    '11694', '11697'
  ],

  bronx: [
    '10451', '10452', '10453', '10454', '10455', '10456', '10457', '10458',
    '10459', '10460', '10461', '10462', '10463', '10464', '10465', '10466',
    '10467', '10468', '10469', '10470', '10471', '10472', '10473', '10474',
    '10475'
  ],

  statenIsland: [
    '10301', '10302', '10303', '10304', '10305', '10306', '10307', '10308',
    '10309', '10310', '10311', '10312', '10314'
  ],

  // Hudson County, NJ (Jersey City, Hoboken, Weehawken, Union City, etc.)
  hudsonCountyNJ: [
    '07002', '07003', '07006', '07008', '07010', '07011', '07012', '07014',
    '07017', '07018', '07020', '07021', '07022', '07024', '07026', '07027',
    '07028', '07029', '07030', '07031', '07032', '07033', '07034', '07036',
    '07039', '07040', '07041', '07042', '07043', '07044', '07047', '07050',
    '07052', '07055', '07057', '07060', '07062', '07063', '07064', '07065',
    '07066', '07067', '07070', '07071', '07072', '07073', '07074', '07075',
    '07076', '07077', '07078', '07079', '07080', '07081', '07083', '07086',
    '07087', '07088', '07090', '07092', '07093', '07094', '07095', '07096',
    '07097', '07099', '07101', '07102', '07103', '07104', '07105', '07106',
    '07107', '07108', '07109', '07110', '07111', '07112', '07114', '07302',
    '07303', '07304', '07305', '07306', '07307', '07308', '07309', '07310',
    '07311', '07395', '07399'
  ]
};

/**
 * Flattened set of all valid zip codes for quick lookup
 * Includes NYC 5 boroughs + Hudson County, NJ
 */
export const ALL_NYC_ZIP_CODES = new Set([
  ...NYC_ZIP_CODES.manhattan,
  ...NYC_ZIP_CODES.brooklyn,
  ...NYC_ZIP_CODES.queens,
  ...NYC_ZIP_CODES.bronx,
  ...NYC_ZIP_CODES.statenIsland,
  ...NYC_ZIP_CODES.hudsonCountyNJ
]);

/**
 * Check if a zip code is a valid NYC zip code
 */
export function isNYCZipCode(zipCode: string): boolean {
  return ALL_NYC_ZIP_CODES.has(zipCode);
}

/**
 * Get the borough/area name for a given zip code
 */
export function getBoroughForZipCode(zipCode: string): string | null {
  if (NYC_ZIP_CODES.manhattan.includes(zipCode)) return 'Manhattan';
  if (NYC_ZIP_CODES.brooklyn.includes(zipCode)) return 'Brooklyn';
  if (NYC_ZIP_CODES.queens.includes(zipCode)) return 'Queens';
  if (NYC_ZIP_CODES.bronx.includes(zipCode)) return 'Bronx';
  if (NYC_ZIP_CODES.statenIsland.includes(zipCode)) return 'Staten Island';
  if (NYC_ZIP_CODES.hudsonCountyNJ.includes(zipCode)) return 'Hudson County, NJ';
  return null;
}

/**
 * Service Area Bounding Box Coordinates
 * Encompasses NYC 5 boroughs + Hudson County, NJ
 */
export const NYC_BOUNDS = {
  north: 40.9176,  // Northern Bronx
  south: 40.4774,  // Southern Staten Island
  east: -73.7004,  // Eastern Queens
  west: -74.3000   // Western Hudson County, NJ (extended from -74.2591)
};

/**
 * Valid Hudson County, NJ county name variations as returned by Google Places
 */
export const HUDSON_COUNTY_NAMES = [
  'Hudson County',
  'Hudson',
];

/**
 * NYC Borough to County name mapping
 * Google Places returns these as administrative_area_level_2
 * Used as fallback when zip code is not available
 */
export const NYC_COUNTY_NAMES: Record<string, string> = {
  'new york county': 'Manhattan',
  'new york': 'Manhattan',
  'kings county': 'Brooklyn',
  'kings': 'Brooklyn',
  'queens county': 'Queens',
  'queens': 'Queens',
  'bronx county': 'Bronx',
  'bronx': 'Bronx',
  'richmond county': 'Staten Island',
  'richmond': 'Staten Island',
};

/**
 * Check if an address is in Hudson County, NJ by state and county name
 * Used as fallback when no zip code is available (e.g., highway addresses)
 */
export function isHudsonCountyNJ(state: string, county: string): boolean {
  if (state !== 'NJ' && state !== 'New Jersey') {
    return false;
  }
  const normalizedCounty = county.toLowerCase().replace(' county', '').trim();
  return normalizedCounty === 'hudson';
}

/**
 * Check if a county name corresponds to an NYC borough
 * Used as fallback when Google Places doesn't return a zip code
 */
export function isNYCCounty(state: string, county: string): boolean {
  if (state !== 'NY' && state !== 'New York') {
    return false;
  }
  const normalizedCounty = county.toLowerCase().trim();
  return normalizedCounty in NYC_COUNTY_NAMES;
}

/**
 * Get borough name from county name
 * Returns null if county is not an NYC borough
 */
export function getBoroughFromCounty(county: string): string | null {
  const normalizedCounty = county.toLowerCase().trim();
  return NYC_COUNTY_NAMES[normalizedCounty] || null;
}

/**
 * Check if an address is valid for the service area
 * Accepts NYC zip codes OR Hudson County, NJ addresses (by zip or county name)
 * Also accepts NYC addresses by county name when zip code is not available
 */
export function isValidServiceArea(zipCode: string, state?: string, county?: string): boolean {
  // First check by zip code
  if (zipCode && isNYCZipCode(zipCode)) {
    return true;
  }

  // Fallback: check if it's an NYC borough by county name
  // This handles cases where Google Places doesn't return a zip code
  // (e.g., "269-01 76th Avenue, Queens, NY" may not include zip)
  if (state && county && isNYCCounty(state, county)) {
    return true;
  }

  // Fallback: check if it's Hudson County, NJ by county name
  if (state && county && isHudsonCountyNJ(state, county)) {
    return true;
  }

  return false;
}
