export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  type: 'virtual_avatar' | 'virtual_frame' | 'physical_reward';
  categoryLabel: string;
  isPhysical: boolean;
  avatarEmoji?: string;
  frameClass?: string;
  imageBgColor?: string;
}

export interface BadgeItem {
  id: string;
  name: string;
  condition: string;
  icon: string;
  isUnlocked: boolean;
  colorScheme: 'gold' | 'emerald' | 'blue' | 'purple' | 'rose';
  unlockedDate?: string;
}

export interface StudentGameProfile {
  studentId: string;
  studentName: string;
  avatar: string;
  equippedAvatar: string;
  equippedFrame: string;
  level: number;
  currentExp: number;
  nextLevelExp: number;
  coins: number;
  interests: string;
  bio: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  ownedItemIds: string[];
  unlockedBadgeIds: string[];
}

export const INITIAL_STORE_ITEMS: StoreItem[] = [
  {
    id: 'store-avatar-robot',
    name: 'Avatar Robot Tin học',
    description: 'Hóa thân thành chiến binh AI thông minh đỉnh cao!',
    price: 500,
    icon: '🤖',
    type: 'virtual_avatar',
    categoryLabel: 'Avatar Ảo',
    isPhysical: false,
    avatarEmoji: '🤖',
    imageBgColor: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  },
  {
    id: 'store-frame-fire',
    name: 'Khung viền Cánh Lửa',
    description: 'Hiệu ứng lửa cháy rực rỡ xung quanh Avatar!',
    price: 300,
    icon: '🔥',
    type: 'virtual_frame',
    categoryLabel: 'Hiệu Ứng Avatar',
    isPhysical: false,
    frameClass: 'ring-4 ring-amber-500 shadow-lg shadow-amber-500/40 animate-pulse',
    imageBgColor: 'bg-amber-100 text-amber-600 border-amber-200'
  },
  {
    id: 'store-avatar-fox',
    name: 'Avatar Chú Cáo Đỏ',
    description: 'Hóa thân thành chú cáo nhỏ nhanh trí!',
    price: 400,
    icon: '🦊',
    type: 'virtual_avatar',
    categoryLabel: 'Avatar Ảo',
    isPhysical: false,
    avatarEmoji: '🦊',
    imageBgColor: 'bg-orange-100 text-orange-600 border-orange-200'
  },
  {
    id: 'store-reward-pencil',
    name: 'Bút Chì Đổi Thưởng',
    description: 'Đổi phần thưởng thực tế: Nhận 1 bút chì xinh tại lớp!',
    price: 1000,
    icon: '✏️',
    type: 'physical_reward',
    categoryLabel: 'Quà Nhận Tại Lớp',
    isPhysical: true,
    imageBgColor: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  },
  {
    id: 'store-frame-star',
    name: 'Khung Viền Sao Băng',
    description: 'Hiệu ứng vệt sao băng phát sáng lấp lánh khi vào phòng đấu!',
    price: 450,
    icon: '✨',
    type: 'virtual_frame',
    categoryLabel: 'Hiệu Ứng Avatar',
    isPhysical: false,
    frameClass: 'ring-4 ring-indigo-400 shadow-lg shadow-indigo-400/40',
    imageBgColor: 'bg-purple-100 text-purple-600 border-purple-200'
  },
  {
    id: 'store-reward-ruler-set',
    name: 'Bộ Thước Kẻ Thông Minh',
    description: 'Đổi phần thưởng thực tế: Bộ thước eke và compa học toán nhận tại lớp!',
    price: 800,
    icon: '📐',
    type: 'physical_reward',
    categoryLabel: 'Quà Nhận Tại Lớp',
    isPhysical: true,
    imageBgColor: 'bg-teal-100 text-teal-700 border-teal-200'
  },
  {
    id: 'store-avatar-wizard',
    name: 'Avatar Phù Thủy Tri Thức',
    description: 'Bộ trang phục áo choàng phù thủy quyền năng!',
    price: 600,
    icon: '🧙',
    type: 'virtual_avatar',
    categoryLabel: 'Avatar Ảo',
    isPhysical: false,
    avatarEmoji: '🧙',
    imageBgColor: 'bg-violet-100 text-violet-700 border-violet-200'
  },
  {
    id: 'store-reward-notebook',
    name: 'Vở Ô Ly Luyện Chữ Đẹp',
    description: 'Đổi phần thưởng thực tế: Tập vở kẻ ô ly xinh xắn nhận tại lớp!',
    price: 500,
    icon: '📒',
    type: 'physical_reward',
    categoryLabel: 'Quà Nhận Tại Lớp',
    isPhysical: true,
    imageBgColor: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }
];

export const INITIAL_BADGES: BadgeItem[] = [
  {
    id: 'badge-typing-master',
    name: 'CHIẾN THẦN GÕ PHÍM',
    condition: 'Đạt gõ 10 ngón chuẩn xác',
    icon: '⌨️',
    isUnlocked: false,
    colorScheme: 'gold'
  },
  {
    id: 'badge-tech-superstar',
    name: 'SIÊU SAO CÔNG NGHỆ',
    condition: 'Trải nghiệm bài làm 10 điểm',
    icon: '🌟',
    isUnlocked: false,
    colorScheme: 'emerald'
  },
  {
    id: 'badge-creative-king',
    name: 'VUA SÁNG TẠO',
    condition: 'Tạo 10 bài tập độc đáo',
    icon: '👑',
    isUnlocked: false,
    colorScheme: 'purple'
  },
  {
    id: 'badge-hardware-engineer',
    name: 'KỸ SƯ PHẦN CỨNG',
    condition: 'Bắt đầu ráp ráp máy vi tính',
    icon: '💻',
    isUnlocked: false,
    colorScheme: 'blue'
  },
  {
    id: 'badge-arena-champion',
    name: 'ĐẤU SĨ BẤT BẠI',
    condition: 'Chiến thắng 5 trận đấu trường liên tiếp',
    icon: '🛡️',
    isUnlocked: false,
    colorScheme: 'rose'
  },
  {
    id: 'badge-diligent-streak',
    name: 'CHĂM CHỈ TOÀN DIỆN',
    condition: 'Hoàn thành bài tập 7 ngày liên tục',
    icon: '📚',
    isUnlocked: false,
    colorScheme: 'emerald'
  },
  {
    id: 'badge-mental-math',
    name: 'BẬC THẦY TÍNH NHẨM',
    condition: 'Đạt điểm tuyệt đối trò chơi Bảng nhân chia',
    icon: '🧮',
    isUnlocked: false,
    colorScheme: 'gold'
  },
  {
    id: 'badge-elearning-explorer',
    name: 'NHÀ THÁM HIỂM 5E',
    condition: 'Hoàn thành trọn vẹn 5 bài giảng E-Learning',
    icon: '🚀',
    isUnlocked: false,
    colorScheme: 'blue'
  }
];

const GAME_PROFILE_STORAGE_KEY = 'eduplay_student_game_profile';

export const getStudentGameProfile = (studentId?: string, studentName?: string): StudentGameProfile => {
  if (typeof window === 'undefined') {
    return createDefaultProfile(studentId, studentName);
  }

  try {
    const raw = localStorage.getItem(GAME_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...createDefaultProfile(studentId, studentName),
        ...parsed,
        studentName: studentName || parsed.studentName || 'Học sinh'
      };
    }
  } catch (e) {
    console.error('Error reading student game profile:', e);
  }

  const defaultProfile = createDefaultProfile(studentId, studentName);
  saveStudentGameProfile(defaultProfile);
  return defaultProfile;
};

const createDefaultProfile = (studentId?: string, studentName?: string): StudentGameProfile => {
  return {
    studentId: studentId || 'st-01',
    studentName: studentName || 'Học sinh',
    avatar: '🐰',
    equippedAvatar: '🐰',
    equippedFrame: 'none',
    level: 1,
    currentExp: 0,
    nextLevelExp: 500,
    coins: 0,
    interests: '',
    bio: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    ownedItemIds: [],
    unlockedBadgeIds: []
  };
};

export const saveStudentGameProfile = (profile: StudentGameProfile): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GAME_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('eduplay_game_profile_updated', { detail: profile }));
  } catch (e) {
    console.error('Error saving student game profile:', e);
  }
};

export const updateStudentBioAndInterests = (interests: string, bio: string): StudentGameProfile => {
  const current = getStudentGameProfile();
  const updated: StudentGameProfile = {
    ...current,
    interests: interests.trim() || 'Chưa thiết lập sở thích',
    bio: bio.trim() || 'Học sinh chăm ngoan trường Tiểu học Quang Hưng'
  };
  saveStudentGameProfile(updated);
  return updated;
};

export interface PurchaseResult {
  success: boolean;
  message: string;
  profile: StudentGameProfile;
}

export const purchaseStoreItem = (item: StoreItem): PurchaseResult => {
  const current = getStudentGameProfile();

  if (current.ownedItemIds.includes(item.id)) {
    // If it's a virtual item, allow toggling equip state
    if (item.type === 'virtual_avatar' && item.avatarEmoji) {
      const isEquipped = current.equippedAvatar === item.avatarEmoji;
      const updated: StudentGameProfile = {
        ...current,
        equippedAvatar: isEquipped ? current.avatar : item.avatarEmoji
      };
      saveStudentGameProfile(updated);
      return {
        success: true,
        message: isEquipped ? 'Đã gỡ trang bị Avatar!' : `Đã trang bị ${item.name}! ✨`,
        profile: updated
      };
    } else if (item.type === 'virtual_frame') {
      const isEquipped = current.equippedFrame === item.id;
      const updated: StudentGameProfile = {
        ...current,
        equippedFrame: isEquipped ? 'none' : item.id
      };
      saveStudentGameProfile(updated);
      return {
        success: true,
        message: isEquipped ? 'Đã tắt hiệu ứng khung!' : `Đã kích hoạt ${item.name}! 🔥`,
        profile: updated
      };
    }

    return {
      success: true,
      message: 'Vật phẩm này em đã sở hữu rồi!',
      profile: current
    };
  }

  if (current.coins < item.price) {
    return {
      success: false,
      message: 'Em chưa đủ xu để đổi vật phẩm này. Cố gắng học tập để tích thêm xu nhé! 💪',
      profile: current
    };
  }

  const newCoins = current.coins - item.price;
  const newOwned = [...current.ownedItemIds, item.id];
  let newEquippedAvatar = current.equippedAvatar;
  let newEquippedFrame = current.equippedFrame;

  if (item.type === 'virtual_avatar' && item.avatarEmoji) {
    newEquippedAvatar = item.avatarEmoji;
  } else if (item.type === 'virtual_frame') {
    newEquippedFrame = item.id;
  }

  const updated: StudentGameProfile = {
    ...current,
    coins: newCoins,
    ownedItemIds: newOwned,
    equippedAvatar: newEquippedAvatar,
    equippedFrame: newEquippedFrame
  };

  saveStudentGameProfile(updated);

  // Dispatch global toast
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('eduplay_toast', {
        detail: {
          title: item.isPhysical ? '🎁 Đổi quà thành công!' : '✨ Mở khóa vật phẩm!',
          message: item.isPhysical 
            ? `Em đã đổi thành công "${item.name}". Hãy đến gặp Thầy/Cô tại lớp để nhận quà nhé!` 
            : `Đã trang bị "${item.name}" cho Avatar của em!`,
          type: 'success'
        }
      })
    );
  }

  return {
    success: true,
    message: item.isPhysical 
      ? `Đổi quà thành công! Hãy đến gặp Thầy/Cô tại lớp để nhận "${item.name}" nhé.`
      : `Chúc mừng em đã sở hữu "${item.name}"!`,
    profile: updated
  };
};

export interface RewardToastData {
  coinsEarned: number;
  expEarned: number;
  reason: string;
  message: string;
}

export const addGameReward = (expEarned: number, coinsEarned: number, reason: string): StudentGameProfile => {
  const current = getStudentGameProfile();
  let newExp = current.currentExp + expEarned;
  let newLevel = current.level;
  let nextExp = current.nextLevelExp;

  while (newExp >= nextExp) {
    newExp -= nextExp;
    newLevel += 1;
    nextExp = Math.round(nextExp * 1.5);
  }

  const newCoins = current.coins + coinsEarned;

  const updated: StudentGameProfile = {
    ...current,
    currentExp: newExp,
    level: newLevel,
    nextLevelExp: nextExp,
    coins: newCoins
  };

  saveStudentGameProfile(updated);

  if (typeof window !== 'undefined') {
    // Dispatch dedicated reward popup toast inviting to Store
    window.dispatchEvent(
      new CustomEvent('eduplay_reward_toast', {
        detail: {
          coinsEarned,
          expEarned,
          reason,
          message: `🎉 Bạn vừa nhận +${coinsEarned} Xu! Ghé Cửa Hàng xem có gì hay ho không nhé!`
        }
      })
    );
  }

  return updated;
};
