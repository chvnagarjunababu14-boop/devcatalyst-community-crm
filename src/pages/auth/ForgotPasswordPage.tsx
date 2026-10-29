import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/common/Card';
import { BrandLogo } from '../../components/common/BrandLogo';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.sendPasswordReset(email);
      setIsSubmitted(true);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to send reset instructions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Password Recovery</h1>
          <p className="text-xs text-[#737373] mt-1">We'll help you regain access to your club account</p>
        </div>

        <Card className="shadow-md border-[#E5E5E5]">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Enter your registered email address and we will dispatch a password recovery link
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isSubmitted ? (
              <div className="p-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#047857] mx-auto" />
                <h4 className="text-sm font-semibold text-[#047857]">Reset Link Dispatched</h4>
                <p className="text-xs text-[#065F46]">
                  If an account exists for <strong>{email}</strong>, you will receive password reset instructions shortly.
                </p>
              </div>
            ) : (
              <>
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
                    autoFocus
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={isLoading}
                    leftIcon={<KeyRound className="w-4 h-4" />}
                  >
                    Send Recovery Link
                  </Button>
                </form>
              </>
            )}
          </CardContent>

          <CardFooter className="justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-[#171717] font-medium hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
