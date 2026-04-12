# FORTRESS FANTASY — Game Design Document v1.0
> Bu döküman Claude Code için yazılmıştır. Her sistem eksiksiz implement edilmelidir.

---

## ⚠️ CLAUDE CODE İŞBİRLİĞİ KURALLARI — ÖNCE BUNU OKU

Bu proje **iki ayrı Claude Code instance'ı** tarafından geliştirilmektedir. Biri **Claude** (server tarafı), diğeri **Claude Akin** (client tarafı). Çakışmaları önlemek için aşağıdaki kurallara kesinlikle uy.

### Kimin Ne Yaptığı

| Instance | Klasör | Sorumluluk |
|---|---|---|
| **Claude** | `/server` + `/shared` | Colyseus server, room, state şemaları, AI, pathfinding, wave logic |
| **Claude Akin** | `/client` | Phaser sahneleri, hero, binalar, HUD, UI, kamera, input |

### Altın Kural
- **Claude** → `/client` klasörüne **asla dokunmaz**
- **Claude Akin** → `/server` klasörüne **asla dokunmaz**
- `/shared` klasörü sadece **Claude** tarafından yazılır, **Claude Akin** sadece okur

---

### Git İş Akışı — Her Oturum Başında Yap

```bash
git pull origin main
```
Çalışmaya başlamadan önce her zaman pull at. Karşı tarafın yaptıklarını al.

```bash
git add .
git commit -m "açıklama"
git push origin main
```
Bir görevi bitirince hemen push at. Biriktirme.

---

### Bağımlılık Durumu — Bekle & Kontrol Et

Bazı görevler diğer instance'ın bitirmesini bekler. Bu durumda şunu yap:

1. `git pull origin main` çek
2. Beklediğin dosya/klasör geldi mi kontrol et
3. Gelmediyse **dur, o göreve geçme**, başka bir görevi yap veya kullanıcıya bildir
4. Gelince devam et

Bağımlılıklar aşağıdaki görev listesinde `⏳ BEKLE:` olarak işaretlenmiştir.

---

### PROGRESS.md Güncelleme Kuralı

Her görevi tamamlayınca `PROGRESS.md` dosyasında ilgili kutucuğu işaretle:
```
- [ ] Görev adı   →   - [x] Görev adı
```
Sonra commit et ve push at. Karşı taraf pull atınca ne yapıldığını görür.

---

## 📋 GÖREV LİSTESİ

### 🖥️ CLAUDE — Server Görevleri

#### Faz 1 — Server İskeleti
- [ ] `server/` klasörü: Colyseus kurulumu, TypeScript config
- [ ] `shared/` klasörü: Ortak tip tanımları (PlayerState, EnemyState, BuildingState vb.)
- [ ] LobbyRoom: oda oluşturma, oda kodu üretme, matchmaking
- [ ] GameRoom: temel state şeması, oyuncu join/leave

#### Faz 2 — Oyun State & Ekonomi
- [ ] Ortak altın havuzu — state'e ekle, client mesajlarını dinle
- [ ] Altın kazanım sistemi (öldürme + wave bonus)
- [ ] Bina/bot satın alma mesajlarını işle, state güncelle

#### Faz 3 — Düşman & Wave
- [ ] Düşman state şeması + spawn sistemi
- [ ] A* pathfinding implementasyonu
- [ ] Görüş açısı AI sistemi
- [ ] Duvar etrafından dolaşma / yıkma davranışı
- [ ] 4 düşman türü (Savaşçı, Hızlı, Tank, Şaman)
- [ ] Wave spawner + wave skalası formülü
- [ ] Prep fazı timer (30sn)

#### Faz 4 — Savaş Sync
- [ ] Hero hasar alma / ölüm / respawn server-side
- [ ] Bot unit savaş mantığı server-side
- [ ] Bina hasar alma / yıkılma server-side
- [ ] Ana base HP takibi, GameOver tetikleme

#### Faz 5 — Login & İstatistik
- [ ] Login / kayıt REST endpoint
- [ ] JWT token yönetimi
- [ ] Session istatistikleri kaydetme (DB)

---

### 🎮 CLAUDE AKİN — Client Görevleri

#### Faz 1 — Client İskeleti
- [ ] `client/` klasörü: Phaser + TypeScript + Capacitor kurulumu
- [ ] Boot, Menu, Game, GameOver sahneleri (iskelet)
- [ ] Colyseus client bağlantısı — `⏳ BEKLE: Claude → GameRoom hazır olsun`

#### Faz 2 — Harita & Kamera
- [ ] Tilemap yükleme (2048x2048)
- [ ] Terrain türleri görsel olarak yerleştir
- [ ] Kamera scroll sistemi
- [ ] Pinch-to-zoom (min %50, max %150)
- [ ] Minimap (sağ alt, 150x150px)

#### Faz 3 — Hero
- [ ] Hero base sınıfı
- [ ] Sol joystick hareketi (mobil)
- [ ] Otomatik yakın dövüş saldırısı
- [ ] 6 hero görseli + stat farklılıkları
- [ ] Hero yetenek butonu + cooldown animasyonu
- [ ] Hero ölüm + respawn görsel efekti
- [ ] Hero seçim ekranı

#### Faz 4 — Bina & Duvar
- [ ] Free placement sistemi (parmakla koy)
- [ ] Duvar serbest çizim mekaniği (sürükle → segmentler çizilir)
- [ ] Okçu Kulesi görseli + ateş animasyonu
- [ ] Havan Topu görseli + AoE animasyonu
- [ ] Lazer Kulesi görseli + ışın efekti
- [ ] Bina upgrade UI
- [ ] `⏳ BEKLE: Claude → satın alma mesajları server'da hazır olsun`

#### Faz 5 — Düşman Görseli
- [ ] 4 düşman türü görseli + animasyon
- [ ] HP bar (düşman üstünde)
- [ ] Ölüm animasyonu
- [ ] `⏳ BEKLE: Claude → düşman state şeması hazır olsun`

#### Faz 6 — HUD & UI
- [ ] Oyuncu HP barları (sol üst)
- [ ] Altın göstergesi (üst orta)
- [ ] Wave sayısı + kalan düşman (üst orta)
- [ ] Prep fazı geri sayım timer
- [ ] Ana base HP barı (alt orta)
- [ ] Bina/unit satın alma menüsü
- [ ] Hızlı komut butonları ("Buraya gel!", "Dikkat!" vb.)

#### Faz 7 — Bot Unit
- [ ] Warrior Bot görseli + animasyon
- [ ] Defender Bot görseli + animasyon
- [ ] Konuşlandırma sistemi (koy, yerinde dur)

#### Faz 8 — Multiplayer Görsel Sync
- [ ] Diğer oyuncuların herolarını render et
- [ ] Tüm state değişikliklerini Colyseus'tan dinle ve görselleştir
- [ ] `⏳ BEKLE: Claude → tüm state şemaları hazır olsun`

#### Faz 9 — Ekranlar & Bitiş
- [ ] Login / kayıt ekranı
- [ ] Bekleme odası ekranı
- [ ] GameOver + istatistik ekranı
- [ ] Ses & müzik entegrasyonu
- [ ] Capacitor mobil build (iOS + Android)

---

---

## 1. PROJE ÖZETI

| Alan | Detay |
|---|---|
| Oyun Adı | Fortress Fantasy (geçici) |
| Tür | Top-down 2D Real-time Co-op Base Defense |
| Platform | Mobil (iOS + Android) |
| Tech Stack | Phaser.js + TypeScript + Colyseus + Capacitor |
| Oyuncu Sayısı | 2-3 oyuncu, real-time multiplayer |
| Kapsam (MVP) | Deathmatch modu — base düşene kadar hayatta kal |

---

## 2. TECH STACK & PROJE YAPISI

### Klasör Yapısı
```
/client          → Phaser.js oyun kodu (TypeScript)
  /scenes        → Phaser sahneleri (Boot, Menu, Game, GameOver)
  /entities      → Hero, Enemy, Building, BotUnit sınıfları
  /systems       → Economy, Wave, AI, Combat sistemleri
  /ui            → HUD, Minimap, QuickComm, StatsScreen
  /assets        → Görseller, sesler, tilemaplar
/server          → Colyseus server kodu (TypeScript)
  /rooms         → GameRoom, LobbyRoom
  /schemas       → State şemaları (oyun durumu sync)
/shared          → Client + Server ortak tipler
```

### Bağımlılıklar
```json
{
  "phaser": "^3.x",
  "colyseus.js": "^0.15.x",
  "colyseus": "^0.15.x",
  "@capacitor/core": "latest",
  "@capacitor/ios": "latest",
  "@capacitor/android": "latest"
}
```

---

## 3. MULTIPLAYER MİMARİSİ

### Colyseus Room Yapısı
- **LobbyRoom**: Oda oluşturma, oda kodu üretme, matchmaking
- **GameRoom**: Oyun state'i, tüm oyun mantığı server-side

### State Sync (Colyseus Schema)
Server'da tutulan ve client'a sync edilen state:
```
GameState:
  - players: MapSchema<PlayerState>
  - enemies: MapSchema<EnemyState>
  - buildings: MapSchema<BuildingState>
  - botUnits: MapSchema<BotUnitState>
  - sharedGold: number
  - currentWave: number
  - baseHP: number
  - phase: "prep" | "wave" | "gameover"
  - prepTimer: number (30sn geri sayım)
```

### Oda Sistemi
- **Oda Kodu**: 6 haneli alphanumeric kod, arkadaşlar bu kodla girer
- **Matchmaking**: Boş odaya otomatik yerleştirme (2-3 oyuncu dolunca başlar)
- Max oyuncu: 3

---

## 4. HESAP & LOGIN SİSTEMİ

- Email + şifre ile kayıt/giriş
- JWT token ile session yönetimi
- Kaydedilen veriler: kullanıcı adı, seçili hero, toplam istatistikler (opsiyonel)
- Backend: Colyseus server üzerinde basit REST endpoint + SQLite/PostgreSQL

---

## 5. HARİTA SİSTEMİ

### Harita Özellikleri
- Boyut: 2048x2048 piksel (büyük, scroll edilebilir)
- Tilemap tabanlı (Phaser Tilemap)
- Ana base: Haritanın tam ortasında

### Terrain Türleri ve Etkileri
| Terrain | Geçiş Hızı Çarpanı |
|---|---|
| Normal zemin (çimen) | x1.0 |
| Taş/yol | x1.2 (hızlı) |
| Orman/bataklık | x0.6 (yavaş) |
| Su | Geçilemez |

### Kamera
- Oyuncu parmakla haritayı kaydırabilir
- Pinch-to-zoom: min %50, max %150 zoom
- Minimap: Sağ alt köşede, 150x150px, tüm haritayı gösterir
  - Minimap'te düşmanlar kırmızı nokta, binalar mavi, herolar yeşil

---

## 6. HERO SİSTEMİ

### Genel Kurallar
- Oyun başlamadan önce her oyuncu 1 hero seçer
- Seçim oyun boyunca değiştirilemez
- Hero ölünce 10 saniye cooldown, sonra haritanın ortasında (base yakınında) respawn
- Her hero: yakın dövüş silahı (kılıç/balta vb.) + 1 aktif yetenek

### Hero Listesi (6 Hero)

#### Hero 1 — Paladin
- **Silah**: Kılıç (orta hasar, orta hız)
- **HP**: Yüksek
- **Hareket Hızı**: Orta
- **Yetenek**: *Kutsal Aura* — Etrafındaki 150px içindeki tüm dost birimlere (hero + bot) 3 saniye boyunca HP regen uygular. Cooldown: 15sn.

#### Hero 2 — Şövalye
- **Silah**: Büyük Kılıç (yüksek hasar, yavaş hız)
- **HP**: Çok yüksek
- **Hareket Hızı**: Yavaş
- **Yetenek**: *Kalkan Duvarı* — 4 saniye boyunca aldığı tüm hasarı sıfırlar (tam hasar kalkanı). Cooldown: 20sn.

#### Hero 3 — Barbar
- **Silah**: Balta (yüksek hasar, orta hız)
- **HP**: Orta
- **Hareket Hızı**: Orta
- **Yetenek**: *Öfke* — 5 saniye boyunca kendi hasar çıktısını x2 yapar. Cooldown: 18sn.

#### Hero 4 — Ranger
- **Silah**: Hançer (düşük hasar, çok hızlı)
- **HP**: Düşük
- **Hareket Hızı**: Çok hızlı
- **Yetenek**: *Rüzgar Koşusu* — Etrafındaki 200px içindeki tüm dost birimlerin hareket hızını 5 saniye boyunca x1.5 yapar. Cooldown: 15sn.

#### Hero 5 — Büyücü
- **Silah**: Asa (orta hasar, orta hız, hafif AoE)
- **HP**: Düşük
- **Hareket Hızı**: Orta
- **Yetenek**: *Büyü Patlaması* — 100px yarıçaplı AoE hasar patlaması, etraftaki tüm düşmanlara anlık yüksek hasar. Cooldown: 12sn.

#### Hero 6 — Druid
- **Silah**: Kısa Kılıç (düşük hasar, hızlı)
- **HP**: Orta
- **Hareket Hızı**: Orta
- **Yetenek**: *Doğanın Gücü* — Etrafındaki 150px içindeki tüm dost birimlerin max HP'sini 10 saniye boyunca %30 artırır. Cooldown: 20sn.

### Hero Kontrolleri (Mobil)
- **Hareket**: Sol tarafta joystick
- **Saldırı**: Otomatik — menzildeki düşmana kendiliğinden vurur
- **Yetenek**: Sağ tarafta yetenek butonu (cooldown göstergeli)

---

## 7. BOT UNİT SİSTEMİ

Bot unitler satın alınan ve haritaya konuşlandırılan savaşan birimlerdir. Herolar gibi kontrol edilmez, yerleştirildikleri noktada bağımsız savaşırlar.

### Bot Unit Türleri

#### Warrior Bot
- **Maliyet**: 50 altın
- **HP**: Orta
- **Hasar**: Orta
- **Davranış**: Menzilindeki düşmana melee saldırı yapar, yerinden çok fazla ayrılmaz (küçük patrol radius)

#### Defender Bot
- **Maliyet**: 75 altın
- **HP**: Yüksek
- **Hasar**: Düşük
- **Davranış**: Yerinden hiç ayrılmaz, sadece menzilindeki düşmana saldırır, Warrior'a göre daha dayanıklıdır

### Konuşlandırma
- Oyuncu binalar menüsünden bot seçer, haritaya dokunarak koyar
- Koyulan bot kalıcıdır, öldürülene kadar savaşır
- Limit: Toplam 10 bot unit (2 oyuncuda 10, 3 oyuncuda da 10 — ortak limit)

---

## 8. BİNA SİSTEMİ

### Genel Kurallar
- Binalar ortak altın havuzundan satın alınır
- Free placement: Oyuncu haritada istediği yere koyar (su veya başka bina üzerine konamaz)
- Binalar upgrade edilebilir (session içinde, para ile)
- Düşmanlar binalara saldırabilir, yıkılınca yok olur

### Bina Türleri

#### Okçu Kulesi
| Özellik | Seviye 1 | Seviye 2 | Seviye 3 |
|---|---|---|---|
| Maliyet | 80 altın | +60 altın | +80 altın |
| HP | 300 | 450 | 600 |
| Hasar | 25 | 40 | 60 |
| Menzil | 200px | 220px | 250px |
| Ateş Hızı | 1.5sn | 1.2sn | 1.0sn |

#### Havan Topu
| Özellik | Seviye 1 | Seviye 2 | Seviye 3 |
|---|---|---|---|
| Maliyet | 120 altın | +90 altın | +110 altın |
| HP | 250 | 375 | 500 |
| Hasar | 80 (AoE 80px) | 120 (AoE 90px) | 160 (AoE 100px) |
| Menzil | 350px | 380px | 420px |
| Ateş Hızı | 4sn | 3.5sn | 3sn |

#### Lazer Kulesi
| Özellik | Seviye 1 | Seviye 2 | Seviye 3 |
|---|---|---|---|
| Maliyet | 150 altın | +100 altın | +130 altın |
| HP | 200 | 300 | 400 |
| Hasar | 15/sn (sürekli) | 25/sn | 40/sn |
| Menzil | 180px | 200px | 230px |
| Özellik | Tek hedefe sürekli ışın | + slow efekti | + zırh delme |

#### Duvar
| Özellik | Seviye 1 | Seviye 2 |
|---|---|---|
| Maliyet | 20 altın/segment | +15 altın |
| HP | 500 | 900 |
| Hasar | - | - |
| Özellik | Engel | Daha dayanıklı |

**Duvar Çizimi:**
- Oyuncu parmağını basıp sürükler, bırakınca duvar segmentleri çizilir
- Her segment 64px uzunluğunda
- Toplam maliyet = segment sayısı x 20 altın
- Altın yetmezse en uzun çizilebilecek kadar çizilir, oyuncuya bildirim gösterilir

### Ana Base
- HP: 5000
- Saldırı yok, sadece savunulur
- HP bar her zaman ekranda görünür

---

## 9. EKONOMİ SİSTEMİ

### Ortak Altın Havuzu
- Tüm oyuncular aynı havuzu paylaşır
- Herhangi bir oyuncu harcama yapabilir, limit yok

### Altın Kazanımı
| Kaynak | Miktar |
|---|---|
| Normal düşman öldürme | +5 altın |
| Tank öldürme | +15 altın |
| Wave tamamlama bonusu | +50 altın (wave no x 10) |

### Başlangıç Altını
- 200 altın (tüm oyuncular için ortak başlangıç)

### UI
- Ekranın üst ortasında altın miktarı her zaman görünür
- Harcama yapılınca animasyonlu azalma efekti

---

## 10. DÜŞMAN SİSTEMİ

### Düşman Türleri

#### 1. Savaşçı (Temel)
- HP: 100 | Hız: Orta | Hasar: 20 | Ödül: 5 altın
- En yaygın düşman türü

#### 2. Hızlı Koşucu
- HP: 50 | Hız: Çok hızlı (x2) | Hasar: 10 | Ödül: 5 altın
- Düşük HP ama binalara çabuk ulaşır, öncelikli hedef alınmalı

#### 3. Tank
- HP: 500 | Hız: Yavaş (x0.5) | Hasar: 60 | Ödül: 15 altın
- Duvarları ve binaları hızla yıkar

#### 4. Şaman (Elite)
- HP: 200 | Hız: Orta | Hasar: 30 | Ödül: 10 altın
- Etrafındaki düşmanlara HP regen aura uygular (75px), öncelikli elimine edilmeli

### Düşman AI Davranışı

**Algı:**
- Her düşmanın görüş açısı vardır (120 derece, 300px menzil)
- Görüş alanına giren hedefi takip etmeye başlar
- Görüş alanı dışında: Ana base'e doğru yürür (pathfinding)

**Hedef Önceliği (görüş alanında):**
1. Önündeki duvar (açıklık yoksa yıkar)
2. En yakın bot unit / bina
3. En yakın hero
4. Ana base

**Duvar Davranışı:**
- Düşman duvarla karşılaşınca görüş alanında açıklık arar
- Açıklık varsa pathfinding ile etrafından dolaşır
- Açıklık yoksa duvara saldırıp yıkmaya çalışır

**Pathfinding:**
- A* algoritması kullan
- Terrain hızı pathfinding'i etkiler (yavaş terrain'den kaçınmaya çalışır)

### Wave Skalası
```
Wave N:
  Savaşçı sayısı  = 5 + (N x 3)
  Hızlı sayısı    = 2 + (N x 2)
  Tank sayısı     = floor(N / 3)
  Şaman sayısı    = floor(N / 5)
  Düşman HP çarpanı    = 1 + (N x 0.1)
  Düşman hasar çarpanı = 1 + (N x 0.08)
```

---

## 11. WAVE SİSTEMİ

### Faz Döngüsü
```
[PREP FAZI - 30sn] → [WAVE FAZI] → [PREP FAZI - 30sn] → ...
```

### Prep Fazı (30 saniye)
- Geri sayım ekranın üstünde görünür
- Oyuncular bina koyar, upgrade yapar, bot konuşlandırır
- Düşman spawní durur

### Wave Fazı
- Düşmanlar haritanın kenarlarından rastgele noktalarda spawn olur
- Tüm düşmanlar öldürülünce wave biter, prep fazına geçilir
- Wave numarası ve kalan düşman sayısı HUD'da görünür

### Bitiş Koşulu
- Ana base HP 0'a düşünce oyun biter → GameOver ekranı

---

## 12. SKOR & İSTATİSTİK SİSTEMİ

### Session Sonunda Gösterilecekler (her oyuncu için ayrı)
- Ulaşılan wave sayısı
- Toplam verilen hasar
- Öldürülen düşman sayısı (türe göre ayrı)
- Ölüm sayısı (hero kaç kez öldü)
- En çok hasar verilen düşman türü

### Ekran Tasarımı
- GameOver ekranında tüm oyuncuların istatistikleri yan yana gösterilir
- "Tekrar Oyna" ve "Ana Menü" butonları

---

## 13. HUD (Heads-Up Display)

### Daima Görünür Elemanlar
- Sol üst: Oyuncu hero portreleri + HP barları (tüm oyuncular)
- Üst orta: Ortak altın miktarı | Wave sayısı | Kalan düşman sayısı
- Üst orta (prep fazında): Geri sayım timer (kırmızı)
- Sağ alt: Minimap (150x150px)
- Ana base HP barı: Ekranın alt ortasında, büyük ve belirgin

### Bina/Unit Menüsü
- Sağ tarafta dikey ikon listesi
- Her ikonun altında maliyeti yazar
- Yetersiz altın varsa ikon grileşir
- Seçince parmak imlecine yapışır, haritaya dokunarak koyulur

### Hızlı Komut Butonları
- Sol altta, joystick'in yanında
- Butonlar: "Buraya Gel!", "Dikkat!", "İyi İş!", "Yardım!"
- Basınca ekranda oyuncunun renginde mesaj balonu çıkar + minimapte işaret

### Kontroller
- Sol: Joystick (hero hareketi)
- Sağ: Yetenek butonu (cooldown pie animasyonu)
- Çift parmak: Zoom in/out

---

## 14. MENÜ & AKIŞ

```
Splash Screen
    ↓
Login / Kayıt Ekranı
    ↓
Ana Menü
    ├── Oyna
    │     ├── Oda Oluştur (kod üret)
    │     ├── Odaya Katıl (kod gir)
    │     └── Matchmaking
    │           ↓
    │     Hero Seçim Ekranı (6 hero, açıklamalı)
    │           ↓
    │     Bekleme Odası (diğer oyuncular beklenir)
    │           ↓
    │     Oyun
    │           ↓
    │     GameOver / İstatistik Ekranı
    └── Ayarlar (ses, müzik)
```

---

## 15. GELİŞTİRME ÖNCELİKLERİ (MVP Sırası)

1. Phaser + Colyseus proje iskeletini kur
2. Harita + kamera + zoom sistemi
3. Tek oyunculu hero hareketi + saldırı
4. Multiplayer sync (2 hero aynı anda)
5. Bina koyma sistemi (duvar dahil)
6. Wave spawner + düşman AI
7. Ekonomi sistemi
8. Bot unitler
9. HUD + minimap
10. Hero yetenekleri
11. Login sistemi
12. Matchmaking + oda kodu
13. İstatistik ekranı
14. Ses + müzik
15. Capacitor mobil build
# FORTRESS FANTASY — PROGRESS.md
> Bu dosya her tamamlanan adımdan sonra güncellenir.

---

## PROJE DURUMU: 🟡 Planlama Aşaması

---

## ✅ Tamamlananlar

### Planlama
- [x] Oyun konsepti belirlendi
- [x] Tech stack kararlaştırıldı (Phaser.js + Colyseus + Capacitor)
- [x] Tüm oyun mekanikleri netleştirildi
- [x] GDD v1.0 yazıldı

---

## 🔲 Yapılacaklar (Sıralı)

### Faz 1 — Proje İskeleti
- [ ] Phaser.js + TypeScript client kurulumu
- [ ] Colyseus server kurulumu
- [ ] Capacitor entegrasyonu
- [ ] Klasör yapısı oluşturma

### Faz 2 — Temel Oyun
- [ ] Harita + tilemap sistemi
- [ ] Terrain türleri (geçiş hızı etkileri)
- [ ] Kamera sistemi (scroll + zoom)
- [ ] Minimap

### Faz 3 — Hero
- [ ] Hero base sınıfı
- [ ] Joystick kontrolü (mobil)
- [ ] Yakın dövüş saldırı sistemi
- [ ] 6 hero implement edildi
- [ ] Hero yetenekleri
- [ ] Hero ölüm + respawn (10sn cooldown)

### Faz 4 — Multiplayer
- [ ] Colyseus GameRoom + state şemaları
- [ ] 2-3 oyuncu sync
- [ ] Oda kodu sistemi
- [ ] Matchmaking

### Faz 5 — Bina & Duvar
- [ ] Free placement sistemi
- [ ] Duvar serbest çizim mekaniği
- [ ] Okçu Kulesi
- [ ] Havan Topu
- [ ] Lazer Kulesi
- [ ] Bina upgrade sistemi

### Faz 6 — Düşman & Wave
- [ ] Düşman base sınıfı
- [ ] 4 düşman türü (Savaşçı, Hızlı, Tank, Şaman)
- [ ] A* pathfinding
- [ ] Görüş açısı AI sistemi
- [ ] Duvar etrafından dolaşma / yıkma davranışı
- [ ] Wave spawner
- [ ] Wave skalası (her wave güçlenir)
- [ ] Prep fazı (30sn geri sayım)

### Faz 7 — Ekonomi & Bot
- [ ] Ortak altın havuzu
- [ ] Altın kazanım sistemi (öldürme + wave bonus)
- [ ] Warrior Bot
- [ ] Defender Bot
- [ ] Bot konuşlandırma sistemi

### Faz 8 — HUD & UI
- [ ] Tüm HUD elemanları
- [ ] Hızlı komut butonları
- [ ] Bina/Unit menüsü
- [ ] Hero seçim ekranı
- [ ] Bekleme odası ekranı

### Faz 9 — Login & İstatistik
- [ ] Login / kayıt sistemi
- [ ] JWT token yönetimi
- [ ] Session istatistikleri takibi
- [ ] GameOver / istatistik ekranı

### Faz 10 — Bitiş
- [ ] Ses & müzik entegrasyonu
- [ ] Capacitor mobil build (iOS + Android)
- [ ] Test & bug fix

---

## 📝 Notlar & Kararlar

| Tarih | Not |
|---|---|
| v1.0 | GDD tamamlandı, geliştirmeye hazır |

---

## 🐛 Bilinen Sorunlar
_Henüz yok_
