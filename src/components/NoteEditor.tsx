import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Code2, Type, Plus, Home, Copy, Sun, Moon, ZoomIn, ZoomOut, Hash, Save, Wifi, WifiOff, Clock, Edit3, Download, Search, Command, Lock, Eye, Palette } from 'lucide-react';
import { VersionHistory } from './VersionHistory';
import { FindReplace } from './FindReplace';
import { CommandPalette } from './CommandPalette';
import { PasswordProtection } from './PasswordProtection';
import { RichTextEditor } from './RichTextEditor';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import bcrypt from 'bcryptjs';

// Import Prism.js for syntax highlighting
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';

// Ensure Prism is available globally for language components
(window as any).Prism = Prism;

// Now import language components
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';

interface NoteEditorProps {
  noteId?: string;
}
type SaveStatus = 'saved' | 'saving' | 'error';
const PROGRAMMING_LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'html', 'css', 'json', 'markdown', 'sql', 'bash', 'plaintext'];
export const NoteEditor = ({
  noteId: propNoteId
}: NoteEditorProps) => {
  const {
    noteId: paramNoteId
  } = useParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const noteId = propNoteId || paramNoteId;
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('plaintext');
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [fontSize, setFontSize] = useState([16]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'set' | 'verify'>('set');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [syntaxHighlightedContent, setSyntaxHighlightedContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Generate random ID for new notes
  const generateNoteId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Calculate stats
  const characterCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content.split('\n').length;

  // Load user preferences
  useEffect(() => {
    const savedFontSize = localStorage.getItem('notepad-font-size');
    const savedTheme = localStorage.getItem('notepad-theme');
    const savedLanguage = localStorage.getItem('notepad-language');
    const savedLineNumbers = localStorage.getItem('notepad-line-numbers');
    if (savedFontSize) setFontSize([parseInt(savedFontSize)]);
    if (savedTheme === 'dark') setIsDarkMode(true);
    if (savedLanguage) setSelectedLanguage(savedLanguage);
    if (savedLineNumbers === 'true') setShowLineNumbers(true);
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('notepad-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('notepad-font-size', fontSize[0].toString());
  }, [fontSize]);
  useEffect(() => {
    localStorage.setItem('notepad-language', selectedLanguage);
  }, [selectedLanguage]);
  useEffect(() => {
    localStorage.setItem('notepad-line-numbers', showLineNumbers.toString());
  }, [showLineNumbers]);

  // Load note content and metadata
  useEffect(() => {
    const loadNote = async () => {
      if (!noteId) {
        // Generate new note ID and redirect
        const newId = generateNoteId();
        navigate(`/${newId}`, {
          replace: true
        });
        return;
      }
      try {
        setSaveStatus('saving');
        const {
          data,
          error
        } = await supabase.from('notes').select('content, current_version, updated_at, password_hash, is_encrypted').eq('id', noteId).maybeSingle();
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        if (data) {
          // Check if note is password protected
          if (data.password_hash) {
            setIsPasswordProtected(true);
            setPasswordMode('verify');
            setPasswordDialogOpen(true);
            return; // Don't load content until password is verified
          }
          
          setContent(data.content || '');
          setLastSaved(new Date(data.updated_at));
          setIsPasswordProtected(!!data.password_hash);
          setIsUnlocked(!data.password_hash);
          
          // Create initial version if this note doesn't have any versions yet
          if (!data.current_version) {
            await supabase
              .from('notes')
              .update({ current_version: 1 })
              .eq('id', noteId);
              
            await supabase
              .from('note_versions')
              .insert({ 
                note_id: noteId, 
                content: data.content || '', 
                version_number: 1,
                content_hash: 'd41d8cd98f00b204e9800998ecf8427e'
              });
          }
        } else {
          // Create new note
          const {
            error: insertError
          } = await supabase.from('notes').insert([{
            id: noteId,
            content: '',
            current_version: 1
          }]);
          if (insertError) {
            throw insertError;
          }
          
          // Create initial version
          await supabase
            .from('note_versions')
            .insert({ 
              note_id: noteId, 
              content: '', 
              version_number: 1,
              content_hash: 'd41d8cd98f00b204e9800998ecf8427e'
            });
            
          setContent('');
          setLastSaved(new Date());
        }
        setSaveStatus('saved');
      } catch (error) {
        console.error('Error loading note:', error);
        setSaveStatus('error');
        toast({
          title: 'Error',
          description: 'Failed to load note. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadNote();
  }, [noteId, navigate, toast]);

  // Auto-save functionality
  useEffect(() => {
    if (!noteId || isLoading) return;
    const saveNote = async () => {
      try {
        // Only show saving status for longer operations to reduce UI flicker
        const savingTimeout = setTimeout(() => setSaveStatus('saving'), 100);
        
        const {
          error
        } = await supabase.from('notes').upsert([{
          id: noteId,
          content
        }], {
          onConflict: 'id'
        });
        
        clearTimeout(savingTimeout);
        
        if (error) {
          throw error;
        }
        setSaveStatus('saved');
        setLastSaved(new Date());
      } catch (error) {
        console.error('Error saving note:', error);
        setSaveStatus('error');
      }
    };
    const debounceTimer = setTimeout(saveNote, 1000); // Increased debounce to reduce frequency
    return () => clearTimeout(debounceTimer);
  }, [content, noteId, isLoading]);

  // Focus textarea on load
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setFindReplaceOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Call saveVersion directly without dependency issues
        if (noteId && content) {
          supabase.rpc('manual_create_note_version', {
            note_id_param: noteId,
            content_param: content
          }).then(({ data, error }) => {
            if (error) {
              console.error('Error saving version:', error);
              toast({
                title: "Error",
                description: "Failed to save version",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Version Saved!",
                description: `Saved as version ${data}`,
              });
            }
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [noteId, content, toast]);

  // Syntax highlighting for code mode
  useEffect(() => {
    if (isCodeMode && selectedLanguage !== 'plaintext' && content) {
      try {
        const highlighted = Prism.highlight(content, Prism.languages[selectedLanguage] || Prism.languages.plain, selectedLanguage);
        setSyntaxHighlightedContent(highlighted);
      } catch (error) {
        console.error('Syntax highlighting error:', error);
        setSyntaxHighlightedContent(content);
      }
    }
  }, [content, selectedLanguage, isCodeMode]);

  // Sync line numbers scroll with textarea
  const handleTextareaScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  // Handle tab key for code mode
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isCodeMode && e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert tab character
      const newContent = content.substring(0, start) + '\t' + content.substring(end);
      setContent(newContent);

      // Move cursor to after the tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    }
  };

  const createNewNote = () => {
    const newId = generateNoteId();
    navigate(`/${newId}`);
  };

  const handleCustomUrl = () => {
    if (isEditingUrl && customUrl.trim()) {
      const cleanUrl = customUrl.trim().replace(/[^a-zA-Z0-9-_]/g, '');
      if (cleanUrl) {
        navigate(`/${cleanUrl}`);
        setIsEditingUrl(false);
        setCustomUrl('');
      }
    } else {
      setIsEditingUrl(true);
      setCustomUrl(noteId || '');
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCustomUrl();
    } else if (e.key === 'Escape') {
      setIsEditingUrl(false);
      setCustomUrl('');
    }
  };

  const saveVersion = async () => {
    if (!noteId) return;
    
    try {
      const { data, error } = await supabase.rpc('manual_create_note_version', {
        note_id_param: noteId,
        content_param: content
      });

      if (error) throw error;

      toast({
        title: "Version Saved!",
        description: `Saved as version ${data}`,
      });
    } catch (error) {
      console.error('Error saving version:', error);
      toast({
        title: "Error",
        description: "Failed to save version",
        variant: "destructive",
      });
    }
  };
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'URL Copied!',
        description: 'Note URL has been copied to clipboard'
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy URL to clipboard',
        variant: 'destructive'
      });
    }
  };
  const formatLastSaved = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  // Download functions
  const downloadAsTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `note-${noteId || 'untitled'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({
      title: 'Downloaded!',
      description: 'Note downloaded as TXT file'
    });
  };

  const downloadAsPdf = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    
    // Set font
    pdf.setFontSize(12);
    
    // Split content into lines that fit the page width
    const lines = pdf.splitTextToSize(content || 'Empty note', maxWidth);
    
    let y = margin;
    const lineHeight = 7;
    
    for (let i = 0; i < lines.length; i++) {
      if (y + lineHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(lines[i], margin, y);
      y += lineHeight;
    }
    
    pdf.save(`note-${noteId || 'untitled'}.pdf`);
    toast({
      title: 'Downloaded!',
      description: 'Note downloaded as PDF file'
    });
  };

  // Password protection functions
  const handlePasswordSet = async (hashedPassword: string) => {
    if (!noteId) return;
    
    try {
      const { error } = await supabase
        .from('notes')
        .update({ password_hash: hashedPassword, is_encrypted: true })
        .eq('id', noteId);
        
      if (error) throw error;
      
      setIsPasswordProtected(true);
      setIsUnlocked(true);
    } catch (error) {
      console.error('Error setting password:', error);
      toast({
        title: "Error",
        description: "Failed to set password protection",
        variant: "destructive",
      });
    }
  };

  const handlePasswordVerified = async (password: string) => {
    if (!noteId) return;
    
    try {
      // Get the stored password hash
      const { data, error } = await supabase
        .from('notes')
        .select('password_hash, content, updated_at')
        .eq('id', noteId)
        .single();
        
      if (error) throw error;
      
      // Verify password
      const isValid = await bcrypt.compare(password, data.password_hash);
      
      if (isValid) {
        setIsUnlocked(true);
        setContent(data.content || '');
        setLastSaved(new Date(data.updated_at));
        toast({
          title: "Access Granted",
          description: "Note unlocked successfully",
        });
      } else {
        toast({
          title: "Access Denied",
          description: "Incorrect password",
          variant: "destructive",
        });
        setPasswordDialogOpen(true); // Keep dialog open
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      toast({
        title: "Error",
        description: "Failed to verify password",
        variant: "destructive",
      });
    }
  };

  const togglePasswordProtection = () => {
    if (isPasswordProtected) {
      // Remove password protection
      supabase
        .from('notes')
        .update({ password_hash: null, is_encrypted: false })
        .eq('id', noteId)
        .then(({ error }) => {
          if (error) {
            toast({
              title: "Error",
              description: "Failed to remove password protection",
              variant: "destructive",
            });
          } else {
            setIsPasswordProtected(false);
            setIsUnlocked(true);
            toast({
              title: "Password Removed",
              description: "Note is no longer password protected",
            });
          }
        });
    } else {
      setPasswordMode('set');
      setPasswordDialogOpen(true);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>;
  }

  // Show password dialog if note is protected and not unlocked
  if (isPasswordProtected && !isUnlocked) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Protected Note</h2>
            <p className="text-sm text-muted-foreground">This note is password protected</p>
          </div>
          <Button onClick={() => setPasswordDialogOpen(true)}>
            <Lock className="h-4 w-4 mr-2" />
            Enter Password
          </Button>
        </div>
        
        <PasswordProtection
          isOpen={passwordDialogOpen}
          onClose={() => setPasswordDialogOpen(false)}
          onPasswordVerified={handlePasswordVerified}
          mode="verify"
          title="Enter Note Password"
        />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto max-w-4xl px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold shrink-0">Tissue</h1>
              
              <Button variant="outline" size="sm" onClick={createNewNote} className="hidden sm:flex shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                New Note
              </Button>
              
              <Button variant="outline" size="sm" onClick={createNewNote} className="sm:hidden shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
              
              {/* Custom URL Editor */}
              {isEditingUrl ? (
                <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                  <Input
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    onKeyDown={handleUrlKeyDown}
                    placeholder="Enter custom URL"
                    className="h-8 text-sm min-w-0 flex-1"
                    autoFocus
                  />
                  <Button variant="ghost" size="sm" onClick={handleCustomUrl} className="shrink-0">
                    Go
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleCustomUrl} className="hidden sm:flex shrink-0">
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit URL
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Save Status */}
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                {saveStatus === 'saving' && <Save className="h-3 w-3 animate-spin" />}
                {saveStatus === 'saved' && <Wifi className="h-3 w-3 text-green-500" />}
                {saveStatus === 'error' && <WifiOff className="h-3 w-3 text-red-500" />}
                <span className="hidden md:inline whitespace-nowrap">
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'saved' && `Saved ${formatLastSaved(lastSaved)}`}
                  {saveStatus === 'error' && 'Save failed'}
                </span>
              </div>
              
              {/* Mobile Save Status Icon Only */}
              <div className="sm:hidden flex items-center">
                {saveStatus === 'saving' && <Save className="h-4 w-4 animate-spin text-muted-foreground" />}
                {saveStatus === 'saved' && <Wifi className="h-4 w-4 text-green-500" />}
                {saveStatus === 'error' && <WifiOff className="h-4 w-4 text-red-500" />}
              </div>
               
              {/* Theme Toggle */}
              <Button variant="ghost" size="sm" onClick={() => setIsDarkMode(!isDarkMode)} className="shrink-0">
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
              {/* Download Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0">
                    <Download className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={downloadAsTxt}>
                    Download as TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadAsPdf}>
                    Download as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Copy URL */}
              <Button variant="outline" size="sm" onClick={copyUrl} className="shrink-0">
                <Copy className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Copy URL</span>
              </Button>

              {/* Save Version */}
              {noteId && (
                <Button variant="outline" size="sm" onClick={saveVersion} className="shrink-0">
                  <Save className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              )}

              {/* Version History */}
              {noteId && (
                <VersionHistory 
                  noteId={noteId} 
                  currentContent={content}
                  onRestoreVersion={(restoredContent) => setContent(restoredContent)}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-3 sm:px-4 py-4 sm:py-6">
        {/* Controls */}
        <div className="mb-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              {/* Mode Toggle */}
              <Button variant={isCodeMode ? "default" : "outline"} size="sm" onClick={() => setIsCodeMode(!isCodeMode)} className="flex-1 sm:flex-none">
                {isCodeMode ? <Code2 className="h-3 w-3 mr-1" /> : <Palette className="h-3 w-3 mr-1" />}
                {isCodeMode ? 'Code Mode' : 'Rich Text'}
              </Button>
              
              
              {/* Language Selection */}
              {isCodeMode && <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-32 sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAMMING_LANGUAGES.map(lang => <SelectItem key={lang} value={lang}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </SelectItem>)}
                  </SelectContent>
                </Select>}
              
              {/* Line Numbers */}
              {isCodeMode && <Button variant={showLineNumbers ? "default" : "outline"} size="sm" onClick={() => setShowLineNumbers(!showLineNumbers)} className="flex-1 sm:flex-none">
                  <Hash className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Line Numbers</span>
                  <span className="sm:hidden">Lines</span>
                </Button>}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Find & Replace */}
              <Button variant="outline" size="sm" onClick={() => setFindReplaceOpen(true)} className="flex-1 sm:flex-none">
                <Search className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Find</span>
                <span className="sm:hidden">Search</span>
              </Button>

              {/* Command Palette */}
              <Button variant="outline" size="sm" onClick={() => setCommandPaletteOpen(true)} className="flex-1 sm:flex-none">
                <Command className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Commands</span>
                <span className="sm:hidden">Cmd</span>
              </Button>

              {/* Password Protection */}
              {noteId && (
                <Button 
                  variant={isPasswordProtected ? "default" : "outline"} 
                  size="sm" 
                  onClick={togglePasswordProtection}
                  className="flex-1 sm:flex-none"
                >
                  <Lock className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">{isPasswordProtected ? 'Protected' : 'Protect'}</span>
                  <span className="sm:hidden">Lock</span>
                </Button>
              )}

              {/* Font Size */}
              <div className="flex items-center gap-1 sm:gap-2 bg-muted/50 rounded-md p-1">
                <Button variant="ghost" size="sm" onClick={() => setFontSize([Math.max(12, fontSize[0] - 2)])} disabled={fontSize[0] <= 12} className="h-8 w-8 p-0">
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground w-6 sm:w-8 text-center">{fontSize[0]}px</span>
                <Button variant="ghost" size="sm" onClick={() => setFontSize([Math.min(24, fontSize[0] + 2)])} disabled={fontSize[0] >= 24} className="h-8 w-8 p-0">
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground overflow-x-auto">
            <span>{characterCount} characters</span>
            <span>{wordCount} words</span>
            <span>{lineCount} lines</span>
            <span className="hidden sm:inline">Note ID: <span className="font-mono">{noteId}</span></span>
          </div>
        </div>
        
        {/* Editor */}
        <div className="relative rounded-md border shadow-sm">
          {showLineNumbers && isCodeMode && (
            <div 
              ref={lineNumbersRef}
              className="absolute left-0 top-0 z-10 bg-muted/30 border-r border-border px-1 sm:px-2 py-3 font-mono text-xs text-muted-foreground select-none pointer-events-none overflow-hidden h-[calc(100vh-280px)] sm:h-[calc(100vh-320px)]" 
              style={{ fontSize: `${fontSize[0] * 0.8}px`, lineHeight: isCodeMode ? '1.5' : '1.6' }}
            >
              {content.split('\n').map((_, index) => (
                <div key={index} className="text-right w-6 sm:w-8">
                  {index + 1}
                </div>
              ))}
            </div>
          )}
          {isCodeMode ? (
            <Textarea 
              ref={textareaRef} 
              value={content} 
              onChange={handleContentChange} 
              onKeyDown={handleKeyDown} 
              onScroll={handleTextareaScroll}
              placeholder={`Start typing your ${selectedLanguage} code... (Tab key inserts tab characters)`}
              className={`min-h-[calc(100vh-280px)] sm:min-h-[calc(100vh-320px)] resize-none border-0 shadow-none focus-visible:ring-1 leading-relaxed font-mono whitespace-pre ${showLineNumbers ? 'pl-8 sm:pl-12' : ''}`} 
              style={{
                fontSize: `${fontSize[0]}px`,
                tabSize: 2,
                lineHeight: '1.5'
              }} 
            />
          ) : (
            <RichTextEditor
              value={content}
              onChange={setContent}
              fontSize={fontSize[0]}
              placeholder="Start typing your note..."
              className="mobile-friendly"
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-4 sm:mt-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">Auto-saved • Share this URL to collaborate</span>
              <span className="sm:hidden">Auto-saved • Share URL</span>
            </div>
            <div className="flex items-center gap-1">
              {saveStatus === 'saved' && lastSaved && <>
                  <span>Last saved: {formatLastSaved(lastSaved)}</span>
                </>}
            </div>
          </div>
          
          {/* Signature */}
          <div className="pt-4 border-t border-border/40">
            <div className="text-xs text-muted-foreground/70 italic text-center">
              Made with ❤️ by <span className="font-medium">Shivam Bhosale</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <FindReplace
        open={findReplaceOpen}
        onOpenChange={setFindReplaceOpen}
        content={content}
        onContentChange={setContent}
        textareaRef={textareaRef}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNewNote={createNewNote}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onToggleCodeMode={() => setIsCodeMode(!isCodeMode)}
        onOpenFindReplace={() => setFindReplaceOpen(true)}
        onCopyUrl={copyUrl}
        onSaveVersion={saveVersion}
        onDownloadTxt={downloadAsTxt}
        onDownloadPdf={downloadAsPdf}
        isCodeMode={isCodeMode}
        currentNoteId={noteId}
      />

      {/* Password Protection Dialog */}
      <PasswordProtection
        isOpen={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        onPasswordSet={handlePasswordSet}
        onPasswordVerified={handlePasswordVerified}
        mode={passwordMode}
      />
    </div>;
};