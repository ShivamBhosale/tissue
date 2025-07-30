-- Remove automatic version creation trigger and modify for manual saving
DROP TRIGGER IF EXISTS create_note_version_trigger ON notes;

-- Update the function to be called manually instead of via trigger
CREATE OR REPLACE FUNCTION manual_create_note_version(note_id_param TEXT, content_param TEXT)
RETURNS INTEGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  new_version_number INTEGER;
BEGIN
  -- Get current version number and increment it
  SELECT COALESCE(current_version, 0) + 1 
  INTO new_version_number
  FROM notes 
  WHERE id = note_id_param;
  
  -- Update the current_version in notes table
  UPDATE notes 
  SET current_version = new_version_number 
  WHERE id = note_id_param;
  
  -- Insert new version record
  INSERT INTO note_versions (note_id, content, version_number, content_hash)
  VALUES (note_id_param, content_param, new_version_number, md5(content_param));
  
  RETURN new_version_number;
END;
$$;