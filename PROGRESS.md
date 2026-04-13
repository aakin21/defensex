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
- [x] Hero base sınıfı (Container tabanlı, HeroConfig.ts ayrı dosya)
- [x] Sol joystick hareketi (mobil, Arc tabanlı Joystick.ts)
- [x] Otomatik yakın dövüş saldırısı (tryAttack, menzil tabanlı)
- [x] 6 hero görseli + stat farklılıkları (placeholder renkli daireler)
- [x] Hero yetenek butonu + cooldown animasyonu (pie overlay, AbilityButton.ts)
- [x] Hero ölüm + respawn görsel efekti (10sn countdown, respawn tween)
- [x] Hero seçim ekranı (HeroSelectScene.ts)

### Faz 4 — Bina & Duvar
- [x] Free placement sistemi (ghost önizleme, tap to place)
- [x] Duvar serbest çizim mekaniği (sürükle → 64px segmentler, altın yetersizse kısalt)
- [x] Okçu Kulesi görseli + saldırı efekti (placeholder)
- [x] Havan Topu görseli + AoE saldırı
- [x] Lazer Kulesi görseli + sürekli ışın efekti
- [x] Bina upgrade UI (UpgradePopup, tap to open)
- [ ] ⏳ BEKLE: Claude → satın alma mesajları server'da hazır olsun

### Faz 5 — Düşman Görseli
- [ ] 4 düşman türü görseli + animasyon
- [ ] HP bar (düşman üstünde)
- [ ] Ölüm animasyonu
- [ ] ⏳ BEKLE: Claude → düşman state şeması hazır olsun

### Faz 6 — HUD & UI
- [x] Oyuncu HP barları (sol üst, hero panel)
- [x] Altın göstergesi (üst orta)
- [x] Wave sayısı + kalan düşman (üst orta)
- [x] Prep fazı geri sayım timer (kırmızı, client-side placeholder)
- [x] Ana base HP barı (alt sol, belirgin)
- [x] Bina/unit satın alma menüsü (zaten vardı — BuildingMenu)
- [x] Hızlı komut butonları (2x2 grid, joystick üstü, balon efekti)

### Faz 7 — Bot Unit
- [x] Warrior Bot görseli + patrol animasyonu
- [x] Defender Bot görseli (sabit durur)
- [x] Konuşlandırma sistemi (BotMenu, limit 10, altın kontrolü)

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
| 2026-04-13 | Faz 3 bitti: Hero (Container, 6 hero), Joystick, AbilityButton (pie), HeroSelectScene, respawn efekti |
| 2026-04-13 | Faz 4 bitti: bina sistemi, duvar çizimi, upgrade popup, ekonomi sistemi |
| 2026-04-13 | Faz 6 bitti: HUD (hero HP, altın, wave, base HP bar, prep timer, hızlı komutlar) |
| 2026-04-13 | Faz 7 bitti: BotUnit (Warrior patrol + Defender sabit), BotMenu, limit/altın kontrolü |
