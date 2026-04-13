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
- [x] 4 düşman türü görseli (placeholder renkli şekiller — asset gelince değişecek)
- [x] HP bar (düşman üstünde, kırmızı tonları)
- [x] Ölüm animasyonu (büyüyüp kaybol tween)
- [x] Görüş konisi AI (120°, 300px), şaman aura (75px regen)
- [x] EnemySystem: wave spawn, altın kazanımı, GameOver tetikleme
- [x] shared/types.ts EnemyStats entegrasyonu

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
- [x] colyseus.js client kurulumu
- [x] NetworkManager.ts — login/register REST, lobby join/create, game join, mesaj gönderme
- [ ] LobbyScene — oda oluştur/katıl UI, bekleme odası
- [ ] GameScene multiplayer wiring — server state'den hero/enemy/building sync
- [ ] Diğer oyuncuların herolarını render et

### Faz 9 — Ekranlar & Bitiş
- [x] Login / kayıt ekranı (LoginScene.ts — HTML form, REST auth)
- [ ] Bekleme odası ekranı (LobbyScene)
- [ ] GameOver + istatistik ekranı
- [ ] Ses & müzik entegrasyonu
- [ ] Capacitor mobil build (iOS + Android)

---

## SERVER (Claude Alps)

### Faz 1 — Server İskeleti
- [x] `server/` klasörü: Colyseus kurulumu, TypeScript config
- [x] `shared/types.ts`: Ortak tip tanımları (PlayerState, EnemyState, BuildingState, stats, wave formula, message types)
- [x] LobbyRoom: 6-haneli oda kodu üretme, join/leave, chat relay
- [x] GameRoom: GameState şeması (players, enemies, buildings, botUnits, sharedGold, wave, baseHP, phase, prepTimer)
- [x] GameRoom: oyuncu join/leave, hero type seçimi

### Faz 2 — Oyun State & Ekonomi
- [x] Ortak altın havuzu (GameState.sharedGold = 200)
- [x] Altın kazanım sistemi (öldürme ödülleri + wave bonus)
- [x] Bina/bot satın alma mesajları işlendi (buy_building, upgrade_building, buy_bot)

### Faz 3 — Düşman & Wave
- [x] Düşman state şeması (EnemyState)
- [x] WaveSpawner: wave formula, staggered spawn, harita kenar noktaları
- [x] A* pathfinding (AStarPathfinder.ts, terrain cost ağırlıklı)
- [x] Görüş açısı AI sistemi (SIGHT=300px, öncelik: bina→bot→hero→base)
- [x] Duvar/bina yıkma davranışı
- [x] 4 düşman türü (Warrior, Runner, Tank, Shaman)
- [x] Wave skalası formülü (getWaveComposition)
- [x] Prep fazı timer (30sn)

### Faz 4 — Savaş Sync
- [x] Hero hasar alma / ölüm / respawn server-side (10sn timer)
- [x] Bot unit savaş mantığı server-side
- [x] Bina hasar / yıkılma server-side (ArcherTower, Mortar AoE, Laser sürekli hasar)
- [x] Ana base HP takibi, GameOver tetikleme

### Faz 5 — Login & İstatistik
- [x] Login / kayıt REST endpoint (/api/auth/register, /api/auth/login)
- [x] JWT token yönetimi
- [x] Session istatistikleri SQLite'a kaydedildi (/api/auth/stats)

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
| 2026-04-13 | SERVER Faz 1-5 bitti: Colyseus server, LobbyRoom, GameRoom, shared/types, A* pathfinding, WaveSpawner, auth REST+JWT+SQLite |
| 2026-04-13 | CLIENT Faz 5 bitti: Enemy entity, EnemySystem, wave spawn, AI görüş konisi, şaman aura, GameOver tetikleme |
| 2026-04-13 | CLIENT Faz 8-9 kısmi: NetworkManager (Colyseus client), LoginScene (HTML form, REST auth) |
