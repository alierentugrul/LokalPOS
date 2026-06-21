# Çaycı App: Tasarım ve Estetik Rehberi (Design System)

Bu doküman, uygulamanın görsel dilini ve tema yapısını belirler. Geliştirmeler sırasında buradaki estetik kurallara ve "AI slop"tan (jenerik yapay zeka tasarımlarından) uzak durma prensiplerine kesinlikle uyulmalıdır.

## Temel Felsefe
- **Jenerik Tasarımlardan Kaçın:** Varsayılan (default) mavi-beyaz tasarımlar, standart gölgeler veya sistem fontlarından kaçının.
- **Kimlikli ve Karakterli:** Uygulama bir "Çaycı" veya "Lüks Kafe" hissiyatı vermelidir. Klasik bakkal defteri görünümü yerine, **modern, premium ve tok** bir arayüz hedeflenir.
- **Hareket (Motion):** Geçişlerde ve butona tıklamalarda yumuşak, gecikmesiz ve native hissettiren mikro-animasyonlar kullanılmalıdır. Kaba veya birdenbire beliren (flash) görünümlerden kaçının.
- **Arkaplan Derinliği:** Dümdüz tek renk zeminler yerine animasyonlu (AnimatedBackground), hafif ışık haleleri barındıran veya lüks degradeler (LinearGradient) içeren arkaplanlar kullanılmalıdır.

## Tipografi
- Ana Başlıklar: **Playfair Display** (Premium ve zarif)
- Veriler, Metinler ve Sayılar: **JetBrains Mono** (Daktilo / Fiş hissiyatı, monospaced olduğu için fiyat hizalamalarında kusursuzdur)

## Renk Paleti ve Temalar

Uygulama Dinamik Tema (Açık/Koyu) sistemine sahiptir. Ana aksan her iki temada da sabittir:
*   **Ana Renk (Altın/Bakır):** `#C89040` (Primary)

### 1. Koyu Tema (Gece Mavisi & Antika Altın - Midnight Navy)
Klasik lüks gece kulübü veya lüks restoran konsepti. (Yeşil tonlar tamamen yasaktır!)
- **Zeminler (Background/Surface):** Gece mavisi ve koyu antrasit karışımı (`#080C14`, `#0E1522`, `#141E30`)
- **Metinler:** Sıcak Krem ve Fildişi (`#EFEADD`)
- **Çizgiler:** Açık ve parlak olmayan lüks lacivert çizgiler (`#24344D`)

### 2. Açık Tema (Cafe Creme & Antika Altın) *YENİ*
Aydınlık, ferah, sıcak çay/kahve dükkanı konsepti.
- **Zeminler (Background/Surface):** Sıcak İnci/Krem tonları (`#F2EFE9`, `#FAFAF7`, `#FFFFFF`)
- **Metinler:** Çok Koyu Lacivert/Antrasit (`#1A202C`)
- **Çizgiler:** Yumuşak Latte/Kum tonları (`#E2DCD0`)

## Bileşen Yapısı (Component Patterns)
- Kartlar yuvarlak köşeli (borderRadius: 14/16), kenarlıklı (borderWidth: 1) ve düz gölgelere sahip olmalıdır.
- Finansal sayılar (ciro, borç vs.) büyük puntolu monospace olmalı ve kesinlikle ilgili duruma göre renk almalıdır (Tehlike/Borç: Kırmızı `#CC5842`, Tahsilat/Artı: Yeşil `#6CC498`).
- Alt Tab Bar, zeminle bütünleşmeli ancak hafif havada süzülüyormuş gibi bir hissiyat yaratmalıdır (absolute + elevation 0 + transparent).