/**
 * Generate Simulated Guests
 *
 * Creates hardcoded mock guest users for usability testing.
 * These are NOT real database users - they exist only in the simulation context.
 *
 * Based on the Bubble.io simulation which preloaded 3 guest users:
 * - Jacques Silva
 * - Mariska Van Der Berg
 * - Lukas Müller
 *
 * @module logic/simulators/generateSimulatedGuests
 */

/**
 * Generates the three simulated guest users for host-side usability testing.
 * These represent guests who will send proposals to the host during simulation.
 *
 * @returns {Array<Object>} Array of simulated guest user objects
 */
export function generateSimulatedGuests() {
  return [
    {
      id: 'sim-guest-jacques',
      firstName: 'Jacques',
      lastName: 'Silva',
      fullName: 'Jacques Silva',
      email: 'jacques.silva@simulation.splitlease.local',
      phone: '555-001-0001',
      avatar: null,
      occupation: 'Marketing Manager',
      isSimulated: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sim-guest-mariska',
      firstName: 'Mariska',
      lastName: 'Van Der Berg',
      fullName: 'Mariska Van Der Berg',
      email: 'mariska.vdb@simulation.splitlease.local',
      phone: '555-002-0002',
      avatar: null,
      occupation: 'UX Designer',
      isSimulated: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sim-guest-lukas',
      firstName: 'Lukas',
      lastName: 'Müller',
      fullName: 'Lukas Müller',
      email: 'lukas.muller@simulation.splitlease.local',
      phone: '555-003-0003',
      avatar: null,
      occupation: 'Software Developer',
      isSimulated: true,
      createdAt: new Date().toISOString()
    }
  ];
}

/**
 * Gets a single simulated guest by their identifier.
 *
 * @param {string} guestId - The guest identifier (e.g., 'sim-guest-jacques')
 * @returns {Object|null} The guest object or null if not found
 */
export function getSimulatedGuestById(guestId) {
  const guests = generateSimulatedGuests();
  return guests.find(guest => guest.id === guestId) || null;
}

/**
 * Gets a simulated guest by their first name.
 *
 * @param {string} firstName - The guest's first name (e.g., 'Jacques', 'Mariska', 'Lukas')
 * @returns {Object|null} The guest object or null if not found
 */
export function getSimulatedGuestByName(firstName) {
  const guests = generateSimulatedGuests();
  return guests.find(guest =>
    guest.firstName.toLowerCase() === firstName.toLowerCase()
  ) || null;
}

export default generateSimulatedGuests;
