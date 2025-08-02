import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from './ui/use-toast';
import bcrypt from 'bcryptjs';

interface PasswordProtectionProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordSet?: (hashedPassword: string) => void;
  onPasswordVerified?: (password: string) => void;
  mode: 'set' | 'verify';
  title?: string;
}

export const PasswordProtection = ({ 
  isOpen, 
  onClose, 
  onPasswordSet, 
  onPasswordVerified, 
  mode, 
  title 
}: PasswordProtectionProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'set') {
        if (password !== confirmPassword) {
          toast({
            title: "Error",
            description: "Passwords do not match",
            variant: "destructive",
          });
          return;
        }

        if (password.length < 6) {
          toast({
            title: "Error", 
            description: "Password must be at least 6 characters long",
            variant: "destructive",
          });
          return;
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        onPasswordSet?.(hashedPassword);
        
        toast({
          title: "Password Set",
          description: "Your note is now password protected",
        });
      } else if (mode === 'verify') {
        onPasswordVerified?.(password);
      }

      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title || (mode === 'set' ? 'Set Password Protection' : 'Enter Password')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'set' ? 'Enter a strong password' : 'Enter note password'}
                className="pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {mode === 'set' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Processing...' : (mode === 'set' ? 'Set Password' : 'Unlock')}
            </Button>
          </div>
        </form>

        {mode === 'set' && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            <p className="font-medium mb-1">Security Note:</p>
            <p>Once password protection is enabled, you'll need the password to access this note. 
            Make sure to remember it - password recovery is not available.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};