import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/common/Card';
import { BrandLogo } from '../../components/common/BrandLogo';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">DevCatalyst Hub</h1>
          <p className="text-xs text-[#737373] mt-1">Sign in to manage projects, events, and community</p>
        </div>

        <Card className="shadow-md border-[#E5E5E5]">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your club credentials to access the platform</CardDescription>
          </CardHeader>

          <CardContent>
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#B91C1C]" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@devcatalyst.club"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />

              <div className="space-y-1">
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-[#171717] hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>

            {/* Quick Demo Credentials Panel for Reviewer Convenience */}
            <div className="mt-6 pt-5 border-t border-[#E5E5E5]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#171717] mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#171717]" />
                <span>Quick Demo Accounts:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoFill('admin@devcatalyst.club')}
                  className="px-2 py-1.5 text-[11px] font-medium bg-[#171717] text-white hover:bg-[#262626] rounded border border-[#262626] text-center transition-colors"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoFill('sarah.lead@devcatalyst.club')}
                  className="px-2 py-1.5 text-[11px] font-medium bg-[#F5F5F5] text-[#171717] hover:bg-[#E5E5E5] rounded border border-[#E5E5E5] text-center transition-colors"
                >
                  Project Lead
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoFill('marcus.member@devcatalyst.club')}
                  className="px-2 py-1.5 text-[11px] font-medium bg-[#F5F5F5] text-[#171717] hover:bg-[#E5E5E5] rounded border border-[#E5E5E5] text-center transition-colors"
                >
                  Member
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-xs text-[#737373]">
              Don't have an account yet?{' '}
              <Link to="/register" className="text-[#171717] font-semibold hover:underline">
                Create Account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
