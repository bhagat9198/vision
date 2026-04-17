'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Mail, ArrowRight, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FormField } from '@/components/ui/form-field';

interface AuthConfig {
  photographerEmailVerificationEnabled: boolean;
  photographerPhoneAuthEnabled: boolean;
  photographerGoogleLoginEnabled: boolean;
  photographerFacebookLoginEnabled: boolean;
  photographerAppleLoginEnabled: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [formData, setFormData] = useState({ email: '', phone: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    // Fetch auth config
    fetch('http://localhost:4000/api/v1/config/auth/public')
      .then(res => res.json())
      .then(data => { if (data.success) setAuthConfig(data.data); })
      .catch(() => setAuthConfig({ photographerEmailVerificationEnabled: false, photographerPhoneAuthEnabled: false, photographerGoogleLoginEnabled: false, photographerFacebookLoginEnabled: false, photographerAppleLoginEnabled: false }));
  }, []);

  // Send OTP for phone login
  const sendOtp = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, type: 'login' }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and login
  const verifyOtpAndLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, otp: formData.otp, type: 'login' }),
      });
      const data = await res.json();
      if (data.success && data.data.token) {
        localStorage.setItem('photographerToken', data.data.token);
        router.push('/photographer/dashboard');
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

    // Phone login flow
    if (loginMethod === 'phone') {
      if (!otpSent) {
        await sendOtp();
        setIsLoading(false);
        return;
      }
      await verifyOtpAndLogin();
      return;
    }

    // Email login flow
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('photographerToken', data.data.token);
        router.push('/photographer/dashboard');
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch {
      setError('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setIsLoading(true);
    // Simulate OAuth redirect
    await new Promise((r) => setTimeout(r, 500));
    router.push('/photographer/dashboard');
  };

  const resetPhoneFlow = () => {
    setOtpSent(false);
    setFormData(prev => ({ ...prev, otp: '' }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-amber-500/20 via-[#0a0a0a] to-purple-500/20">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1920&q=80')] bg-cover bg-center opacity-20" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-semibold text-white">PhotoShare</span>
          </Link>
          <h1 className="text-4xl font-bold text-white mb-4">Welcome back!</h1>
          <p className="text-xl text-white/60 max-w-md">
            Sign in to manage your galleries, upload photos, and delight your clients.
          </p>
          <div className="mt-12 space-y-4">
            {['AI-powered face search', 'Beautiful gallery templates', 'Secure photo delivery'].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/80">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-white">PhotoShare</span>
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white">Sign in</h2>
            <p className="mt-2 text-white/60">
              Don&apos;t have an account?{' '}
              <Link href="/photographer/signup" className="text-amber-400 hover:text-amber-300 font-medium">
                Sign up free
              </Link>
            </p>
          </div>

          {/* Social Login - Only show if any social login is enabled */}
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
                    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
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

          {/* Login Method Toggle - Only show if phone auth is enabled */}
          {authConfig?.photographerPhoneAuthEnabled && (
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
              <button type="button" onClick={() => { setLoginMethod('email'); resetPhoneFlow(); }} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${loginMethod === 'email' ? 'bg-amber-500 text-white' : 'text-white/60 hover:text-white'}`}>
                <Mail className="h-4 w-4 inline mr-2" />Email
              </button>
              <button type="button" onClick={() => { setLoginMethod('phone'); resetPhoneFlow(); }} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${loginMethod === 'phone' ? 'bg-amber-500 text-white' : 'text-white/60 hover:text-white'}`}>
                <Phone className="h-4 w-4 inline mr-2" />Phone
              </button>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMethod === 'email' ? (
              <>
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
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(value) => setFormData({ ...formData, password: value })}
                  required
                  labelRight={
                    <Link href="/photographer/forgot-password" className="text-sm text-amber-400 hover:text-amber-300">
                      Forgot password?
                    </Link>
                  }
                />
              </>
            ) : (
              <>
                <FormField
                  id="phone"
                  label="Phone Number"
                  type="phone"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  required
                  disabled={otpSent}
                />
                {otpSent && (
                  <div className="space-y-2">
                    <FormField
                      id="otp"
                      label="Enter OTP"
                      type="otp"
                      placeholder="000000"
                      value={formData.otp}
                      onChange={(value) => setFormData({ ...formData, otp: value })}
                      required
                      labelRight={
                        <button type="button" onClick={resetPhoneFlow} className="text-sm text-amber-400 hover:text-amber-300">
                          Change number
                        </button>
                      }
                    />
                    <p className="text-xs text-white/40 text-center">OTP sent to {formData.phone}</p>
                  </div>
                )}
              </>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" size="lg" className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" disabled={isLoading}>
              {isLoading ? (
                loginMethod === 'phone' ? (otpSent ? 'Verifying...' : 'Sending OTP...') : 'Signing in...'
              ) : (
                loginMethod === 'phone' ? (otpSent ? 'Verify & Sign in' : 'Send OTP') : 'Sign in'
              )} {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

