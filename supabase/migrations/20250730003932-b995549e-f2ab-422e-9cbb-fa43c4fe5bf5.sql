-- Fix security issues from the linter

-- Fix 1: Add missing RLS policy for Notes table DELETE operations
CREATE POLICY "Anyone can delete notes" 
ON notes 
FOR DELETE 
USING (true);

-- Fix 2: Update functions with proper search_path security
DROP FUNCTION IF EXISTS create_note_version();
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

-- Update the existing update_updated_at_column function for security
DROP FUNCTION IF EXISTS update_updated_at_column();
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