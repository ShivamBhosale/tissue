import { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
      ]
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
    <div className={`rich-text-editor ${className}`}>
      <style>{`
        .ql-toolbar {
          border-top: 1px solid hsl(var(--border));
          border-left: 1px solid hsl(var(--border));
          border-right: 1px solid hsl(var(--border));
          border-bottom: none;
          background: hsl(var(--background));
        }
        
        .ql-container {
          border: 1px solid hsl(var(--border));
          border-top: none;
          font-family: inherit;
        }
        
        .ql-editor {
          min-height: calc(100vh - 320px);
          color: hsl(var(--foreground));
          background: hsl(var(--background));
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
        }
        
        .ql-snow .ql-picker-item:hover {
          background: hsl(var(--accent));
        }
        
        .ql-snow .ql-tooltip {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
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