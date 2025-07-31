import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Replace, X, ChevronUp, ChevronDown } from 'lucide-react';

interface FindReplaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onContentChange: (content: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const FindReplace: React.FC<FindReplaceProps> = ({
  open,
  onOpenChange,
  content,
  onContentChange,
  textareaRef
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [matches, setMatches] = useState<number[]>([]);
  const [caseSensitive, setCaseSensitive] = useState(false);

  // Find all matches
  useEffect(() => {
    if (!searchTerm) {
      setMatches([]);
      setCurrentMatch(0);
      return;
    }

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const newMatches: number[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      newMatches.push(match.index);
      if (regex.lastIndex === match.index) {
        regex.lastIndex++;
      }
    }

    setMatches(newMatches);
    setCurrentMatch(newMatches.length > 0 ? 0 : -1);
  }, [searchTerm, content, caseSensitive]);

  // Navigate to match
  const navigateToMatch = (index: number) => {
    if (!textareaRef.current || matches.length === 0) return;

    const matchIndex = matches[index];
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(matchIndex, matchIndex + searchTerm.length);
    textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Navigate to next match
  const nextMatch = () => {
    if (matches.length === 0) return;
    const next = currentMatch === matches.length - 1 ? 0 : currentMatch + 1;
    setCurrentMatch(next);
    navigateToMatch(next);
  };

  // Navigate to previous match
  const previousMatch = () => {
    if (matches.length === 0) return;
    const prev = currentMatch === 0 ? matches.length - 1 : currentMatch - 1;
    setCurrentMatch(prev);
    navigateToMatch(prev);
  };

  // Replace current match
  const replaceCurrent = () => {
    if (matches.length === 0 || currentMatch === -1) return;

    const matchIndex = matches[currentMatch];
    const before = content.slice(0, matchIndex);
    const after = content.slice(matchIndex + searchTerm.length);
    const newContent = before + replaceTerm + after;

    onContentChange(newContent);

    // Update textarea selection
    if (textareaRef.current) {
      setTimeout(() => {
        const newPosition = matchIndex + replaceTerm.length;
        textareaRef.current?.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  // Replace all matches
  const replaceAll = () => {
    if (!searchTerm) return;

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const newContent = content.replace(regex, replaceTerm);

    onContentChange(newContent);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        nextMatch();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        previousMatch();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, nextMatch, previousMatch, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find & Replace
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Find..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Badge variant="secondary" className="text-xs">
                {matches.length > 0 ? `${currentMatch + 1}/${matches.length}` : '0/0'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCaseSensitive(!caseSensitive)}
                className={caseSensitive ? 'bg-accent' : ''}
              >
                Aa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={previousMatch}
                disabled={matches.length === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMatch}
                disabled={matches.length === 0}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Replace input */}
          <div className="space-y-2">
            <Input
              placeholder="Replace with..."
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
            />

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={replaceCurrent}
                disabled={matches.length === 0}
                className="flex items-center gap-1"
              >
                <Replace className="h-3 w-3" />
                Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={replaceAll}
                disabled={matches.length === 0}
                className="flex items-center gap-1"
              >
                <Replace className="h-3 w-3" />
                Replace All
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Use Enter to find next, Shift+Enter to find previous, Esc to close
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};