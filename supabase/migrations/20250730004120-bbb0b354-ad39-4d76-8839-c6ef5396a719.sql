-- Add policies for the Notes table (capital N) which seems to be missing policies
-- PostgreSQL doesn't support IF NOT EXISTS for policies, so we'll drop and recreate

-- Drop existing policies if they exist (this won't error if they don't exist)
DROP POLICY IF EXISTS "Anyone can view Notes" ON "Notes";
DROP POLICY IF EXISTS "Anyone can create Notes" ON "Notes";
DROP POLICY IF EXISTS "Anyone can update Notes" ON "Notes";
DROP POLICY IF EXISTS "Anyone can delete Notes" ON "Notes";

-- Create policies for the Notes table (capital N)
CREATE POLICY "Anyone can view Notes" 
ON "Notes" 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create Notes" 
ON "Notes" 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update Notes" 
ON "Notes" 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete Notes" 
ON "Notes" 
FOR DELETE 
USING (true);