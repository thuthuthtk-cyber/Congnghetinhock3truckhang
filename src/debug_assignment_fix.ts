
import { getAssignmentsFromFirestore, saveAssignmentToFirestore } from './services/assignmentStorageService';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './services/firebase';

initializeApp(firebaseConfig);

async function run() {
  const assignments = await getAssignmentsFromFirestore();
  let fixedCount = 0;
  for (const a of assignments) {
    if (a.questions) {
      for (const q of a.questions) {
        if (q.type === 'ordering' || q.type === 'sắp xếp') {
          // Check if it's the quạt điện question by looking for keywords
          const isQuat = q.options?.some(o => /quạt/i.test(o));
          if (isQuat) {
            console.log("Found quat question in assignment:", a.title, q.content);
            // Fix sequence: Phát hiện -> Tắt -> Thông báo
            const newOrder = [
                "Phát hiện quạt rung lắc",
                "Nhanh chóng bấm nút tắt quạt",
                "Thông báo cho người lớn"
            ];
            if (JSON.stringify(q.options) !== JSON.stringify(newOrder)) {
                q.options = newOrder;
                q.correctAnswer = newOrder.join(' -> ');
                fixedCount++;
            }
          }
        }
      }
      if (fixedCount > 0) {
        await saveAssignmentToFirestore(a);
      }
    }
  }
  console.log("Fixed", fixedCount, "assignment questions");
}

run();
