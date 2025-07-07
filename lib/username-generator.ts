// Username generation utility for wallet-only users
// Generates usernames in the format: AdjectiveNoun123

const adjectives = [
  'Quick',
  'Brave',
  'Swift',
  'Bold',
  'Calm',
  'Wise',
  'Cool',
  'Fast',
  'Sharp',
  'Smart',
  'Bright',
  'Strong',
  'Lucky',
  'Happy',
  'Magic',
  'Silent',
  'Golden',
  'Silver',
  'Royal',
  'Noble',
  'Fierce',
  'Wild',
  'Clever',
  'Mighty',
  'Radiant',
  'Cosmic',
  'Electric',
  'Mystic'
];

const nouns = [
  'Panda',
  'Tiger',
  'Eagle',
  'Wolf',
  'Fox',
  'Bear',
  'Lion',
  'Hawk',
  'Raven',
  'Dragon',
  'Phoenix',
  'Falcon',
  'Shark',
  'Cobra',
  'Lynx',
  'Panther',
  'Jaguar',
  'Leopard',
  'Cheetah',
  'Viper',
  'Wizard',
  'Knight',
  'Warrior',
  'Sage',
  'Hunter',
  'Guardian',
  'Ranger',
  'Scholar'
];

/**
 * Generates a random username in the format: AdjectiveNoun123
 * @returns A randomly generated username
 */
export function generateRandomUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 900) + 100; // 3-digit number (100-999)

  return `${adjective}${noun}${number}`;
}

/**
 * Generates a unique username that doesn't exist in the database
 * @param checkUniqueness - Function that checks if a username already exists
 * @param maxAttempts - Maximum number of generation attempts (default: 5)
 * @returns A unique username or throws an error if unable to generate one
 */
export async function generateUniqueUsername(
  checkUniqueness: (username: string) => Promise<boolean>,
  maxAttempts: number = 5
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const username = generateRandomUsername();

    // Check if username is unique
    const isUnique = await checkUniqueness(username);
    if (isUnique) {
      return username;
    }
  }

  throw new Error(`Failed to generate unique username after ${maxAttempts} attempts`);
}

/**
 * Generates a prefixed username for wallet users to avoid conflicts
 * @param prefix - Prefix to add (default: "wallet")
 * @returns A prefixed random username
 */
export function generatePrefixedUsername(prefix: string = 'wallet'): string {
  const baseUsername = generateRandomUsername();
  return `${prefix}_${baseUsername}`;
}
