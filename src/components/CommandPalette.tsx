import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { 
  Plus, 
  Home, 
  Search, 
  Sun, 
  Moon, 
  Code2, 
  Type, 
  Download,
  Copy,
  Save,
  Tag,
  Folder
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewNote: () => void;
  onToggleTheme: () => void;
  onToggleCodeMode: () => void;
  onOpenFindReplace: () => void;
  onCopyUrl: () => void;
  onSaveVersion: () => void;
  onDownloadTxt: () => void;
  onDownloadPdf: () => void;
  isCodeMode: boolean;
  currentNoteId?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  onNewNote,
  onToggleTheme,
  onToggleCodeMode,
  onOpenFindReplace,
  onCopyUrl,
  onSaveVersion,
  onDownloadTxt,
  onDownloadPdf,
  isCodeMode,
  currentNoteId
}) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState('');

  // Reset input when closing
  useEffect(() => {
    if (!open) {
      setInputValue('');
    }
  }, [open]);

  const runCommand = (command: () => void) => {
    command();
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Type a command or search..." 
        value={inputValue}
        onValueChange={setInputValue}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <Home className="mr-2 h-4 w-4" />
            Go to Home
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onNewNote)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Note
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Editor">
          <CommandItem onSelect={() => runCommand(onToggleCodeMode)}>
            {isCodeMode ? <Type className="mr-2 h-4 w-4" /> : <Code2 className="mr-2 h-4 w-4" />}
            Switch to {isCodeMode ? 'Text' : 'Code'} Mode
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onOpenFindReplace)}>
            <Search className="mr-2 h-4 w-4" />
            Find & Replace
          </CommandItem>
          {currentNoteId && (
            <CommandItem onSelect={() => runCommand(onSaveVersion)}>
              <Save className="mr-2 h-4 w-4" />
              Save Version
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Share & Export">
          {currentNoteId && (
            <CommandItem onSelect={() => runCommand(onCopyUrl)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Note URL
            </CommandItem>
          )}
          <CommandItem onSelect={() => runCommand(onDownloadTxt)}>
            <Download className="mr-2 h-4 w-4" />
            Download as TXT
          </CommandItem>
          <CommandItem onSelect={() => runCommand(onDownloadPdf)}>
            <Download className="mr-2 h-4 w-4" />
            Download as PDF
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Appearance">
          <CommandItem onSelect={() => runCommand(onToggleTheme)}>
            {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Theme
          </CommandItem>
        </CommandGroup>

        {/* Quick navigation by note ID */}
        {inputValue.length > 0 && !inputValue.startsWith('/') && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Navigate to Note">
              <CommandItem onSelect={() => runCommand(() => navigate(`/${inputValue}`))}>
                <Folder className="mr-2 h-4 w-4" />
                Go to note: {inputValue}
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};