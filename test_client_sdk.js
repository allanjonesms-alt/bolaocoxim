import { initializeApp } from 'firebase/app';
import { initializeFirestore, getDocs, collection } from 'firebase/firestore';
import fs from 'fs';

async function main() {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    const app = initializeApp(firebaseConfig);
    const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

    console.log("=== MATCHES ===");
    const matchesSnap = await getDocs(collection(db, "matches"));
    matchesSnap.forEach(doc => {
      const data = doc.data();
      console.log(`Match ID: ${doc.id} | ${data.team1} X ${data.team2} | Date: ${data.date} | Status: ${data.status}`);
    });

    console.log("\n=== MINUTO CERTO DRAWS ===");
    const drawsSnap = await getDocs(collection(db, "minuto_certo_draws"));
    drawsSnap.forEach(doc => {
      const data = doc.data();
      console.log(`Draw ID: ${doc.id} | MatchName: ${data.matchName} | Price: ${data.price} | Prize: ${data.prize} | Status: ${data.status}`);
    });

    console.log("\n=== MINUTO CERTO TICKETS ===");
    const ticketsSnap = await getDocs(collection(db, "minuto_certo_tickets"));
    console.log(`Total Tickets: ${ticketsSnap.size}`);
    ticketsSnap.forEach(doc => {
      const data = doc.data();
      console.log(`Ticket ID: ${doc.id} | DrawID: ${data.drawId} | UserName: ${data.userName} | Minute: ${data.minuteLabel} (${data.minuteValue})`);
    });

  } catch (e) {
    console.error("Error running script:", e);
  }
}

main();
