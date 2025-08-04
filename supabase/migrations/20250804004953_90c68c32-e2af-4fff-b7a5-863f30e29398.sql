-- Create storage bucket for note images
INSERT INTO storage.buckets (id, name, public) VALUES ('note-images', 'note-images', true);

-- Create policies for image uploads
CREATE POLICY "Anyone can view note images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'note-images');

CREATE POLICY "Anyone can upload note images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'note-images');

CREATE POLICY "Anyone can update note images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'note-images');

CREATE POLICY "Anyone can delete note images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'note-images');