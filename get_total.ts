import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function getTotalBalance() {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let total = 0;
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data && typeof data.balance === 'number') {
        total += data.balance;
      }
    });
    console.log(`TOTAL_BALANCE_OUTPUT: ${total}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

getTotalBalance();
