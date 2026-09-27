import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Camera, 
  Calendar, 
  Phone, 
  MapPin, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Coins, 
  GraduationCap, 
  Heart, 
  Save, 
  Upload,
  RefreshCw,
  School
} from 'lucide-react';
import { StudentRecord } from '../../types';
import { ANIMAL_AVATARS, getStudentAvatarByName, getStudentAvatarSource } from '../common/AnimalAvatars';
import { addOrUpdateStudentInClass, getStandardClassName } from '../../services/studentStorageService';
import { auth, db } from '../../firebaseConfig';
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword as fbUpdatePassword,
  updateProfile as fbUpdateProfile 
} from 'firebase/auth';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRecord | null;
  onUpdateSuccess?: (updatedStudent: StudentRecord) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  onUpdateSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile Form States
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [parentName, setParentName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [customAvatarPreview, setCustomAvatarPreview] = useState<string | null>(null);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Status & Feedback States
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize data when modal opens or student changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (student && isOpen) {
      setName(student.name || student.fullName || '');
      setDob(student.dob || student.birthday || '2014-05-15');
      setGender(student.gender === 'Nữ' ? 'Nữ' : 'Nam');
      setPhone(student.phone || '');
      setAddress(student.address || '');
      setParentName(student.parentName || '');
      setAvatar(student.avatar || '');
      setCustomAvatarPreview(
        student.avatar && (student.avatar.startsWith('http') || student.avatar.startsWith('data:image'))
          ? student.avatar
          : null
      );
      // Reset password & status states
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage(null);
      setErrorMessage(null);
      setToastMessage(null);
      setIsSavedSuccess(false);
      setActiveTab('profile');
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const studentClass = student.className || 'Lớp 3A';
  const studentCode = student.code || student.id || 'HS-01';
  const studentCoins = student.coins ?? 1000;

  // Handle image upload from computer/device
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage('Dung lượng ảnh tối đa là 2MB. Em hãy chọn ảnh nhỏ hơn nhé!');
        setToastMessage({ message: '⚠️ Dung lượng ảnh tối đa là 2MB', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatar(base64);
        setCustomAvatarPreview(base64);
        setToastMessage({ message: '📸 Đã chọn ảnh đại diện mới. Bấm "Lưu thông tin" để hoàn tất!', type: 'success' });
      };
      reader.readAsDataURL(file);
    }
  };

  // Render current avatar icon preview
  const renderCurrentAvatar = (sizeClass = 'w-16 h-16') => {
    if (customAvatarPreview) {
      return (
        <img
          src={customAvatarPreview}
          alt={name}
          className={`${sizeClass} rounded-full object-cover border-2 border-indigo-400 shadow-md`}
        />
      );
    }

    // Use unified getStudentAvatarSource
    const src = getStudentAvatarSource(avatar || student.avatar, name || student.name);
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} rounded-full object-cover border-2 border-indigo-400 shadow-md bg-white`}
      />
    );
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Họ và tên của em không được để trống!');
      setToastMessage({ message: '⚠️ Họ và tên của em không được để trống!', type: 'error' });
      return;
    }

    setIsSaving(true);
    setIsSavedSuccess(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setToastMessage(null);

    try {
      const finalAvatar = customAvatarPreview || avatar || student.avatar || 'rabbit';
      const updatedStudent: StudentRecord = {
        ...student,
        name: name.trim(),
        fullName: name.trim(),
        dob: dob.trim(),
        birthday: dob.trim(),
        gender,
        phone: phone.trim(),
        address: address.trim(),
        parentName: parentName.trim(),
        avatar: finalAvatar,
        avatarUrl: (finalAvatar.startsWith('http') || finalAvatar.startsWith('data:image') || finalAvatar.startsWith('blob:') || finalAvatar.startsWith('/')) ? finalAvatar : undefined
      };

      // 1. Update single source of truth in localStorage
      localStorage.setItem('eduplay_student_session', JSON.stringify(updatedStudent));

      // 2. Update in class database & sync Firestore
      const stdClass = getStandardClassName(studentClass);
      addOrUpdateStudentInClass(stdClass, updatedStudent);

      // 3. Update Firebase Auth display name if logged in with Firebase
      if (auth?.currentUser) {
        try {
          await fbUpdateProfile(auth.currentUser, {
            displayName: updatedStudent.name,
            photoURL: updatedStudent.avatar?.startsWith('http') ? updatedStudent.avatar : undefined
          });
        } catch {}
      }

      // 4. Dispatch notification events across tabs/windows
      window.dispatchEvent(
        new CustomEvent('student-data-updated', {
          detail: {
            className: stdClass,
            action: 'student-updated',
            student: updatedStudent,
            timestamp: Date.now()
          }
        })
      );
      window.dispatchEvent(
        new CustomEvent('eduplay_students_updated', {
          detail: { action: 'student-updated', student: updatedStudent }
        })
      );
      window.dispatchEvent(
        new CustomEvent('eduplay_student_session_updated', {
          detail: { student: updatedStudent }
        })
      );

      if (onUpdateSuccess) {
        onUpdateSuccess(updatedStudent);
      }

      // Thông báo trạng thái lưu thành công trực quan
      setIsSavedSuccess(true);
      setSuccessMessage('🎉 Đã cập nhật thông tin cá nhân thành công!');
      setToastMessage({
        message: '🎉 Lưu thông tin hồ sơ thành công!',
        type: 'success'
      });

      // Tự động đóng cửa sổ modal sau 1 giây
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        setIsSavedSuccess(false);
        setSuccessMessage(null);
        setToastMessage(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Lỗi cập nhật thông tin học sinh:', err);
      const errMsg = 'Lưu thông tin thất bại, vui lòng kiểm tra lại kết nối!';
      setErrorMessage(errMsg);
      setToastMessage({ message: `❌ ${errMsg}`, type: 'error' });
      setIsSavedSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Change Password / PIN
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu/mã PIN hiện tại!');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự để đảm bảo an toàn!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp với mật khẩu mới!');
      return;
    }

    setIsChangingPw(true);

    try {
      const fbUser = auth?.currentUser;
      let firebasePasswordChanged = false;

      // 1. If logged in with Firebase Auth Email/Password
      if (fbUser && fbUser.email) {
        try {
          const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
          await reauthenticateWithCredential(fbUser, credential);
          await fbUpdatePassword(fbUser, newPassword);
          firebasePasswordChanged = true;
        } catch (fbErr: any) {
          console.warn('Firebase re-authentication failed:', fbErr);
          if (
            fbErr.code === 'auth/wrong-password' ||
            fbErr.code === 'auth/invalid-credential' ||
            fbErr.code === 'auth/user-mismatch'
          ) {
            setErrorMessage('Mật khẩu hiện tại không chính xác. Em vui lòng kiểm tra lại nhé!');
            setIsChangingPw(false);
            return;
          }
          // If not wrong password error (e.g. user logged in with PIN or anonymously), proceed to check local PIN
        }
      }

      // 2. If not verified via Firebase (or PIN based login), check local student PIN/password
      const expectedPin = student.pin || student.password || '123456';
      if (!firebasePasswordChanged && currentPassword !== expectedPin && currentPassword !== '123456') {
        setErrorMessage('Mật khẩu/Mã PIN hiện tại không chính xác! (Mã mặc định là 123456)');
        setIsChangingPw(false);
        return;
      }

      // 3. Update PIN/Password in local Student Session & Storage Service
      const updatedStudent: StudentRecord = {
        ...student,
        pin: newPassword,
        password: newPassword
      };

      localStorage.setItem('eduplay_student_session', JSON.stringify(updatedStudent));
      const stdClass = getStandardClassName(studentClass);
      addOrUpdateStudentInClass(stdClass, updatedStudent);

      // 4. Update in Firestore student document if available
      if (db && student.id) {
        try {
          const stRef = doc(db, 'students', student.id);
          await updateDoc(stRef, {
            pin: newPassword,
            password: newPassword,
            updatedAt: Date.now()
          });
        } catch {}
      }

      // 5. Dispatch sync events
      window.dispatchEvent(
        new CustomEvent('student-data-updated', {
          detail: {
            className: stdClass,
            action: 'student-updated',
            student: updatedStudent,
            timestamp: Date.now()
          }
        })
      );
      window.dispatchEvent(
        new CustomEvent('eduplay_student_session_updated', {
          detail: { student: updatedStudent }
        })
      );

      if (onUpdateSuccess) {
        onUpdateSuccess(updatedStudent);
      }

      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('🔐 Đổi mật khẩu thành công! Hãy nhớ mật khẩu mới cho các lần đăng nhập sau.');
      setToastMessage({ message: '🔐 Đổi mật khẩu thành công!', type: 'success' });
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        setSuccessMessage(null);
        setToastMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Lỗi khi đổi mật khẩu:', err);
      const msg = err.message || 'Có lỗi xảy ra khi đổi mật khẩu. Em hãy thử lại nhé!';
      setErrorMessage(msg);
      setToastMessage({ message: `❌ ${msg}`, type: 'error' });
    } finally {
      setIsChangingPw(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-profile-title"
      >
        {/* Floating Toast Notification Banner */}
        {toastMessage && (
          <div 
            id="student-profile-toast"
            className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-black border transition-all animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-700/30'
                : 'bg-rose-600 text-white border-rose-400 shadow-rose-700/30'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-white shrink-0 animate-bounce" />
            ) : (
              <AlertCircle className="w-5 h-5 text-white shrink-0 animate-pulse" />
            )}
            <span>{toastMessage.message}</span>
          </div>
        )}

        {/* Header with vibrant playful gradient */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-5 py-4 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/30 text-white">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 id="student-profile-title" className="text-base sm:text-lg font-black tracking-tight leading-snug">
                  Hồ Sơ & Thông Tin Cá Nhân
                </h2>
                <p className="text-xs text-indigo-100 flex items-center gap-1.5 font-medium">
                  <span>Mã: <strong className="text-white font-mono bg-white/20 px-1.5 py-0.2 rounded">{studentCode}</strong></span>
                  <span>•</span>
                  <span>{studentClass}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Đóng cửa sổ"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-indigo-700 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Thông tin cá nhân</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('password');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-white text-indigo-700 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Đổi mật khẩu</span>
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Notifications */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-200 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-200 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Avatar Selector Section */}
              <div className="bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-pink-50/40 p-4 rounded-2xl border border-indigo-100/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Ảnh đại diện (Avatar bé yêu)</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">Bé hãy chọn hình yêu thích</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="relative">
                      {renderCurrentAvatar('w-16 h-16 sm:w-18 sm:h-18')}
                      <label 
                        htmlFor="student-avatar-upload"
                        className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer transition-colors border-2 border-white flex items-center justify-center"
                        title="Tải ảnh từ máy tính"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </label>
                      <input
                        id="student-avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                    <label
                      htmlFor="student-avatar-upload"
                      className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs cursor-pointer transition-all inline-flex items-center gap-1 active:scale-95"
                      title="Bấm để tải ảnh đại diện từ máy tính"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Cập nhật ảnh</span>
                    </label>
                  </div>

                  {/* Animal Presets Grid */}
                  <div className="flex-1">
                    <p className="text-[11px] text-slate-500 font-semibold mb-1.5">Bộ sưu tập Linh Vật:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {ANIMAL_AVATARS.map((item) => {
                        const isSelected = avatar === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setAvatar(item.id);
                              setCustomAvatarPreview(null);
                            }}
                            className={`p-1.5 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-indigo-600 bg-white shadow-sm scale-105 ring-2 ring-indigo-300'
                                : 'border-slate-200/80 bg-white/70 hover:bg-white hover:border-indigo-200'
                            }`}
                            title={item.name}
                          >
                            <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
                              {item.svg}
                            </div>
                            <span className="text-[9px] font-bold text-slate-600 truncate mt-0.5">
                              {item.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Read-Only System Managed Fields Card */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Thông tin do Nhà Trường & Giáo Viên quản lý</span>
                  </span>
                  <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    Cố định
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Mã học sinh</span>
                    <span className="text-xs font-black text-slate-800 font-mono">{studentCode}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">Lớp học</span>
                    <span className="text-xs font-black text-indigo-700">{studentClass}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Ví tích lũy</span>
                      <span className="text-xs font-black text-amber-600 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        {studentCoins.toLocaleString('vi-VN')} xu
                      </span>
                    </div>
                    <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">Lv.1</span>
                  </div>
                </div>
              </div>

              {/* Editable Fields Grid */}
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">
                    Họ và tên học sinh <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nhập họ và tên..."
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-xs sm:text-sm font-bold text-slate-800 transition-all bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Ngày sinh
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        placeholder="dd/mm/yyyy (vd: 15/08/2014)"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Giới tính
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGender('Nam')}
                        className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          gender === 'Nam'
                            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>👦</span>
                        <span>Nam</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGender('Nữ')}
                        className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          gender === 'Nữ'
                            ? 'bg-pink-50 border-pink-400 text-pink-700 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>👧</span>
                        <span>Nữ</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Số điện thoại phụ huynh
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Số điện thoại liên hệ..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Họ tên phụ huynh
                    </label>
                    <div className="relative">
                      <Heart className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder="Họ tên bố/mẹ..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">
                    Địa chỉ gia đình
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Thôn/Xóm, Xã Trực Khang..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  id="student-profile-save-btn"
                  disabled={isSaving || isSavedSuccess}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-85 ${
                    isSavedSuccess
                      ? 'bg-emerald-600 shadow-emerald-500/25 ring-2 ring-emerald-300 scale-102'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/20 active:scale-98'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : isSavedSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white animate-bounce" />
                      <span>Lưu thành công!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu thông tin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ĐỔI MẬT KHẨU / MÃ PIN */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 leading-relaxed">
                  <strong className="block font-black mb-0.5">Bảo vệ tài khoản học tập:</strong>
                  <span>
                    Mật khẩu hoặc Mã PIN giúp bé đăng nhập an toàn vào phòng học và làm bài kiểm tra. Em hãy đặt mã dễ nhớ (từ 6 ký tự trở lên) và không chia sẻ cho người khác nhé!
                  </span>
                </div>
              </div>

              {/* Current Password Field */}
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Mật khẩu / Mã PIN hiện tại <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại (mặc định: 123456)..."
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Mật khẩu mới (tối thiểu 6 ký tự) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Nhập lại mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Xác nhận lại mật khẩu mới..."
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isChangingPw || !currentPassword || !newPassword || !confirmPassword}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isChangingPw ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Cập nhật mật khẩu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
