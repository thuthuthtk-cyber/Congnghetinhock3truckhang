import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Key,
  Wifi,
  WifiOff,
  User,
  CheckCircle2,
  X,
  RefreshCw,
  Zap,
  Sliders,
  LogOut,
  LogIn
} from 'lucide-react';
import { UserRole, LatencyTestResult } from '../types';
import { APP_NAME, APP_SUBTITLE } from '../config/appConfig';
import { getStoredApiKey, setStoredApiKey, testGeminiLatency } from '../services/geminiService';
import { db, auth } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { resolveTeacherNameByEmail, verifyTeacherAuthorization } from '../services/teacherStorageService';
import { getStudentAvatarSource } from './common/AnimalAvatars';

interface HeaderProps {
  currentRole?: UserRole;
  userRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  currentUserName?: string;
  apiKey?: string;
  onSaveApiKey?: (key: string) => void;
  isApiKeyModalOpen?: boolean;
  setIsApiKeyModalOpen?: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  userRole,
  currentUserName,
  apiKey,
  onSaveApiKey,
  isApiKeyModalOpen: externalIsModalOpen,
  setIsApiKeyModalOpen: setExternalIsModalOpen,
}) => {
  const [internalIsKeyModalOpen, setInternalIsKeyModalOpen] = useState(false);
  const isKeyModalOpen = externalIsModalOpen !== undefined ? externalIsModalOpen : internalIsKeyModalOpen;
  const setIsKeyModalOpen = (open: boolean) => {
    setInternalIsKeyModalOpen(open);
    setExternalIsModalOpen?.(open);
  };

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [studentSession, setStudentSession] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('eduplay_student_session');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  const activeRole: UserRole = currentRole || userRole || 'teacher';
  const effectiveStudentName = studentSession?.name || studentSession?.fullName || currentUserName || 'Học Sinh';
  const displayUserName = currentUserName || (
    activeRole === 'student'
      ? effectiveStudentName
      : resolveTeacherNameByEmail(
          currentUser?.email || (typeof window !== 'undefined' ? localStorage.getItem('eduplay_teacher_email') : null),
          currentUser?.displayName || (typeof window !== 'undefined' ? localStorage.getItem('eduplay_teacher_name') : null),
          undefined,
          activeRole
        )
  );

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [globalApiKeyInput, setGlobalApiKeyInput] = useState('');
  const [latencyResult, setLatencyResult] = useState<LatencyTestResult | null>(null);
  const [isTestingLatency, setIsTestingLatency] = useState(false);
  const [isSavingFirestore, setIsSavingFirestore] = useState(false);
  const [firestoreStatus, setFirestoreStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('eduplay_student_session');
        if (saved) setStudentSession(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('eduplay_student_session_updated', handleUpdate);
    window.addEventListener('student-data-updated', handleUpdate);
    return () => {
      window.removeEventListener('eduplay_student_session_updated', handleUpdate);
      window.removeEventListener('student-data-updated', handleUpdate);
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, provider);
      const gUser = res.user;
      const email = (gUser?.email || '').trim().toLowerCase();
      if (!email) {
        await signOut(auth);
        alert('Không thể xác thực địa chỉ email từ tài khoản Google.');
        return;
      }
      const authCheck = await verifyTeacherAuthorization(email);
      if (!authCheck.authorized || !authCheck.profile) {
        await signOut(auth);
        alert('Tài khoản Google này chưa được đăng ký trong hệ thống. Vui lòng liên hệ quản trị viên.');
        return;
      }
      localStorage.setItem('eduplay_teacher_email', email);
      if (authCheck.profile.name) {
        localStorage.setItem('eduplay_teacher_name', authCheck.profile.name);
      }
      window.dispatchEvent(new CustomEvent('eduplay_teacher_session_updated'));
    } catch (e: any) {
      console.error('Login error:', e);
      if (auth && auth.currentUser) {
        try {
          await signOut(auth);
        } catch {}
      }
      if (!e?.message?.includes('popup-closed-by-user')) {
        alert(`Đăng nhập Google thất bại: ${e.message}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('eduplay_teacher_email');
    localStorage.removeItem('eduplay_teacher_name');
    localStorage.removeItem('eduplay_teacher_profile');
    localStorage.removeItem('eduplay_student_session');
    localStorage.removeItem('eduplay_current_class');
    localStorage.removeItem('eduplay_active_class');
    window.dispatchEvent(new CustomEvent('eduplay_logout'));
  };

  useEffect(() => {
    if (isKeyModalOpen) {
      setApiKeyInput(apiKey !== undefined ? apiKey : getStoredApiKey());
      const fetchGlobalKey = async () => {
        try {
          const docRef = doc(db, 'settings', 'ai_config');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as any;
            setGlobalApiKeyInput(data.globalApiKey || data.apiKey || '');
          }
        } catch (e) {
          console.error('Error fetching global API key:', e);
        }
      };
      fetchGlobalKey();
    }
  }, [isKeyModalOpen, apiKey]);

  const handleTestLatency = async () => {
    setIsTestingLatency(true);
    setLatencyResult(null);
    const result = await testGeminiLatency(apiKeyInput || globalApiKeyInput);
    setLatencyResult(result);
    setIsTestingLatency(false);
  };

  const handleSaveGlobalFirestore = async () => {
    setIsSavingFirestore(true);
    setFirestoreStatus(null);
    try {
      await setDoc(doc(db, 'settings', 'ai_config'), {
        globalApiKey: globalApiKeyInput.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: displayUserName,
      }, { merge: true });

      setFirestoreStatus({
        success: true,
        message: 'Lưu Global API Key thành công lên Firestore! Toàn bộ máy trạm, giáo viên và học sinh sẽ tự động sử dụng khóa chung này khi chưa cấu hình Key cá nhân.'
      });
    } catch (e: any) {
      setFirestoreStatus({
        success: false,
        message: `Lỗi lưu Global Firestore: ${e.message || 'Không thể thiết lập kết nối'}`
      });
    } finally {
      setIsSavingFirestore(false);
    }
  };

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput);
    onSaveApiKey?.(apiKeyInput);
    setIsKeyModalOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 transition-all w-full">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#4F46E5] flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
            <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 animate-pulse-subtle" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-xl font-bold text-[#111827] tracking-tight font-heading uppercase truncate">
                {APP_NAME}
              </h1>
              <span className="bg-[#FFFBEB] text-[#D97706] text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border border-[#FDE68A] shrink-0">
                v2.5 AI
              </span>
            </div>
            <p className="text-xs text-gray-500 hidden sm:block truncate">
              {APP_SUBTITLE}
            </p>
          </div>
        </div>

        {/* Right Controls: API Key Config & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* API Key Modal Launcher */}
          <button
            onClick={() => setIsKeyModalOpen(true)}
            id="header-api-key-button"
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-all cursor-pointer"
            title="Cấu hình Google Gemini API Key"
          >
            <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
            <span className="hidden md:inline">Cấu hình API Key</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]"></span>
            </span>
          </button>

          {/* User Profile & Firebase Auth */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            {activeRole === 'student' ? (
              <div className="flex items-center gap-2">
                <img
                  src={getStudentAvatarSource(studentSession, effectiveStudentName)}
                  alt={effectiveStudentName}
                  className="w-8 h-8 rounded-full border border-indigo-200 object-cover bg-white shadow-2xs"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-black text-gray-900 leading-none truncate max-w-[130px]" title={effectiveStudentName}>
                    {effectiveStudentName}
                  </div>
                  <div className="text-[10px] text-indigo-600 font-semibold mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{studentSession?.className || 'Học sinh'}</span>
                  </div>
                </div>
              </div>
            ) : currentUser ? (
              <div className="flex items-center gap-2">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || 'User'} className="w-8 h-8 rounded-full border border-indigo-200 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                    {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-semibold text-gray-900 leading-none truncate max-w-[140px]" title={resolveTeacherNameByEmail(currentUser.email, currentUser.displayName, undefined, activeRole)}>
                    {resolveTeacherNameByEmail(currentUser.email, currentUser.displayName, undefined, activeRole)}
                  </div>
                  <div className="text-[10px] text-[#16A34A] font-medium mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span> Firebase Auth
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-gray-400 hover:text-[#DC2626] hover:bg-gray-100 rounded-lg transition-colors ml-1 cursor-pointer"
                  title="Đăng xuất khỏi Firebase"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-medium shadow-xs transition-all cursor-pointer"
                title="Đăng nhập tài khoản Google (Firebase Auth)"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập Google</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* API Key Modal & Latency Test */}
      {isKeyModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#4F46E5] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-base font-heading">
                <Sliders className="w-5 h-5 text-amber-300" /> Cấu Hình Google Gemini API Key
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed font-normal">
                Hệ thống tự động sử dụng <strong>Environment Gemini Key</strong> của máy chủ AI Studio. Bạn có thể nhập <strong>Personal API Key</strong> của riêng mình dưới đây để ưu tiên xử lý cá nhân.
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Personal Gemini API Key:
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 font-mono text-gray-900"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Khóa cá nhân được lưu bảo mật trong <code>localStorage</code> của trình duyệt (ưu tiên số 1).
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    🌐 Global API Key (Khóa dùng chung toàn trường):
                  </label>
                  <span className="text-xs bg-[#EEF2FF] text-[#4F46E5] px-2 py-0.5 rounded-full font-medium border border-[#C7D2FE]">
                    {activeRole === 'admin' ? 'Quyền Admin (Chỉnh sửa)' : 'Chế độ xem chung'}
                  </span>
                </div>
                <input
                  type="password"
                  value={globalApiKeyInput}
                  onChange={(e) => setGlobalApiKeyInput(e.target.value)}
                  placeholder="AIzaSy... (Lưu trên Firestore cho toàn hệ thống)"
                  disabled={activeRole !== 'admin'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 font-mono disabled:opacity-75 disabled:cursor-not-allowed text-gray-900"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {activeRole === 'admin'
                    ? 'Quản trị viên có quyền cập nhật khóa chung phục vụ thi cử và trình diễn cho toàn trường.'
                    : 'Áp dụng tự động cho mọi máy trạm/tài khoản khi chưa cấu hình Key cá nhân.'}
                </p>
              </div>

              {/* Latency Test Action & Firestore Sync */}
              <div className="bg-[#F9FAFB] rounded-xl p-3 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" /> Kết Nối & Đánh Giá
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleSaveGlobalFirestore}
                      disabled={isSavingFirestore}
                      className="px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                      title="Lưu cấu hình và đồng bộ vĩnh viễn với Firebase Firestore"
                    >
                      {isSavingFirestore ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang đồng bộ...
                        </>
                      ) : (
                        <>
                          🌐 Lưu Global Firestore
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleTestLatency}
                      disabled={isTestingLatency}
                      className="px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingLatency ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang đo...
                        </>
                      ) : (
                        <>
                          <Wifi className="w-3.5 h-3.5" /> Kiểm tra
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Firestore Sync Success/Error Notification */}
                {firestoreStatus && (
                  <div
                    className={`p-3 rounded-lg text-xs border flex items-start gap-2.5 ${
                      firestoreStatus.success
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${firestoreStatus.success ? 'text-[#16A34A]' : 'text-[#DC2626]'}`} />
                    <div className="leading-relaxed font-medium">
                      {firestoreStatus.message}
                    </div>
                  </div>
                )}

                {/* Test Result Display */}
                {latencyResult && (
                  <div
                    className={`p-3 rounded-lg text-xs border flex items-start gap-2.5 ${
                      latencyResult.status === 'online'
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                    }`}
                  >
                    {latencyResult.status === 'online' ? (
                      <Wifi className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <span>{latencyResult.message}</span>
                        {latencyResult.status === 'online' && (
                          <span className="bg-[#DCFCE7] text-[#16A34A] px-2 py-0.5 rounded-full text-xs font-mono font-medium">
                            ⚡ {latencyResult.latencyMs} ms
                          </span>
                        )}
                      </div>
                      <div className="text-xs opacity-80 mt-0.5 text-gray-600">
                        Mô hình: <code className="font-mono font-medium text-gray-800">{latencyResult.modelName}</code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[#4F46E5] hover:bg-[#4338CA] text-white transition-all shadow-xs cursor-pointer"
              >
                Lưu Cấu Hình
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
