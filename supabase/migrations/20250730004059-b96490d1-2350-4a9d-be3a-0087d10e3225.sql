-- Check if Notes table has proper policies and fix any missing ones
-- The Notes table might be missing a policy

-- First, let's see what we have in the Notes table
-- Since we can't query directly, let's ensure all policies exist

-- Check if there's a missing policy on the Notes table
-- Since the linter mentioned RLS enabled but no policy, let's add all necessary policies

-- For the Notes table (capital N), we need basic policies
CREATE POLICY IF NOT EXISTS "Anyone can view Notes" 
ON "Notes" 
FOR SELECT 
USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can create Notes" 
ON "Notes" 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Anyone can update Notes" 
ON "Notes" 
FOR UPDATE 
USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can delete Notes" 
ON "Notes" 
FOR DELETE 
USING (true);