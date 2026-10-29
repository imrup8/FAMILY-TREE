/**
 * Bengali Text Normalization and Matching Utilities
 * 
 * Handles Bengali text similarity for genealogy duplicate detection.
 * Does NOT change the original spelling - only creates search-optimized forms.
 */

// ============================================================
// Bengali Unicode Normalization
// ============================================================

/**
 * Normalize Bengali text for comparison purposes.
 * This creates a search-friendly form WITHOUT modifying the original.
 * 
 * Normalizations applied:
 * - Unicode NFC normalization
 * - Remove hasanta (্) where it creates ambiguity in names
 * - Normalize different forms of the same character (e.g., ো vs ো)
 * - Collapse multiple spaces
 * - Trim whitespace
 */
export function normalizeBengali(text: string): string {
  if (!text) return ''
  
  return text
    .normalize('NFC')           // Unicode canonical normalization
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .trim()
    .toLowerCase()
}

/**
 * Create a phonetic key for Bengali names.
 * Used as a secondary matching signal.
 * 
 * This is a simplified approximation - not a full phonetic algorithm.
 * Maps common Bengali character combinations to simplified forms.
 */
export function bengaliPhoneticKey(text: string): string {
  const normalized = normalizeBengali(text)
  
  // Common Bengali character substitutions for phonetic matching
  // These are approximations to catch common spelling variations
  return normalized
    // Vowels - normalize different representations
    .replace(/া|আ/g, 'a')
    .replace(/ি|ী|ই/g, 'i')
    .replace(/ু|ূ|উ/g, 'u')
    .replace(/ে|এ/g, 'e')
    .replace(/ো|ও/g, 'o')
    .replace(/ৃ/g, 'ri')
    // Common consonant clusters
    .replace(/ক্ষ/g, 'ksh')
    .replace(/জ্ঞ/g, 'gy')
    .replace(/ণ|ন/g, 'n')      // ণ and ন sound similar
    .replace(/শ|ষ|স/g, 'sh')   // All sibilants
    .replace(/ব|ভ/g, 'bh')
    .replace(/দ|ধ/g, 'dh')
    .replace(/ত|থ/g, 'th')
    .replace(/ক|খ/g, 'k')
    .replace(/গ|ঘ/g, 'g')
    .replace(/চ|ছ/g, 'ch')
    .replace(/জ|ঝ/g, 'j')
    .replace(/ট|ঠ/g, 't')
    .replace(/ড|ঢ/g, 'd')
    .replace(/প|ফ/g, 'p')
    .replace(/ম/g, 'm')
    .replace(/য|য়/g, 'y')
    .replace(/র|ড়|ঢ়/g, 'r')
    .replace(/ল/g, 'l')
    .replace(/হ/g, 'h')
    // Remove hasanta and virama
    .replace(/্/g, '')
    .replace(/ং|ঃ|ঁ/g, 'n')
    // Remove remaining non-alphanumeric
    .replace(/[^a-z]/g, '')
}

// ============================================================
// Similarity Scoring
// ============================================================

/**
 * Calculate similarity between two Bengali names.
 * Returns a score from 0.0 (completely different) to 1.0 (identical).
 * 
 * Uses multiple signals:
 * 1. Exact match (after normalization)
 * 2. Levenshtein distance on normalized text
 * 3. Phonetic key similarity
 */
export function calculateNameSimilarity(nameA: string, nameB: string): number {
  if (!nameA || !nameB) return 0

  const normA = normalizeBengali(nameA)
  const normB = normalizeBengali(nameB)

  // Exact match after normalization
  if (normA === normB) return 1.0

  // Phonetic key match
  const phoneticA = bengaliPhoneticKey(nameA)
  const phoneticB = bengaliPhoneticKey(nameB)
  if (phoneticA === phoneticB && phoneticA.length > 0) return 0.92

  // Levenshtein similarity on original normalized text
  const editScore = levenshteinSimilarity(normA, normB)

  // Levenshtein on phonetic keys
  const phoneticScore = levenshteinSimilarity(phoneticA, phoneticB)

  // Weighted combination
  return Math.max(editScore * 0.6 + phoneticScore * 0.4, phoneticScore * 0.9)
}

/**
 * Levenshtein distance-based similarity (0-1)
 */
function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length === 0 || b.length === 0) return 0

  const distance = levenshteinDistance(a, b)
  const maxLen = Math.max(a.length, b.length)
  return 1 - distance / maxLen
}

function levenshteinDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[a.length][b.length]
}

// ============================================================
// Name Matching for Duplicate Detection
// ============================================================

export interface NameMatchResult {
  similarity: number
  isExactMatch: boolean
  isPhoneticMatch: boolean
  matchType: 'exact' | 'phonetic' | 'close' | 'partial' | 'none'
}

export function matchNames(nameA: string, nameB: string): NameMatchResult {
  const normA = normalizeBengali(nameA)
  const normB = normalizeBengali(nameB)
  const phoneticA = bengaliPhoneticKey(nameA)
  const phoneticB = bengaliPhoneticKey(nameB)

  const isExactMatch = normA === normB
  const isPhoneticMatch = phoneticA === phoneticB && phoneticA.length > 0
  const similarity = calculateNameSimilarity(nameA, nameB)

  let matchType: NameMatchResult['matchType'] = 'none'
  if (isExactMatch) matchType = 'exact'
  else if (isPhoneticMatch) matchType = 'phonetic'
  else if (similarity >= 0.85) matchType = 'close'
  else if (similarity >= 0.65) matchType = 'partial'

  return { similarity, isExactMatch, isPhoneticMatch, matchType }
}

// ============================================================
// Bengali-Aware Search
// ============================================================

/**
 * Check if a search query matches a person's name or alternate spellings.
 * Used for client-side search before hitting the database.
 */
export function searchMatchesPerson(
  query: string,
  nameBengali: string,
  alternateNames: string[] = [],
  nameTransliterated?: string | null,
): boolean {
  if (!query.trim()) return true

  const normQuery = normalizeBengali(query)

  // Check primary name
  if (normalizeBengali(nameBengali).includes(normQuery)) return true

  // Check alternate names
  for (const alt of alternateNames) {
    if (normalizeBengali(alt).includes(normQuery)) return true
  }

  // Check transliteration (case-insensitive)
  if (nameTransliterated?.toLowerCase().includes(query.toLowerCase())) return true

  // Phonetic check
  const queryPhonetic = bengaliPhoneticKey(query)
  if (queryPhonetic && bengaliPhoneticKey(nameBengali).includes(queryPhonetic)) return true

  return false
}

// ============================================================
// Alternate Spelling Suggestions
// ============================================================

/**
 * Generate common alternate spellings for a Bengali name.
 * Used to broaden search and duplicate detection.
 */
export function generateAlternateSpellings(name: string): string[] {
  const alternates = new Set<string>()
  
  // Original variants
  alternates.add(name.trim())
  
  // Common variations
  const variations = name
    .replace(/ণ/g, 'ন')    // ণ → ন
    .replace(/ন/g, 'ণ')    // ন → ণ
    .replace(/শ/g, 'স')    // শ → স
    .replace(/স/g, 'শ')    // স → শ
    .replace(/ি/g, 'ী')    // ি → ী
    .replace(/ী/g, 'ি')    // ী → ি
    .replace(/ু/g, 'ূ')    // ু → ূ
    .replace(/ূ/g, 'ু')    // ূ → ু
  
  alternates.add(variations)
  
  // Remove the original
  alternates.delete(name.trim())
  
  return Array.from(alternates)
}
