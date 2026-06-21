# LokalPOS Finansal Yönetim ve Ciro Takip Modülü Analizi

*Bir Muhasebe ve Finans Uzmanı Gözünden Sistem Tasarımı*

Bir işletmenin hayatta kalması kasasına giren paraya, büyümesi ise bu parayı nasıl yönettiğine bağlıdır. Özellikle galericiler sitesi gibi sirkülasyonu yüksek, "yaz deftere" (veresiye) kültürünün hakim olduğu esnaf modelinde, ciro ve nakit akışı yönetimi hayati önem taşır. Bu modül sadece günlük hasılatı toplayan bir hesap makinesi değil, işletmenin röntgenini çeken bir finansal zeka olmalıdır.

Aşağıda, 10 yıllık muhasebe ve denetim tecrübesi ışığında LokalPOS ciro sisteminin nasıl kurgulanması gerektiğine dair mimari detaylar yer almaktadır.

---

## 1. Temel Muhasebe Prensibi: Tahakkuk ve Tahsilat Ayrımı
Lokal gibi B2B (esnaftan esnafa) çalışan işletmelerde en büyük finansal hata, "satış" ile "tahsilatı" birbirine karıştırmaktır. Çay bardağı masaya konduğu an işletme geliri elde etmiştir (Tahakkuk). Ancak parası henüz kasaya girmemiştir (Tahsilat).

*   **Brüt Ciro (Tahakkuk Eden Hasılat):** O gün satılan tüm ürünlerin (peşin + veresiye) toplam satış değeridir. İşletmenin gerçek performansını ve üretim kapasitesini gösterir.
*   **Nakit Akışı (Kasa/Banka Girişi):** O gün fiilen tahsil edilen tutardır. Geçmiş borçların ödenmesini de kapsar.
*   **Sistem Gereksinimi:** Uygulama ekranında "Bugünkü Satışlar" ile "Bugün Kasaya Giren Para" net çizgilerle ayrılmalıdır. İşletmeci, cebindeki paranın ne kadarının bugünün satışı, ne kadarının geçmişin tahsilatı olduğunu bir bakışta görebilmelidir.

## 2. Satışların Maliyeti (SMM) ve Gerçek (Net) Kâr Analizi
Ciro bir makyajdır, asıl gerçeklik kârdır. Günde 2.000 TL ciro yapan bir işletme, eğer maliyetlerini doğru ölçemiyorsa gün sonunda zararına yoruluyor olabilir. 

*   **Birim Maliyetleme:** Ayarlar modülünde her ürün için dinamik bir "Birim Maliyet" alanı olmalıdır. 
    *   *Örnek:* Bir bardak çayın satış fiyatı 15 TL ise; çay yaprağı, şeker, su, elektrik ve karton bardak maliyeti hesaplanıp örneğin 4.5 TL olarak sisteme girilebilmelidir.
*   **Otomatik Brüt Kâr Marjı:** Sistem arka planda `(Satış Fiyatı - Birim Maliyet) * Miktar` formülünü çalıştırarak gün sonu net kârı hesaplamalıdır.
*   **Maliyet Güncelleme Koruması (Önemli!):** Toptancıdan çaya zam geldiğinde ve işletmeci maliyeti güncellediğinde, bu güncelleme *sadece o andan sonraki* satışları etkilemeli, geçmiş ciro ve kâr raporlarını bozmamalıdır. (Veritabanında satış fiyatı ve maliyet, sipariş anında "snapshot" olarak kopyalanıp o günkü kayda mühürlenmelidir).

## 3. Cari Hesap (Veresiye) Mutabakatı ve Risk Yönetimi
Geleneksel veresiye defterlerinde hesaplar sıklıkla karışır. Dijital cari hesap yönetimi, müşteri (galerici) ile işletmeci arasındaki güvenin dijital sözleşmesidir.

*   **Açık Hesap (Bakiye) Takibi:** Her galericinin bir "Cari Hesabı" (Müşteri Kartı) olmalıdır. Siparişler default olarak buraya borç kaydedilir (Aktif artışı).
*   **Tahsilat İşlemi:** Galerici cuma günü toplu ödeme yaptığında (Örn: "Hesaptan 1.000 TL düş"), sistem bunu bir ürün satışı olarak değil, "Tahsilat" (Kasa girişi / Cari alacak düşüşü) olarak kaydetmelidir.
*   **Şeffaf Ekstre (Hesap Dökümü):** Müşteri hesabını sorduğunda uygulama tek tuşla şu dökümü ekrana getirmelidir: *"Pazartesi 10 çay, 2 tost; Çarşamba 5 ayran... Toplam borç: X TL, Önceki Ödemeler: Y TL, Kalan Bakiye: Z TL"*.

## 4. Z Raporu ve Finansal Dashboard (Yönetici Paneli)
İşletmeci dükkanı kapatırken zihnini de rahatça kapatabilmelidir. Ciro paneli karmaşık grafiklerden ziyade net rakamlar sunmalıdır.

**Gün Sonu Ekranında Yer Alması Gereken Veri Setleri:**
*   **Toplam Satış Hacmi (Adet Bazlı):** (Örn: 210 Bardak Çay, 15 Tost, 8 Kakao) - Bu veri ertesi günün stok planlaması için elzemdir.
*   **Oluşan Toplam Ciro:** (Günün tüm satışlarının parasal karşılığı).
*   **Günün Net Kârı (Fiktif Kâr Arındırılmış):** (Toplam Ciro - Toplam SMM).
*   **Kasaya Giren Nakit / Çıkan Veresiye Oranı:** İşletmenin sıcak para döngüsü ne durumda?
*   **İkram, Zayi ve Tüketimler:** İşletmecinin kendisine yaptığı çaylar, dökülen salepler veya galericilere yapılan ücretsiz ikramlar cirodan değil, direkt maliyetten düşülmelidir. Bunun için uygulamada küçük bir "İkram/Fire Yaz" butonu tasarlanabilir.

## 5. İleri Düzey Analizler (ABC ve Trend Analizi)
Sistemde 1-2 aylık veri biriktiğinde, uygulama bir finansal danışman gibi konuşmaya başlamalıdır.
*   **Sürüm Ürünleri (A Grubu):** Hangi ürün kasaya en çok sıcak para girişini sağlıyor? (Genellikle Çay).
*   **Kâr Jeneratörleri (B Grubu):** Satış adedi düşük olsa da birim başına en yüksek kâr marjını bırakan ürünler hangileri? (Örn: Tuzlu limonlu ayran veya Salep).
*   **Riskli Alacaklar Uyarısı:** Bakiyesi çok şişen ve örneğin 15 gündür hiç tahsilat yapılamayan galerici hesaplarının, işletmeciye kırmızı bir uyarı ikonu ile raporlanması.

---
**Teknik Mimar Notu:** Firebase yapılandırmasında `Orders` (Siparişler/Satışlar) tablosu ile `Payments` (Tahsilatlar) tablolarını kesinlikle ayrı koleksiyonlarda tutunuz. Ciro, Orders tablosundan; Kasa ve Nakit Akışı ise Payments tablosundan beslenmelidir.