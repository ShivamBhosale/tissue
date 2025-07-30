-- Create note_versions table to store historical versions
CREATE TABLE note_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  content_hash TEXT,
  change_summary TEXT
);

-- Add current_version to notes table
ALTER TABLE notes ADD COLUMN current_version INTEGER DEFAULT 1;

-- Create index for performance
CREATE INDEX idx_note_versions_note_id_version ON note_versions(note_id, version_number DESC);

-- Enable RLS on note_versions table
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for note_versions table
CREATE POLICY "Note versions are publicly readable" 
ON note_versions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create note versions" 
ON note_versions 
FOR INSERT 
WITH CHECK (true);

-- Create function to automatically create version when note content changes
CREATE OR REPLACE FUNCTION create_note_version()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create versions
CREATE TRIGGER create_note_version_trigger
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION create_note_version();