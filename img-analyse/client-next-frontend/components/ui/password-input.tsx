'use client';

import * as React from 'react';
import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PasswordInputProps {
  id: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  showIcon?: boolean; // Show lock icon on left
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  labelRight?: React.ReactNode; // For forgot password link, etc.
  theme?: 'dark' | 'light' | 'auto';
}

export function PasswordInput({
  id,
  label,
  placeholder = '••••••••',
  value,
  onChange,
  disabled = false,
  required = false,
  showIcon = true,
  className,
  inputClassName,
  labelClassName,
  labelRight,
  theme = 'dark',
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const isDark = theme === 'dark';
  const isAuto = theme === 'auto';

  const labelStyles = cn(
    isDark ? 'text-white/80' : isAuto ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-700',
    labelClassName
  );

  const inputStyles = cn(
    'h-12',
    showIcon && 'pl-10',
    'pr-10', // Always have space for eye icon
    isDark
      ? 'bg-white/5 border-white/20 text-white placeholder:text-white/40'
      : isAuto
      ? 'bg-white dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500'
      : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400',
    inputClassName
  );

  const iconStyles = cn(
    'absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5',
    isDark ? 'text-white/40' : isAuto ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400'
  );

  const toggleStyles = cn(
    'absolute right-3 top-1/2 -translate-y-1/2',
    isDark ? 'text-white/40 hover:text-white/60' : isAuto ? 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
  );

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className={cn('flex items-center', labelRight ? 'justify-between' : '')}>
          <Label htmlFor={id} className={labelStyles}>
            {label}
          </Label>
          {labelRight}
        </div>
      )}
      <div className="relative">
        {showIcon && <Lock className={iconStyles} />}
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className={inputStyles}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={toggleStyles}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

