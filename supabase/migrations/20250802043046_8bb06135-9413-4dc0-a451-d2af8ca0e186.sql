-- Remove organize features: collections table and collection/tags columns from notes table

-- Drop the collections table entirely
DROP TABLE IF EXISTS public.collections CASCADE;

-- Remove collection and tags columns from notes table
ALTER TABLE public.notes 
DROP COLUMN IF EXISTS collection,
DROP COLUMN IF EXISTS tags;