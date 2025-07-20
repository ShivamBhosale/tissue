-- Create or replace the notes table with proper structure
DROP TABLE IF EXISTS public.Notes;
DROP TABLE IF EXISTS public.notes;

CREATE TABLE public.notes (
    id TEXT PRIMARY KEY,
    content TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS but make it permissive since notes should be editable by anyone with the URL
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read any note
CREATE POLICY "Notes are publicly readable" ON public.notes
    FOR SELECT USING (true);

-- Allow anyone to insert new notes
CREATE POLICY "Anyone can create notes" ON public.notes
    FOR INSERT WITH CHECK (true);

-- Allow anyone to update any note
CREATE POLICY "Notes are publicly editable" ON public.notes
    FOR UPDATE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();