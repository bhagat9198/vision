'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface Step {
  number: number;
  label?: string;
}

interface StepIndicatorProps {
  steps: Step[] | number; // Can pass array of steps or just a number
  currentStep: number;
  className?: string;
  activeColor?: string;
  inactiveColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: { circle: 'w-6 h-6 text-xs', line: 'w-6 h-0.5' },
  md: { circle: 'w-8 h-8 text-sm', line: 'w-8 h-1' },
  lg: { circle: 'w-10 h-10 text-base', line: 'w-10 h-1.5' },
};

export function StepIndicator({
  steps,
  currentStep,
  className,
  activeColor = 'bg-amber-500 text-white',
  inactiveColor = 'bg-white/10 text-white/40',
  size = 'md',
}: StepIndicatorProps) {
  const stepArray: Step[] = typeof steps === 'number' 
    ? Array.from({ length: steps }, (_, i) => ({ number: i + 1 }))
    : steps;

  const sizes = sizeClasses[size];

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {stepArray.map((step, index) => (
        <React.Fragment key={step.number}>
          <div
            className={cn(
              'rounded-full flex items-center justify-center font-medium transition-colors',
              sizes.circle,
              currentStep >= step.number ? activeColor : inactiveColor
            )}
          >
            {step.number}
          </div>
          {index < stepArray.length - 1 && (
            <div
              className={cn(
                'transition-colors',
                sizes.line,
                currentStep > step.number ? activeColor.split(' ')[0] : inactiveColor.split(' ')[0]
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Horizontal step labels (optional, for longer forms)
interface StepLabelIndicatorProps extends StepIndicatorProps {
  labels: string[];
}

export function StepLabelIndicator({
  labels,
  currentStep,
  className,
  activeColor = 'bg-amber-500 text-white',
  inactiveColor = 'bg-white/10 text-white/40',
  size = 'md',
}: StepLabelIndicatorProps) {
  const sizes = sizeClasses[size];

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="flex items-center gap-2">
        {labels.map((_, index) => (
          <React.Fragment key={index}>
            <div
              className={cn(
                'rounded-full flex items-center justify-center font-medium transition-colors',
                sizes.circle,
                currentStep >= index + 1 ? activeColor : inactiveColor
              )}
            >
              {index + 1}
            </div>
            {index < labels.length - 1 && (
              <div
                className={cn(
                  'transition-colors',
                  sizes.line,
                  currentStep > index + 1 ? activeColor.split(' ')[0] : inactiveColor.split(' ')[0]
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="flex justify-between w-full text-xs text-white/60">
        {labels.map((label, index) => (
          <span
            key={index}
            className={cn(
              'text-center transition-colors',
              currentStep >= index + 1 ? 'text-white/80' : 'text-white/40'
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

