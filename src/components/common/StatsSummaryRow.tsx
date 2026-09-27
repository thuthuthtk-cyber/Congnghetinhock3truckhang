import React from 'react';
import { LucideIcon } from 'lucide-react';

export type StatColorScheme =
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'purple'
  | 'blue'
  | 'rose'
  | 'orange'
  | 'cyan'
  | 'teal'
  | 'fuchsia';

export interface StatItem {
  id?: string;
  label: string;
  value: string | number;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  colorScheme?: StatColorScheme;
  customValueColor?: string;
  customBgColor?: string;
  customIconColor?: string;
}

export interface StatsSummaryRowProps {
  items: StatItem[];
  className?: string;
  gridColsClassName?: string;
}

const colorSchemeMap: Record<
  StatColorScheme,
  { iconBg: string; iconColor: string; valueColor: string }
> = {
  indigo: {
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    valueColor: 'text-slate-900',
  },
  emerald: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-600',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-600',
  },
  purple: {
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    valueColor: 'text-purple-600',
  },
  blue: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    valueColor: 'text-blue-600',
  },
  rose: {
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    valueColor: 'text-rose-600',
  },
  orange: {
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    valueColor: 'text-orange-600',
  },
  cyan: {
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    valueColor: 'text-cyan-600',
  },
  teal: {
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    valueColor: 'text-teal-600',
  },
  fuchsia: {
    iconBg: 'bg-fuchsia-50',
    iconColor: 'text-fuchsia-600',
    valueColor: 'text-fuchsia-600',
  },
};

export const StatsSummaryRow: React.FC<StatsSummaryRowProps> = ({
  items,
  className = '',
  gridColsClassName = 'grid-cols-2 md:grid-cols-4',
}) => {
  return (
    <div className={`grid ${gridColsClassName} gap-4 ${className}`}>
      {items.map((item, index) => {
        const scheme = item.colorScheme || 'indigo';
        const styles = colorSchemeMap[scheme] || colorSchemeMap.indigo;
        const Icon = item.icon;

        return (
          <div
            key={item.id || `stat-${index}`}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 hover:shadow-sm transition-shadow"
          >
            <div
              className={`w-12 h-12 rounded-2xl ${
                item.customBgColor || styles.iconBg
              } ${item.customIconColor || styles.iconColor} flex items-center justify-center font-bold shrink-0`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-slate-500 font-bold block truncate">
                {item.label}
              </span>
              <span
                className={`text-xl font-black ${
                  item.customValueColor || styles.valueColor
                } truncate block`}
              >
                {item.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
