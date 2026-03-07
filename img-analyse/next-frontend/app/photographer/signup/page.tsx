'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Mail, ArrowRight, Phone, Sparkles, Shield, Zap, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FormField } from '@/components/ui/form-field';
import { StepIndicator } from '@/components/ui/step-indicator';

const benefits = [
  { icon: Sparkles, title: 'AI Face Search', desc: 'Clients find their photos instantly' },
  { icon: Shield, title: 'Secure Delivery', desc: 'Password protection & watermarks' },
  { icon: Zap, title: 'Lightning Fast', desc: 'Optimized global CDN delivery' },
  { icon: Heart, title: 'Client Love', desc: 'Beautiful gallery experiences' },
];

const testimonials = [
  { name: 'Sarah M.', role: 'Wedding Photographer', text: 'My clients absolutely love finding themselves with the AI search!', rating: 5 },
  { name: 'James K.', role: 'Event Photographer', text: 'Saved me hours of manual photo sorting. Game changer!', rating: 5 },
];

interface AuthConfig {
  photographerEmailVerificationEnabled: boolean;
  photographerPhoneAuthEnabled: boolean;
  photographerGoogleLoginEnabled: boolean;
  photographerFacebookLoginEnabled: boolean;
  photographerAppleLoginEnabled: boolean;
}

// Signup steps: 1=enter info, 2=verify OTP, 3=set password (for phone) or complete (for email with verification)
type SignupStep = 1 | 2 | 3;

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<SignupStep>(1);
  const [emailStep, setEmailStep] = useState<SignupStep>(1);
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    // Fetch auth config
    fetch('http://localhost:4000/api/v1/config/auth/public')
      .then(res => res.json())
      .then(data => { if (data.success) setAuthConfig(data.data); })
      .catch(() => setAuthConfig({ photographerEmailVerificationEnabled: false, photographerPhoneAuthEnabled: false, photographerGoogleLoginEnabled: false, photographerFacebookLoginEnabled: false, photographerAppleLoginEnabled: false }));
  }, []);

  const handleSendPhoneOtp = async () => {
    if (!formData.name || !formData.phone) {
      setError('Please enter your name and phone number');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, type: 'signup' }),
      });
      const data = await res.json();
      if (data.success) {
        setPhoneStep(2);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, otp, type: 'signup' }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpVerified(true);
        setPhoneStep(3);
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email OTP handlers
  const handleSendEmailOtp = async () => {
    if (!formData.name || !formData.email) {
      setError('Please enter your name and email');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, type: 'signup' }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStep(2);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp, type: 'signup' }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpVerified(true);
        setEmailStep(3);
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Phone signup flow
      if (signupMethod === 'phone') {
        if (phoneStep === 1) {
          await handleSendPhoneOtp();
          setIsLoading(false);
          return;
        }
        if (phoneStep === 2) {
          await handleVerifyPhoneOtp();
          setIsLoading(false);
          return;
        }
        // Step 3: Set password and complete registration
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters');
          setIsLoading(false);
          return;
        }
        const res = await fetch('http://localhost:4000/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, phone: formData.phone, password: formData.password, otp, phoneVerified: true }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('photographerToken', data.data.token);
          router.push('/photographer/dashboard');
        } else {
          setError(data.error || 'Registration failed');
        }
        setIsLoading(false);
        return;
      }

      // Email signup flow with 3-phase stepper (when email verification is enabled)
      if (authConfig?.photographerEmailVerificationEnabled) {
        if (emailStep === 1) {
          await handleSendEmailOtp();
          setIsLoading(false);
          return;
        }
        if (emailStep === 2) {
          await handleVerifyEmailOtp();
          setIsLoading(false);
          return;
        }
        // Step 3: Set password and complete registration
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters');
          setIsLoading(false);
          return;
        }
        const res = await fetch('http://localhost:4000/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password, emailVerified: true }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('photographerToken', data.data.token);
          router.push('/photographer/dashboard');
        } else {
          setError(data.error || 'Registration failed');
        }
        setIsLoading(false);
        return;
      }

      // Email signup without verification (simple flow)
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        setIsLoading(false);
        return;
      }

      const res = await fetch('http://localhost:4000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('photographerToken', data.data.token);
        router.push('/photographer/dashboard');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    router.push('/photographer/onboarding');
  };

  const resetPhoneFlow = () => {
    setPhoneStep(1);
    setOtp('');
    setOtpVerified(false);
    setError('');
  };

  const resetEmailFlow = () => {
    setEmailStep(1);
    setOtp('');
    setOtpVerified(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left Side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-[#0a0a0a] to-purple-500/20" />
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-amber-500/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/30 rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          <Link href="/" className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-semibold text-white">PhotoShare</span>
          </Link>

          <h1 className="text-4xl font-bold text-white mb-3">Start your free trial</h1>
          <p className="text-xl text-white/60 mb-8">No credit card required. 14 days free.</p>

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            {benefits.map((benefit, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3">
                  <benefit.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                <p className="text-sm text-white/60">{benefit.desc}</p>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="space-y-4">
            <p className="text-sm text-white/40 uppercase tracking-wider">Loved by photographers</p>
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex gap-1 mb-2">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-white/80 text-sm mb-2">&quot;{t.text}&quot;</p>
                <p className="text-white/40 text-xs">{t.name} · {t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-white">PhotoShare</span>
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white">Create your account</h2>
            <p className="mt-2 text-white/60">
              Already have an account?{' '}
              <Link href="/photographer/login" className="text-amber-400 hover:text-amber-300 font-medium">Sign in</Link>
            </p>
          </div>

          {/* Social Signup - Only show if any social login is enabled */}
          {(authConfig?.photographerGoogleLoginEnabled || authConfig?.photographerFacebookLoginEnabled || authConfig?.photographerAppleLoginEnabled) && (
            <>
              <div className="space-y-3">
                {authConfig?.photographerGoogleLoginEnabled && (
                  <Button variant="outline" className="w-full h-12 bg-white/5 border-white/20 text-white hover:bg-white/10" onClick={() => handleSocialLogin('google')} disabled={isLoading}>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Continue with Google
                  </Button>
                )}
                {authConfig?.photographerFacebookLoginEnabled && (
                  <Button variant="outline" className="w-full h-12 bg-white/5 border-white/20 text-white hover:bg-white/10" onClick={() => handleSocialLogin('facebook')} disabled={isLoading}>
                    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    Continue with Facebook
                  </Button>
                )}
                {authConfig?.photographerAppleLoginEnabled && (
                  <Button variant="outline" className="w-full h-12 bg-white/5 border-white/20 text-white hover:bg-white/10" onClick={() => handleSocialLogin('apple')} disabled={isLoading}>
                    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                    Continue with Apple
                  </Button>
                )}
              </div>
              <div className="relative">
                <Separator className="bg-white/20" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0a0a] px-4 text-sm text-white/40">or</span>
              </div>
            </>
          )}

          {/* Signup Method Toggle */}
          {authConfig?.photographerPhoneAuthEnabled && (
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
              <button type="button" onClick={() => { setSignupMethod('email'); resetEmailFlow(); resetPhoneFlow(); }} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${signupMethod === 'email' ? 'bg-amber-500 text-white' : 'text-white/60 hover:text-white'}`}>
                <Mail className="h-4 w-4 inline mr-2" />Email
              </button>
              <button type="button" onClick={() => { setSignupMethod('phone'); resetEmailFlow(); resetPhoneFlow(); }} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${signupMethod === 'phone' ? 'bg-amber-500 text-white' : 'text-white/60 hover:text-white'}`}>
                <Phone className="h-4 w-4 inline mr-2" />Phone
              </button>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Signup Flow - Step Indicator */}
            {signupMethod === 'phone' && (
              <StepIndicator steps={3} currentStep={phoneStep} className="mb-2" />
            )}

            {/* Email Signup Flow - Step Indicator (when verification is enabled) */}
            {signupMethod === 'email' && authConfig?.photographerEmailVerificationEnabled && (
              <StepIndicator steps={3} currentStep={emailStep} className="mb-2" />
            )}

            {/* PHONE SIGNUP - Step 1: Name & Phone */}
            {signupMethod === 'phone' && phoneStep === 1 && (
              <>
                <FormField
                  id="name"
                  label="Full Name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                  required
                />
                <FormField
                  id="phone"
                  label="Phone Number"
                  type="phone"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  required
                />
              </>
            )}

            {/* PHONE SIGNUP - Step 2: Verify OTP */}
            {signupMethod === 'phone' && phoneStep === 2 && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <p className="text-white/80 text-sm">OTP sent to</p>
                  <p className="text-white font-medium">{formData.phone}</p>
                </div>
                <FormField
                  id="otp"
                  label="Enter 6-digit OTP"
                  type="otp"
                  placeholder="000000"
                  value={otp}
                  onChange={setOtp}
                  required
                />
                <button type="button" onClick={resetPhoneFlow} className="text-sm text-amber-400 hover:text-amber-300 w-full text-center">Change phone number?</button>
              </div>
            )}

            {/* PHONE SIGNUP - Step 3: Set Password */}
            {signupMethod === 'phone' && phoneStep === 3 && (
              <div className="space-y-4">
                <div className="text-center py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 text-sm">✓ Phone verified successfully</p>
                  <p className="text-white/60 text-xs mt-1">Now set your password to complete signup</p>
                </div>
                <FormField
                  id="password"
                  label="Create Password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={(value) => setFormData({ ...formData, password: value })}
                  required
                />
              </div>
            )}

            {/* EMAIL SIGNUP FLOW - With verification (3-phase stepper) */}
            {signupMethod === 'email' && authConfig?.photographerEmailVerificationEnabled && (
              <>
                {/* Step 1: Name & Email */}
                {emailStep === 1 && (
                  <>
                    <FormField
                      id="name"
                      label="Full Name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(value) => setFormData({ ...formData, name: value })}
                      required
                    />
                    <FormField
                      id="email"
                      label="Email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(value) => setFormData({ ...formData, email: value })}
                      required
                    />
                  </>
                )}

                {/* Step 2: Verify OTP */}
                {emailStep === 2 && (
                  <div className="space-y-4">
                    <div className="text-center py-2">
                      <p className="text-white/80 text-sm">OTP sent to</p>
                      <p className="text-white font-medium">{formData.email}</p>
                    </div>
                    <FormField
                      id="emailOtp"
                      label="Enter 6-digit OTP"
                      type="otp"
                      placeholder="000000"
                      value={otp}
                      onChange={setOtp}
                      required
                    />
                    <button type="button" onClick={resetEmailFlow} className="text-sm text-amber-400 hover:text-amber-300 w-full text-center">Change email?</button>
                  </div>
                )}

                {/* Step 3: Set Password */}
                {emailStep === 3 && (
                  <div className="space-y-4">
                    <div className="text-center py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-green-400 text-sm">✓ Email verified successfully</p>
                      <p className="text-white/60 text-xs mt-1">Now set your password to complete signup</p>
                    </div>
                    <FormField
                      id="password"
                      label="Create Password"
                      type="password"
                      placeholder="Min 8 characters"
                      value={formData.password}
                      onChange={(value) => setFormData({ ...formData, password: value })}
                      required
                    />
                  </div>
                )}
              </>
            )}

            {/* EMAIL SIGNUP FLOW - Without verification (simple flow) */}
            {signupMethod === 'email' && !authConfig?.photographerEmailVerificationEnabled && (
              <>
                <FormField
                  id="name"
                  label="Full Name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                  required
                />
                <FormField
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(value) => setFormData({ ...formData, email: value })}
                  required
                />
                <FormField
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={(value) => setFormData({ ...formData, password: value })}
                  required
                />
              </>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" size="lg" className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" disabled={isLoading}>
              {isLoading ? (
                signupMethod === 'phone' ? (
                  phoneStep === 1 ? 'Sending OTP...' : phoneStep === 2 ? 'Verifying...' : 'Creating Account...'
                ) : authConfig?.photographerEmailVerificationEnabled ? (
                  emailStep === 1 ? 'Sending OTP...' : emailStep === 2 ? 'Verifying...' : 'Creating Account...'
                ) : 'Creating Account...'
              ) : (
                signupMethod === 'phone' ? (
                  phoneStep === 1 ? 'Send OTP' : phoneStep === 2 ? 'Verify OTP' : 'Create Account'
                ) : authConfig?.photographerEmailVerificationEnabled ? (
                  emailStep === 1 ? 'Send OTP' : emailStep === 2 ? 'Verify OTP' : 'Create Account'
                ) : 'Create free account'
              )} {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
          </form>

          <p className="text-center text-white/40 text-xs">
            By signing up, you agree to our{' '}
            <Link href="#" className="text-white/60 hover:text-white">Terms of Service</Link>{' '}and{' '}
            <Link href="#" className="text-white/60 hover:text-white">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

