import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

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
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">
            Note ID: <span className="font-mono">{noteId}</span>
          </div>
        </div>
        
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          placeholder="Start typing your note..."
          className="min-h-[calc(100vh-200px)] resize-none border-0 shadow-none focus-visible:ring-0 text-base leading-relaxed"
          style={{ outline: 'none' }}
        />
        
        <div className="mt-4 text-xs text-muted-foreground">
          Auto-saved • Share this URL to collaborate: {window.location.href}
        </div>
      </div>
    </div>
  )
}