# Fortress Fantasy — PROGRESS.md

## PROJE DURUMU: 🟡 Geliştirme Aşaması

---

## CLIENT (Claude Akin)

### Faz 1 — Client İskeleti
- [x] `client/` klasörü: Phaser + TypeScript + Vite kurulumu
- [x] Capacitor entegrasyonu
- [x] Boot, Menu, Game, GameOver sahneleri (iskelet)
- [ ] Colyseus client bağlantısı — ⏳ BEKLE: Claude → GameRoom hazır olsun

### Faz 2 — Harita & Kamera
- [x] Tilemap yükleme (2048x2048) — programatik placeholder, tileset gelince değiştirilecek
- [x] Terrain türleri görsel olarak yerleştir (grass/road/forest/water renklerle)
- [x] Kamera scroll sistemi (parmakla sürükleme)
- [x] Pinch-to-zoom (min %50, max %150)
- [x] Minimap (sağ alt, 150x150px)

### Faz 3 — Hero
- [ ] Hero base sınıfı
- [ ] Sol joystick hareketi (mobil)
- [ ] Otomatik yakın dövüş saldırısı
- [ ] 6 hero görseli + stat farklılıkları
- [ ] Hero yetenek butonu + cooldown animasyonu
- [ ] Hero ölüm + respawn görsel efekti
- [ ] Hero seçim ekranı

### Faz 4 — Bina & Duvar
- [ ] Free placement sistemi (parmakla koy)
- [ ] Duvar serbest çizim mekaniği (sürükle → segmentler çizilir)
- [ ] Okçu Kulesi görseli + ateş animasyonu
- [ ] Havan Topu görseli + AoE animasyonu
- [ ] Lazer Kulesi görseli + ışın efekti
- [ ] Bina upgrade UI
- [ ] ⏳ BEKLE: Claude → satın alma mesajları server'da hazır olsun

### Faz 5 — Düşman Görseli
- [ ] 4 düşman türü görseli + animasyon
- [ ] HP bar (düşman üstünde)
- [ ] Ölüm animasyonu
- [ ] ⏳ BEKLE: Claude → düşman state şeması hazır olsun

### Faz 6 — HUD & UI
- [ ] Oyuncu HP barları (sol üst)
- [ ] Altın göstergesi (üst orta)
- [ ] Wave sayısı + kalan düşman (üst orta)
- [ ] Prep fazı geri sayım timer
- [ ] Ana base HP barı (alt orta)
- [ ] Bina/unit satın alma menüsü
- [ ] Hızlı komut butonları

### Faz 7 — Bot Unit
- [ ] Warrior Bot görseli + animasyon
- [ ] Defender Bot görseli + animasyon
- [ ] Konuşlandırma sistemi

### Faz 8 — Multiplayer Görsel Sync
- [ ] Diğer oyuncuların herolarını render et
- [ ] Tüm state değişikliklerini Colyseus'tan dinle ve görselleştir
- [ ] ⏳ BEKLE: Claude → tüm state şemaları hazır olsun

### Faz 9 — Ekranlar & Bitiş
- [ ] Login / kayıt ekranı
- [ ] Bekleme odası ekranı
- [ ] GameOver + istatistik ekranı
- [ ] Ses & müzik entegrasyonu
- [ ] Capacitor mobil build (iOS + Android)

---

## SERVER (Claude)

### Faz 1 — Server İskeleti
- [ ] `server/` klasörü: Colyseus kurulumu
- [ ] `shared/` klasörü: Ortak tip tanımları
- [ ] LobbyRoom
- [ ] GameRoom: temel state şeması

_(diğer fazlar server tarafı tarafından güncellenir)_

---

## Notlar

| Tarih | Not |
|---|---|
| 2026-04-13 | Client iskeleti kuruldu (Phaser + Vite + Capacitor) |
| 2026-04-13 | Faz 2 bitti: harita sistemi, terrain renkleri, kamera drag, pinch-zoom, minimap |
