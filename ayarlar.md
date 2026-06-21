# LokalPOS - Ürün ve Katalog Yönetimi Modülü Analizi

*Bir Ürün Yönetim Uzmanı Gözünden Ayarlar Paneli Mimarisi*

Uygulamanın uzun ömürlü olması, kullanıcının sisteme bağımlı olmadan kendi iş akışını özgürce yönetebilmesine bağlıdır. Ayarlar panelindeki sabit ürün yapısından, tam yetkili bir "Dinamik Ürün Katalog Sistemi"ne geçiş, LokalPOS'u basit bir sipariş aracından gerçek bir POS sistemine dönüştürecek en kritik adımdır.

## 1. Dinamik Ürün Yönetimi (CRUD Operasyonları)
İşletmeci ürün yelpazesine tam hakim olmalıdır. Panel aşağıdaki temel işlevleri kusursuz ve basit bir arayüzle sunmalıdır:
* **Ürün Ekleme (Create):** İşletmeci istediği an yeni bir ürün (Örn: "Karışık Tost", "Soğuk Çay") ekleyebilmelidir.
* **Ürün Düzenleme (Update):** Sadece fiyat değil; ürün adı, maliyeti ve kategorisi de güncellenebilmelidir.
* **Aktif/Pasif Durumu (Soft Delete):** Bir ürün menüden kalktığında veritabanından kalıcı olarak silinmemelidir (Hard Delete). Eğer silinirse, geçmiş ayların ciro raporlarında "Bilinmeyen Ürün" hatası patlak verir. Bunun yerine bir toggle (aç-kapat) butonu ile ürün sipariş ekranında "Görünmez" hale getirilmelidir.

## 2. Satış Hızı ve Görsel Hiyerarşi (UI/UX)
Sipariş ekranındaki hız, ürünlerin ne kadar kolay ayırt edildiğine bağlıdır. İşletmeci her yeni ürün eklediğinde o ürünü görsel olarak da kategorize edebilmelidir.
* Özellikle grafik tasarım projelerindeki görsel hiyerarşi tecrübeni bu alanda konuşturarak, işletmecinin ürün eklerken o ürüne özel bir **renk kodu veya ikon** (Çay için sıcak bir kırmızı, ayran için mavi, tost için turuncu gibi) atayabileceği bir yapı kurgulayabilirsin.
* Bu görsel etiketleme, kalabalıklaşan sipariş ekranında işletmecinin reflekslerini ikiye katlayacaktır.

## 3. Akıllı Fiyat ve Maliyet Mimarisi
Ürün kartı sadece etiket fiyatından ibaret değildir. 
* **Satış Fiyatı:** Kasaya girecek brüt tutar.
* **Birim Maliyet:** Ürünün işletmeye olan maliyeti (Ciro ekranındaki net kâr hesaplaması için zorunludur).
* **Anlık Fiyat Geçmişi (Snapshot):** Ayarlar panelinden bir ürünün fiyatı 10 TL'den 15 TL'ye çıkarıldığında, eski siparişlerin toplam cirosu geriye dönük olarak bozulmamalıdır. Fiyat değişikliği sadece o andan sonraki siparişleri etkileyecek şekilde veritabanı kuralları yazılmalıdır.

## 4. Kategori Bazlı Gruplandırma (Gelecek Vizyonu)
Lokaldeki çeşitler şu an az görünse de zamanla artacaktır. Ürünler eklenirken bir kategori ("İçecekler", "Yiyecekler", "Aperatifler") seçtirilmeli. Bu sayede ana sipariş ekranında sekmeli bir yapı kurularak sonsuz bir ürün listesinde kaydırma yapmanın önüne geçilir.

## 5. Stok (Tükendi) Hızlı Kontrolü
Ayarlar panelinde her ürünün yanında bir "Bugün Var/Yok" butonu olmalıdır. Öğleden sonra tost ekmeği bittiğinde, işletmeci bu butonu kapatarak sipariş ekranındaki tost butonunu inaktif (gri) hale getirebilmeli, böylece yanlışlıkla sipariş girip iptal etmekle uğraşmamalıdır.