-- Fix security issues by properly dropping and recreating functions with dependencies

-- Fix 1: Add missing RLS policy for Notes table DELETE operations
CREATE POLICY "Anyone can delete notes" 
ON notes 
FOR DELETE 
USING (true);

-- Fix 2: Drop trigger first, then function, then recreate both with proper security
DROP TRIGGER IF EXISTS create_note_version_trigger ON notes;
DROP FUNCTION IF EXISTS create_note_version() CASCADE;

-- Recreate function with proper security
CREATE OR REPLACE FUNCTION create_note_version()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Only create version if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    -- Increment version number
    NEW.current_version = COALESCE(OLD.current_version, 0) + 1;
    
    -- Insert new version record
    INSERT INTO note_versions (note_id, content, version_number, content_hash)
    VALUES (NEW.id, NEW.content, NEW.current_version, md5(NEW.content));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER create_note_version_trigger
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION create_note_version();

-- Update the existing update_updated_at_column function for security
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate the updated_at trigger
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();