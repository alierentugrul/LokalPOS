\# LokalPOS - Kalite Güvence (QA) ve Test Senaryoları Ajani



\*Bir QA ve Test Otomasyon Uzmanı Gözünden Sistem Doğrulaması\*



LokalPOS uygulaması, galericiler sitesindeki yoğun iş temposunda sıfır hata ile çalışmak zorundadır. Bu doküman, uygulamanın Expo üzerinden canlıya (iPhone 15) alınmadan önce geçmesi gereken stres ve doğrulama testlerinin (UAT - User Acceptance Testing) yol haritasıdır.



\## 1. Fonksiyonel Testler (Temel İşlevlerin Doğrulanması)

Uygulamanın ana damarlarının sorunsuz çalıştığından emin olunmalıdır:

\* \*\*Auth (Giriş) Testi:\*\* Yönetici hesabı dışında uydurma bir e-posta ve şifre ile giriş yapılmaya çalışıldığında sistemin güvenli bir şekilde hata mesajı (Uyarı UI) verip vermediği test edilmelidir.

\* \*\*Sipariş ve Veresiye Akışı:\*\* Bir müşteriye (Örn: Görkem) ardışık olarak 3 Çay, 2 Tost girildiğinde; sistemin bu ürünleri Firebase veri tabanına doğru adet, fiyat ve tarih damgasıyla aktarıp aktarmadığı kontrol edilmelidir.

\* \*\*Ciro ve Maliyet Doğrulaması:\*\* Ayarlar panelinden bir ürünün maliyeti değiştirildikten sonra girilen yeni siparişlerde, "Gün Sonu Net Kâr" hesaplamasının matematiksel olarak %100 doğru çalıştığı manuel hesaplamalarla karşılaştırılmalıdır.



\## 2. UI/UX ve Performans Testleri (Kullanıcı Deneyimi)

Görsel hiyerarşinin ve arayüz tepkilerinin saha şartlarına uygunluğu test edilmelidir:

\* \*\*"Fat Finger" (Kalın Parmak) Testi:\*\* Sipariş ekranındaki butonların tıklanma alanları (hitbox) yeterince geniş mi? Aceleyle çay butonuna basarken yanlışlıkla yanındaki ayran butonuna basma riski var mı?

\* \*\*Görsel Geri Bildirim:\*\* Bir sipariş girildiğinde veya tahsilat yapıldığında, kullanıcıya başarılı olduğuna dair tatmin edici bir görsel geri bildirim (Lottie animasyonu, haptik titreşim veya renk değişimi) veriliyor mu?

\* \*\*Cihaz Uyumluluğu:\*\* Uygulama arayüzü, hedef cihaz olan iPhone 15'in "Dynamic Island" çentiğine veya ekran altındaki "Home Indicator" çizgisine taşıyor mu? Güvenli alan (SafeArea) testleri Expo üzerinden dikkatlice yapılmalıdır.



\## 3. Edge Cases (Sınır Durumlar ve Stres Testleri)

İşletmecinin yapabileceği "beklenmedik" hareketlere karşı uygulamanın dayanıklılığı ölçülmelidir:

\* \*\*Hızlı Tıklama (Spam) Testi:\*\* Bir masadan art arda 10 çay siparişi geldiğinde, butona saniyede 3 kez basıldığında sistem çöküyor mu yoksa her bir tıklamayı sıraya alıp veritabanına sorunsuz iletiyor mu? (Debounce/Throttle kontrolü).

\* \*\*Fiyat Değişimi Çakışması:\*\* Ayarlar panelinden çayın fiyatı güncellenirken, o esnada başka bir sekmede çay siparişi verilirse sistem hangi fiyatı baz alıyor?

\* \*\*İptal ve Geri Alma:\*\* Yanlış girilen bir siparişi veya tahsilatı geri almak/silmek (Undo) istenildiğinde, ciro ve veresiye bakiyesi anında eski haline dönüyor mu?



\## 4. Firebase ve Çevrimdışı (Offline) Senaryoları

Lokal ağındaki internet kesintilerinde işleyişin durmaması hayati önem taşır:

\* \*\*İnternetsiz Sipariş Testi:\*\* Telefonun Wi-Fi ve Hücresel verisi kapatıldıktan sonra (Uçak modu), uygulamaya 5 farklı sipariş girilmeli.

\* \*\*Senkronizasyon Kontrolü:\*\* İnternet bağlantısı tekrar sağlandığında, çevrimdışı girilen bu 5 siparişin Firebase Firestore'a otomatik ve kayıpsız bir şekilde push edilip edilmediği test edilmelidir.



\## 5. Dağıtım ve EAS Build Doğrulaması

\* Expo üzerinden alınan son iOS `.ipa` derlemesinin cihazda pürüzsüz kurulduğu ve 7 günlük imza süreçlerinin (veya kullanılan alternatif yöntemin) stabil çalıştığı doğrulanmalıdır.

