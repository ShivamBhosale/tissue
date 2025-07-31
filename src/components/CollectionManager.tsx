import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Folder, Tag, Plus, X } from 'lucide-react';

interface Collection {
  id: string;
  name: string;
  description?: string;
}

interface CollectionManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  currentCollection?: string;
  currentTags: string[];
  onCollectionChange: (collection: string | null) => void;
  onTagsChange: (tags: string[]) => void;
}

export const CollectionManager: React.FC<CollectionManagerProps> = ({
  open,
  onOpenChange,
  noteId,
  currentCollection,
  currentTags,
  onCollectionChange,
  onTagsChange
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load collections
  useEffect(() => {
    if (open) {
      loadCollections();
    }
  }, [open]);

  const loadCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('name');

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collections',
        variant: 'destructive',
      });
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collections')
        .insert({ name: newCollectionName.trim() })
        .select()
        .single();

      if (error) throw error;

      setCollections(prev => [...prev, data]);
      setNewCollectionName('');
      toast({
        title: 'Success',
        description: 'Collection created successfully',
      });
    } catch (error) {
      console.error('Error creating collection:', error);
      toast({
        title: 'Error',
        description: 'Failed to create collection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateNoteMetadata = async (collection: string | null, tags: string[]) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ 
          collection: collection || null,
          tags: tags
        })
        .eq('id', noteId);

      if (error) throw error;

      onCollectionChange(collection);
      onTagsChange(tags);
      
      toast({
        title: 'Success',
        description: 'Note metadata updated',
      });
    } catch (error) {
      console.error('Error updating note metadata:', error);
      toast({
        title: 'Error',
        description: 'Failed to update note metadata',
        variant: 'destructive',
      });
    }
  };

  const addTag = () => {
    if (!newTag.trim() || currentTags.includes(newTag.trim())) return;
    
    const updatedTags = [...currentTags, newTag.trim()];
    updateNoteMetadata(currentCollection || null, updatedTags);
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
    updateNoteMetadata(currentCollection || null, updatedTags);
  };

  const handleCollectionChange = (value: string) => {
    const collection = value === 'none' ? null : value;
    updateNoteMetadata(collection, currentTags);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Organize Note
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Collection Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Collection</label>
            <Select value={currentCollection || 'none'} onValueChange={handleCollectionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Collection</SelectItem>
                {collections.map(collection => (
                  <SelectItem key={collection.id} value={collection.name}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Create New Collection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Create New Collection</label>
            <div className="flex gap-2">
              <Input
                placeholder="Collection name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createCollection();
                  }
                }}
              />
              <Button 
                onClick={createCollection} 
                disabled={!newCollectionName.trim() || loading}
                size="sm"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            
            {/* Current Tags */}
            {currentTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add New Tag */}
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button 
                onClick={addTag} 
                disabled={!newTag.trim() || currentTags.includes(newTag.trim())}
                size="sm"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};