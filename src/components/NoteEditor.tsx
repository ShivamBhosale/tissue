import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Code2, Type, Plus, Home, Copy, Sun, Moon, ZoomIn, ZoomOut, Hash, Save, Wifi, WifiOff, Clock } from 'lucide-react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Load note content
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
        } = await supabase.from('notes').select('content').eq('id', noteId).maybeSingle();
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        if (data) {
          setContent(data.content || '');
          setLastSaved(new Date());
        } else {
          // Create new note
          const {
            error: insertError
          } = await supabase.from('notes').insert([{
            id: noteId,
            content: ''
          }]);
          if (insertError) {
            throw insertError;
          }
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
        setSaveStatus('saving');
        const {
          error
        } = await supabase.from('notes').upsert([{
          id: noteId,
          content
        }], {
          onConflict: 'id'
        });
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
    const debounceTimer = setTimeout(saveNote, 500);
    return () => clearTimeout(debounceTimer);
  }, [content, noteId, isLoading]);

  // Focus textarea on load
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);
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
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">NapKit</h1>
              
              <Button variant="outline" size="sm" onClick={createNewNote}>
                <Plus className="h-4 w-4 mr-1" />
                New Note
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Save Status */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {saveStatus === 'saving' && <Save className="h-3 w-3 animate-spin" />}
                {saveStatus === 'saved' && <Wifi className="h-3 w-3 text-green-500" />}
                {saveStatus === 'error' && <WifiOff className="h-3 w-3 text-red-500" />}
                <span>
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'saved' && `Saved ${formatLastSaved(lastSaved)}`}
                  {saveStatus === 'error' && 'Save failed'}
                </span>
              </div>
              
              {/* Theme Toggle */}
              <Button variant="ghost" size="sm" onClick={() => setIsDarkMode(!isDarkMode)}>
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
              {/* Copy URL */}
              <Button variant="outline" size="sm" onClick={copyUrl}>
                <Copy className="h-4 w-4 mr-1" />
                Copy URL
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* Controls */}
        <div className="mb-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Mode Toggle */}
              <Button variant={isCodeMode ? "default" : "outline"} size="sm" onClick={() => setIsCodeMode(!isCodeMode)}>
                {isCodeMode ? <Code2 className="h-3 w-3 mr-1" /> : <Type className="h-3 w-3 mr-1" />}
                {isCodeMode ? 'Code Mode' : 'Text Mode'}
              </Button>
              
              {/* Language Selection */}
              {isCodeMode && <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAMMING_LANGUAGES.map(lang => <SelectItem key={lang} value={lang}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </SelectItem>)}
                  </SelectContent>
                </Select>}
              
              {/* Line Numbers */}
              {isCodeMode && <Button variant={showLineNumbers ? "default" : "outline"} size="sm" onClick={() => setShowLineNumbers(!showLineNumbers)}>
                  <Hash className="h-3 w-3 mr-1" />
                  Line Numbers
                </Button>}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Font Size */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setFontSize([Math.max(12, fontSize[0] - 2)])} disabled={fontSize[0] <= 12}>
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground w-8 text-center">{fontSize[0]}px</span>
                <Button variant="outline" size="sm" onClick={() => setFontSize([Math.min(24, fontSize[0] + 2)])} disabled={fontSize[0] >= 24}>
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{characterCount} characters</span>
            <span>{wordCount} words</span>
            <span>{lineCount} lines</span>
            <span>Note ID: <span className="font-mono">{noteId}</span></span>
          </div>
        </div>
        
        {/* Editor */}
        <div className="relative">
          <Textarea ref={textareaRef} value={content} onChange={handleContentChange} onKeyDown={handleKeyDown} placeholder={isCodeMode ? `Start typing your ${selectedLanguage} code... (Tab key inserts tab characters)` : "Start typing your note..."} className={`min-h-[calc(100vh-320px)] resize-none border shadow-sm focus-visible:ring-1 leading-relaxed ${isCodeMode ? 'font-mono whitespace-pre' : ''}`} style={{
          fontSize: `${fontSize[0]}px`,
          tabSize: 2,
          lineHeight: isCodeMode ? '1.5' : '1.6'
        }} />
        </div>
        
        {/* Footer */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Auto-saved • Share this URL to collaborate
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
    </div>;
};