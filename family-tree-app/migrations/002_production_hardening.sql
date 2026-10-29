-- Production hardening for private genealogy data.
-- Apply after 001_initial_schema.sql.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS checksum TEXT,
  ADD COLUMN IF NOT EXISTS mime_types TEXT[];

ALTER TABLE document_pages
  ADD COLUMN IF NOT EXISTS checksum TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_pages_checksum
  ON document_pages(document_id, checksum)
  WHERE checksum IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_people_name_transliterated_trgm
  ON people USING GIN (name_transliterated gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_extracted_candidates_name_trgm
  ON extracted_candidates USING GIN (name_original_script gin_trgm_ops);

CREATE UNIQUE INDEX IF NOT EXISTS idx_relationships_canonical_pair
  ON relationships (
    LEAST(person_a_id, person_b_id),
    GREATEST(person_a_id, person_b_id),
    relationship_type
  )
  WHERE deleted_at IS NULL AND relationship_type IN ('spouse', 'sibling');

CREATE OR REPLACE FUNCTION prevent_review_item_reassignment()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status <> 'pending' AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'A completed review item cannot be reassigned';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_review_item_reassignment ON review_items;
CREATE TRIGGER trg_review_item_reassignment
  BEFORE UPDATE ON review_items
  FOR EACH ROW EXECUTE FUNCTION prevent_review_item_reassignment();

-- Storage is private by default. Application APIs issue short-lived signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "authenticated_read_document_objects" ON storage.objects;
CREATE POLICY "authenticated_read_document_objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "editor_upload_document_objects" ON storage.objects;
CREATE POLICY "editor_upload_document_objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND get_user_role(auth.uid()) IN ('admin', 'editor')
  );
