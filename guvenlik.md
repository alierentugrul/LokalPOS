\# LokalPOS - Güvenlik Açıkları ve Tehdit Modellemesi (Threat Modeling)



\*Bir Siber Güvenlik ve Sızma Testi Uzmanı Gözünden Sistem Koruması\*



LokalPOS, kapalı devre çalışan (sadece işletmecinin kullandığı) bir uygulama olsa da, veritabanı bulutta (Firebase) barınmakta ve cihaz fiziksel bir dükkan ortamında durmaktadır. Bu durum, sistemi hem siber tehditlere hem de fiziksel/mantıksal veri bozulmalarına açık hale getirir. Aşağıda tespit edilen potansiyel zafiyetler ve alınması gereken ekstra güvenlik önlemleri listelenmiştir.



\## 1. Firebase Veritabanı ve Yetkilendirme Güvenliği (Kritik)

\* \*\*Zafiyet (Açık Kapı):\*\* Firestore kurulumunda "Test Modu" seçildiği için ilk 30 gün boyunca internet bağlantısı olan ve proje kimliğini (Firebase Config) bilen herkes veritabanına veri yazabilir veya silebilir. React Native uygulamalarında config dosyaları tersine mühendislikle kolayca okunabilir.

\* \*\*Çözüm (Security Rules):\*\* Firebase konsolundan `Rules` (Kurallar) sekmesine gidilerek, veritabanı okuma ve yazma işlemleri sadece giriş yapmış (Authenticated) kullanıcıya kısıtlanmalıdır.

&#x20;   ```javascript

&#x20;   // Firestore Güvenlik Kuralı Örneği

&#x20;   match /{document=\*\*} {

&#x20;     allow read, write: if request.auth != null;

&#x20;   }

&#x20;   ```

\* \*\*Sıkılaştırma:\*\* Sadece giriş yapmış olmak yetmez, giriş yapan kişinin UID'sinin (Kullanıcı ID), işletmecinin tanımlı UID'si ile eşleşip eşleşmediği de kurallara eklenebilir.



\## 2. Mantıksal Açıklar (Business Logic Vulnerabilities)

Kodun teknik olarak doğru çalışması, mantıksal olarak güvenli olduğu anlamına gelmez. Finansal veriler manipülasyona kapalı olmalıdır.

\* \*\*Negatif Veri Girişi:\*\* Eğer miktar veya fiyat giriş alanlarında sadece rakam kontrolü (validation) yapılmazsa, sisteme "-5 adet çay" girilerek gün sonu cirosu suni olarak düşürülebilir. Tüm sayısal girdilerde "Sıfırdan büyük olmalı" ( `> 0` ) şartı aranmalıdır.

\* \*\*Geçmişi Değiştirme (Kayıt Silme Riski):\*\* Ödemesi alınmış ve hesabı kapatılmış bir veresiye kaydı veya gün sonu siparişi silindiğinde (Delete), ciro verileri geriye dönük bozulur.

\* \*\*Çözüm (Soft Delete ve Loglama):\*\* Finansal uygulamalarda veri silinmez, "İptal Edildi" (Status: Cancelled) olarak işaretlenir. İptal edilen kayıtlar arka planda tutulmaya devam etmeli, sadece arayüzdeki ciro toplamından düşülmelidir.



\## 3. Fiziksel Çevre ve Cihaz İçi Güvenlik

Kullanılan cihazın bir dükkan ortamında, tezgahın üzerinde duracağı unutulmamalıdır.

\* \*\*Fiziksel Müdahale Riski:\*\* İşletmeci sipariş hazırlarken telefonu masada bıraktığında, kötü niyetli biri uygulamaya girip veresiye defterinden kendi borcunu silebilir veya değiştirebilir.

\* \*\*Çözüm (Biyometrik Kilit):\*\* Uygulama arka plana atılıp tekrar açıldığında veya ekran 5 dakika boyunca kilitli kaldığında, uygulamanın içine girmek için Expo'nun `expo-local-authentication` paketi kullanılarak anında \*\*Face ID\*\* veya cihaz parolası doğrulama ekranı tetiklenmelidir. iPhone 15'in Face ID donanımı bu süreci işletmeci için saniyelik ve zahmetsiz bir hale getirecektir.



\## 4. Local Storage (Yerel Depolama) Sızıntıları

\* \*\*Zafiyet:\*\* Kullanıcı oturumu açık kalsın diye token'lar veya bazı önbellek verileri şifrelenmeden cihaz hafızasına (örneğin standart `AsyncStorage` ile) yazılırsa, bu veriler güvenlik riski oluşturabilir.

\* \*\*Çözüm:\*\* Hassas veriler (özellikle Auth token'ları veya işletmeci ayarları) saklanacaksa, React Native tarafında standart AsyncStorage yerine donanımsal şifreleme kullanan `expo-secure-store` modülü tercih edilmelidir.



\## 5. Çevrimdışı/Çevrimiçi Senkronizasyon Çakışmaları

\* \*\*Zafiyet:\*\* Cihaz internetsiz ortamda işlem yaparken arka arkaya çok fazla asenkron veri birikirse, internet geldiğinde veritabanına aynı siparişin mükerrer (çift) yazılması riski doğar (Race Condition).

\* \*\*Çözüm:\*\* Her siparişe işlem anında benzersiz bir ID (UUID) atanarak, Firebase'e gönderilirken aynı ID'nin önceden yazılıp yazılmadığı kontrol edilmelidir (Idempotency Key mantığı).

