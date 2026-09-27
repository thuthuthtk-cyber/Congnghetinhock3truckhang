import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Trophy,
  Coins,
  Pencil,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  ShoppingBag,
  Award,
  Flame,
  Star,
  Zap,
  Phone,
  Mail,
  User,
  Heart,
  BookOpen
} from 'lucide-react';
import {
  StudentGameProfile,
  StoreItem,
  BadgeItem,
  INITIAL_STORE_ITEMS,
  INITIAL_BADGES,
  getStudentGameProfile,
  saveStudentGameProfile,
  updateStudentBioAndInterests,
  purchaseStoreItem
} from '../../services/studentGameStoreService';
import { getEffectiveStudentClassAndGrade } from '../../services/studentSessionService';

interface StudentGameStoreTabProps {
  currentUserName?: string;
  studentClassName?: string;
}

export const StudentGameStoreTab: React.FC<StudentGameStoreTabProps> = ({
  currentUserName,
  studentClassName
}) => {
  const { studentClass: resolvedClass, studentName: resolvedName } = useMemo(() => {
    return getEffectiveStudentClassAndGrade(studentClassName);
  }, [studentClassName]);

  const effectiveUserName = currentUserName || resolvedName || 'Học sinh';
  const effectiveClass = studentClassName || resolvedClass;

  const [profile, setProfile] = useState<StudentGameProfile>(() =>
    getStudentGameProfile(undefined, effectiveUserName)
  );
  const [storeItems, setStoreItems] = useState<StoreItem[]>(INITIAL_STORE_ITEMS);
  const [badges, setBadges] = useState<BadgeItem[]>(INITIAL_BADGES);

  // Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editInterests, setEditInterests] = useState(profile.interests);
  const [editBio, setEditBio] = useState(profile.bio);

  // Insufficient Coins Alert Dialog
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Listen to profile updates across the app
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setProfile(e.detail);
      }
    };

    window.addEventListener('eduplay_game_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('eduplay_game_profile_updated', handleProfileUpdate);
    };
  }, []);

  const handleOpenEditModal = () => {
    setEditInterests(profile.interests);
    setEditBio(profile.bio);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = () => {
    const updated = updateStudentBioAndInterests(editInterests, editBio);
    setProfile(updated);
    setIsEditModalOpen(false);
  };

  const handleBuyOrEquip = (item: StoreItem) => {
    const result = purchaseStoreItem(item);
    setProfile(result.profile);

    if (!result.success) {
      setAlertMessage(result.message);
    }
  };

  // Calculate EXP percentage
  const expPercentage = Math.min(
    100,
    Math.max(0, Math.round((profile.currentExp / (profile.nextLevelExp || 1000)) * 100))
  );

  // Leaderboard data for right sidebar
  const LEADERBOARD_TOP = [
    {
      rank: 1,
      name: `${effectiveUserName} (Em)`,
      class: `${effectiveClass} • Thành viên tích cực`,
      score: `${profile.coins > 0 ? profile.coins : 0}`,
      avatar: '🌟',
      badgeClass: 'bg-amber-400 text-amber-950 font-black',
      isMe: true
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. KHỐI HỒ SƠ HỌC VIÊN NHÍ & BẢNG VÀNG ĐUA TOP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Hồ Sơ Học Viên Nhí */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 flex flex-col justify-between">
          
          {/* Header of Profile */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🦁</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                HỒ SƠ HỌC VIÊN NHÍ
              </h3>
            </div>

            <button
              onClick={handleOpenEditModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200/60"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Chỉnh sửa hồ sơ</span>
            </button>
          </div>

          {/* Avatar + EXP + Coin Wallet Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-amber-50/30 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
            
            {/* Avatar + Name + EXP Progress */}
            <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
              {/* Avatar Icon with frame effect */}
              <div className="relative shrink-0">
                <div
                  className={`w-16 h-16 rounded-2xl bg-white border-2 border-indigo-200 flex items-center justify-center text-3xl shadow-sm ${
                    profile.equippedFrame === 'store-frame-fire'
                      ? 'ring-4 ring-amber-500 shadow-amber-300 animate-pulse'
                      : profile.equippedFrame === 'store-frame-star'
                      ? 'ring-4 ring-indigo-400 shadow-indigo-300'
                      : ''
                  }`}
                >
                  {profile.equippedAvatar || profile.avatar || '🐰'}
                </div>
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 font-black text-[9px] shadow-xs border border-amber-200">
                  {studentClassName}
                </span>
              </div>

              {/* Name + Level + EXP Bar */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base sm:text-lg font-black text-slate-900 truncate font-heading">
                    {profile.studentName || currentUserName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[10px] tracking-wide border border-amber-300 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-600 fill-amber-600" /> CẤP ĐỘ {profile.level}
                  </span>
                </div>

                {/* EXP Subtitle & Bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span className="flex items-center gap-1 text-amber-700">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> Điểm kinh nghiệm (EXP)
                    </span>
                    <span className="font-mono text-slate-500">
                      {profile.currentExp} / {profile.nextLevelExp} EXP
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 transition-all duration-500 shadow-xs"
                      style={{ width: `${expPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* VÍ TIỀN XU Highlighted Box */}
            <div className="w-full sm:w-auto bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl p-4 sm:p-5 text-center shrink-0 shadow-md shadow-amber-200 border border-amber-300 min-w-[140px]">
              <span className="text-[10px] text-amber-950 font-black uppercase tracking-wider block">
                VÍ TIỀN XU
              </span>
              <div className="text-2xl sm:text-3xl font-black font-heading text-slate-950 tracking-tight flex items-center justify-center gap-1.5 my-0.5">
                <span>{profile.coins.toLocaleString('vi-VN')}</span>
                <span className="text-xl">🪙</span>
              </div>
              <span className="text-[10px] font-bold text-amber-900 bg-amber-300/60 px-2 py-0.5 rounded-full inline-block">
                Có thể đổi quà
              </span>
            </div>
          </div>

          {/* 2 Small Boxes: Sở Thích & Giới Thiệu Bản Thân */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: Sở thích */}
            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5 uppercase tracking-wide">
                <span>🌟</span> SỞ THÍCH
              </span>
              <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                {profile.interests || 'Chưa thiết lập sở thích'}
              </p>
            </div>

            {/* Box 2: Giới thiệu bản thân */}
            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1.5 uppercase tracking-wide">
                <span>✍️</span> GIỚI THIỆU BẢN THÂN
              </span>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {profile.bio || 'Học sinh chăm ngoan trường Tiểu học Quang Hưng'}
              </p>
            </div>
          </div>

          {/* 1 Row: Liên Hệ Phụ Huynh (Chỉ xem) */}
          <div className="bg-teal-50/60 rounded-xl p-3.5 border border-teal-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-teal-900 flex items-center gap-1.5 uppercase tracking-wide">
                <span>👨‍👩‍👧</span> LIÊN HỆ PHỤ HUYNH
              </span>
              <span className="text-[10px] font-bold text-teal-600 bg-teal-100/80 px-2 py-0.5 rounded-full">
                Chỉ xem (Quản lý bởi Nhà trường)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Tên: <b className="text-slate-900">{profile.parentName || 'Chưa cập nhật'}</b></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>ĐT: <b className="text-slate-900 font-mono">{profile.parentPhone || 'Chưa cập nhật'}</b></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 truncate">
                <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="truncate">Email: <b className="text-slate-900">{profile.parentEmail || 'Chưa cập nhật'}</b></span>
              </div>
            </div>
          </div>

        </div>

        {/* Right 1 Col: BẢNG VÀNG ĐUA TOP */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 text-center space-y-1 bg-gradient-to-b from-amber-50/60 to-white">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 inline-block">
                BẢNG VÀNG ĐUA TOP
              </span>
              <h4 className="text-sm font-black text-slate-900 flex items-center justify-center gap-1.5 mt-1">
                <span>✨</span> Trần quý Anh tài tuần này <span>✨</span>
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">
                Bảng xếp hạng tổng hợp điểm tích lũy thi đấu thực hành các khối lớp
              </p>
            </div>

            {/* List of 3 Top Students */}
            <div className="p-3.5 space-y-2.5">
              {LEADERBOARD_TOP.map((item) => (
                <div
                  key={item.rank}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    item.isMe
                      ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-lg shrink-0 shadow-xs">
                      {item.avatar}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1">
                        <span>{item.name}</span>
                        {item.isMe && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        {item.class}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black font-mono text-amber-700 block">
                      {item.score}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Notice */}
          <div className="p-3 bg-amber-50/60 border-t border-amber-200/60 text-[10px] text-amber-900 font-medium text-center leading-relaxed">
            ⚡ Thứ hạng cập nhật liên tục 5 giây một lần. Hãy tham gia tích lũy bài để gặt hái thêm nhiều Xu đổi quà!
          </div>
        </div>

      </div>


      {/* 2. KHỐI CỬA HÀNG QUÀ TẶNG PHÉP THUẬT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔮</span>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                CỬA HÀNG QUÀ TẶNG PHÉP THUẬT
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Bố mẹ và thầy cô tài trợ xu đổi quà. Dùng số xu kiếm được rèn luyện để sắm đồ khủng!
            </p>
          </div>

          <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider self-start sm:self-auto">
            COIN STORE V2.0
          </span>
        </div>

        {/* 2-Column Grid of Store Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {storeItems.map((item) => {
            const isOwned = profile.ownedItemIds.includes(item.id);
            const isEquippedAvatar = item.type === 'virtual_avatar' && profile.equippedAvatar === item.avatarEmoji;
            const isEquippedFrame = item.type === 'virtual_frame' && profile.equippedFrame === item.id;
            const isEquipped = isEquippedAvatar || isEquippedFrame;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 ${
                  isOwned
                    ? 'bg-slate-50/70 border-slate-200'
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Item Icon */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border shrink-0 shadow-xs ${
                      item.imageBgColor || 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    {item.icon}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                        {item.name}
                      </h4>
                      {item.isPhysical && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-[9px] border border-rose-200">
                          Nhận tại lớp 🎁
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Price & Action Button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-amber-700 font-black font-mono text-sm">
                    <span>{item.price.toLocaleString('vi-VN')}</span>
                    <span>🪙</span>
                  </div>

                  {isOwned ? (
                    item.type === 'virtual_avatar' || item.type === 'virtual_frame' ? (
                      <button
                        onClick={() => handleBuyOrEquip(item)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          isEquipped
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isEquipped ? 'Đang trang bị ✨' : 'Đã sở hữu (Trang bị)'}</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1 rounded-xl bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Đã đổi quà
                      </span>
                    )
                  ) : (
                    <button
                      onClick={() => handleBuyOrEquip(item)}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Đổi quà 🛒</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* 3. KHỐI BỘ SƯU TẬP HUY HIỆU VINH HẠNH */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                BỘ SƯU TẬP HUY HIỆU VINH HẠNH
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Bí kíp hoàn thành mục tiêu học tập xuất sắc để đập vỡ ổ khóa thành tựu kì diệu!
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500">
            Đã mở khóa: <b className="text-indigo-600">{profile.unlockedBadgeIds.length}</b> / {badges.length} huy hiệu
          </span>
        </div>

        {/* 4-Column Grid of Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {badges.map((badge) => {
            const isUnlocked = profile.unlockedBadgeIds.includes(badge.id);

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-between space-y-3 ${
                  isUnlocked
                    ? badge.colorScheme === 'gold'
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-300/60 shadow-xs'
                      : badge.colorScheme === 'emerald'
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-300/60 shadow-xs'
                      : badge.colorScheme === 'rose'
                      ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-300/60 shadow-xs'
                      : 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-300/60 shadow-xs'
                    : 'bg-slate-50 border-slate-200 opacity-65'
                }`}
              >
                {/* Badge Icon */}
                <div className="relative">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border shadow-xs ${
                      isUnlocked
                        ? 'bg-white border-white/60 shadow-sm animate-in zoom-in-95'
                        : 'bg-slate-200 border-slate-300 grayscale'
                    }`}
                  >
                    {badge.icon}
                  </div>

                  {isUnlocked ? (
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-xs border border-white font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-white flex items-center justify-center text-[10px] shadow-xs border border-white font-bold">
                      🔒
                    </span>
                  )}
                </div>

                {/* Badge Title & Condition */}
                <div className="space-y-1">
                  <h4
                    className={`text-xs font-black uppercase tracking-tight ${
                      isUnlocked ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {badge.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {badge.condition}
                  </p>
                </div>

                {/* Status Footer */}
                <div className="w-full pt-1">
                  {isUnlocked ? (
                    <span className="inline-block w-full py-1 rounded-lg bg-white/80 border border-slate-200/80 text-[10px] font-black text-emerald-800 shadow-xs">
                      Đã đạt được ⭐
                    </span>
                  ) : (
                    <span className="inline-block w-full py-1 rounded-lg bg-slate-200/80 text-[10px] font-bold text-slate-500">
                      Chưa mở khóa 🔒
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* MODAL: Chỉnh Sửa Hồ Sơ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Pencil className="w-5 h-5" />
                <h3 className="text-base font-black font-heading">Chỉnh Sửa Hồ Sơ Của Em</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <span>🌟</span> Sở thích của em:
                </label>
                <input
                  type="text"
                  value={editInterests}
                  onChange={(e) => setEditInterests(e.target.value)}
                  placeholder="Ví dụ: Đọc truyện tranh, lập trình Scratch, bóng đá..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <span>✍️</span> Giới thiệu ngắn về em:
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Hãy viết đôi dòng giới thiệu về bản thân hoặc mục tiêu học tập..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                💡 <strong>Gợi ý:</strong> Thông tin này sẽ hiển thị trên bảng vinh danh và hồ sơ cá nhân của em để bạn bè và Thầy/Cô cùng biết nhé!
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Lưu hồ sơ
              </button>
            </div>

          </div>
        </div>
      )}


      {/* MODAL: Không Đủ Xu */}
      {alertMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col text-center p-6 space-y-4 animate-in zoom-in-95 duration-200 border border-slate-200">
            
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
              🪙
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-slate-900 font-heading">
                Chưa Đủ Tiền Xu Đổi Quà!
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {alertMessage}
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-bold text-left space-y-1">
              <span>🎯 <b>Cách tích thêm xu:</b></span>
              <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-800">
                <li>Chiến thắng các phòng thi đấu trực tuyến (+50 xu)</li>
                <li>Hoàn thành bài tập về nhà đúng hạn (+30 xu)</li>
                <li>Làm bài kiểm tra đạt điểm 9-10 (+100 xu)</li>
              </ul>
            </div>

            <button
              onClick={() => setAlertMessage(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Em đã hiểu, sẽ cố gắng học tập! 💪
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
