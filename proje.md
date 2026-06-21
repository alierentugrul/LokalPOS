# Proje Adı: LokalPOS - Esnaf ve Çay Ocağı Sipariş Yönetim Sistemi

## 1. Projenin Amacı ve Hedef Kitlesi
LokalPOS, tek başına işletilen lokal, çay ocağı veya büfe gibi küçük işletmelerin sipariş, veresiye ve günlük ciro takibini dijitalleştirmek amacıyla tasarlanmış bir mobil uygulamadır. Geleneksel kalem-kağıt ve hesap makinesi yöntemlerinin yarattığı zaman kaybını ve hesap hatalarını ortadan kaldırarak, işletmeciye hız ve finansal kontrol sağlamayı hedefler. İlk sürüm, bir galericiler sitesindeki lokalin ihtiyaçlarına özel olarak geliştirilecektir.

## 2. Kullanılacak Teknolojiler
*   **Frontend (Mobil):** React Native / Expo
*   **Derleme ve Dağıtım (CI/CD):** EAS (Expo Application Services) - Bulut tabanlı iOS derlemesi.
*   **Backend & Veritabanı:** Firebase (Authentication, Cloud Firestore)
*   **Animasyon ve UI:** Lottie (Animasyonlu açılış ekranı için)

## 3. Temel Özellikler ve Kullanıcı Akışı

### A. Kimlik Doğrulama ve Karşılama
*   **Splash Screen:** İşletme konseptine uygun, animasyonlu çay bardağı logosu ile açılış.
*   **Giriş Sistemi:** Firebase Auth destekli, yetkisiz erişimi engelleyen yönetici giriş ekranı.

### B. Müşteri (Galerici) Yönetimi
*   Sisteme kayıtlı galericilerin/müşterilerin listelendiği ana kontrol paneli.
*   Yeni müşteri ekleme, düzenleme ve silme işlemleri.
*   Hızlı arama çubuğu ile müşterilere anında ulaşım.

### C. Sipariş ve Satış Akışı
*   Müşteri profiline girildiğinde hızlı sipariş butonları (Çay, Kakao, Salep, Ayran, Tuzlu Limonlu Ayran, Tost vb.).
*   Miktar seçimi ve anında sipariş onayı.
*   **Veresiye Sistemi:** Girilen tüm siparişler, işletme modeline uygun olarak varsayılan (default) şekilde müşterinin veresiye hesabına yazılır.

### D. Finansal Yönetim ve Raporlama
*   **Veresiye Ekranı:** Hangi müşterinin ne kadar borcu olduğunun toplu olarak görüntülendiği, ödeme alındığında borç düşme/sıfırlama işlemlerinin yapıldığı tahsilat modülü.
*   **Günlük Ciro Ekranı:** Günlük, haftalık ve aylık bazda toplam satışların ve gelirin analizi.
*   **Maliyet Ayarları:** Sistemdeki her ürünün maliyet fiyatının girilebileceği dinamik ayarlar sayfası. Bu sayede ciro üzerinden net kar-zarar hesaplamasının otomatik yapılması.

## 4. Veritabanı Mimarisi (Draft)
*   **`Users` Koleksiyonu:** İşletmeci hesap bilgileri.
*   **`Customers` Koleksiyonu:** Galericilerin bilgileri (Ad, Bakiye/Borç durumu).
*   **`Products` Koleksiyonu:** Ürün listesi (Ad, Satış Fiyatı, Maliyet).
*   **`Orders` Koleksiyonu:** Günlük sipariş dökümleri (Tarih, Müşteri ID, Ürün ID, Adet, Tutar, Durum: Ödendi/Veresiye).

## 5. Proje Çıktısı ve Test Süreci
Uygulamanın arayüz tasarımı ve kodlaması tamamlandıktan sonra Expo üzerinden QR kod ile canlı testleri yapılacak, ardından EAS üzerinden iOS platformu için `.ipa` derlemesi alınarak hedef cihazda (iPhone 15) stabilite testleri gerçekleştirilecektir.