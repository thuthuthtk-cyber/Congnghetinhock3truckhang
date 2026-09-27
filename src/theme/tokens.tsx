import React from 'react';
import { CognitiveLevel } from '../types';

export type QuestionLevel = CognitiveLevel;

/**
 * DẠY VÀ HỌC SỐ PK TRỰC KHANG - Standard Color Tokens
 * 
 * MÀU THƯƠNG HIỆU:
 * - Primary: #4F46E5 (Indigo-600)
 * - Primary Light: #EEF2FF (Indigo-50)
 * - Accent (chỉ dùng cho nút Trợ lý AI): #7C3AED (Violet-600)
 * 
 * MÀU TRUNG TÍNH:
 * - Nền chính: #F9FAFB | Nền card: #FFFFFF | Viền: #E5E7EB
 * - Chữ heading: #111827 | Chữ body: #6B7280 | Chữ disabled: #9CA3AF
 * - Sidebar: 1 tông xanh rêu đậm duy nhất #134E4A
 * 
 * MÀU NGỮ NGHĨA:
 * - Success: chữ #16A34A, nền #F0FDF4, viền #BBF7D0
 * - Warning: chữ #D97706, nền #FFFBEB, viền #FDE68A
 * - Danger: chữ #DC2626, nền #FEF2F2, viền #FECACA
 * - Info: chữ #0284C7, nền #F0F9FF, viền #BAE6FD
 */

export const THEME_COLORS = {
  // Brand
  primary: '#4F46E5',
  primaryHover: '#4338CA',
  primaryLight: '#EEF2FF',
  accentAi: '#7C3AED',
  accentAiHover: '#6D28D9',
  accentAiLight: '#F5F3FF',

  // Neutrals
  bgMain: '#F9FAFB',
  bgCard: '#FFFFFF',
  border: '#E5E7EB',
  textHeading: '#111827',
  textBody: '#6B7280',
  textDisabled: '#9CA3AF',
  sidebarBg: '#134E4A',

  // Semantics
  successText: '#16A34A',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',

  warningText: '#D97706',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',

  dangerText: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',

  infoText: '#0284C7',
  infoBg: '#F0F9FF',
  infoBorder: '#BAE6FD',
} as const;

/**
 * Standard CSS class mappings for Semantic and Cognitive Badges
 */
export const COGNITIVE_LEVEL_STYLES: Record<QuestionLevel, {
  label: string;
  badgeClass: string;
  dotColor: string;
}> = {
  nhan_biet: {
    label: '1. Nhận biết',
    badgeClass: 'bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD]',
    dotColor: '#0284C7',
  },
  thong_hieu: {
    label: '2. Thông hiểu',
    badgeClass: 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]',
    dotColor: '#16A34A',
  },
  van_dung: {
    label: '3. Vận dụng',
    badgeClass: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]',
    dotColor: '#D97706',
  },
  van_dung_cao: {
    label: '4. VD Cao',
    badgeClass: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
    dotColor: '#DC2626',
  },
};

/**
 * Unified Badge Component for Cognitive Levels
 */
export const CognitiveLevelBadge: React.FC<{
  level?: QuestionLevel | string;
  className?: string;
  showDot?: boolean;
}> = ({ level, className = '', showDot = false }) => {
  const normLevel: QuestionLevel = (
    level === 'nhan_biet' || level === 'thong_hieu' || level === 'van_dung' || level === 'van_dung_cao'
      ? level
      : (level === 'easy' || level === 'Dễ' || level === 'Nhận biết' ? 'nhan_biet' :
         level === 'medium' || level === 'Trung bình' || level === 'Thông hiểu' ? 'thong_hieu' :
         level === 'hard' || level === 'Khó' || level === 'Vận dụng' ? 'van_dung' :
         level === 'Vận dụng cao' || level === 'Rất khó' ? 'van_dung_cao' : 'nhan_biet')
  );

  const config = COGNITIVE_LEVEL_STYLES[normLevel];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium ${config.badgeClass} ${className}`}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: config.dotColor }}
        />
      )}
      <span>{config.label}</span>
    </span>
  );
};

/**
 * Common Primary Button classes
 */
export const BTN_PRIMARY = 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Common AI Assistant Button classes (Accent #7C3AED)
 */
export const BTN_ACCENT_AI = 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Common Success Button / Badge
 */
export const BADGE_SUCCESS = 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]';
export const BADGE_WARNING = 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]';
export const BADGE_DANGER = 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]';
export const BADGE_INFO = 'bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD]';
