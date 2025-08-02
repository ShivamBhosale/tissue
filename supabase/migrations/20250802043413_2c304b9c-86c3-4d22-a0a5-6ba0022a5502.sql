-- Add password protection for notes
ALTER TABLE public.notes 
ADD COLUMN password_hash text DEFAULT NULL,
ADD COLUMN is_encrypted boolean DEFAULT false;