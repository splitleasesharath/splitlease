/**
 * Type definitions for the Favorite Listings Page
 * Based on Bubble data schema with Split Lease listing fields
 */

/**
 * @typedef {'No Preference' | 'Male' | 'Female' | 'Non-Binary'} GenderPreference
 */

/**
 * @typedef {'Full Kitchen' | 'Kitchenette' | 'No Kitchen' | 'Shared Kitchen'} KitchenType
 */

/**
 * @typedef {'Entire Place' | 'Private Room' | 'Shared Room'} ListingType
 */

/**
 * @typedef {'Flexible' | 'Moderate' | 'Strict'} CancellationPolicy
 */

/**
 * @typedef {'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island'} Borough
 */

/**
 * @typedef {'New York' | 'Jersey City' | 'Hoboken'} City
 */

/**
 * @typedef {Object} ListingPhoto
 * @property {string} url
 * @property {number} order
 * @property {string} [altText]
 */

/**
 * @typedef {Object} GeographicAddress
 * @property {string} address
 * @property {number} lat
 * @property {number} lng
 * @property {string} [formatted]
 */

/**
 * @typedef {Object} PricingList
 * @property {number} startingNightlyPrice
 * @property {number} [weeklyPrice]
 * @property {number} [monthlyPrice]
 * @property {string} currency
 */

/**
 * @typedef {Object} ListingFeatures
 * @property {number} qtyBedrooms
 * @property {number} qtyBathrooms
 * @property {number} qtyBeds
 * @property {number} qtyGuests
 * @property {number} [maxGuests]
 * @property {number} [sqftArea]
 * @property {number} [sqftOfRoom]
 * @property {ListingType} typeOfSpace
 * @property {string[]} amenitiesInUnit
 * @property {string[]} amenitiesInBuilding
 * @property {string[]} houseRules
 * @property {string[]} safetyFeatures
 * @property {string} [parkingType]
 * @property {string} [secureStorageOption]
 * @property {boolean} trialPeriodsAllowed
 * @property {ListingPhoto[]} photos
 */

/**
 * @typedef {Object} ListingLocation
 * @property {GeographicAddress} address
 * @property {Borough} borough
 * @property {City} city
 * @property {string} hood
 * @property {string[]} [hoods]
 * @property {string} state
 * @property {string} zipCode
 */

/**
 * @typedef {Object} ListingAvailability
 * @property {string} firstAvailable - ISO date string
 * @property {string} lastAvailable - ISO date string
 * @property {number} nightsAvailable
 * @property {number[]} nightsAvailableList
 * @property {number[]} nightsNotAvailable
 * @property {string[]} datesBlocked - ISO date strings
 * @property {boolean} confirmedAvailability
 */

/**
 * @typedef {Object} Listing
 * @property {string} id
 * @property {string} name
 * @property {boolean} active
 * @property {boolean} approved
 * @property {boolean} complete
 * @property {string} progress
 * @property {number} searchRanking
 * @property {string} listingCode
 * @property {ListingFeatures} features
 * @property {KitchenType} [kitchenType]
 * @property {ListingLocation} location
 * @property {ListingAvailability} availability
 * @property {number} listerPriceDisplay
 * @property {PricingList} pricingList
 * @property {GenderPreference} preferredGender
 * @property {boolean} allowAlternatingRoommates
 * @property {string} newDateCheckInTime
 * @property {string} newDateCheckOutTime
 * @property {CancellationPolicy} cancellationPolicy
 * @property {string} createdAt - ISO date string
 * @property {string} updatedAt - ISO date string
 * @property {boolean} isFavorited
 */

/**
 * @typedef {Object} PaginationMeta
 * @property {number} total
 * @property {number} page
 * @property {number} perPage
 * @property {number} totalPages
 */

/**
 * @typedef {Object} FavoritedListingsResponse
 * @property {Listing[]} listings
 * @property {PaginationMeta} pagination
 */

/**
 * @typedef {Object} ScheduleSelection
 * @property {string} checkIn - ISO date string
 * @property {string} checkOut - ISO date string
 * @property {number} nights
 * @property {number[]} daysOfWeek - 0 = Sunday, 6 = Saturday
 */

export {};
