import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, RotateCcw, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Version {
  id: string;
  version_number: number;
  content: string;
  created_at: string;
  content_hash: string;
}

interface VersionHistoryProps {
  noteId: string;
  currentContent: string;
  onRestoreVersion: (content: string) => void;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  noteId,
  currentContent,
  onRestoreVersion,
}) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const fetchVersions = async () => {
    if (!noteId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('note_versions')
        .select('*')
        .eq('note_id', noteId)
        .order('version_number', { ascending: false })
        .limit(50);

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast({
        title: "Error",
        description: "Failed to load version history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, noteId]);

  const handleRestoreVersion = async (version: Version) => {
    try {
      onRestoreVersion(version.content);
      setIsOpen(false);
      toast({
        title: "Version Restored",
        description: `Restored to version ${version.version_number}`,
      });
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: "Error",
        description: "Failed to restore version",
        variant: "destructive",
      });
    }
  };

  const getVersionChanges = (content: string) => {
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).filter(w => w.length > 0).length;
    const chars = content.length;
    return { lines, words, chars };
  };

  const getContentPreview = (content: string) => {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Clock className="h-4 w-4 mr-1" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading versions...</div>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">No version history available</div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Current version */}
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Current</Badge>
                    <span className="text-sm font-medium">Working Version</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Now</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {(() => {
                    const stats = getVersionChanges(currentContent);
                    return `${stats.chars} chars, ${stats.words} words, ${stats.lines} lines`;
                  })()}
                </div>
                <div className="text-sm text-muted-foreground bg-background/50 p-2 rounded text-wrap break-words">
                  {getContentPreview(currentContent) || 'Empty note'}
                </div>
              </div>

              <Separator />

              {/* Previous versions */}
              {versions.map((version) => {
                const stats = getVersionChanges(version.content);
                const isSelected = selectedVersion?.id === version.id;
                
                return (
                  <div
                    key={version.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                    }`}
                    onClick={() => setSelectedVersion(isSelected ? null : version)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{version.version_number}</Badge>
                        <span className="text-sm font-medium">
                          {format(new Date(version.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVersion(version);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreVersion(version);
                          }}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2">
                      {stats.chars} chars, {stats.words} words, {stats.lines} lines • {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                    </div>
                    
                    <div className="text-sm text-muted-foreground bg-background/50 p-2 rounded text-wrap break-words">
                      {getContentPreview(version.content) || 'Empty note'}
                    </div>
                    
                    {isSelected && (
                      <div className="mt-3 p-3 bg-background border rounded max-h-40 overflow-y-auto">
                        <div className="text-sm font-medium mb-2">Full Content:</div>
                        <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                          {version.content || 'Empty note'}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};