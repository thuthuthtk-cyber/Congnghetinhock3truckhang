import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

async function inspect() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  console.log('--- INSPECTING FIRESTORE ---');

  // 1. Check `teachers` collection
  console.log('\n=== COLLECTION: teachers ===');
  const teachersSnap = await getDocs(collection(db, 'teachers'));
  console.log(`Total docs in 'teachers': ${teachersSnap.size}`);
  const teachersMap: Record<string, any> = {};
  teachersSnap.forEach(d => {
    const data = d.data();
    teachersMap[d.id] = data;
    console.log(`[teachers] docId: ${d.id} | email: ${data.email} | name: ${data.name} | role: ${data.role} | toChuyenMon: ${data.toChuyenMon}`);
  });

  // 2. Check `users` collection
  console.log('\n=== COLLECTION: users ===');
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`Total docs in 'users': ${usersSnap.size}`);
  const usersMap: Record<string, any> = {};
  usersSnap.forEach(d => {
    const data = d.data();
    usersMap[d.id] = data;
    console.log(`[users] docId: ${d.id} | email: ${data.email} | name: ${data.name} | role: ${data.role}`);
  });

  // 3. Check `to_chuyen_mon` collection
  console.log('\n=== COLLECTION: to_chuyen_mon ===');
  const toChuyenMonSnap = await getDocs(collection(db, 'to_chuyen_mon'));
  console.log(`Total docs in 'to_chuyen_mon': ${toChuyenMonSnap.size}`);
  const toChuyenMonTeachers: Array<{ docId: string; teacher: any }> = [];
  toChuyenMonSnap.forEach(d => {
    const data = d.data();
    console.log(`[to_chuyen_mon] docId: ${d.id} | name: ${data.name || data.title} | leader: ${data.leader} | totalMembers: ${data.totalMembers}`);
    const teachers = data.teachers || [];
    if (Array.isArray(teachers)) {
      teachers.forEach((t: any) => {
        toChuyenMonTeachers.push({ docId: d.id, teacher: t });
        console.log(`  -> deptDoc: ${d.id} | id: ${t.id} | email: ${t.email} | name: ${t.name} | role: ${t.role}`);
      });
    }
  });

  // 4. Check `system_settings/teachers_registry`
  console.log('\n=== DOC: system_settings/teachers_registry ===');
  const regSnap = await getDoc(doc(db, 'system_settings', 'teachers_registry'));
  if (regSnap.exists()) {
    const regData = regSnap.data();
    console.log(`teachers_registry totalTeachers: ${regData.totalTeachers}`);
    if (Array.isArray(regData.teachers)) {
      regData.teachers.forEach((t: any) => {
        console.log(`  [teachers_registry] id: ${t.id} | email: ${t.email} | name: ${t.name} | role: ${t.role}`);
      });
    }
  } else {
    console.log('system_settings/teachers_registry DOES NOT EXIST');
  }

  process.exit(0);
}

inspect().catch(err => {
  console.error('Error inspecting firestore:', err);
  process.exit(1);
});
