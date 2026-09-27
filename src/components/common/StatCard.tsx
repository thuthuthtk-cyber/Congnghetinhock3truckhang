import React from 'react';
import { LucideIcon } from 'lucide-react';

export type StatCardVariant = 'blue' | 'green' | 'purple';

export interface StatCardProps {
  variant: StatCardVariant;
  title: string;
  value?: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<
  StatCardVariant,
  {
    bg: string;
    border: string;
    titleColor: string;
    valueColor: string;
    subtextColor: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  blue: {
    bg: 'bg-blue-50/80',
    border: 'border-blue-200/80',
    titleColor: 'text-blue-900/80',
    valueColor: 'text-blue-700',
    subtextColor: 'text-blue-600/70',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  green: {
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-200/80',
    titleColor: 'text-emerald-900/80',
    valueColor: 'text-emerald-700',
    subtextColor: 'text-emerald-600/70',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  purple: {
    bg: 'bg-purple-50/80',
    border: 'border-purple-200/80',
    titleColor: 'text-purple-900/80',
    valueColor: 'text-purple-700',
    subtextColor: 'text-purple-600/70',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  variant,
  title,
  value,
  subtext,
  icon: Icon,
  children,
  className = '',
}) => {
  const styles = variantStyles[variant] || variantStyles.blue;

  return (
    <div
      className={`p-4 rounded-xl border space-y-1.5 transition-all ${styles.bg} ${styles.border} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold ${styles.titleColor}`}>{title}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${styles.iconBg}`}>
            <Icon className={`w-4 h-4 ${styles.iconColor}`} />
          </div>
        )}
      </div>

      {value !== undefined && value !== null && (
        <div className={`text-lg font-extrabold font-heading ${styles.valueColor}`}>
          {value}
        </div>
      )}

      {subtext && (
        <div className={`text-[11px] ${styles.subtextColor}`}>
          {subtext}
        </div>
      )}

      {children}
    </div>
  );
};
