import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, Coins, Zap } from 'lucide-react';
import { RewardToastData } from '../../services/studentGameStoreService';

interface RewardToastNotificationProps {
  onNavigateToStore?: () => void;
}

interface ActiveRewardNotification extends RewardToastData {
  id: number;
}

export const RewardToastNotification: React.FC<RewardToastNotificationProps> = ({
  onNavigateToStore
}) => {
  const [activeNotification, setActiveNotification] = useState<ActiveRewardNotification | null>(null);

  useEffect(() => {
    const handleRewardEvent = (e: any) => {
      if (e.detail && (e.detail.coinsEarned > 0 || e.detail.expEarned > 0)) {
        setActiveNotification({
          id: Date.now(),
          coinsEarned: e.detail.coinsEarned || 0,
          expEarned: e.detail.expEarned || 0,
          reason: e.detail.reason || '',
          message: e.detail.message || `🎉 Bạn vừa nhận +${e.detail.coinsEarned} Xu! Ghé Cửa Hàng xem có gì hay ho không nhé!`
        });
      }
    };

    window.addEventListener('eduplay_reward_toast', handleRewardEvent);
    return () => {
      window.removeEventListener('eduplay_reward_toast', handleRewardEvent);
    };
  }, []);

  // Auto-dismiss after 5.5 seconds
  useEffect(() => {
    if (!activeNotification) return;

    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 5500);

    return () => clearTimeout(timer);
  }, [activeNotification]);

  if (!activeNotification) return null;

  const handleGoToStore = () => {
    setActiveNotification(null);
    onNavigateToStore?.();
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 pointer-events-none max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white p-4 sm:p-4.5 rounded-2xl shadow-2xl border-2 border-amber-400/80 ring-4 ring-amber-400/20 flex flex-col gap-3 relative overflow-hidden">
        
        {/* Decorative Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

        {/* Header & Body Row */}
        <div className="flex items-start gap-3">
          {/* Animated Coin Badge */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black text-xl shrink-0 shadow-md shadow-amber-400/30 animate-bounce">
            🪙
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Thưởng Nóng +{activeNotification.coinsEarned} Xu
              </span>
              {activeNotification.expEarned > 0 && (
                <span className="text-[10px] font-bold text-amber-200/90 flex items-center gap-0.5">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> +{activeNotification.expEarned} EXP
                </span>
              )}
            </div>

            <p className="text-xs text-slate-100 font-bold mt-1.5 leading-snug">
              {activeNotification.message}
            </p>

            {activeNotification.reason && (
              <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                Nguồn: {activeNotification.reason}
              </p>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => setActiveNotification(null)}
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button Row */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-medium italic">
            Tự động ẩn sau vài giây...
          </span>

          <button
            onClick={handleGoToStore}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Đi xem ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
