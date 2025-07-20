import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const Index = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Generate random ID and redirect to new note
    const generateNoteId = () => {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }
    
    const newId = generateNoteId()
    navigate(`/${newId}`, { replace: true })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-muted-foreground">Creating new note...</div>
      </div>
    </div>
  );
};

export default Index;
