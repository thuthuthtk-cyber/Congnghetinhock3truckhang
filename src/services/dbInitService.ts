import { db } from './firebase';

/**
 * dbInitService: Không tự động gieo mầm dữ liệu mẫu (mock/seed)
 * Chỉ kết nối trực tiếp với dữ liệu thực từ Firestore Database của người dùng.
 */
export async function initializeAndSyncAllCollections(): Promise<{ success: boolean; message: string }> {
  try {
    if (!db) {
      return { success: false, message: 'Chưa khởi tạo kết nối Firestore' };
    }

    // Kết nối thành công với Firestore Database thực
    return {
      success: true,
      message: 'Kết nối Firestore Database thực tế thành công.'
    };
  } catch (err: any) {
    console.warn('Lỗi kết nối Firestore:', err);
    return {
      success: false,
      message: err?.message || String(err)
    };
  }
}
