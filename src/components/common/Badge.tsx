import React from 'react';
import type { Role } from '../../types/auth';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'info' | 'warning' | 'urgent' | 'neutral';
  role?: Role;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  role,
  size = 'md',
  className = '',
  ...props
}) => {
  // If role is passed, map to canonical design tokens
  let computedVariant = variant || 'neutral';
  let label = children;

  if (role) {
    switch (role) {
      case 'ADMIN':
        computedVariant = 'primary';
        label = label || 'Admin';
        break;
      case 'ORGANIZER':
        computedVariant = 'info';
        label = label || 'Organizer';
        break;
      case 'PROJECT_LEAD':
        computedVariant = 'success';
        label = label || 'Lead';
        break;
      case 'MEMBER':
        computedVariant = 'neutral';
        label = label || 'Member';
        break;
      case 'PARTICIPANT':
        computedVariant = 'neutral';
        label = label || 'Participant';
        break;
    }
  }

  const variantStyles = {
    primary: 'bg-[#171717] text-white border-[#171717]',
    success: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
    info: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
    warning: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    urgent: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    neutral: 'bg-[#F5F5F5] text-[#737373] border-[#E5E5E5]',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-0.5 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full select-none ${sizeStyles[size]} ${variantStyles[computedVariant]} ${className}`}
      {...props}
    >
      {label}
    </span>
  );
};
