'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, ArrowRight, ArrowLeft, Upload, Check, Sparkles, Palette, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, title: 'Profile', icon: Camera },
  { id: 2, title: 'Branding', icon: Palette },
  { id: 3, title: 'Preferences', icon: Sparkles },
  { id: 4, title: 'Complete', icon: Check },
];

const photographyTypes = ['Wedding', 'Portrait', 'Event', 'Corporate', 'Product', 'Real Estate', 'Fashion', 'Sports'];
const templates = [
  { id: 'modern', name: 'Modern', preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=60' },
  { id: 'classic', name: 'Classic', preview: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=60' },
  { id: 'minimal', name: 'Minimal', preview: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=300&q=60' },
  { id: 'elegant', name: 'Elegant', preview: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300&q=60' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    bio: '',
    website: '',
    instagram: '',
    avatar: '',
    photographyTypes: [] as string[],
    defaultTemplate: 'modern',
    watermarkEnabled: true,
  });

  const progress = (currentStep / steps.length) * 100;

  const togglePhotographyType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      photographyTypes: prev.photographyTypes.includes(type)
        ? prev.photographyTypes.filter((t) => t !== type)
        : [...prev.photographyTypes, type],
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push('/photographer/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-white">PhotoShare</span>
          </div>
          <Button variant="ghost" className="text-white/60 hover:text-white" onClick={() => router.push('/photographer/dashboard')}>
            Skip for now
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                currentStep >= step.id ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-white/10 text-white/40'
              )}>
                {currentStep > step.id ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>
              {i < steps.length - 1 && <div className={cn('w-16 sm:w-24 h-0.5 mx-2', currentStep > step.id ? 'bg-amber-500' : 'bg-white/10')} />}
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-1 bg-white/10" />
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Let&apos;s set up your profile</h1>
              <p className="text-white/60">This helps clients recognize and trust your brand</p>
            </div>

            {/* Avatar Upload */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center overflow-hidden">
                  {formData.avatar ? (
                    <Image src={formData.avatar} alt="" fill className="object-cover" />
                  ) : (
                    <Upload className="h-8 w-8 text-white/40" />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white hover:bg-amber-600">
                  <Upload className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/80">Business / Studio Name</Label>
                <Input placeholder="e.g., Alex Thompson Photography" value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} className="h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Bio</Label>
                <Textarea placeholder="Tell clients about yourself and your photography style..." value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-[100px]" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Website (optional)</Label>
                  <Input placeholder="https://yoursite.com" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Instagram (optional)</Label>
                  <Input placeholder="@yourusername" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} className="h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40" />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">What do you shoot?</h1>
              <p className="text-white/60">Select all that apply to customize your experience</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photographyTypes.map((type) => (
                <button key={type} onClick={() => togglePhotographyType(type)} className={cn(
                  'p-4 rounded-xl border-2 text-center transition-all',
                  formData.photographyTypes.includes(type)
                    ? 'border-amber-500 bg-amber-500/20 text-white'
                    : 'border-white/20 text-white/60 hover:border-white/40'
                )}>
                  {formData.photographyTypes.includes(type) && <Check className="h-4 w-4 mx-auto mb-1 text-amber-400" />}
                  <span className="text-sm font-medium">{type}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Choose your default template</h1>
              <p className="text-white/60">You can always change this later for each event</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setFormData({ ...formData, defaultTemplate: template.id })}
                  className={cn(
                    'relative rounded-xl overflow-hidden border-2 transition-all',
                    formData.defaultTemplate === template.id
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
                      : 'border-white/20 hover:border-white/40'
                  )}
                >
                  <div className="relative aspect-[4/3]">
                    <Image src={template.preview} alt={template.name} fill className="object-cover" />
                    {formData.defaultTemplate === template.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white/5">
                    <p className="text-white font-medium">{template.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-8 text-center py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-3">You&apos;re all set! 🎉</h1>
              <p className="text-xl text-white/60 max-w-md mx-auto">
                Your account is ready. Start creating beautiful galleries for your clients.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 max-w-lg mx-auto">
              {[
                { icon: Upload, label: 'Upload Photos', desc: 'Add your first gallery' },
                { icon: Users, label: 'Invite Clients', desc: 'Share access easily' },
                { icon: Globe, label: 'Go Live', desc: 'Publish your gallery' },
              ].map((item, i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mx-auto mb-2">
                      <item.icon className="h-5 w-5 text-amber-400" />
                    </div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-white/40 text-xs">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0a0a0a]/90 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1} className="text-white/60 hover:text-white gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={handleNext} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2">
            {currentStep === steps.length ? 'Go to Dashboard' : 'Continue'} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

