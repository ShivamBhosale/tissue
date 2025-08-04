import { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fontSize: number;
  className?: string;
}

export const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Start typing your note...", 
  fontSize,
  className = ""
}: RichTextEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);
  const { toast } = useToast();

  // Image upload handler
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('note-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('note-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Custom image handler for Quill
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const imageUrl = await uploadImage(file);
        if (imageUrl && quillRef.current) {
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection();
          quill.insertEmbed(range?.index || 0, 'image', imageUrl);
        }
      }
    };
  };

  // Custom toolbar configuration
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['blockquote', 'code-block'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'indent',
    'align', 'link', 'image', 'blockquote', 'code-block'
  ];

  // Apply custom font size
  useEffect(() => {
    const editor = document.querySelector('.ql-editor') as HTMLElement;
    if (editor) {
      editor.style.fontSize = `${fontSize}px`;
      editor.style.lineHeight = '1.6';
    }
  }, [fontSize]);

  return (
    <div className={`rich-text-editor ${className}`} style={{ minHeight: '400px' }}>
      <style>{`
        .ql-toolbar {
          border-top: 1px solid hsl(var(--border));
          border-left: 1px solid hsl(var(--border));
          border-right: 1px solid hsl(var(--border));
          border-bottom: none;
          background: hsl(var(--background));
          flex-wrap: wrap;
        }
        
        .ql-container {
          border: 1px solid hsl(var(--border));
          border-top: none;
          font-family: inherit;
        }
        
        .ql-editor {
          min-height: calc(100vh - 280px);
          color: hsl(var(--foreground));
          background: hsl(var(--background));
          padding: 12px;
        }
        
        @media (min-width: 640px) {
          .ql-editor {
            min-height: calc(100vh - 320px);
            padding: 12px;
          }
        }
        
        .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        
        .ql-snow .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        
        .ql-snow .ql-fill {
          fill: hsl(var(--foreground));
        }
        
        .ql-snow .ql-picker {
          color: hsl(var(--foreground));
        }
        
        .ql-snow .ql-picker-options {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          z-index: 1000;
        }
        
        .ql-snow .ql-picker-item:hover {
          background: hsl(var(--accent));
        }
        
        .ql-snow .ql-tooltip {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          z-index: 1000;
        }
        
        .ql-snow .ql-tooltip input {
          color: hsl(var(--foreground));
        }

        .dark .ql-snow .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        
        .dark .ql-snow .ql-fill {
          fill: hsl(var(--foreground));
        }
        
        /* Mobile-friendly toolbar */
        @media (max-width: 639px) {
          .ql-toolbar {
            padding: 8px 4px;
          }
          
          .ql-toolbar .ql-formats {
            margin-right: 8px;
          }
          
          .ql-toolbar .ql-picker.ql-size,
          .ql-toolbar .ql-picker.ql-header {
            width: auto;
          }
          
          .ql-toolbar button {
            width: 28px;
            height: 28px;
            padding: 3px;
            margin: 1px;
          }
          
          .ql-toolbar button svg {
            width: 14px;
            height: 14px;
          }
          
          .ql-editor {
            font-size: 16px !important; /* Prevent zoom on iOS */
            padding: 16px 12px;
          }
        }
        
        /* Touch-friendly controls */
        .ql-toolbar button:hover {
          background: hsl(var(--accent));
        }
        
        .ql-toolbar button.ql-active {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
      `}</style>
      
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
};