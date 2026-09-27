
import { fetchQuestionsFromFirestore } from '../src/services/questionStorageService';

async function run() {
  const q = await fetchQuestionsFromFirestore();
  const target = q.find(item => item.content && item.content.includes("quạt rung lắc"));
  console.log(JSON.stringify(target, null, 2));
}

run();
