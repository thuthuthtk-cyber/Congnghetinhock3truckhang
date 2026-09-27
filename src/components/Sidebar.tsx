import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  FileCheck2,
  ClipboardList,
  Database,
  Gamepad2,
  Users,
  ChevronRight,
  LogOut,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  SquarePen,
  Coins,
  Menu,
  X,
  CheckCircle2
} from 'lucide-react';
import { ActiveModule, UserRole, StudentRecord } from '../types';
import { auth } from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { ANIMAL_AVATARS, getStudentAvatarByName, getStudentAvatarSource } from './common/AnimalAvatars';
import {
  getTeachersFromLocalStorage,
  resolveTeacherNameByEmail,
  getCurrentTeacherProfile,
  TeacherRecord
} from '../services/teacherStorageService';
import { getCurrentStudentSession } from '../services/studentSessionService';
import { StudentProfileModal } from './modals/StudentProfileModal';

export function resolveUserDisplayName(
  email?: string | null,
  displayName?: string | null,
  role: UserRole = 'teacher'
): string {
  if (role === 'student') {
    if (displayName && displayName.trim()) return displayName;
    return 'Học Sinh Tiểu Học';
  }
  return resolveTeacherNameByEmail(email, displayName, getTeachersFromLocalStorage(), role);
}

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  userRole: UserRole;
  badgeCounts?: {
    lessonsCount?: number;
    examsCount?: number;
    assignmentsCount?: number;
    questionsCount?: number;
  };
  userName?: string;
  userEmail?: string;
  teacherName?: string;
  teacherEmail?: string;
  currentStudent?: StudentRecord | null;
  currentClass?: string;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  userRole,
  badgeCounts = {} as NonNullable<SidebarProps['badgeCounts']>,
  userName: propUserName,
  userEmail: propUserEmail,
  teacherName: propTeacherName,
  teacherEmail: propTeacherEmail,
  currentStudent,
  currentClass,
  onLogout
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth?.currentUser || null);
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>(() => getTeachersFromLocalStorage());
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isStudentProfileModalOpen, setIsStudentProfileModalOpen] = useState(false);
  const [profileToast, setProfileToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [effectiveStudent, setEffectiveStudent] = useState<StudentRecord | null>(() => {
    return currentStudent || getCurrentStudentSession();
  });

  useEffect(() => {
    if (currentStudent) {
      setEffectiveStudent(currentStudent);
    }
  }, [currentStudent]);

  // Synchronize student data across real-time storage events
  useEffect(() => {
    const handleStudentSessionUpdate = (e: any) => {
      if (e.detail?.student) {
        setEffectiveStudent(e.detail.student);
      } else {
        const session = getCurrentStudentSession();
        if (session) setEffectiveStudent(session);
      }
    };

    const handleStudentsDbUpdate = () => {
      const session = getCurrentStudentSession();
      if (session) setEffectiveStudent(session);
    };

    window.addEventListener('eduplay_student_session_updated', handleStudentSessionUpdate);
    window.addEventListener('student-data-updated', handleStudentsDbUpdate);
    window.addEventListener('eduplay_students_updated', handleStudentsDbUpdate);
    return () => {
      window.removeEventListener('eduplay_student_session_updated', handleStudentSessionUpdate);
      window.removeEventListener('student-data-updated', handleStudentsDbUpdate);
      window.removeEventListener('eduplay_students_updated', handleStudentsDbUpdate);
    };
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Listen for live updates from User Management Module
  useEffect(() => {
    const handleTeachersUpdate = (e: any) => {
      if (e.detail?.teachers && Array.isArray(e.detail.teachers)) {
        setTeachersList(e.detail.teachers);
      } else {
        setTeachersList(getTeachersFromLocalStorage());
      }
    };

    window.addEventListener('eduplay_teachers_updated', handleTeachersUpdate);
    return () => {
      window.removeEventListener('eduplay_teachers_updated', handleTeachersUpdate);
    };
  }, []);

  // Global trigger for mobile menu
  useEffect(() => {
    const handleOpenMobileMenu = () => setIsMobileDrawerOpen(true);
    window.addEventListener('eduplay_open_mobile_menu', handleOpenMobileMenu);
    return () => {
      window.removeEventListener('eduplay_open_mobile_menu', handleOpenMobileMenu);
    };
  }, []);

  // Điều hướng màn hình mặc định sang 'assignment' ("Bài Tập Của Tôi" / "Nhiệm Vụ Học Tập") ngay khi học sinh đăng nhập vào hệ thống
  const autoSwitchedStudentRef = useRef<string | null>(null);

  const handleSelectModuleItem = (moduleId: ActiveModule) => {
    if (userRole === 'student' && typeof window !== 'undefined') {
      try {
        if (moduleId === 'dashboard') {
          sessionStorage.setItem('eduplay_student_explicit_dashboard', 'true');
        } else {
          sessionStorage.removeItem('eduplay_student_explicit_dashboard');
        }
      } catch {}
    }
    onSelectModule(moduleId);
  };

  useEffect(() => {
    if (userRole === 'student' && typeof window !== 'undefined') {
      const studentSessionKey = currentStudent
        ? `${currentStudent.id || currentStudent.code || currentStudent.name || 'student'}`
        : 'guest-student';

      let hasExplicitDashboard = false;
      try {
        hasExplicitDashboard = sessionStorage.getItem('eduplay_student_explicit_dashboard') === 'true';
      } catch {}

      if (!hasExplicitDashboard && autoSwitchedStudentRef.current !== studentSessionKey) {
        autoSwitchedStudentRef.current = studentSessionKey;
        if (activeModule !== 'assignment') {
          onSelectModule('assignment');
        }
      }
    }
  }, [userRole, currentStudent, activeModule, onSelectModule]);

  // Reset flag when logging out so subsequent logins also default to 'assignment'
  useEffect(() => {
    const handleLogoutReset = () => {
      autoSwitchedStudentRef.current = null;
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('eduplay_student_explicit_dashboard');
        } catch {}
      }
    };
    window.addEventListener('eduplay_logout', handleLogoutReset);
    return () => {
      window.removeEventListener('eduplay_logout', handleLogoutReset);
    };
  }, []);

  const studentMenuItems = [
    {
      id: 'assignment' as ActiveModule,
      label: 'Nhiệm Vụ Học Tập',
      shortLabel: 'Bài tập',
      icon: ClipboardList,
      description: 'Bài tập được giao & nộp bài',
      badge: (badgeCounts?.assignmentsCount && badgeCounts.assignmentsCount > 0) ? badgeCounts.assignmentsCount : undefined,
      colorBg: 'bg-orange-100 text-orange-700 border-orange-200',
      activeColor: 'from-orange-50 to-amber-50 text-orange-950 border-orange-400',
      roles: ['student']
    },
    {
      id: 'exam_management' as ActiveModule,
      label: 'Phòng Kiểm Tra & Ôn Luyện',
      shortLabel: 'Kiểm tra',
      icon: FileCheck2,
      description: 'Làm đề, luyện tập theo mức độ',
      badge: (badgeCounts?.examsCount && badgeCounts.examsCount > 0) ? badgeCounts.examsCount : undefined,
      colorBg: 'bg-blue-100 text-blue-700 border-blue-200',
      activeColor: 'from-blue-50 to-indigo-50 text-blue-950 border-blue-400',
      roles: ['student']
    }
  ];

  const teacherMenuItems = [
    {
      id: 'question_bank' as ActiveModule,
      label: 'Ngân Hàng Câu Hỏi',
      shortLabel: 'Ngân hàng CH',
      icon: Database,
      description: 'Phân loại 4 mức độ & Excel',
      badge: badgeCounts?.questionsCount || 7,
      roles: ['admin', 'teacher']
    },
    {
      id: 'exam_management' as ActiveModule,
      label: 'Quản Lý Đề Kiểm Tra',
      shortLabel: 'Đề kiểm tra',
      icon: FileCheck2,
      description: 'Ma trận, Trộn đề & Xuất Word/PDF',
      badge: badgeCounts?.examsCount || 2,
      roles: ['admin', 'teacher']
    },
    {
      id: 'assignment' as ActiveModule,
      label: 'Quản Lý Bài Tập',
      shortLabel: 'Bài tập',
      icon: ClipboardList,
      description: 'Giao bài & Chấm tự động AI',
      badge: badgeCounts?.assignmentsCount || 2,
      roles: ['admin', 'teacher']
    },
    {
      id: 'user_management' as ActiveModule,
      label: 'Quản Lý Người Dùng',
      shortLabel: 'Người dùng',
      icon: Users,
      description: 'Giáo viên, Học sinh & Lớp học',
      roles: ['admin', 'teacher']
    }
  ];

  const menuItems = userRole === 'student' ? studentMenuItems : teacherMenuItems;
  const visibleItems = menuItems.filter(item => item.roles.includes(userRole));

  // Determine separate teacher session vs student session to prevent cross-overriding
  const storedTeacherEmail = typeof window !== 'undefined' ? localStorage.getItem('eduplay_teacher_email') : null;
  const storedTeacherName = typeof window !== 'undefined' ? localStorage.getItem('eduplay_teacher_name') : null;

  const effectiveTeacherEmail =
    propTeacherEmail ||
    firebaseUser?.email ||
    storedTeacherEmail ||
    (userRole === 'admin' ? 'vanquan18189@gmail.com' : 'vanquan18189@gmail.com');

  const teacherProfile = getCurrentTeacherProfile(effectiveTeacherEmail);
  const effectiveTeacherRole = teacherProfile.userRole;

  const effectiveTeacherName = resolveTeacherNameByEmail(
    effectiveTeacherEmail,
    firebaseUser?.displayName || null,
    teachersList,
    userRole === 'admin' || effectiveTeacherRole === 'admin' ? 'admin' : 'teacher'
  );

  const [teacherAvatarImgError, setTeacherAvatarImgError] = useState(false);

  const matchedTeacher = teachersList.find(
    (t) =>
      (t.email && effectiveTeacherEmail && t.email.toLowerCase().trim() === effectiveTeacherEmail.toLowerCase().trim()) ||
      (t.id && teacherProfile?.id && t.id === teacherProfile.id) ||
      (t.name && effectiveTeacherName && t.name.toLowerCase().trim() === effectiveTeacherName.toLowerCase().trim())
  );

  const rawTeacherAvatar =
    matchedTeacher?.avatar ||
    teacherProfile?.avatar ||
    firebaseUser?.photoURL ||
    '';

  useEffect(() => {
    setTeacherAvatarImgError(false);
  }, [rawTeacherAvatar]);

  const isTeacherUrlAvatar = Boolean(
    rawTeacherAvatar &&
    !teacherAvatarImgError &&
    (rawTeacherAvatar.startsWith('http://') ||
      rawTeacherAvatar.startsWith('https://') ||
      rawTeacherAvatar.startsWith('data:image/') ||
      rawTeacherAvatar.startsWith('blob:') ||
      rawTeacherAvatar.startsWith('/'))
  );

  const isTeacherEmojiAvatar = Boolean(
    rawTeacherAvatar &&
    !isTeacherUrlAvatar &&
    /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}]/u.test(rawTeacherAvatar)
  );

  const teacherInitialLetter = (
    effectiveTeacherName.trim().charAt(0) ||
    effectiveTeacherEmail.trim().charAt(0) ||
    'U'
  ).toUpperCase();

  // Student specific data
  const activeStudent = effectiveStudent || currentStudent;
  const studentName = activeStudent?.name || activeStudent?.fullName || propUserName || 'Hoàng Bảo An';
  const rawStudentClass = activeStudent?.className || currentClass || 'Lớp 3A';
  const cleanStudentClass = rawStudentClass.startsWith('Lớp') ? rawStudentClass : `Lớp ${rawStudentClass}`;
  const studentCoins = activeStudent?.coins ?? 1000;

  // Render avatar supporting animal SVG, custom image, or fallback
  const renderStudentAvatarElement = (sizeClass = 'w-8 h-8 sm:w-9 sm:h-9') => {
    const avatarSource = getStudentAvatarSource(activeStudent, studentName);
    return (
      <img
        src={avatarSource}
        alt={studentName}
        className="w-full h-full rounded-full object-cover shadow-2xs bg-white"
      />
    );
  };

  // Distinct styling for Student Sidebar vs Teacher Sidebar
  if (userRole === 'student') {
    return (
      <>
        {/* ========================================================================= */}
        {/* DESKTOP / TABLET SIDEBAR (>= 768px): Fixed width, classic left column     */}
        {/* ========================================================================= */}
        <aside className="hidden md:flex w-72 shrink-0 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 p-[2px] rounded-[24px] shadow-xl shadow-purple-500/10 hover:shadow-2xl hover:shadow-purple-500/15 transition-all duration-300 self-start sticky top-[76px] sm:top-[80px] max-h-[calc(100vh-90px)] sm:max-h-[calc(100vh-96px)] flex-col z-30">
          <div className="bg-white/95 backdrop-blur-md rounded-[22px] px-3.5 pt-2.5 pb-3.5 sm:px-4 sm:pt-3 sm:pb-4 flex flex-col justify-between h-full max-h-[calc(100vh-94px)] sm:max-h-[calc(100vh-100px)] overflow-y-auto">
            <div className="space-y-2.5">
              
              {/* Menu Section Title */}
              <div className="px-1 pt-0 pb-0.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 leading-tight">
                  <span>🎉 GÓC HỌC TẬP CỦA EM</span>
                  <span className="text-amber-500 text-xs">✨</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-tight">
                  Chọn chức năng để cùng học và rèn luyện
                </p>
              </div>

              {/* Navigation Items with 3D depth & press effect */}
              <nav className="space-y-2" id="sidebar-navigation">
                {visibleItems.map((item: any) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  const colorBg = item.colorBg || 'bg-indigo-100 text-indigo-700 border-indigo-200';
                  const activeColor = item.activeColor || 'from-indigo-50 to-purple-50 text-indigo-950 border-indigo-400';

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectModuleItem(item.id)}
                      id={`sidebar-item-${item.id}`}
                      className={`w-full text-left p-2.5 rounded-2xl transition-all duration-150 flex items-center justify-between group cursor-pointer select-none ${
                        isActive
                          ? `bg-gradient-to-r ${activeColor} border-2 border-indigo-400 shadow-[0_3px_0_0_#818cf8,0_6px_14px_rgba(99,102,241,0.18)] -translate-y-0.5 font-black active:translate-y-[2px] active:shadow-none`
                          : 'bg-white border border-slate-200/90 shadow-[0_2px_0_0_#e2e8f0] text-slate-700 hover:bg-slate-50/80 hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-none font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-xl border shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                            isActive
                              ? 'bg-white text-indigo-700 border-indigo-300 shadow-xs ring-2 ring-indigo-200/60'
                              : colorBg
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs leading-tight truncate ${isActive ? 'text-indigo-950 font-black' : 'text-slate-800'}`}>
                            {item.label}
                          </div>
                          <div
                            className={`text-[10px] mt-0.5 truncate ${
                              isActive ? 'text-indigo-700 font-bold' : 'text-slate-500 font-medium'
                            }`}
                          >
                            {item.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {item.badge !== undefined && (
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : 'bg-amber-100 text-amber-900 border border-amber-300/60'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isActive ? 'text-indigo-600 translate-x-0.5' : 'text-slate-400 group-hover:translate-x-0.5'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Footer User Profile & Logout for Student */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 shrink-0">
              <div 
                className="bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/40 p-2.5 rounded-2xl border border-indigo-100/90 shadow-2xs flex items-center gap-2.5 group hover:border-indigo-300 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setIsStudentProfileModalOpen(true)}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border-2 border-indigo-400/60 hover:border-indigo-600 flex items-center justify-center p-1 shrink-0 shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                  title="Bấm để xem và chỉnh sửa thông tin cá nhân"
                  aria-label="Ảnh đại diện học sinh"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
                    {renderStudentAvatarElement()}
                  </div>
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="text-xs sm:text-sm font-black text-slate-900 truncate hover:text-indigo-600 transition-colors cursor-pointer" 
                      title={studentName}
                      onClick={() => setIsStudentProfileModalOpen(true)}
                    >
                      {studentName}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsStudentProfileModalOpen(true);
                      }}
                      title="Thông tin cá nhân & Đổi mật khẩu"
                      aria-label="Chỉnh sửa thông tin cá nhân"
                      id="student-edit-profile-btn"
                      className="p-1 rounded-lg hover:bg-indigo-100/70 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                    >
                      <SquarePen className="w-3.5 h-3.5 hover:scale-110 transition-transform" />
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5 truncate">
                    <span className="text-indigo-700 bg-white/80 px-1.5 py-0.2 rounded font-bold border border-indigo-100">{cleanStudentClass}</span>
                    <span className="text-slate-400">•</span>
                    <span className="inline-flex items-center gap-1 font-black text-amber-600">
                      <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{studentCoins.toLocaleString('vi-VN')} xu</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  } else {
                    alert('Đã đăng xuất hệ thống an toàn!');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-all text-xs font-bold cursor-pointer border border-slate-200/90 hover:border-rose-200 shadow-[0_2px_0_0_#e2e8f0] hover:shadow-[0_3px_8px_rgba(0,0,0,0.05)] active:translate-y-[2px] active:shadow-none"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* MOBILE TOP CONTROLS (< 768px): Profile Pill + Horizontal Module Switcher  */}
        {/* ========================================================================= */}
        <div className="md:hidden w-full flex flex-col gap-2 shrink-0">
          {/* Top Compact Student Strip */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-xs flex items-center justify-between gap-2">
            <button
              onClick={() => setIsStudentProfileModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer hover:opacity-85 transition-opacity"
              title="Xem thông tin cá nhân & đổi mật khẩu"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 border border-indigo-300 flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
                <div className="w-7 h-7 flex items-center justify-center">
                  {renderStudentAvatarElement('w-7 h-7')}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1">
                  <span>{studentName}</span>
                  <SquarePen className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.2">
                  <span className="text-indigo-700 font-bold">{cleanStudentClass}</span>
                  <span>•</span>
                  <span className="font-bold text-amber-600 inline-flex items-center gap-0.5">
                    <Coins className="w-3 h-3 text-amber-500" /> {studentCoins.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              id="mobile-student-drawer-btn"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/90 text-indigo-800 text-[11px] font-black flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer active:scale-95 transition-transform"
            >
              <Menu className="w-4 h-4 text-indigo-700" />
              <span>Menu</span>
            </button>
          </div>

          {/* Horizontal Swipeable Module Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            {visibleItems.map((item: any) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectModuleItem(item.id)}
                  id={`mobile-tab-${item.id}`}
                  className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400'
                      : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50 shadow-2xs'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                  <span className="whitespace-nowrap">{item.shortLabel || item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white text-indigo-900' : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE BOTTOM NAVIGATION BAR (< 768px): Thumb-friendly fast access       */}
        {/* ========================================================================= */}
        <nav
          id="mobile-bottom-navbar"
          aria-label="Thanh điều hướng học sinh trên điện thoại"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] md:hidden px-1.5 py-1 flex items-center justify-around"
        >
          {visibleItems.map((item: any) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  handleSelectModuleItem(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                id={`mobile-bottom-${item.id}`}
                className={`relative flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all cursor-pointer min-w-[50px] flex-1 ${
                  isActive
                    ? 'text-indigo-600 font-black'
                    : 'text-slate-500 hover:text-slate-800 font-semibold'
                }`}
              >
                {/* Active Indicator Glow Pill */}
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" />
                )}

                <div className={`relative p-1 rounded-lg transition-transform ${isActive ? 'scale-110 bg-indigo-50' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 stroke-[2.5]' : 'text-slate-500'}`} />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1.5 text-[8px] font-black bg-rose-500 text-white rounded-full px-1 min-w-[14px] text-center shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span className="text-[10px] leading-tight truncate mt-0.5 max-w-[62px]">
                  {item.shortLabel || item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ========================================================================= */}
        {/* MOBILE SLIDE-OUT DRAWER / MENU SHEET (< 768px)                            */}
        {/* ========================================================================= */}
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop Overlay */}
            <div
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
            />

            {/* Slide-out Menu Drawer */}
            <div className="relative w-[85vw] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between p-4 z-10 overflow-y-auto animate-in slide-in-from-left duration-200">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎉</span>
                    <span className="font-black text-sm text-indigo-900 font-heading">GÓC HỌC TẬP</span>
                  </div>
                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Full Student Profile Card */}
                <div 
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsStudentProfileModalOpen(true);
                  }}
                  className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-3.5 rounded-2xl border border-indigo-100 shadow-xs flex items-center gap-3 cursor-pointer hover:border-indigo-300 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-indigo-400 flex items-center justify-center p-1 shrink-0 shadow-xs">
                    <div className="w-9 h-9 flex items-center justify-center">
                      {renderStudentAvatarElement('w-9 h-9')}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-slate-900 truncate flex items-center justify-between">
                      <span>{studentName}</span>
                      <span className="p-1 rounded-lg bg-white/80 text-indigo-600 border border-indigo-100 shadow-2xs">
                        <SquarePen className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                      <span className="text-indigo-700 bg-white px-1.5 py-0.2 rounded font-bold border border-indigo-100">
                        {cleanStudentClass}
                      </span>
                      <span>•</span>
                      <span className="font-black text-amber-600 flex items-center gap-0.5">
                        <Coins className="w-3.5 h-3.5 text-amber-500" /> {studentCoins.toLocaleString('vi-VN')} xu
                      </span>
                    </div>
                  </div>
                </div>

                {/* Full Vertical Navigation List */}
                <nav className="space-y-2">
                  {visibleItems.map((item: any) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    const colorBg = item.colorBg || 'bg-indigo-100 text-indigo-700 border-indigo-200';

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleSelectModuleItem(item.id);
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md font-bold'
                            : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl border shrink-0 ${isActive ? 'bg-white/20 text-white border-white/30' : colorBg}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className={`text-xs font-black truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                              {item.label}
                            </div>
                            <div className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {item.description}
                            </div>
                          </div>
                        </div>

                        <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Footer Logout */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    if (onLogout) {
                      onLogout();
                    } else {
                      alert('Đã đăng xuất hệ thống an toàn!');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold border border-rose-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student Profile & Password Modal */}
        <StudentProfileModal
          isOpen={isStudentProfileModalOpen}
          onClose={() => setIsStudentProfileModalOpen(false)}
          student={activeStudent}
          onUpdateSuccess={(updated) => {
            setEffectiveStudent(updated);
            setProfileToast({
              message: '🎉 Cập nhật hồ sơ cá nhân thành công!',
              type: 'success'
            });
            setTimeout(() => {
              setProfileToast(null);
            }, 3000);
          }}
        />

        {/* Global Toast Notification for Profile Updates */}
        {profileToast && (
          <div 
            id="sidebar-profile-toast"
            className="fixed top-5 right-5 z-[9999] px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3 fade-in duration-200 border border-emerald-400/40"
          >
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            <span>{profileToast.message}</span>
          </div>
        )}
      </>
    );
  }

  // Teacher / Admin Sidebar
  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP TEACHER SIDEBAR (>= 768px): Fixed width dark column               */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex w-72 shrink-0 bg-[#1E293B] text-white border border-[#334155] rounded-2xl p-4 flex-col justify-between shadow-lg self-stretch">
        <div className="space-y-6">
          
          {/* Menu Section Title */}
          <div className="px-3 pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
              PHÂN HỆ CHỨC NĂNG ({visibleItems.length} PHÂN HỆ)
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Chọn phân hệ làm việc nhanh
            </p>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5" id="sidebar-navigation">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectModule(item.id)}
                  id={`sidebar-item-${item.id}`}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? 'bg-[#4338CA] text-white shadow-md font-semibold'
                      : 'text-slate-300 hover:bg-[#334155] hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isActive ? 'bg-white/20 text-white shadow-xs' : 'bg-[#334155] text-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs leading-tight">
                        {item.label}
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          isActive ? 'text-indigo-200 font-medium' : 'text-slate-400'
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-[#334155] text-indigo-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isActive ? 'text-white translate-x-0.5' : 'text-slate-500 group-hover:translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer User Profile & Logout - Strictly Role-based */}
        <div className="mt-8 pt-4 border-t border-[#334155] space-y-3">
          {/* Teacher / Admin Profile Card with Avatar */}
          <div className="bg-[#0F172A] p-3 rounded-2xl border border-[#334155] shadow-inner flex items-center gap-2.5">
            {/* Circular Avatar (36-40px) */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 border border-indigo-400/30 flex items-center justify-center text-white shadow-xs overflow-hidden">
                {isTeacherUrlAvatar ? (
                  <img
                    src={rawTeacherAvatar}
                    alt={effectiveTeacherName}
                    className="w-full h-full object-cover"
                    onError={() => setTeacherAvatarImgError(true)}
                  />
                ) : isTeacherEmojiAvatar ? (
                  <span className="text-xl select-none leading-none">
                    {rawTeacherAvatar}
                  </span>
                ) : (
                  <span className="text-sm font-black uppercase select-none text-white tracking-wide">
                    {teacherInitialLetter}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0F172A] animate-pulse"></span>
            </div>

            {/* Profile Info Details with overflow protection */}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <span
                  className="text-xs font-bold text-white truncate min-w-0"
                  title={effectiveTeacherName}
                >
                  {effectiveTeacherName}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0 ${
                    userRole === 'admin' || effectiveTeacherRole === 'admin'
                      ? 'bg-[#4338CA] text-white border border-indigo-400/30'
                      : 'bg-[#334155] text-slate-200 border border-slate-600'
                  }`}
                >
                  {userRole === 'admin' || effectiveTeacherRole === 'admin' ? 'ADMIN' : 'TEACHER'}
                </span>
              </div>

              {/* Email with truncation and tooltip */}
              <p
                className="text-[11px] text-slate-400 truncate font-mono mt-0.5"
                title={effectiveTeacherEmail}
              >
                {effectiveTeacherEmail}
              </p>
            </div>
          </div>

          {/* Global Logout Button */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('eduplay_logout'));
              if (onLogout) {
                onLogout();
              }
            }}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#0F172A] hover:bg-[#334155] text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer border border-[#334155] active:scale-98"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Đăng xuất hệ thống</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE TEACHER CONTROLS (< 768px): Top Strip + Scroller + Drawer          */}
      {/* ========================================================================= */}
      <div className="md:hidden w-full flex flex-col gap-2 shrink-0">
        <div className="bg-[#1E293B] text-white rounded-2xl p-2.5 border border-[#334155] shadow-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 border border-indigo-400/30 flex items-center justify-center text-white shadow-xs overflow-hidden shrink-0">
              {isTeacherUrlAvatar ? (
                <img
                  src={rawTeacherAvatar}
                  alt={effectiveTeacherName}
                  className="w-full h-full object-cover"
                  onError={() => setTeacherAvatarImgError(true)}
                />
              ) : isTeacherEmojiAvatar ? (
                <span className="text-base select-none leading-none">
                  {rawTeacherAvatar}
                </span>
              ) : (
                <span className="text-xs font-black uppercase select-none text-white">
                  {teacherInitialLetter}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-white truncate min-w-0" title={effectiveTeacherName}>
                  {effectiveTeacherName}
                </span>
                <span className="text-[9px] font-bold bg-[#4338CA] text-white px-1.5 py-0.2 rounded uppercase shrink-0">
                  {userRole === 'admin' || effectiveTeacherRole === 'admin' ? 'ADMIN' : 'TEACHER'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate font-mono" title={effectiveTeacherEmail}>
                {effectiveTeacherEmail}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-[#334155] hover:bg-[#475569] text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Menu (8)</span>
          </button>
        </div>

        {/* Horizontal Scroller for Teacher Modules */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {visibleItems.map((item: any) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#4338CA] text-white shadow-md border border-indigo-400'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                <span className="whitespace-nowrap">{item.shortLabel || item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Teacher Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />
          <div className="relative w-[85vw] max-w-[320px] bg-[#1E293B] text-white h-full shadow-2xl flex flex-col justify-between p-4 z-10 overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
                <span className="font-bold text-sm text-indigo-300">PHÂN HỆ CHỨC NĂNG ({visibleItems.length})</span>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-xl bg-[#334155] hover:bg-[#475569] text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {visibleItems.map((item: any) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectModule(item.id);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-[#4338CA] text-white shadow-md font-bold'
                          : 'text-slate-300 hover:bg-[#334155] hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-xs truncate">{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#334155] space-y-3">
              {/* Profile in mobile drawer */}
              <div className="bg-[#0F172A] p-2.5 rounded-xl border border-[#334155] flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 border border-indigo-400/30 flex items-center justify-center text-white shadow-xs overflow-hidden shrink-0">
                  {isTeacherUrlAvatar ? (
                    <img
                      src={rawTeacherAvatar}
                      alt={effectiveTeacherName}
                      className="w-full h-full object-cover"
                      onError={() => setTeacherAvatarImgError(true)}
                    />
                  ) : isTeacherEmojiAvatar ? (
                    <span className="text-lg select-none leading-none">
                      {rawTeacherAvatar}
                    </span>
                  ) : (
                    <span className="text-xs font-black uppercase select-none text-white">
                      {teacherInitialLetter}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <span className="text-xs font-bold text-white truncate min-w-0" title={effectiveTeacherName}>
                      {effectiveTeacherName}
                    </span>
                    <span className="text-[9px] font-bold bg-[#4338CA] text-white px-1.5 py-0.2 rounded uppercase shrink-0">
                      {userRole === 'admin' || effectiveTeacherRole === 'admin' ? 'ADMIN' : 'TEACHER'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate font-mono mt-0.5" title={effectiveTeacherEmail}>
                    {effectiveTeacherEmail}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  window.dispatchEvent(new CustomEvent('eduplay_logout'));
                  if (onLogout) onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#0F172A] hover:bg-[#334155] text-slate-300 text-xs font-medium border border-[#334155] cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Đăng xuất hệ thống</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

