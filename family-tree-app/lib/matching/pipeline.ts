import type { ExtractedCandidate, Person, MatchingResult } from '@/types'
import { calculateNameSimilarity, normalizeBengali } from '@/lib/matching/bengali'
import { supabaseAdmin } from '@/lib/supabase/server'

// ============================================================
// Duplicate Matching Pipeline
// ============================================================

const MATCH_THRESHOLD = 0.65  // Minimum similarity to flag as possible duplicate

/**
 * For each extracted candidate, search the existing people database
 * for possible matches. Returns ranked match candidates.
 */
export async function findPossibleMatches(
  candidate: ExtractedCandidate,
  existingPeople?: Person[], // If provided, skip DB query
): Promise<MatchingResult> {
  
  // Get all existing people if not provided
  let people: Person[]
  if (existingPeople) {
    people = existingPeople
  } else {
    const { data, error } = await supabaseAdmin
      .from('people')
      .select('*')
      .is('deleted_at', null)
      .limit(5000)

    if (error) throw error
    people = data as Person[]
  }

  // Score each existing person against the candidate
  const scored = people
    .map(person => {
      const reasons: string[] = []
      let score = 0

      // Primary name similarity
      const nameSim = calculateNameSimilarity(
        candidate.name_original_script,
        person.name_bengali
      )
      
      if (nameSim > 0) {
        score = Math.max(score, nameSim)
        if (nameSim >= 0.9) reasons.push(`নাম প্রায় একই (${Math.round(nameSim * 100)}%)`)
        else if (nameSim >= 0.7) reasons.push(`নাম মিলের সম্ভাবনা (${Math.round(nameSim * 100)}%)`)
      }

      // Check alternate names
      for (const altName of (person.alternate_names || [])) {
        const altSim = calculateNameSimilarity(candidate.name_original_script, altName)
        if (altSim > score) {
          score = altSim
          if (altSim >= 0.8) reasons.push(`বিকল্প নামের সাথে মিল: ${altName}`)
        }
      }

      // Check normalized name
      if (candidate.normalized_name && person.name_normalized) {
        const normSim = calculateNameSimilarity(candidate.normalized_name, person.name_normalized)
        if (normSim > score) score = normSim
      }

      // Gender consistency bonus
      if (
        candidate.gender !== 'unknown' &&
        person.gender !== 'unknown' &&
        candidate.gender === person.gender
      ) {
        score = Math.min(1, score + 0.05)
        reasons.push('লিঙ্গ মিলছে')
      } else if (
        candidate.gender !== 'unknown' &&
        person.gender !== 'unknown' &&
        candidate.gender !== person.gender
      ) {
        score = Math.max(0, score - 0.2) // Penalize gender mismatch
        reasons.push('লিঙ্গ মিলছে না')
      }

      return {
        person,
        similarity_score: score,
        match_reasons: reasons,
        shared_relatives: [] as string[],
      }
    })
    .filter(m => m.similarity_score >= MATCH_THRESHOLD)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 5) // Top 5 matches

  // Determine recommended action
  let recommended_action: MatchingResult['recommended_action'] = 'create_new'
  
  if (scored.length > 0) {
    const topMatch = scored[0]
    if (topMatch.similarity_score >= 0.92) {
      recommended_action = 'merge_with_match'
    } else {
      recommended_action = 'needs_review'
    }
  }

  return {
    candidate,
    possible_matches: scored,
    recommended_action,
  }
}

/**
 * Find all potential duplicates in the existing database.
 * Run periodically or after bulk imports.
 */
export async function findAllDuplicates(): Promise<Array<{
  personA: Person
  personB: Person
  score: number
  reason: string
}>> {
  const { data: people, error } = await supabaseAdmin
    .from('people')
    .select('*')
    .is('deleted_at', null)

  if (error || !people) return []

  const duplicates: Array<{
    personA: Person
    personB: Person
    score: number
    reason: string
  }> = []

  // O(n²) comparison - for large trees, use database trigram search instead
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const personA = people[i] as Person
      const personB = people[j] as Person

      const score = calculateNameSimilarity(personA.name_bengali, personB.name_bengali)

      if (score >= MATCH_THRESHOLD) {
        // Check if already recorded
        duplicates.push({
          personA,
          personB,
          score,
          reason: `নাম মিলের সম্ভাবনা: ${Math.round(score * 100)}%`,
        })
      }
    }
  }

  return duplicates.sort((a, b) => b.score - a.score)
}

/**
 * Generate a change set from a batch of extracted candidates.
 * Compares candidates against existing database to produce minimal changes.
 */
export async function generateChangeSet(
  candidates: ExtractedCandidate[],
  extractedRelationships: Array<{
    person_a_temp_id: string
    person_b_temp_id: string
    relationship_type: string
    direction: string
    confidence: number
    evidence: string
  }>,
): Promise<{
  newPeople: ExtractedCandidate[]
  possibleDuplicates: MatchingResult[]
  newRelationships: typeof extractedRelationships
  conflictingRelationships: typeof extractedRelationships
}> {
  const newPeople: ExtractedCandidate[] = []
  const possibleDuplicates: MatchingResult[] = []

  // Load all existing people once
  const { data: allPeople } = await supabaseAdmin
    .from('people')
    .select('*')
    .is('deleted_at', null)
  
  const existingPeople = (allPeople || []) as Person[]

  // Match each candidate
  for (const candidate of candidates) {
    const result = await findPossibleMatches(candidate, existingPeople)
    
    if (result.recommended_action === 'create_new') {
      newPeople.push(candidate)
    } else {
      possibleDuplicates.push(result)
    }
  }

  return {
    newPeople,
    possibleDuplicates,
    newRelationships: extractedRelationships,
    conflictingRelationships: [],
  }
}
