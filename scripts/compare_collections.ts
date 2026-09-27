import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

async function compare() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  // 1. Fetch `teachers`
  const teachersSnap = await getDocs(collection(db, 'teachers'));
  const teachersMap = new Map<string, any>(); // key: email
  teachersSnap.forEach(d => {
    const data = d.data();
    if (data.email) {
      teachersMap.set(data.email.toLowerCase().trim(), { docId: d.id, ...data });
    }
  });

  // 2. Fetch `users`
  const usersSnap = await getDocs(collection(db, 'users'));
  const usersByEmail = new Map<string, any[]>();
  usersSnap.forEach(d => {
    const data = d.data();
    if (data.email) {
      const email = data.email.toLowerCase().trim();
      const existing = usersByEmail.get(email) || [];
      existing.push({ docId: d.id, ...data });
      usersByEmail.set(email, existing);
    }
  });

  // 3. Fetch `to_chuyen_mon`
  const toChuyenMonSnap = await getDocs(collection(db, 'to_chuyen_mon'));
  const toChuyenMonByEmail = new Map<string, any[]>();
  toChuyenMonSnap.forEach(d => {
    const data = d.data();
    const teachers = data.teachers || [];
    if (Array.isArray(teachers)) {
      teachers.forEach((t: any) => {
        if (t.email) {
          const email = t.email.toLowerCase().trim();
          const existing = toChuyenMonByEmail.get(email) || [];
          existing.push({ deptDocId: d.id, deptName: data.name, ...t });
          toChuyenMonByEmail.set(email, existing);
        }
      });
    }
  });

  // 4. Fetch `system_settings/teachers_registry`
  const regSnap = await getDoc(doc(db, 'system_settings', 'teachers_registry'));
  const registryByEmail = new Map<string, any>();
  if (regSnap.exists()) {
    const regData = regSnap.data();
    (regData.teachers || []).forEach((t: any) => {
      if (t.email) {
        registryByEmail.set(t.email.toLowerCase().trim(), t);
      }
    });
  }

  console.log('=== SO SÁNH CHI TIẾT TẤT CẢ TÀI KHOẢN ===');
  const allEmails = new Set<string>([
    ...teachersMap.keys(),
    ...usersByEmail.keys(),
    ...toChuyenMonByEmail.keys(),
    ...registryByEmail.keys()
  ]);

  console.log(`Tổng số email phát hiện trên toàn bộ các collection: ${allEmails.size}\n`);

  let conflictRoleCount = 0;
  let conflictNameCount = 0;
  let conflictIdCount = 0;

  for (const email of Array.from(allEmails).sort()) {
    const tData = teachersMap.get(email);
    const uList = usersByEmail.get(email) || [];
    const tcmList = toChuyenMonByEmail.get(email) || [];
    const regData = registryByEmail.get(email);

    console.log(`\n------------------------------------------------------------`);
    console.log(`📧 EMAIL: ${email}`);

    // Teachers
    if (tData) {
      console.log(`  [teachers]       docId: ${tData.docId} | name: "${tData.name}" | role: "${tData.role}" | toChuyenMon: "${tData.toChuyenMon}"`);
    } else {
      console.log(`  [teachers]       (KHÔNG CÓ)`);
    }

    // Users
    if (uList.length > 0) {
      uList.forEach(u => {
        console.log(`  [users]          docId: ${u.docId} | name: "${u.name}" | role: "${u.role}"`);
      });
    } else {
      console.log(`  [users]          (KHÔNG CÓ)`);
    }

    // To chuyen mon
    if (tcmList.length > 0) {
      tcmList.forEach(tcm => {
        console.log(`  [to_chuyen_mon]  dept: ${tcm.deptDocId} ("${tcm.deptName}") | id: ${tcm.id} | name: "${tcm.name}" | role: "${tcm.role}"`);
      });
    } else {
      console.log(`  [to_chuyen_mon]  (KHÔNG CÓ)`);
    }

    // Registry
    if (regData) {
      console.log(`  [teachers_registry] id: ${regData.id} | name: "${regData.name}" | role: "${regData.role}"`);
    }

    // Detect role conflict
    const roles: string[] = [];
    if (tData?.role) roles.push(`teachers: "${tData.role}"`);
    uList.forEach(u => roles.push(`users(${u.docId}): "${u.role}"`));
    tcmList.forEach(tcm => roles.push(`to_chuyen_mon(${tcm.deptDocId}): "${tcm.role}"`));

    // Normalize roles to check if they fundamentally conflict (admin vs teacher)
    const isAdminRole = (r: string) => {
      const lower = (r || '').toLowerCase();
      return lower.includes('admin') || lower.includes('quản trị') || lower.includes('hiệu trưởng');
    };

    const hasAdmin = roles.some(isAdminRole);
    const hasTeacherOnly = roles.some(r => {
      const lower = r.toLowerCase();
      return !isAdminRole(lower) && (lower.includes('giáo viên') || lower.includes('tổ trưởng') || lower.includes('teacher'));
    });

    if (hasAdmin && hasTeacherOnly) {
      conflictRoleCount++;
      console.log(`  ⚠️ MÂU THUẪN ROLE: Có nguồn ghi ADMIN và nguồn ghi TEACHER/Giáo viên!`);
    }

    // Detect name conflict
    const names = new Set<string>();
    if (tData?.name) names.add(tData.name);
    uList.forEach(u => names.add(u.name));
    tcmList.forEach(tcm => names.add(tcm.name));
    if (names.size > 1) {
      conflictNameCount++;
      console.log(`  ⚠️ MÂU THUẪN NAME: [${Array.from(names).map(n => `"${n}"`).join(', ')}]`);
    }

    // Detect ID conflict
    const ids = new Set<string>();
    if (tData?.docId) ids.add(tData.docId);
    uList.forEach(u => ids.add(u.docId));
    tcmList.forEach(tcm => ids.add(tcm.id));
    if (ids.size > 1) {
      conflictIdCount++;
      console.log(`  ⚠️ MÂU THUẪN / ĐA ID: [${Array.from(ids).join(', ')}]`);
    }
  }

  console.log(`\n============================================================`);
  console.log(`TỔNG KẾT MÂU THUẪN:`);
  console.log(`- Tài khoản có mâu thuẫn Role (Admin vs Teacher): ${conflictRoleCount}`);
  console.log(`- Tài khoản có mâu thuẫn Tên hiển thị: ${conflictNameCount}`);
  console.log(`- Tài khoản có nhiều Document ID khác nhau: ${conflictIdCount}`);

  process.exit(0);
}

compare().catch(err => {
  console.error(err);
  process.exit(1);
});
