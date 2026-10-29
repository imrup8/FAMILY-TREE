// ============================================================
// Core TypeScript Types for Family Genealogy System
// ============================================================

// ---- Database Entity Types ----

export type UserRole = 'admin' | 'editor' | 'viewer'

export type Gender = 'male' | 'female' | 'other' | 'unknown'

export type VerificationStatus = 'unverified' | 'ai_extracted' | 'user_reviewed' | 'verified'

export type DataSource = 'manual' | 'ai_extracted' | 'imported'

export type DocumentStatus =
  | 'uploaded'
  | 'queued'
  | 'analyzing'
  | 'needs_review'
  | 'approved'
  | 'failed'
  | 'partial'

export type PageStatus = 'uploaded' | 'queued' | 'analyzing' | 'needs_review' | 'approved' | 'failed'

export type ProcessingJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'merged' | 'uncertain' | 'deferred'

export type RelationshipType = 'parent_child' | 'spouse' | 'sibling' | 'other'

export type RelationshipDirection = 'a_to_b' | 'b_to_a' | 'bidirectional'

export type ReviewItemType =
  | 'new_person'
  | 'new_relationship'
  | 'conflict'
  | 'duplicate'
  | 'uncertain_reading'

export type ChangeType = 'create' | 'update' | 'delete' | 'restore' | 'merge' | 'approve' | 'reject'

export type EntityType = 'person' | 'relationship' | 'document' | 'review_item'

// ---- Source Region (Bounding Box) ----

export interface SourceRegion {
  x: number
  y: number
  width: number
  height: number
  page?: number
}

// ---- Person ----

export interface Person {
  id: string
  display_id: string
  name_bengali: string
  name_normalized: string | null
  name_transliterated: string | null
  alternate_names: string[]
  gender: Gender
  birth_date: string | null
  birth_date_approximate: boolean
  death_date: string | null
  death_date_approximate: boolean
  is_living: boolean
  birth_place: string | null
  death_place: string | null
  residence: string | null
  verification_status: VerificationStatus
  data_source: DataSource
  notes: string | null
  biography: string | null
  generation_number: number | null
  deleted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PersonWithRelatives extends Person {
  parents: Person[]
  children: Person[]
  spouses: Person[]
  siblings: Person[]
  source_documents: DocumentPage[]
}

// ---- Relationship ----

export interface Relationship {
  id: string
  person_a_id: string
  person_b_id: string
  relationship_type: RelationshipType
  direction: RelationshipDirection | null
  marriage_date: string | null
  marriage_place: string | null
  divorce_date: string | null
  verification_status: VerificationStatus
  data_source: DataSource
  confidence_score: number | null
  notes: string | null
  deleted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---- Document ----

export interface Document {
  id: string
  display_id: string
  title: string
  description: string | null
  source_description: string | null
  approximate_date: string | null
  document_date: string | null
  uploaded_by: string | null
  total_pages: number
  status: DocumentStatus
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface DocumentPage {
  id: string
  display_id: string
  document_id: string
  page_number: number
  storage_path: string
  original_filename: string
  file_type: string
  file_size_bytes: number | null
  width_px: number | null
  height_px: number | null
  rotation_degrees: number
  page_label: string | null
  status: PageStatus
  processing_error: string | null
  created_at: string
  updated_at: string
}

// ---- Processing Job ----

export interface ProcessingJob {
  id: string
  document_id: string
  page_id: string | null
  job_type: 'ai_analysis' | 'matching' | 'export'
  status: ProcessingJobStatus
  priority: number
  attempts: number
  max_attempts: number
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  result_summary: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// ---- AI Extraction Types ----

export interface ExtractedPersonCandidate {
  temporary_id: string
  name_original_script: string
  normalized_name: string | null
  alternate_spellings: string[]
  gender: Gender
  birth_date: string | null
  death_date: string | null
  notes: string[]
  text_confidence: number
  source_region: SourceRegion | null
}

export interface ExtractedRelationshipCandidate {
  person_a: string   // temporary_id
  person_b: string   // temporary_id
  relationship_type: RelationshipType
  direction: RelationshipDirection
  relationship_confidence: number
  evidence: string
  source_region: SourceRegion | null
}

// This is the validated AI output schema
export interface AIExtractionResult {
  document_id: string
  page_id: string
  people: ExtractedPersonCandidate[]
  relationships: ExtractedRelationshipCandidate[]
  unresolved_items: string[]
  warnings: string[]
  raw_text?: string
  processing_notes?: string
}

// ---- Extracted Candidates (DB records) ----

export interface ExtractedCandidate {
  id: string
  document_id: string
  page_id: string
  temporary_id: string
  name_original_script: string
  normalized_name: string | null
  alternate_spellings: string[]
  gender: Gender
  birth_date: string | null
  death_date: string | null
  notes: string[]
  text_confidence: number | null
  source_region: SourceRegion | null
  possible_match_person_id: string | null
  match_confidence: number | null
  match_reason: string | null
  review_status: ReviewStatus
  raw_extraction: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ExtractedRelationship {
  id: string
  document_id: string
  page_id: string
  person_a_temp_id: string
  person_b_temp_id: string
  person_a_id: string | null
  person_b_id: string | null
  relationship_type: RelationshipType
  direction: RelationshipDirection | null
  relationship_confidence: number | null
  evidence: string | null
  source_region: SourceRegion | null
  review_status: ReviewStatus
  raw_extraction: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// ---- Review Items ----

export interface ReviewItem {
  id: string
  document_id: string | null
  page_id: string | null
  item_type: ReviewItemType
  extracted_candidate_id: string | null
  extracted_relationship_id: string | null
  existing_person_id: string | null
  existing_relationship_id: string | null
  proposed_data: Record<string, unknown>
  existing_data: Record<string, unknown> | null
  conflict_description: string | null
  confidence_score: number | null
  warnings: string[]
  status: ReviewStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  change_history_id: string | null
  created_at: string
  updated_at: string
}

// ---- Duplicate Candidates ----

export interface DuplicateCandidate {
  id: string
  person_a_id: string
  person_b_id: string
  similarity_score: number
  match_reason: string | null
  status: 'pending' | 'confirmed_same' | 'confirmed_different' | 'uncertain'
  resolved_by: string | null
  resolved_at: string | null
  merged_into_person_id: string | null
  created_at: string
  updated_at: string
}

// ---- Change History ----

export interface ChangeHistoryEntry {
  id: string
  entity_type: EntityType
  entity_id: string
  change_type: ChangeType
  previous_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  triggered_by_document_id: string | null
  triggered_by_page_id: string | null
  triggered_by_review_item_id: string | null
  changed_by: string | null
  change_source: 'manual' | 'ai_approved' | 'import' | 'system'
  notes: string | null
  reversible: boolean
  reversed_by_change_id: string | null
  created_at: string
}

// ---- Family Tree Visualization ----

export interface TreeNode {
  id: string
  person: Person
  children: TreeNode[]
  x?: number
  y?: number
  depth?: number
  isExpanded?: boolean
  isVerified: boolean
}

export interface TreeEdge {
  source: string  // person ID
  target: string  // person ID
  relationship: Relationship
}

export interface FamilyTreeData {
  nodes: TreeNode[]
  edges: TreeEdge[]
  rootPersonId: string | null
  totalPeople: number
  generations: number
}

// ---- Dashboard Stats ----

export interface DashboardStats {
  total_people: number
  total_documents: number
  total_pages: number
  pending_reviews: number
  pending_duplicates: number
  pending_conflicts: number
  generations: number
  recent_changes: ChangeHistoryEntry[]
  processing_jobs: ProcessingJob[]
}

// ---- API Response Types ----

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// ---- Upload Types ----

export interface UploadedFile {
  file: File
  preview: string
  rotation: number
  pageLabel: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
  storagePath?: string
  pageId?: string
}

export interface DocumentUploadForm {
  title: string
  description: string
  source_description: string
  approximate_date: string
  notes: string
  tags: string[]
  files: UploadedFile[]
}

// ---- Search ----

export interface SearchFilters {
  query: string
  gender?: Gender
  verification_status?: VerificationStatus
  generation_number?: number
  has_birth_date?: boolean
  has_death_date?: boolean
  is_living?: boolean
}

export interface SearchResult {
  person: Person
  match_type: 'name' | 'alternate_name' | 'normalized' | 'transliterated'
  score: number
}

// ---- Export Types ----

export type ExportFormat = 'pdf' | 'csv' | 'json' | 'gedcom'

export interface ExportOptions {
  format: ExportFormat
  include_living: boolean
  person_id?: string          // Export single person's report
  branch_root_id?: string     // Export a branch
  generation_from?: number
  generation_to?: number
  include_source_references: boolean
  include_change_history: boolean
}

// ---- Matching Result ----

export interface MatchingResult {
  candidate: ExtractedCandidate
  possible_matches: Array<{
    person: Person
    similarity_score: number
    match_reasons: string[]
    shared_relatives: string[]
  }>
  recommended_action: 'create_new' | 'merge_with_match' | 'needs_review'
}
