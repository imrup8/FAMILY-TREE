-- ============================================================
-- Family Genealogy System - Initial Database Schema
-- Migration 001: Initial Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================
-- USERS & ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_id TEXT UNIQUE NOT NULL, -- e.g., DOC-0001
  title TEXT NOT NULL,
  description TEXT,
  source_description TEXT,
  approximate_date TEXT, -- User-provided approximate date as text
  document_date DATE,    -- Parsed date if available
  uploaded_by UUID REFERENCES auth.users(id),
  total_pages INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'uploaded' 
    CHECK (status IN ('uploaded', 'queued', 'analyzing', 'needs_review', 'approved', 'failed', 'partial')),
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- ============================================================
-- DOCUMENT PAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS document_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_id TEXT UNIQUE NOT NULL, -- e.g., PAGE-0001
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,       -- Supabase Storage path
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('jpg', 'jpeg', 'png', 'webp', 'pdf')),
  file_size_bytes BIGINT,
  width_px INTEGER,
  height_px INTEGER,
  rotation_degrees INTEGER DEFAULT 0,
  page_label TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'queued', 'analyzing', 'needs_review', 'approved', 'failed')),
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, page_number)
);

CREATE INDEX idx_document_pages_document_id ON document_pages(document_id);
CREATE INDEX idx_document_pages_status ON document_pages(status);

-- ============================================================
-- PROCESSING JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_id UUID REFERENCES document_pages(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL DEFAULT 'ai_analysis'
    CHECK (job_type IN ('ai_analysis', 'matching', 'export')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_document_id ON processing_jobs(document_id);
CREATE INDEX idx_processing_jobs_page_id ON processing_jobs(page_id);

-- ============================================================
-- PEOPLE
-- ============================================================

CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_id TEXT UNIQUE NOT NULL, -- e.g., PERSON-0001
  
  -- Name fields (Bengali and normalized)
  name_bengali TEXT NOT NULL,       -- Original Bengali script as extracted/entered
  name_normalized TEXT,             -- Normalized form for searching
  name_transliterated TEXT,         -- Optional romanization
  alternate_names TEXT[],           -- Other known spellings or names
  
  -- Basic demographics
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'unknown')) DEFAULT 'unknown',
  birth_date TEXT,                  -- Text form for historical dates
  birth_date_approximate BOOLEAN DEFAULT FALSE,
  death_date TEXT,
  death_date_approximate BOOLEAN DEFAULT FALSE,
  is_living BOOLEAN DEFAULT FALSE,
  
  -- Location
  birth_place TEXT,
  death_place TEXT,
  residence TEXT,
  
  -- Status and provenance
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'ai_extracted', 'user_reviewed', 'verified')),
  data_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (data_source IN ('manual', 'ai_extracted', 'imported')),
  
  -- Notes and metadata
  notes TEXT,
  biography TEXT,
  
  -- Generation tracking (distance from root)
  generation_number INTEGER,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index for Bengali names
CREATE INDEX idx_people_name_bengali_trgm ON people USING GIN (name_bengali gin_trgm_ops);
CREATE INDEX idx_people_name_normalized ON people(name_normalized);
CREATE INDEX idx_people_display_id ON people(display_id);
CREATE INDEX idx_people_verification_status ON people(verification_status);
CREATE INDEX idx_people_deleted_at ON people(deleted_at);
CREATE INDEX idx_people_generation ON people(generation_number);

-- ============================================================
-- RELATIONSHIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- The two people in the relationship
  person_a_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  person_b_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  
  -- Relationship type and direction
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('parent_child', 'spouse', 'sibling', 'other')),
  direction TEXT CHECK (direction IN ('a_to_b', 'b_to_a', 'bidirectional')),
  -- For parent_child: direction = 'a_to_b' means person_a is parent of person_b
  -- For spouse/sibling: direction = 'bidirectional'
  
  -- Marriage details (if spouse relationship)
  marriage_date TEXT,
  marriage_place TEXT,
  divorce_date TEXT,
  
  -- Status and provenance
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'ai_extracted', 'user_reviewed', 'verified')),
  data_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (data_source IN ('manual', 'ai_extracted', 'imported')),
  confidence_score NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1),
  
  notes TEXT,
  
  -- Prevent self-relationships
  CONSTRAINT no_self_relationship CHECK (person_a_id != person_b_id),
  
  -- Prevent exact duplicate relationships (same pair, same type, same direction)
  UNIQUE(person_a_id, person_b_id, relationship_type, direction),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relationships_person_a ON relationships(person_a_id);
CREATE INDEX idx_relationships_person_b ON relationships(person_b_id);
CREATE INDEX idx_relationships_type ON relationships(relationship_type);
CREATE INDEX idx_relationships_status ON relationships(verification_status);
CREATE INDEX idx_relationships_deleted ON relationships(deleted_at);

-- ============================================================
-- EXTRACTED CANDIDATES (Raw AI output, not committed)
-- ============================================================

CREATE TABLE IF NOT EXISTS extracted_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES document_pages(id) ON DELETE CASCADE,
  
  -- Temporary ID from AI extraction (within this document batch)
  temporary_id TEXT NOT NULL,
  
  -- Extracted person data
  name_original_script TEXT NOT NULL,
  normalized_name TEXT,
  alternate_spellings TEXT[],
  gender TEXT DEFAULT 'unknown',
  birth_date TEXT,
  death_date TEXT,
  notes TEXT[],
  
  -- Confidence and regions
  text_confidence NUMERIC(4,3),
  source_region JSONB, -- {x, y, width, height, page} bounding box
  
  -- Matching results
  possible_match_person_id UUID REFERENCES people(id),
  match_confidence NUMERIC(4,3),
  match_reason TEXT,
  
  -- Review status
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'merged', 'uncertain')),
  
  -- Raw AI extraction (full JSON for debugging)
  raw_extraction JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_extracted_candidates_page_id ON extracted_candidates(page_id);
CREATE INDEX idx_extracted_candidates_document_id ON extracted_candidates(document_id);
CREATE INDEX idx_extracted_candidates_review_status ON extracted_candidates(review_status);
CREATE INDEX idx_extracted_candidates_possible_match ON extracted_candidates(possible_match_person_id);

-- ============================================================
-- EXTRACTED RELATIONSHIP CANDIDATES
-- ============================================================

CREATE TABLE IF NOT EXISTS extracted_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES document_pages(id) ON DELETE CASCADE,
  
  -- References to extracted candidates (by temp ID)
  person_a_temp_id TEXT NOT NULL,
  person_b_temp_id TEXT NOT NULL,
  
  -- Resolved person IDs (set after matching)
  person_a_id UUID REFERENCES people(id),
  person_b_id UUID REFERENCES people(id),
  
  relationship_type TEXT NOT NULL,
  direction TEXT,
  relationship_confidence NUMERIC(4,3),
  evidence TEXT,
  source_region JSONB,
  
  -- Review status
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'uncertain')),
  
  raw_extraction JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_extracted_rels_page_id ON extracted_relationships(page_id);
CREATE INDEX idx_extracted_rels_document_id ON extracted_relationships(document_id);
CREATE INDEX idx_extracted_rels_review_status ON extracted_relationships(review_status);

-- ============================================================
-- REVIEW ITEMS (Consolidated pending work)
-- ============================================================

CREATE TABLE IF NOT EXISTS review_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  page_id UUID REFERENCES document_pages(id) ON DELETE CASCADE,
  
  item_type TEXT NOT NULL
    CHECK (item_type IN ('new_person', 'new_relationship', 'conflict', 'duplicate', 'uncertain_reading')),
  
  -- References to candidates
  extracted_candidate_id UUID REFERENCES extracted_candidates(id),
  extracted_relationship_id UUID REFERENCES extracted_relationships(id),
  
  -- Existing person (for conflicts/duplicates)
  existing_person_id UUID REFERENCES people(id),
  existing_relationship_id UUID REFERENCES relationships(id),
  
  -- Proposed change details
  proposed_data JSONB NOT NULL,        -- The proposed addition/change
  existing_data JSONB,                 -- Current data if conflict
  conflict_description TEXT,
  
  -- AI confidence
  confidence_score NUMERIC(4,3),
  warnings TEXT[],
  
  -- Review outcome
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'merged', 'uncertain', 'deferred')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Applied change reference
  change_history_id UUID, -- populated after approval
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_items_status ON review_items(status);
CREATE INDEX idx_review_items_type ON review_items(item_type);
CREATE INDEX idx_review_items_document_id ON review_items(document_id);

-- ============================================================
-- DUPLICATE CANDIDATES
-- ============================================================

CREATE TABLE IF NOT EXISTS duplicate_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  person_a_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  person_b_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  
  similarity_score NUMERIC(4,3) NOT NULL,
  match_reason TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed_same', 'confirmed_different', 'uncertain')),
  
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  
  -- If confirmed same, which person was kept
  merged_into_person_id UUID REFERENCES people(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT no_self_duplicate CHECK (person_a_id != person_b_id),
  UNIQUE(person_a_id, person_b_id)
);

CREATE INDEX idx_duplicate_candidates_status ON duplicate_candidates(status);
CREATE INDEX idx_duplicate_candidates_person_a ON duplicate_candidates(person_a_id);
CREATE INDEX idx_duplicate_candidates_person_b ON duplicate_candidates(person_b_id);

-- ============================================================
-- PERSON SOURCE LINKS (Provenance)
-- ============================================================

CREATE TABLE IF NOT EXISTS person_source_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_id UUID REFERENCES document_pages(id) ON DELETE SET NULL,
  extracted_candidate_id UUID REFERENCES extracted_candidates(id),
  source_region JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(person_id, page_id)
);

CREATE INDEX idx_person_source_links_person_id ON person_source_links(person_id);
CREATE INDEX idx_person_source_links_document_id ON person_source_links(document_id);

-- ============================================================
-- RELATIONSHIP SOURCE LINKS (Provenance)
-- ============================================================

CREATE TABLE IF NOT EXISTS relationship_source_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_id UUID REFERENCES document_pages(id) ON DELETE SET NULL,
  extracted_relationship_id UUID REFERENCES extracted_relationships(id),
  source_region JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rel_source_links_relationship_id ON relationship_source_links(relationship_id);

-- ============================================================
-- CHANGE HISTORY (Full audit trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS change_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What changed
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('person', 'relationship', 'document', 'review_item')),
  entity_id UUID NOT NULL,
  
  -- Type of change
  change_type TEXT NOT NULL
    CHECK (change_type IN ('create', 'update', 'delete', 'restore', 'merge', 'approve', 'reject')),
  
  -- Before/after snapshots
  previous_data JSONB,
  new_data JSONB,
  
  -- What document triggered this (if any)
  triggered_by_document_id UUID REFERENCES documents(id),
  triggered_by_page_id UUID REFERENCES document_pages(id),
  triggered_by_review_item_id UUID,
  
  -- Who did it
  changed_by UUID REFERENCES auth.users(id),
  change_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (change_source IN ('manual', 'ai_approved', 'import', 'system')),
  
  notes TEXT,
  
  -- For undo: point to previous change that can be reversed
  reversible BOOLEAN DEFAULT TRUE,
  reversed_by_change_id UUID REFERENCES change_history(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_change_history_entity ON change_history(entity_type, entity_id);
CREATE INDEX idx_change_history_changed_by ON change_history(changed_by);
CREATE INDEX idx_change_history_created_at ON change_history(created_at);

-- ============================================================
-- PERSON ATTACHMENTS (Photos, additional documents)
-- ============================================================

CREATE TABLE IF NOT EXISTS person_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  caption TEXT,
  attachment_type TEXT DEFAULT 'photo'
    CHECK (attachment_type IN ('photo', 'document', 'other')),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_person_attachments_person_id ON person_attachments(person_id);

-- ============================================================
-- SEQUENCES for display IDs
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS seq_document_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_page_id START 1;
CREATE SEQUENCE IF NOT EXISTS seq_person_id START 1;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-generate display IDs
CREATE OR REPLACE FUNCTION generate_document_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    NEW.display_id := 'DOC-' || LPAD(nextval('seq_document_id')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_page_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    NEW.display_id := 'PAGE-' || LPAD(nextval('seq_page_id')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_person_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    NEW.display_id := 'PERSON-' || LPAD(nextval('seq_person_id')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_document_display_id
  BEFORE INSERT ON documents
  FOR EACH ROW EXECUTE FUNCTION generate_document_display_id();

CREATE TRIGGER trg_page_display_id
  BEFORE INSERT ON document_pages
  FOR EACH ROW EXECUTE FUNCTION generate_page_display_id();

CREATE TRIGGER trg_person_display_id
  BEFORE INSERT ON people
  FOR EACH ROW EXECUTE FUNCTION generate_person_display_id();

-- Updated_at triggers
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_document_pages_updated_at BEFORE UPDATE ON document_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_people_updated_at BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_relationships_updated_at BEFORE UPDATE ON relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_extracted_candidates_updated_at BEFORE UPDATE ON extracted_candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_review_items_updated_at BEFORE UPDATE ON review_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_processing_jobs_updated_at BEFORE UPDATE ON processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_attachments ENABLE ROW LEVEL SECURITY;

-- Helper function for role checking
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM user_roles WHERE user_id = user_uuid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies: Authenticated users can read, editors/admins can write
-- (Service role key bypasses RLS for server-side operations)

CREATE POLICY "authenticated_read_people" ON people
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "editor_admin_insert_people" ON people
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'editor'));

CREATE POLICY "editor_admin_update_people" ON people
  FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'editor'));

CREATE POLICY "authenticated_read_relationships" ON relationships
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "editor_admin_write_relationships" ON relationships
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'editor'));

CREATE POLICY "authenticated_read_documents" ON documents
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "editor_admin_write_documents" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'editor'));

CREATE POLICY "authenticated_read_pages" ON document_pages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_review_items" ON review_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "editor_admin_update_review_items" ON review_items
  FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'editor'));

CREATE POLICY "authenticated_read_change_history" ON change_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_extracted_candidates" ON extracted_candidates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_duplicate_candidates" ON duplicate_candidates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_user_roles" ON user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

CREATE POLICY "admin_write_user_roles" ON user_roles
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- SEED DATA (Development only - mark clearly)
-- ============================================================

-- Note: Seed data is inserted via the application initialization
-- Remove or comment out in production

COMMENT ON TABLE people IS 'Core person records for the genealogy system. All names stored in original Bengali script.';
COMMENT ON TABLE relationships IS 'Independent relationship records. Use direction field to determine role (parent vs child etc).';
COMMENT ON TABLE extracted_candidates IS 'Raw AI extraction output - NOT committed to main data until reviewed and approved.';
COMMENT ON TABLE review_items IS 'Pending changes requiring human review before application to main database.';
COMMENT ON TABLE change_history IS 'Full audit trail of all changes to people and relationships.';
