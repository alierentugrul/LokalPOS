# ☕ LokalPOS (SaaS Edition)

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![SaaS Ready](https://img.shields.io/badge/Architecture-SaaS_Multi--Tenant-success?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Biometric_%26_Rules-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)


LokalPOS, çay ocakları, kahvehaneler, lokaller ve küçük işletmeler için özel olarak geliştirilmiş modern, hızlı ve kullanımı kolay bir mobil **Adisyon ve Veresiye Takip** uygulamasıdır. Son güncellemelerle birlikte tam teşekküllü bir **SaaS (Software as a Service)** ürünü haline gelmiş olup, yüksek güvenlik standartlarına ve çoklu işletme (Multi-Tenant) desteğine kavuşmuştur.

React Native (Expo) ve Firebase altyapısı kullanılarak inşa edilmiş olup, hem iOS hem de Android cihazlarda sorunsuz çalışacak şekilde tasarlanmıştır.

---

## ✨ Özellikler

### 🛡️ Güvenlik ve Mimari
- **Multi-Tenant (Çoklu İşletme) Yalıtımı:** Sisteme kayıt olan her işletmenin verisi (Müşteriler, Siparişler, Kasa, Katalog) kendi ID'sine (UID) zimmetlenir. Hiçbir işletme diğerinin verisini göremez.
- **E-posta Doğrulamalı Kayıt:** Yeni açılan hesaplar e-posta doğrulaması (Email Verification) yapmadan sisteme giriş yapamaz, sahte bot hesapların önüne geçilir.
- **Biyometrik Kilit (Face ID / Touch ID):** İşletme sahibi uygulamayı arka plana atıp tekrar açtığında `expo-local-authentication` ile biyometrik kilit devreye girer. Cihaz masada unutulsa bile veriler güvendedir.
- **Güvenli İptal (Soft Delete):** Finansal tutarsızlıkları önlemek için siparişler ve müşteriler fiziksel olarak silinmez (`deleteDoc` kullanılmaz); arka planda `status: 'cancelled'` veya `isDeleted: true` olarak işaretlenip ekrandan gizlenir (Geriye dönük denetim için saklanır).
- **Çevrimdışı Çalışma (Offline Persistence):** İnternet kopsa bile sipariş almaya devam edebilirsiniz. İnternet geldiğinde Firebase önbelleği (persistent cache) verileri otomatik olarak buluta eşitler.
- **Firestore Security Rules:** Sadece kimliği doğrulanmış kullanıcıların kendi verilerini okuyup yazabileceği katı sunucu taraflı kurallar devrededir (`firestore.rules`).

### 💼 İşletme Yönetimi
- **Müşteri Yönetimi:** Müşterileri kaydetme, düzenleme ve bakiye takibi.
- **Dinamik Ürün Kataloğu:** Ürünleri kategorilerine göre ekleme, fiyat/maliyet belirleme ve stok durumu yönetimi (Tükendi / Stokta).
- **Hızlı Sipariş (POS):** Tek tıkla sepete atma veya tekil ürün için uzun basarak hızlı Peşin, Veresiye, İkram siparişi girme.
- **Veresiye ve Kasa Takibi:** Müşterilerin borçlarını anlık görme, kısmi veya tam tahsilat yapma.
- **Detaylı Finansal Analiz (Z Raporu):** 
  - Günlük, Haftalık ve Aylık Brüt Ciro ve Net Kâr hesaplamaları.
  - Sürüm liderleri (en çok satanlar) ve kâr jeneratörleri (en çok kazandıranlar) analizleri.
  - Anlık kasa nakit akışı raporlaması.

### 🎨 Kullanıcı Deneyimi (UX/UI)
- **Haptik Geri Bildirim:** Sipariş girme, sepet onaylama ve tahsilat gibi işlemlerde dokunsal titreşim (Haptics) desteği.
- **Akıcı Animasyonlar:** Lottie (lottie-react-native) ile donatılmış splash screen ve geçişler.
- **Karanlık/Aydınlık (Dark/Light) Mod:** Cihaz temasına uyumlu, gece "Onyx & Gold" konseptli yorgunluk önleyici tasarım.
- **Kullanıcı Dostu Modallar:** Native modal davranışlarına uygun hızlı kapatılabilir alt paneller (Bottom Sheets).

---

## 🛠️ Kullanılan Teknolojiler

- **Frontend:** React Native, Expo, React Navigation
- **Backend / Veritabanı:** Firebase Auth, Firebase Firestore (Offline Cache destekli)
- **Güvenlik Donanımı:** `expo-local-authentication` (Biometrics)
- **Deneyim:** `expo-haptics` (Titreşim), Lottie, React Native Animated API
- **İkonlar ve Tipografi:** Expo Vector Icons (Ionicons), Google Fonts (JetBrains Mono, Playfair Display)

---

## 🚀 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin:

### Gereksinimler
- Node.js (v18+)
- npm veya yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS (Face ID) testleri için EAS Build veya fiziksel cihaz + Expo Go (bazı native modüller EAS gerektirebilir).

### Adımlar

1. **Depoyu Klonlayın:**
   ```bash
   git clone https://github.com/KULLANICI_ADINIZ/LokalPOS.git
   cd LokalPOS/app
   ```

2. **Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```

3. **Firebase Yapılandırması:**
   `app/src/config/firebase.js` dosyasını oluşturun ve Firebase Console'dan aldığınız config verilerini girin.

4. **Security Rules Kurulumu:**
   Proje ana dizinindeki `firestore.rules` dosyasının içeriğini Firebase Console -> Firestore Database -> Rules sekmesine yapıştırıp yayınlayın.

5. **Uygulamayı Başlatın:**
   ```bash
   npx expo start
   ```

---

## 📄 Lisans

Bu proje SaaS (Hizmet Olarak Yazılım) mimarisinde kişisel ve ticari kullanım standartlarına uygun geliştirilmiştir. Tüm hakları saklıdır.
