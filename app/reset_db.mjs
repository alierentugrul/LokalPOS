import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipeDatabase() {
  console.log("Sıfırlama işlemi başlatılıyor...");

  // 1. Orders
  console.log("Siparişler siliniyor...");
  const ordersSnap = await getDocs(collection(db, 'orders'));
  for (const docSnap of ordersSnap.docs) {
    await deleteDoc(doc(db, 'orders', docSnap.id));
  }
  console.log(`Silindi: ${ordersSnap.size} sipariş.`);

  // 2. Payments
  console.log("Tahsilatlar siliniyor...");
  const paymentsSnap = await getDocs(collection(db, 'payments'));
  for (const docSnap of paymentsSnap.docs) {
    await deleteDoc(doc(db, 'payments', docSnap.id));
  }
  console.log(`Silindi: ${paymentsSnap.size} tahsilat.`);

  // 3. Customers
  console.log("Müşteri bakiyeleri sıfırlanıyor...");
  const customersSnap = await getDocs(collection(db, 'customers'));
  for (const docSnap of customersSnap.docs) {
    await updateDoc(doc(db, 'customers', docSnap.id), { balance: 0 });
  }
  console.log(`Sıfırlandı: ${customersSnap.size} müşteri bakiyesi.`);

  console.log("TÜM İŞLEMLER BAŞARIYLA TAMAMLANDI!");
  process.exit(0);
}

wipeDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
