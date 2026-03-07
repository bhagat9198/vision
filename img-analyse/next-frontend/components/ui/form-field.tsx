'use client';

import * as React from 'react';
import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Phone, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type FormFieldType = 'text' | 'email' | 'password' | 'phone' | 'otp';

interface FormFieldProps {
  id: string;
  label: string;
  type?: FormFieldType;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  icon?: LucideIcon;
  autoIcon?: boolean; // Automatically choose icon based on type
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  showPasswordToggle?: boolean; // For password fields
  maxLength?: number;
  // OTP specific
  otpLength?: number;
  // Custom label content (for forgot password link, etc.)
  labelRight?: React.ReactNode;
}

const typeIcons: Record<FormFieldType, LucideIcon | null> = {
  text: User,
  email: Mail,
  password: Lock,
  phone: Phone,
  otp: null,
};

export function FormField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  icon,
  autoIcon = true,
  className,
  inputClassName,
  labelClassName,
  showPasswordToggle = true,
  maxLength,
  otpLength = 6,
  labelRight,
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  const IconComponent = icon || (autoIcon ? typeIcons[type] : null);
  const isPassword = type === 'password';
  const isOtp = type === 'otp';
  const hasLeftIcon = !!IconComponent && !isOtp;
  const hasRightIcon = isPassword && showPasswordToggle;

  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type === 'phone' ? 'tel' : type === 'otp' ? 'text' : type;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    if (isOtp) {
      // OTP: only digits, limit to otpLength
      newValue = newValue.replace(/\D/g, '').slice(0, otpLength);
    }
    onChange(newValue);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className={cn('flex items-center', labelRight ? 'justify-between' : '')}>
        <Label htmlFor={id} className={cn('text-white/80', labelClassName)}>
          {label}
        </Label>
        {labelRight}
      </div>
      <div className="relative">
        {hasLeftIcon && IconComponent && (
          <IconComponent className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
        )}
        <Input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          maxLength={isOtp ? otpLength : maxLength}
          className={cn(
            'h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40',
            hasLeftIcon && 'pl-10',
            hasRightIcon && 'pr-10',
            isOtp && 'text-center text-2xl tracking-[0.5em] font-mono',
            inputClassName
          )}
        />
        {hasRightIcon && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-white/40 dark:hover:text-white/60"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// Variant for light/dark themed pages (like settings)
interface ThemedFormFieldProps extends Omit<FormFieldProps, 'labelClassName' | 'inputClassName'> {
  theme?: 'dark' | 'light' | 'auto';
}

export function ThemedFormField({
  theme = 'auto',
  ...props
}: ThemedFormFieldProps) {
  const isDark = theme === 'dark';
  const isAuto = theme === 'auto';

  return (
    <FormField
      {...props}
      labelClassName={cn(
        isDark ? 'text-white/80' : isAuto ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-700'
      )}
      inputClassName={cn(
        isDark
          ? 'bg-white/5 border-white/20 text-white placeholder:text-white/40'
          : isAuto
            ? 'bg-white dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500'
            : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
      )}
    />
  );
}

