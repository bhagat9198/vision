'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Mail, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryTabs } from '@/lib/hooks/use-query-tabs';

// Mock types for the flow
type AuthMethod = 'phone' | 'email';
type AuthStep = 'input' | 'otp' | 'details';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuthConfig {
  userEmailVerificationEnabled: boolean;
  userPhoneAuthEnabled: boolean;
  // ... other keys if needed
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useQueryTabs('phone', 'auth') as [AuthMethod, (v: string) => void];
  const [step, setStep] = useState<AuthStep>('input');
  const [loading, setLoading] = useState(false);

  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Form State
  const [identifier, setIdentifier] = useState(''); // Phone or Email
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    // Fetch public auth config
    const fetchConfig = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/v1/config/auth/public');
        const data = await res.json();
        if (data.success) {
          setConfig(data.data);
          // Set initial tab based on available options
          if (data.data.userPhoneAuthEnabled) setActiveTab('phone');
          else if (data.data.userEmailVerificationEnabled) setActiveTab('email');
        }
      } catch (err) {
        console.error('Failed to fetch auth config:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    if (isOpen) fetchConfig();
  }, [isOpen]);

  // Reset state when opening/closing
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset after a short delay to avoid flickering while closing
      setTimeout(() => {
        setStep('input');
        setIdentifier('');
        setOtp('');
        setName('');
        setLoading(false);
      }, 300);
    }
    onClose();
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [activeTab]: identifier,
          type: 'login',
          userType: 'client',
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setStep('otp');
      } else {
        console.error('Failed to send OTP:', data.message);
        // Ideally show an error message to user
        alert(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [activeTab]: identifier,
          otp,
          type: 'login',
          userType: 'client',
        }),
      });
      const data = await res.json();

      if (res.ok) {
        // Success
        localStorage.setItem('authToken', data.data.token);
        // If we want to store user info
        if (data.data.user) {
          localStorage.setItem('authUser', JSON.stringify(data.data.user));
        }

        // Mocking the "New User" check for now by just going to finish, 
        // since we don't really have a "Name" step required by backend yet.
        // If we want to keep the "Details" step (Name), we can do it here purely client side
        // or just close.
        // For now, let's just close and reload to be robust.
        handleOpenChange(false);
        window.location.reload();
      } else {
        console.error('Failed to verify OTP:', data.message);
        alert(data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    // This step is currently not backed by an API that updates the ephemeral client user.
    // We can just close the modal.
    handleOpenChange(false);
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-xl">
            {step === 'input' && 'Welcome to PhotoShare'}
            {step === 'otp' && 'Verify it\'s you'}
            {step === 'details' && 'One last thing'}
          </DialogTitle>
          <DialogDescription>
            {step === 'input' && 'Enter your details to access the gallery interactions.'}
            {step === 'otp' && `We sent a code to ${identifier}. Enter it below.`}
            {step === 'details' && 'What should we call you?'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loadingConfig ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : step === 'input' && config ? (
            <>
              {/* Case 1: Both Enabled -> Show Tabs */}
              {config.userPhoneAuthEnabled && config.userEmailVerificationEnabled && (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AuthMethod)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="phone">Phone</TabsTrigger>
                    <TabsTrigger value="email">Email</TabsTrigger>
                  </TabsList>

                  <TabsContent value="phone" className="space-y-4">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="+1 (555) 000-0000"
                        type="tel"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={handleContinue} disabled={!identifier || loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continue
                    </Button>
                  </TabsContent>

                  <TabsContent value="email" className="space-y-4">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        placeholder="you@example.com"
                        type="email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={handleContinue} disabled={!identifier || loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continue
                    </Button>
                  </TabsContent>
                </Tabs>
              )}

              {/* Case 2: Only Phone Enabled */}
              {config.userPhoneAuthEnabled && !config.userEmailVerificationEnabled && (
                <div className="space-y-4">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" onClick={handleContinue} disabled={!identifier || loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue
                  </Button>
                </div>
              )}

              {/* Case 3: Only Email Enabled */}
              {!config.userPhoneAuthEnabled && config.userEmailVerificationEnabled && (
                <div className="space-y-4">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      placeholder="you@example.com"
                      type="email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" onClick={handleContinue} disabled={!identifier || loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue
                  </Button>
                </div>
              )}

              {/* Case 4: Neither Enabled */}
              {!config.userPhoneAuthEnabled && !config.userEmailVerificationEnabled && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Authentication is currently disabled.
                </div>
              )}
            </>
          ) : null}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  placeholder="123456"
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleVerifyOtp} disabled={otp.length < 4 || loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Code
              </Button>
              <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setStep('input')}>
                Change {activeTab === 'phone' ? 'Phone Number' : 'Email'}
              </Button>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleComplete} disabled={!name || loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </div>
          )}
        </div>

        <div className="text-center text-[10px] text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </div>
      </DialogContent>
    </Dialog>
  );
}
