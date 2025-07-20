import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Code2, Type } from 'lucide-react'

interface NoteEditorProps {
  noteId?: string
}

export const NoteEditor = ({ noteId: propNoteId }: NoteEditorProps) => {
  const { noteId: paramNoteId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const noteId = propNoteId || paramNoteId
  
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCodeMode, setIsCodeMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Generate random ID for new notes
  const generateNoteId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  // Load note content
  useEffect(() => {
    const loadNote = async () => {
      if (!noteId) {
        // Generate new note ID and redirect
        const newId = generateNoteId()
        navigate(`/${newId}`, { replace: true })
        return
      }

      try {
        const { data, error } = await supabase
          .from('notes')
          .select('content')
          .eq('id', noteId)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        if (data) {
          setContent(data.content || '')
        } else {
          // Create new note
          const { error: insertError } = await supabase
            .from('notes')
            .insert([{ id: noteId, content: '' }])

          if (insertError) {
            throw insertError
          }
          setContent('')
        }
      } catch (error) {
        console.error('Error loading note:', error)
        toast({
          title: 'Error',
          description: 'Failed to load note. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadNote()
  }, [noteId, navigate, toast])

  // Auto-save functionality
  useEffect(() => {
    if (!noteId || isLoading) return

    const saveNote = async () => {
      try {
        const { error } = await supabase
          .from('notes')
          .upsert([{ id: noteId, content }], { onConflict: 'id' })

        if (error) {
          throw error
        }
      } catch (error) {
        console.error('Error saving note:', error)
      }
    }

    const debounceTimer = setTimeout(saveNote, 500)
    return () => clearTimeout(debounceTimer)
  }, [content, noteId, isLoading])

  // Focus textarea on load
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isLoading])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  // Handle tab key for code mode
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isCodeMode && e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      
      // Insert tab character
      const newContent = content.substring(0, start) + '\t' + content.substring(end)
      setContent(newContent)
      
      // Move cursor to after the tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
      }, 0)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Note ID: <span className="font-mono">{noteId}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={isCodeMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCodeMode(!isCodeMode)}
              className="text-xs"
            >
              {isCodeMode ? <Code2 className="h-3 w-3 mr-1" /> : <Type className="h-3 w-3 mr-1" />}
              {isCodeMode ? 'Code Mode' : 'Text Mode'}
            </Button>
          </div>
        </div>
        
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={isCodeMode ? "Start typing your code... (Tab key inserts tab characters)" : "Start typing your note..."}
          className={`min-h-[calc(100vh-280px)] resize-none border-0 shadow-none focus-visible:ring-0 text-base leading-relaxed ${
            isCodeMode ? 'font-mono whitespace-pre' : ''
          }`}
          style={{ 
            outline: 'none',
            tabSize: 2
          }}
        />
        
        <div className="mt-4 space-y-2">
          <div className="text-xs text-muted-foreground">
            Auto-saved • Share this URL to collaborate: {window.location.href}
          </div>
          
          {/* Signature */}
          <div className="pt-4 border-t border-border/40">
            <div className="text-xs text-muted-foreground/70 italic text-center">
              Made with ❤️ by <span className="font-medium">Shivam Bhosale</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}