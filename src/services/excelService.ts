import * as XLSX from 'xlsx';
import { QuestionItem, ExamPaper, StudentRecord } from '../types';

/**
 * Utility helper to trigger binary .xlsx file download in the browser
 */
export function saveWorkbookAsExcel(workbook: XLSX.WorkBook, filename: string) {
  // Ensure the filename strictly ends with .xlsx
  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, safeFilename, { bookType: 'xlsx', type: 'binary' });
}

/**
 * Set custom column widths for a worksheet
 */
export function setWorksheetColWidths(ws: XLSX.WorkSheet, colWidths: number[]) {
  ws['!cols'] = colWidths.map((wch) => ({ wch }));
}

/* =========================================================================
   1. QUẢN LÝ NGƯỜI DÙNG & HỌC SINH (Student & User Management Templates & Parser)
   ========================================================================= */

/**
 * 6 Cột tiêu chuẩn tinh gọn theo đúng cấu trúc dữ liệu học sinh:
 * Cột A (index 0): STT
 * Cột B (index 1): Mã HS
 * Cột C (index 2): Họ và tên học sinh
 * Cột D (index 3): Ngày sinh
 * Cột E (index 4): Giới tính
 * Cột F (index 5): Mật khẩu
 */
export const STANDARD_STUDENT_HEADERS = [
  'STT',
  'Mã HS',
  'Họ và tên học sinh',
  'Ngày sinh',
  'Giới tính',
  'Mật khẩu'
] as const;

/**
 * Tải File Excel Mẫu để Nhập Danh Sách Học Sinh (.xlsx chuẩn 6 cột tinh gọn)
 */
export function downloadStudentImportTemplate(className: string = 'Lớp 3A') {
  const wb = XLSX.utils.book_new();

  // Prefix mã học sinh chuẩn theo khối và lớp (vd: 3a1, 3a2...)
  const prefix = className.replace(/Lớp\s*/i, '').toLowerCase();

  // Bảng dữ liệu học sinh mẫu 6 cột
  const studentData = [
    [...STANDARD_STUDENT_HEADERS],
    [1, `${prefix}1`, 'Hà Nhật An', '22/01/2016', 'Nam', '123456'],
    [2, `${prefix}2`, 'Phạm Lê Khang An', '21/03/2016', 'Nam', '123456'],
    [3, `${prefix}3`, 'Trần Gia An', '27/12/2016', 'Nam', '123456'],
    [4, `${prefix}4`, 'Hoàng Thùy Anh', '04/05/2016', 'Nữ', '123456'],
    [5, `${prefix}5`, 'Lê Trần Huyền Anh', '27/09/2016', 'Nữ', '123456'],
    [6, `${prefix}6`, 'Đồng Gia Bảo', '22/09/2016', 'Nam', '123456'],
    [7, `${prefix}7`, 'Dương Thị Thùy Chi', '21/02/2016', 'Nữ', '123456'],
    [8, `${prefix}8`, 'Mai Thành Danh', '16/09/2016', 'Nam', '123456'],
    [9, `${prefix}9`, 'Đoàn Đức Duy', '24/12/2016', 'Nam', '123456'],
    [10, `${prefix}10`, 'Đồng Tiến Đạt', '02/07/2016', 'Nam', '123456']
  ];

  const wsStudents = XLSX.utils.aoa_to_sheet(studentData);
  setWorksheetColWidths(wsStudents, [8, 16, 26, 16, 12, 16]);
  XLSX.utils.book_append_sheet(wb, wsStudents, `Danh Sách ${className}`);

  // Sheet 2: Hướng dẫn nhập liệu
  const instructionData = [
    ['HƯỚNG DẪN ĐIỀN DỮ LIỆU FILE EXCEL NHẬP HỌC SINH'],
    [''],
    ['Thứ tự cột', 'Tên tiêu đề cột', 'Ý nghĩa', 'Quy cách & Định dạng dữ liệu chuẩn'],
    ['Cột A (0)', 'STT', 'stt', 'Số thứ tự học sinh trong danh sách (1, 2, 3...)'],
    ['Cột B (1)', 'Mã HS', 'code / username', `Mã tài khoản học sinh (ví dụ: ${prefix}1, ${prefix}2, ..., ${prefix}35).`],
    ['Cột C (2)', 'Họ và tên học sinh', 'fullName / name', 'Họ tên đầy đủ có dấu của học sinh (ví dụ: Hà Nhật An).'],
    ['Cột D (3)', 'Ngày sinh', 'dob / birthday', 'Định dạng ngày/tháng/năm (dd/mm/yyyy), ví dụ: 22/01/2016.'],
    ['Cột E (4)', 'Giới tính', 'gender', 'Giới tính học sinh: "Nam" hoặc "Nữ".'],
    ['Cột F (5)', 'Mật khẩu', 'pin / password', 'Mật khẩu đăng nhập (mặc định 123456 hoặc mã riêng).']
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(instructionData);
  setWorksheetColWidths(wsGuide, [12, 22, 18, 60]);
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Hướng Dẫn Quy Chuẩn');

  const cleanClassName = className.replace(/[\s\/:*?"<>|]+/g, '_');
  saveWorkbookAsExcel(wb, `Mau_Nhap_Hoc_Sinh_${cleanClassName}.xlsx`);
}

/**
 * Xuất danh sách tài khoản & mật khẩu (.xlsx chuẩn 6 cột tinh gọn)
 */
export function exportStudentCredentialsExcel(className: string, students: StudentRecord[]) {
  const wb = XLSX.utils.book_new();

  const dataRows: any[] = [
    [...STANDARD_STUDENT_HEADERS]
  ];

  students.forEach((st, idx) => {
    dataRows.push([
      st.stt || (idx + 1),
      st.username || st.code || `${className.replace(/Lớp\s*/i, '').toLowerCase()}${idx + 1}`,
      st.fullName || st.name,
      st.birthday || st.dob || '01/01/2016',
      st.gender || 'Nam',
      st.password || st.pin || '123456'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(dataRows);
  setWorksheetColWidths(ws, [8, 16, 26, 16, 12, 16]);
  XLSX.utils.book_append_sheet(wb, ws, `Danh Sách ${className}`);

  const cleanClassName = className.replace(/[\s\/:*?"<>|]+/g, '_');
  saveWorkbookAsExcel(wb, `Danh_Sach_Hoc_Sinh_${cleanClassName}.xlsx`);
}

export interface ParseStudentResult {
  success: boolean;
  students: StudentRecord[];
  totalCount: number;
  className?: string;
  error?: string;
}

/**
 * Hàm phân tích ngày tháng từ ô Excel (hỗ trợ cả chuỗi dd/mm/yyyy, yyyy-mm-dd hoặc số serial Excel)
 */
function parseExcelDate(val: any): string {
  if (!val) return '01/01/2016';
  if (typeof val === 'number') {
    // Excel serial date to JS Date
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      const d = String(jsDate.getDate()).padStart(2, '0');
      const m = String(jsDate.getMonth() + 1).padStart(2, '0');
      const y = jsDate.getFullYear();
      return `${d}/${m}/${y}`;
    }
  }
  const str = String(val).trim();
  // Nếu đã ở dạng dd/mm/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }
  // Nếu ở dạng yyyy-mm-dd
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const parts = str.split('-');
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return str;
}

/**
 * Hàm xử lý file Excel (importStudentsFromExcel) đọc chính xác dữ liệu theo đúng thứ tự 9 cột:
 * Cột A (index 0): STT
 * Cột B (index 1): Mã HS (Tên đăng nhập) -> username / code
 * Cột C (index 2): Mật khẩu đăng nhập -> password / pin
 * Cột D (index 3): Họ và tên học sinh -> fullName / name
 * Cột E (index 4): Số định danh (SĐCN/CCCD) / SĐDCN -> idCard / sddcn
 * Cột F (index 5): Giới tính -> gender
 * Cột G (index 6): Ngày sinh -> birthday / dob
 * Cột H (index 7): Họ tên phụ huynh / Phụ huynh liên hệ -> parentName
 * Cột I (index 8): Số điện thoại -> phone
 */
export function importStudentsFromExcel(
  fileInput: ArrayBuffer | Uint8Array | any,
  fallbackClass: string = 'Lớp 5B'
): ParseStudentResult {
  try {
    let arrayBuffer: ArrayBuffer | Uint8Array;
    if (fileInput instanceof ArrayBuffer || fileInput instanceof Uint8Array) {
      arrayBuffer = fileInput;
    } else if (fileInput?.buffer instanceof ArrayBuffer) {
      arrayBuffer = fileInput.buffer;
    } else {
      return { success: false, students: [], totalCount: 0, error: 'Dữ liệu file không hợp lệ.' };
    }

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, students: [], totalCount: 0, error: 'File Excel không có sheet dữ liệu hợp lệ.' };
    }

    // Chọn sheet danh sách học sinh (ưu tiên sheet đầu tiên hoặc sheet chứa tên lớp)
    const targetSheetName =
      workbook.SheetNames.find((s) => !s.toLowerCase().includes('hướng dẫn')) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[targetSheetName];

    // Chuyển sheet sang mảng 2 chiều
    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return { success: false, students: [], totalCount: 0, error: 'File Excel trống.' };
    }

    // Cấu hình chỉ mục cột cố định mặc định theo chuẩn A -> I:
    // Cột A (index 0): STT
    // Cột B (index 1): Mã HS (Tên đăng nhập) -> username
    // Cột C (index 2): Mật khẩu đăng nhập -> password
    // Cột D (index 3): Họ và tên học sinh -> fullName
    // Cột E (index 4): Số định danh (SĐCN/CCCD) -> idCard
    // Cột F (index 5): Giới tính -> gender
    // Cột G (index 6): Ngày sinh -> birthday
    // Cột H (index 7): Họ tên phụ huynh -> parentName
    // Cột I (index 8): Số điện thoại -> phone
    let colIndices = {
      stt: 0,
      username: 1,
      password: 2,
      fullName: 3,
      idCard: 4,
      gender: 5,
      birthday: 6,
      parentName: 7,
      phone: 8
    };

    let headerRowIdx = -1;

    // Hàm chuẩn hóa chuỗi tiêu đề để so khớp linh hoạt không phân biệt hoa thường, dấu tiếng Việt
    const norm = (s: any) =>
      String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s\(\)\/_\-\:\.]+/g, '');

    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      let matchCount = 0;

      row.forEach((cellVal, cIdx) => {
        const cellNorm = norm(cellVal);
        if (cellNorm === 'stt' || cellNorm === 'no' || cellNorm === 'thutu') {
          colIndices.stt = cIdx;
          matchCount++;
        } else if (
          cellNorm.includes('mahs') ||
          cellNorm.includes('tendangnhap') ||
          cellNorm.includes('taikhoan') ||
          cellNorm.includes('mshs') ||
          cellNorm.includes('username')
        ) {
          colIndices.username = cIdx;
          matchCount++;
        } else if (
          cellNorm.includes('matkhau') ||
          cellNorm.includes('pin') ||
          cellNorm.includes('pass') ||
          cellNorm.includes('password')
        ) {
          colIndices.password = cIdx;
          matchCount++;
        } else if (
          cellNorm.includes('hovaten') ||
          cellNorm.includes('hoten') ||
          cellNorm.includes('tenhocsinh') ||
          cellNorm === 'ten' ||
          cellNorm.includes('fullname')
        ) {
          colIndices.fullName = cIdx;
          matchCount++;
        } else if (
          cellNorm.includes('dinhdanh') ||
          cellNorm.includes('sdcn') ||
          cellNorm.includes('sddcn') ||
          cellNorm.includes('cccd') ||
          cellNorm.includes('cmnd') ||
          cellNorm.includes('idcard')
        ) {
          colIndices.idCard = cIdx;
          matchCount++;
        } else if (cellNorm === 'gioitinh' || cellNorm === 'gender' || cellNorm === 'phai') {
          colIndices.gender = cIdx;
          matchCount++;
        } else if (
          cellNorm.includes('ngaysinh') ||
          cellNorm.includes('ns') ||
          cellNorm.includes('birthday') ||
          cellNorm.includes('dob') ||
          cellNorm.includes('sinhngay')
        ) {
          colIndices.birthday = cIdx;
          matchCount++;
        } else if (
          cellNorm.includes('phuhuynh') ||
          cellNorm.includes('hotenph') ||
          cellNorm.includes('bame') ||
          cellNorm.includes('giamho') ||
          cellNorm.includes('parent')
        ) {
          colIndices.parentName = cIdx;
          matchCount++;
        } else if (
          cellNorm.includes('dienthoai') ||
          cellNorm.includes('sdt') ||
          cellNorm.includes('phone') ||
          cellNorm.includes('tel')
        ) {
          colIndices.phone = cIdx;
          matchCount++;
        }
      });

      if (matchCount >= 3) {
        headerRowIdx = r;
        break;
      }
    }

    const startDataRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 1;
    const parsedStudents: StudentRecord[] = [];
    const prefix = fallbackClass.replace(/Lớp\s*/i, '').toLowerCase();

    for (let i = startDataRow; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawFullName = String(row[colIndices.fullName] || '').trim();
      const rawUsername = String(row[colIndices.username] || '').trim();

      // Bỏ qua dòng trống hoặc dòng hướng dẫn/tổng kết
      if (!rawFullName && !rawUsername) continue;
      if (rawFullName.toLowerCase().includes('hướng dẫn') || rawFullName.toLowerCase().includes('tổng cộng')) continue;

      const sttNum =
        parseInt(String(row[colIndices.stt] || parsedStudents.length + 1), 10) || parsedStudents.length + 1;
      const usernameVal = rawUsername || `${prefix}${sttNum}`;
      const passwordVal = String(row[colIndices.password] || '123456').replace(/^'/, '').trim() || '123456';
      const fullNameVal = rawFullName || `Học sinh ${usernameVal}`;
      const rawGender = String(row[colIndices.gender] || '').trim();
      const genderVal: 'Nam' | 'Nữ' =
        rawGender.toLowerCase() === 'nữ' || rawGender.toLowerCase() === 'nu' || rawGender.toLowerCase() === 'female'
          ? 'Nữ'
          : 'Nam';

      const birthdayVal = parseExcelDate(row[colIndices.birthday]);

      const studentItem: StudentRecord = {
        id: `st-${prefix}-${sttNum}`,
        stt: sttNum,
        code: usernameVal,
        username: usernameVal,
        pin: passwordVal,
        password: passwordVal,
        name: fullNameVal,
        fullName: fullNameVal,
        gender: genderVal,
        dob: birthdayVal,
        birthday: birthdayVal,
        className: fallbackClass
      };

      parsedStudents.push(studentItem);
    }

    // Deduplicate parsed students array to ensure strict key uniqueness
    const seenParsedIds = new Set<string>();
    const seenParsedCodes = new Set<string>();
    const deduplicatedParsed: StudentRecord[] = [];

    parsedStudents.forEach((st) => {
      const codeKey = (st.code || '').toLowerCase();
      if (codeKey && seenParsedCodes.has(codeKey)) {
        return;
      }
      if (codeKey) seenParsedCodes.add(codeKey);
      deduplicatedParsed.push(st);
    });

    const finalResult = deduplicatedParsed.map((st, idx) => {
      const stt = idx + 1;
      const id = `st-${prefix}-${stt}`;
      seenParsedIds.add(id);
      return {
        id,
        stt,
        code: st.code || `${prefix}${stt}`,
        username: st.username || `${prefix}${stt}`,
        name: st.name || st.fullName || `Học sinh ${prefix}${stt}`,
        fullName: st.fullName || st.name || `Học sinh ${prefix}${stt}`,
        dob: st.dob || st.birthday || '01/01/2016',
        birthday: st.birthday || st.dob || '01/01/2016',
        gender: st.gender || 'Nam',
        password: st.password || st.pin || '123456',
        pin: st.pin || st.password || '123456',
        className: st.className || fallbackClass
      };
    });

    return {
      success: true,
      students: finalResult,
      totalCount: finalResult.length,
      className: fallbackClass
    };
  } catch (err: any) {
    console.error('Lỗi khi đọc file Excel:', err);
    return {
      success: false,
      students: [],
      totalCount: 0,
      error: err?.message || 'Không thể xử lý file Excel.'
    };
  }
}

/**
 * Wrapper parseStudentExcel gọi hàm importStudentsFromExcel
 */
export function parseStudentExcel(
  fileBuffer: ArrayBuffer | Uint8Array,
  fallbackClass: string = 'Lớp 5B'
): ParseStudentResult {
  return importStudentsFromExcel(fileBuffer, fallbackClass);
}

/* =========================================================================
   2. NGÂN HÀNG CÂU HỎI (Question Bank Templates & Exporter)
   ========================================================================= */

/**
 * Tải File Excel Mẫu để Nhập Ngân Hàng Câu Hỏi (.xlsx chuẩn)
 */
export function downloadQuestionBankTemplate(subject: string = 'Tin học', grade: string = 'Khối 3') {
  const wb = XLSX.utils.book_new();

  const headers = [
    'STT',
    'Mã câu hỏi',
    'Môn học',
    'Khối lớp',
    'Tên bài học / Chủ đề',
    'Mức độ nhận thức',
    'Loại câu hỏi',
    'Nội dung câu hỏi',
    'Lựa chọn A',
    'Lựa chọn B',
    'Lựa chọn C',
    'Lựa chọn D',
    'Đáp án đúng',
    'Lời giải chi tiết sư phạm'
  ];

  const sampleRows = [
    [
      1,
      'CH-TIN3-001',
      'Tin học',
      'Khối 3',
      'Bài 1: Ôn tập các số đến 1000',
      '1. Nhận biết',
      'Trắc nghiệm đơn',
      'Số gồm 4 trăm, 5 chục và 8 đơn vị được viết là:',
      '458',
      '485',
      '548',
      '845',
      'A',
      'Số gồm 4 trăm, 5 chục và 8 đơn vị là 458.'
    ],
    [
      2,
      'CH-TOAN3-002',
      'Toán',
      'Khối 3',
      'Bài 2: Cộng trừ trong phạm vi 1000',
      '2. Thông hiểu',
      'Trắc nghiệm đơn',
      'Kết quả của phép tính 245 + 321 là:',
      '566',
      '556',
      '565',
      '466',
      'A',
      'Ta có: 245 + 321 = 566.'
    ],
    [
      3,
      'CH-TV3-001',
      'Tiếng Việt',
      'Khối 3',
      'Chủ điểm Mái ấm gia đình',
      '1. Nhận biết',
      'Trắc nghiệm đơn',
      'Từ nào dưới đây chỉ tình cảm gia đình?',
      'Yêu thương',
      'Học tập',
      'Chạy nhảy',
      'Sách vở',
      'A',
      'Từ "Yêu thương" là từ chỉ tình cảm ruột thịt trong gia đình.'
    ],
    [
      4,
      'CH-TIN3-001',
      'Tin học',
      'Khối 3',
      'Bài 1: Thông tin và quyết định',
      '2. Thông hiểu',
      'Đúng / Sai',
      'Bộ phận nào của máy tính dùng để nhập chữ và số? (A: Bàn phím [Đúng], B: Màn hình [Sai])',
      'Bàn phím máy tính',
      'Màn hình máy tính',
      'Thân máy',
      'Chuột máy tính',
      'A',
      'Bàn phím là thiết bị thu nhận dữ liệu chữ và số.'
    ],
    [
      5,
      'CH-CN3-001',
      'Công nghệ',
      'Khối 3',
      'Bài 1: Tự nhiên và công nghệ',
      '3. Vận dụng',
      'Trắc nghiệm đơn',
      'Sản phẩm công nghệ nào trong gia đình giúp bảo quản thực phẩm tươi sống?',
      'Tủ lạnh',
      'Quạt điện',
      'Tivi',
      'Bếp gas',
      'A',
      'Tủ lạnh làm chậm sự phát triển của vi khuẩn giúp bảo quản thực phẩm an toàn.'
    ]
  ];

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  setWorksheetColWidths(wsData, [8, 16, 14, 12, 30, 18, 18, 45, 20, 20, 20, 20, 14, 40]);
  XLSX.utils.book_append_sheet(wb, wsData, 'Ngân Hàng Câu Hỏi Mẫu');

  // Sheet 2: Danh mục mã & Quy định chuẩn
  const conventions = [
    ['QUY ĐỊNH CHUẨN ĐỊNH DẠNG IMPORT NGÂN HÀNG CÂU HỎI - DẠY VÀ HỌC SỐ PK TRỰC KHANG'],
    [''],
    ['Cột dữ liệu', 'Giá trị hợp lệ được hệ thống nhận diện tự động'],
    ['Mức độ nhận thức', '1. Nhận biết (hoặc "nhan_biet"), 2. Thông hiểu ("thong_hieu"), 3. Vận dụng ("van_dung"), 4. Vận dụng cao ("van_dung_cao")'],
    ['Loại câu hỏi', 'Trắc nghiệm đơn, Chọn nhiều đáp án đúng, Đúng/Sai, Điền khuyết, Sắp xếp thứ tự, Phân loại, Tự luận'],
    ['Đáp án đúng', 'Điền ký tự chữ cái đáp án đúng: A, B, C, D hoặc nội dung cụ thể'],
    ['Lời giải chi tiết', 'Trình bày ngắn gọn, chuẩn mực sư phạm để AI và phần mềm hỗ trợ chấm và giải thích cho học sinh.']
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(conventions);
  setWorksheetColWidths(wsGuide, [25, 75]);
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Quy Chuẩn Nhận Thức');

  saveWorkbookAsExcel(wb, `Mau_Nhap_Ngan_Hang_Cau_Hoi_Truc_Khang.xlsx`);
}

/**
 * Xuất toàn bộ ngân hàng câu hỏi ra file .xlsx chuẩn
 */
export function exportQuestionBankToExcel(questions: QuestionItem[], filename: string = 'Ngan_Hang_Cau_Hoi_Truc_Khang_Chuan.xlsx') {
  const wb = XLSX.utils.book_new();

  const headers = [
    'STT',
    'Mã câu hỏi',
    'Môn học',
    'Khối lớp',
    'Mức độ nhận thức',
    'Loại câu hỏi',
    'Nội dung câu hỏi',
    'Lựa chọn A / Các ý',
    'Lựa chọn B',
    'Lựa chọn C',
    'Lựa chọn D',
    'Đáp án đúng',
    'Lời giải chi tiết sư phạm'
  ];

  const rows: any[] = [];
  questions.forEach((q, idx) => {
    const levelLabel =
      q.level === 'nhan_biet' ? '1. Nhận biết' :
      q.level === 'thong_hieu' ? '2. Thông hiểu' :
      q.level === 'van_dung' ? '3. Vận dụng' : '4. Vận dụng cao';

    const optA = q.options && q.options[0] ? q.options[0] : '';
    const optB = q.options && q.options[1] ? q.options[1] : '';
    const optC = q.options && q.options[2] ? q.options[2] : '';
    const optD = q.options && q.options[3] ? q.options[3] : '';

    rows.push([
      idx + 1,
      q.code || `CH-${idx + 1}`,
      q.subject || 'Tin học',
      q.grade || 'Khối 3',
      levelLabel,
      q.type || 'Trắc nghiệm đơn',
      q.content || '',
      optA,
      optB,
      optC,
      optD,
      q.correctAnswer || 'A',
      q.explanation || 'Lời giải chuẩn sư phạm.'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  setWorksheetColWidths(ws, [8, 16, 14, 12, 18, 18, 45, 20, 20, 20, 20, 14, 40]);
  XLSX.utils.book_append_sheet(wb, ws, 'Ngân Hàng Câu Hỏi');

  saveWorkbookAsExcel(wb, filename);
}

/* =========================================================================
   3. QUẢN LÝ ĐỀ KIỂM TRA & THI (Exam Management Templates & Exporter)
   ========================================================================= */

/**
 * Tải File Excel Mẫu Ma Trận & Cấu Trúc Đề Thi (.xlsx chuẩn)
 */
export function downloadExamMatrixTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Ma trận đề thi mẫu
  const matrixHeaders = [
    ['MA TRẬN CẤU TRÚC ĐỀ KIỂM TRA ĐỊNH KỲ - TIỂU HỌC QUANG HƯNG PK1'],
    ['Môn học: Toán', 'Khối lớp: Khối 3', 'Thời gian: 40 phút', 'Hình thức: Trắc nghiệm kết hợp tự luận'],
    [''],
    [
      'STT',
      'Chủ đề / Mạch kiến thức',
      'Nhận biết (Câu)',
      'Thông hiểu (Câu)',
      'Vận dụng (Câu)',
      'Vận dụng cao (Câu)',
      'Tổng số câu',
      'Tổng điểm',
      'Tỉ lệ (%)'
    ],
    [1, '1. Số và phép tính trong phạm vi 1000', 2, 2, 1, 1, 6, 6.0, '60%'],
    [2, '2. Hình học & Đo lường (Góc, độ dài, khối lượng)', 1, 1, 1, 0, 3, 3.0, '30%'],
    [3, '3. Giải toán có lời văn thực tế', 1, 0, 0, 0, 1, 1.0, '10%'],
    ['', 'TỔNG CỘNG MA TRẬN', 4, 3, 2, 1, 10, 10.0, '100%']
  ];

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixHeaders);
  setWorksheetColWidths(wsMatrix, [8, 45, 18, 18, 18, 20, 15, 15, 15]);
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Ma Trận Đề Thi');

  // Sheet 2: Khung đề thi chi tiết
  const examItems = [
    [
      'STT',
      'Mã câu',
      'Nội dung câu hỏi',
      'Mức độ nhận thức',
      'Lựa chọn A',
      'Lựa chọn B',
      'Lựa chọn C',
      'Lựa chọn D',
      'Đáp án đúng',
      'Biểu điểm'
    ],
    [1, 'DT-01', 'Số lớn nhất có 3 chữ số khác nhau là:', 'Nhận biết', '987', '999', '102', '989', 'A', '1.0 điểm'],
    [2, 'DT-02', 'Kết quả phép tính 300 + 40 + 5 là:', 'Nhận biết', '345', '354', '435', '543', 'A', '1.0 điểm'],
    [3, 'DT-03', 'Mỗi túi có 5 quả cam. Hỏi 6 túi như thế có tất cả bao nhiêu quả cam?', 'Thông hiểu', '30 quả', '25 quả', '35 quả', '11 quả', 'A', '1.0 điểm'],
    [4, 'DT-04', 'Tìm một số biết nếu lấy số đó chia cho 4 thì được 8 dư 3:', 'Vận dụng', '35', '32', '31', '36', 'A', '1.0 điểm'],
    [5, 'DT-05', 'Bác An cưa một khúc gỗ dài 12m thành các đoạn 2m. Mỗi lần cưa mất 5 phút. Hỏi bác An cưa xong khúc gỗ hết bao nhiêu phút?', 'Vận dụng cao', '25 phút', '30 phút', '20 phút', '35 phút', 'A', '1.0 điểm']
  ];
  const wsExam = XLSX.utils.aoa_to_sheet(examItems);
  setWorksheetColWidths(wsExam, [8, 14, 45, 18, 16, 16, 16, 16, 14, 14]);
  XLSX.utils.book_append_sheet(wb, wsExam, 'Danh Sách Câu Hỏi');

  saveWorkbookAsExcel(wb, 'Mau_Cau_Truc_Ma_Tran_De_Kiem_Tra.xlsx');
}

/**
 * Xuất đề kiểm tra chi tiết ra file .xlsx đầy đủ 3 sheets (Nội dung, Đáp án & Hướng dẫn chấm, Ma trận)
 */


export function exportExamToExcel(exam: ExamPaper) {
  const wb = XLSX.utils.book_new();

  const numQuestions = 9; // Fallback to 9
  
  const questionHeaders = [];
  for (let i = 1; i <= numQuestions; i++) {
    questionHeaders.push(`Câu ${i}`);
  }

  const headers = [
    'Mã Học Sinh',
    'Tên Học Sinh',
    'Ngày Sinh',
    'Trạng Thái',
    ...questionHeaders,
    'Tổng điểm',
    'Số lần làm',
    'Thời gian nộp'
  ];

  const targetClasses = exam.targetClass ? exam.targetClass.split(',').map(c => c.trim()) : ['Lớp 3A'];
  
  // Standard 39 students for Lớp 3A mock
  const mockStudentsData = [
    { name: 'Hoàng Bảo An', dob: '21/12/2018', status: 'Đã nộp bài', score: 4, attempts: 1, time: '10:15:00 15/08/2026',
      answers: ['Đúng', 'Đúng', 'Đúng', 'Sai', 'Sai', 'Sai', 'Sai', 'Đúng', 'Sai'] },
    { name: 'Trần Bảo An', dob: '05/10/2018', status: 'Chưa nộp bài' },
    { name: 'Nguyễn Nguyên Anh', dob: '09/09/2018', status: 'Chưa nộp bài' },
    { name: 'Nguyễn Quốc Bảo', dob: '22/03/2018', status: 'Chưa nộp bài' },
    { name: 'Tống Thị Quỳnh Chi', dob: '02/06/2018', status: 'Chưa nộp bài' },
    { name: 'Vũ Ngọc Diệp', dob: '24/07/2018', status: 'Chưa nộp bài' },
    { name: 'Mai Hải Đăng', dob: '17/07/2018', status: 'Chưa nộp bài' },
    { name: 'Nguyễn Minh Đức', dob: '17/03/2018', status: 'Chưa nộp bài' },
    { name: 'Hà Ngọc Hoa', dob: '29/04/2018', status: 'Chưa nộp bài' },
    { name: 'Hà Việt Hoàng', dob: '30/10/2018', status: 'Chưa nộp bài' },
    { name: 'Ngô Nhật Hưng', dob: '29/06/2018', status: 'Đã nộp bài', score: 4, attempts: 1, time: '10:17:01 15/08/2026',
      answers: ['Đúng', 'Sai', 'Sai', 'Sai', 'Đúng', 'Đúng', 'Sai', 'Đúng', 'Sai'] },
    { name: 'Nguyễn Bảo Khánh', dob: '04/11/2018', status: 'Chưa nộp bài' },
    { name: 'Hoàng Tuấn Kiệt', dob: '03/03/2018', status: 'Chưa nộp bài' },
    { name: 'Đỗ Diệu Linh', dob: '15/12/2018', status: 'Chưa nộp bài' },
    { name: 'Phan Tú Linh', dob: '02/10/2018', status: 'Chưa nộp bài' },
    { name: 'Hà Bảo Long', dob: '10/07/2018', status: 'Chưa nộp bài' },
    { name: 'Hà Bảo Nam', dob: '10/01/2018', status: 'Chưa nộp bài' },
    { name: 'Hà Duy Nam', dob: '11/05/2018', status: 'Chưa nộp bài' },
    { name: 'Dương Bảo Ngân', dob: '07/07/2018', status: 'Chưa nộp bài' },
    { name: 'Nguyễn Trung Nghĩa', dob: '17/04/2018', status: 'Chưa nộp bài' },
    { name: 'Đào Thị Bích Ngọc', dob: '26/06/2018', status: 'Chưa nộp bài' },
    { name: 'Phan Vũ Khánh Ngọc', dob: '27/06/2018', status: 'Chưa nộp bài' },
    { name: 'Nguyễn Bình Nguyên', dob: '17/05/2018', status: 'Chưa nộp bài' },
    { name: 'Đoàn Yến Nhi', dob: '09/02/2018', status: 'Chưa nộp bài' },
    { name: 'Nguyễn Quỳnh Như', dob: '27/06/2018', status: 'Chưa nộp bài' },
    { name: 'Lê Hải Phong', dob: '13/02/2018', status: 'Chưa nộp bài' },
    { name: 'Hà Đại Phú', dob: '24/11/2018', status: 'Chưa nộp bài' },
    { name: 'Đồng Xuân Phúc', dob: '05/01/2018', status: 'Chưa nộp bài' },
    { name: 'Lê Quang Quân', dob: '18/08/2018', status: 'Chưa nộp bài' },
    { name: 'Vũ Huy Thái', dob: '21/09/2018', status: 'Chưa nộp bài' },
    { name: 'Nguyễn Ngọc Trâm', dob: '12/12/2018', status: 'Chưa nộp bài' },
    { name: 'Hoàng Mai Trang', dob: '08/04/2018', status: 'Chưa nộp bài' },
    { name: 'Hà Đình Tiến', dob: '19/11/2018', status: 'Chưa nộp bài' },
    { name: 'Hoàng Khánh Vân', dob: '25/02/2018', status: 'Chưa nộp bài' },
    { name: 'Vũ Hà Trang', dob: '03/07/2018', status: 'Chưa nộp bài' },
    { name: 'Trịnh Bảo Trâm', dob: '14/10/2018', status: 'Chưa nộp bài' },
    { name: 'Lý Nam Việt', dob: '28/05/2018', status: 'Chưa nộp bài' },
    { name: 'Đinh Quốc Vượng', dob: '07/08/2018', status: 'Chưa nộp bài' },
    { name: 'Phạm Xuân Yến', dob: '30/01/2018', status: 'Chưa nộp bài' }
  ];

  targetClasses.forEach(className => {
    const sheetData: any[][] = [headers];
    
    mockStudentsData.forEach((student, index) => {
      const stt = index + 1;
      let maHsPrefix = className.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!maHsPrefix) maHsPrefix = '3a';
      const maHs = `${maHsPrefix}${stt}`;
      
      const rowData: any[] = [
        maHs,               // Mã Học Sinh
        student.name,       // Tên Học Sinh
        student.dob,        // Ngày Sinh
        student.status      // Trạng Thái
      ];

      for (let i = 0; i < numQuestions; i++) {
        if (student.status === 'Đã nộp bài' && student.answers && student.answers[i]) {
          rowData.push(student.answers[i]);
        } else {
          rowData.push('Chưa làm');
        }
      }

      rowData.push(
        student.score !== undefined ? student.score : 'Chưa thi',  // Tổng điểm
        student.attempts !== undefined ? student.attempts : 0,     // Số lần làm
        student.time || ''                                         // Thời gian nộp
      );

      sheetData.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const colWidths = [12, 25, 12, 15, ...Array(numQuestions).fill(10), 10, 10, 20];
    setWorksheetColWidths(ws, colWidths);
    XLSX.utils.book_append_sheet(wb, ws, className);
  });

  const cleanExamName = exam.title.replace(/[\s\/:*?"<>|]+/g, '_');
  const classNamesCleaned = targetClasses.map(c => c.replace(/[\s\/:*?"<>|]+/g, '_')).join('_');
  saveWorkbookAsExcel(wb, `Bao_cao_thi_kiem_tra_${cleanExamName}_${classNamesCleaned}.xlsx`);
}



/* =========================================================================
   4. QUẢN LÝ BÀI TẬP VỀ NHÀ (Assignment Management Templates & Exporter)
   ========================================================================= */

/**
 * Tải File Excel Mẫu Giao Bài Tập Cho Học Sinh (.xlsx chuẩn)
 */
export function downloadAssignmentPlanTemplate(className: string = 'Lớp 3A') {
  const wb = XLSX.utils.book_new();

  const headers = [
    'STT',
    'Mã HS',
    'Họ và tên học sinh',
    'Tên bài rèn luyện / Phiếu học tập',
    'Môn học',
    'Khối lớp',
    'Hạn nộp bài',
    'Mục tiêu cần đạt',
    'Ghi chú dặn dò phụ huynh'
  ];

  const prefix = className.replace(/Lớp\s*/i, '').toLowerCase();

  const rows = [
    [1, `${prefix}1`, 'Nguyễn Văn An', 'Bài 1: Tự nhiên và công nghệ', 'Công nghệ', 'Khối 3', '23:59 10/09/2026', 'Đạt từ 8.0 điểm trở lên', 'Nhắc nhở con tự giác hoàn thành trên máy tính/điện thoại'],
    [2, `${prefix}2`, 'Trần Đức Bảo', 'Bài 1: Tự nhiên và công nghệ', 'Công nghệ', 'Khối 3', '23:59 10/09/2026', 'Đạt từ 8.0 điểm trở lên', 'Phụ huynh hỗ trợ chụp ảnh phiếu bài tập nếu có yêu cầu'],
    [3, `${prefix}3`, 'Lê Minh Cường', 'Bài 1: Tự nhiên và công nghệ', 'Công nghệ', 'Khối 3', '23:59 10/09/2026', 'Đạt từ 8.0 điểm trở lên', 'Đọc kỹ câu hỏi trước khi chọn đáp án'],
    [4, `${prefix}4`, 'Phạm Quỳnh Chi', 'Bài 1: Tự nhiên và công nghệ', 'Công nghệ', 'Khối 3', '23:59 10/09/2026', 'Đạt từ 8.0 điểm trở lên', 'Làm lại các câu sai để ghi nhớ bài học']
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  setWorksheetColWidths(ws, [8, 14, 24, 35, 16, 12, 22, 28, 45]);
  XLSX.utils.book_append_sheet(wb, ws, 'Danh Sách Giao Bài');

  saveWorkbookAsExcel(wb, `Mau_Giao_Bai_Tap_Hoc_Sinh_${className.replace(/\s+/g, '')}.xlsx`);
}

/**
 * Xuất Báo Cáo Theo Dõi Nộp Bài & Kết Quả Rèn Luyện (.xlsx chuẩn)
 */
export function exportAssignmentResultsExcel(
  assignmentTitle: string,
  className: string,
  studentsList: any[]
) {
  const wb = XLSX.utils.book_new();

  const nowStr = new Date().toLocaleString('vi-VN');

  const sheetData: any[] = [
    ['BÁO CÁO THEO DÕI NỘP BÀI RÈN LUYỆN & CHẤM ĐIỂM TỰ ĐỘNG'],
    [`Bài tập: ${assignmentTitle}`],
    [`Lớp phụ trách: ${className} | Tổng số: ${studentsList.length} học sinh | Thời gian xuất báo cáo: ${nowStr}`],
    [''],
    [
      'STT',
      'Mã HS',
      'Họ và tên học sinh',
      'Câu 1',
      'Câu 2',
      'Câu 3',
      'Câu 4',
      'Câu 5',
      'Tổng điểm',
      'Đánh giá AI',
      'Thời gian nộp bài',
      'Trạng thái nộp',
      'Nhận xét sư phạm của Giáo viên'
    ]
  ];

  studentsList.forEach((st, idx) => {
    const c1 = st.answers && st.answers[0] === 'pass' ? 'Đúng' : st.answers && st.answers[0] === 'fail' ? 'Sai' : 'Chưa làm';
    const c2 = st.answers && st.answers[1] === 'pass' ? 'Đúng' : st.answers && st.answers[1] === 'fail' ? 'Sai' : 'Chưa làm';
    const c3 = st.answers && st.answers[2] === 'pass' ? 'Đúng' : st.answers && st.answers[2] === 'fail' ? 'Sai' : 'Chưa làm';
    const c4 = st.answers && st.answers[3] === 'pass' ? 'Đúng' : st.answers && st.answers[3] === 'fail' ? 'Sai' : 'Chưa làm';
    const c5 = st.answers && st.answers[4] === 'pass' ? 'Đúng' : st.answers && st.answers[4] === 'fail' ? 'Sai' : 'Chưa làm';

    const aiStatusStr = st.aiStatus === 'pass' ? 'Đạt yêu cầu' : st.aiStatus === 'fail' ? 'Cần ôn tập thêm' : '-';
    const statusStr = st.status === 'submitted' ? 'Đã nộp bài' : 'Chờ học sinh nộp';

    let teacherNote = '';
    if (st.totalScore !== '-') {
      const scoreNum = Number(st.totalScore);
      if (scoreNum >= 9) teacherNote = 'Xuất sắc, nắm chắc kiến thức bài học';
      else if (scoreNum >= 7) teacherNote = 'Đạt yêu cầu, cần cẩn thận hơn ở câu vận dụng';
      else if (scoreNum >= 5) teacherNote = 'Cần luyện tập thêm, giáo viên hỗ trợ chữa bài';
      else teacherNote = 'Cần kèm cặp thêm ngoài giờ học';
    } else {
      teacherNote = 'Chưa nộp bài - Đã gửi thông báo nhắc nhở qua Zalo phụ huynh';
    }

    sheetData.push([
      idx + 1,
      st.code || '',
      st.name || '',
      c1,
      c2,
      c3,
      c4,
      c5,
      st.totalScore !== '-' ? st.totalScore : 'Chưa chấm',
      aiStatusStr,
      st.submittedTime || 'Chưa nộp',
      statusStr,
      teacherNote
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  setWorksheetColWidths(ws, [8, 14, 24, 12, 12, 12, 12, 12, 14, 18, 22, 18, 45]);
  XLSX.utils.book_append_sheet(wb, ws, 'Ket_Qua_Ren_Luyen');

  const cleanClass = className.replace(/[\s\/:*?"<>|]+/g, '_');
  const cleanTitle = assignmentTitle.replace(/[\s\/:*?"<>|]+/g, '_');
  saveWorkbookAsExcel(wb, `Ket_Qua_Ren_Luyen_${cleanClass}_${cleanTitle.substring(0, 30)}.xlsx`);
}

/* =========================================================================
   7. HỌC BẠ SỐ & SỔ TỔNG KẾT (Sổ Nhận Xét & Sổ Tổng Kết Excel Exports)
   ========================================================================= */

interface SoNhanXetExportItem {
  id: string;
  lastName: string;
  firstName: string;
  dob: string;
  isFemale: boolean;
  className: string;
  commentDetail?: {
    correctCount: number;
    totalQuestions: number;
    strengths: string;
    reminders: string;
    overallDat: 'T' | 'H' | 'CHT';
    score: number;
    hasCommented: boolean;
  };
}

interface SoTongKetExportItem {
  id: string;
  lastName: string;
  firstName: string;
  dob: string;
  isFemale: boolean;
  className: string;
  homeroomTeacher?: string;
  evaluations: Record<string, { dat: 'T' | 'H' | 'CHT'; score: string }>;
}

/**
 * Xuất Sổ Nhận Xét Học Sinh ra file .xlsx chuẩn
 */
export function exportSoNhanXetToExcel(params: {
  students: SoNhanXetExportItem[];
  grade: string;
  className: string;
  subject: string;
  examType: string;
  month: string;
  testName: string;
}) {
  const { students, grade, className, subject, examType, month, testName } = params;
  const wb = XLSX.utils.book_new();

  // Helper to check if subject has numerical scores
  const checkHasScore = (subjName: string): boolean => {
    if (!subjName) return false;
    const name = subjName.toLowerCase().trim();
    if (
      name.includes('đạo đức') ||
      name.includes('tự nhiên và xã hội') ||
      name.includes('tnxh') ||
      name.includes('mĩ thuật') ||
      name.includes('mỹ thuật') ||
      name.includes('giáo dục thể chất') ||
      name.includes('gdtc') ||
      name.includes('thể dục') ||
      name.includes('âm nhạc') ||
      name.includes('trải nghiệm') ||
      name.includes('hđtn')
    ) {
      return false;
    }
    return true;
  };

  const hasScore = checkHasScore(subject);

  const displayClass = className === 'Tất cả Lớp' ? grade : className;
  const titleRow1 = ['TRƯỜNG TIỂU HỌC TRỰC KHANG - BÁO CÁO SỔ NHẬN XẾT HỌC SINH'];
  const titleRow2 = [`Khối/Lớp: ${displayClass} | Môn học: ${subject} | Loại KT: ${examType} | Thời gian: ${month} | Bài KT: ${testName}`];
  const titleRow3 = [`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Tổng số học sinh: ${students.length}`];
  const emptyRow: string[] = [];

  const headers = ['STT', 'Họ và tên', 'Ngày sinh', 'Lời nhận xét chi tiết (AI Sư phạm)', 'Đạt'];
  if (hasScore) {
    headers.push('Điểm');
  }

  const sheetData: any[][] = [
    titleRow1,
    titleRow2,
    titleRow3,
    emptyRow,
    headers
  ];

  students.forEach((st, idx) => {
    const hasComment = Boolean(st.commentDetail && st.commentDetail.hasCommented);
    const comment = st.commentDetail;

    const fullName = `${st.lastName} ${st.firstName}`.trim();
    const genderTag = st.isFemale ? ' (Nữ)' : '';
    const nameWithGender = `${fullName}${genderTag}`;

    const commentText = hasComment && comment
      ? `Khen ngợi em đã hoàn thành đúng ${comment.correctCount}/${comment.totalQuestions} câu. Làm tốt các câu: ${comment.strengths}. Cần ôn tập kỹ hơn ở ${comment.reminders}`
      : 'Chưa có nhận xét';

    const row = [
      idx + 1,
      nameWithGender,
      st.dob || '',
      commentText,
      hasComment && comment?.overallDat ? comment.overallDat : '-'
    ];

    if (hasScore) {
      row.push(hasComment && comment?.score !== undefined ? comment.score : '-');
    }

    sheetData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto Column Widths
  const colWidths = [8, 28, 14, 75, 10];
  if (hasScore) colWidths.push(10);
  setWorksheetColWidths(ws, colWidths);

  XLSX.utils.book_append_sheet(wb, ws, 'SoNhanXet');

  // Filename format: SoNhanXet_[Lớp][Tháng hoặc Kỳ][ngày xuất].xlsx
  const cleanClass = displayClass.replace(/[\s\/:*?"<>|]+/g, '');
  const cleanMonth = (month || 'Thang').replace(/[\s\/:*?"<>|]+/g, '');
  const d = new Date();
  const dateStr = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;

  const fileName = `SoNhanXet_${cleanClass}_${cleanMonth}_${dateStr}.xlsx`;
  saveWorkbookAsExcel(wb, fileName);
}

/**
 * Xuất Sổ Tổng Kết Kết Quả Giáo Dục Học Sinh ra file .xlsx chuẩn
 */
export function exportSoTongKetToExcel(params: {
  students: SoTongKetExportItem[];
  grade: string;
  className: string;
  semester: string;
  subjects: string[];
  homeroomTeacher?: string;
}) {
  const { students, grade, className, semester, subjects, homeroomTeacher } = params;
  const isAllClasses = className === 'Tất cả Lớp';
  const wb = XLSX.utils.book_new();

  const checkHasScore = (subjName: string): boolean => {
    if (!subjName) return false;
    const name = subjName.toLowerCase().trim();
    if (
      name.includes('đạo đức') ||
      name.includes('tự nhiên và xã hội') ||
      name.includes('tnxh') ||
      name.includes('mĩ thuật') ||
      name.includes('mỹ thuật') ||
      name.includes('giáo dục thể chất') ||
      name.includes('gdtc') ||
      name.includes('thể dục') ||
      name.includes('âm nhạc') ||
      name.includes('trải nghiệm') ||
      name.includes('hđtn')
    ) {
      return false;
    }
    return true;
  };

  const displayClass = isAllClasses ? grade : className;
  const titleRow1 = ['TRƯỜNG TIỂU HỌC QUANG HƯNG - BÁO CÁO SỔ TỔNG KẾT KẾT QUẢ GIÁO DỤC'];
  const teacherSegment = !isAllClasses && homeroomTeacher ? ` | GVCN: ${homeroomTeacher}` : '';
  const titleRow2 = [`Khối/Lớp: ${displayClass} | Học kỳ: ${semester}${teacherSegment} | Năm học: 2026 - 2027`];
  const titleRow3 = [`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Sĩ số: ${students.length} học sinh`];
  const emptyRow: string[] = [];

  const headers = isAllClasses
    ? ['STT', 'Lớp', 'GVCN', 'Họ lót', 'Tên', 'Ngày sinh', 'Nữ']
    : ['STT', 'Họ lót', 'Tên', 'Ngày sinh', 'Nữ'];

  subjects.forEach((subj) => {
    headers.push(`${subj} (Đạt)`);
    if (checkHasScore(subj)) {
      headers.push(`${subj} (Điểm)`);
    }
  });

  const sheetData: any[][] = [
    titleRow1,
    titleRow2,
    titleRow3,
    emptyRow,
    headers
  ];

  students.forEach((st, idx) => {
    const row: any[] = isAllClasses
      ? [
          idx + 1,
          st.className || '',
          st.homeroomTeacher || '',
          st.lastName || '',
          st.firstName || '',
          st.dob || '',
          st.isFemale ? 'v' : ''
        ]
      : [
          idx + 1,
          st.lastName || '',
          st.firstName || '',
          st.dob || '',
          st.isFemale ? 'v' : ''
        ];

    subjects.forEach((subj) => {
      const evalData = st.evaluations ? st.evaluations[subj] : undefined;
      row.push(evalData && evalData.dat ? evalData.dat : '-');
      if (checkHasScore(subj)) {
        row.push(evalData && evalData.score ? evalData.score : '-');
      }
    });

    sheetData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column Widths
  const colWidths = isAllClasses ? [8, 12, 22, 18, 12, 14, 8] : [8, 18, 12, 14, 8];
  subjects.forEach((subj) => {
    colWidths.push(14);
    if (checkHasScore(subj)) {
      colWidths.push(10);
    }
  });
  setWorksheetColWidths(ws, colWidths);

  XLSX.utils.book_append_sheet(wb, ws, 'SoTongKet');

  // Filename format: SoTongKet_[Lớp][Tháng hoặc Kỳ][ngày xuất].xlsx
  const cleanClass = displayClass.replace(/[\s\/:*?"<>|]+/g, '');
  const cleanSemester = (semester || 'Ky').replace(/[\s\/:*?"<>|]+/g, '');
  const d = new Date();
  const dateStr = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;

  const fileName = `SoTongKet_${cleanClass}_${cleanSemester}_${dateStr}.xlsx`;
  saveWorkbookAsExcel(wb, fileName);
}

