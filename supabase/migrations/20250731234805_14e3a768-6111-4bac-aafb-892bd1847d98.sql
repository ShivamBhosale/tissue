-- Add collections/tags support to notes
ALTER TABLE notes ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE notes ADD COLUMN collection TEXT;

-- Create an index for better performance on tags
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX idx_notes_collection ON notes(collection);

-- Create a collections table for better organization
CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Create policies for collections
CREATE POLICY "Collections are publicly readable" 
ON collections FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create collections" 
ON collections FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Collections are publicly editable" 
ON collections FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete collections" 
ON collections FOR DELETE 
USING (true);

-- Add trigger for collections updated_at
CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();