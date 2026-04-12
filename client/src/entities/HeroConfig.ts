// placeholder sayısal değerler — GDD'de "yüksek/orta/düşük" olarak tanımlı
// balans testinden sonra güncellenir

export type HeroType = 'Paladin' | 'Sövalye' | 'Barbar' | 'Ranger' | 'Büyücü' | 'Druid';

export type AbilityId =
  | 'kutsal_aura'
  | 'kalkan_duvari'
  | 'ofke'
  | 'ruzgar_kosusu'
  | 'buyu_patlamasi'
  | 'doga_gucu';

export interface AbilityConfig {
  id: AbilityId;
  name: string;
  cooldown: number;   // saniye
  duration: number;   // saniye (0 = anlık)
  radius: number;     // etki yarıçapı px (0 = self-only)
  description: string;
}

export interface HeroConfig {
  type: HeroType;
  displayName: string;
  color: number;       // placeholder grafik rengi
  maxHp: number;
  speed: number;       // px/sn
  damage: number;      // hasar/vuruş
  attackSpeed: number; // saniye (vuruşlar arası cooldown)
  attackRange: number; // px
  ability: AbilityConfig;
}

export const HERO_CONFIGS: Record<HeroType, HeroConfig> = {
  Paladin: {
    type: 'Paladin',
    displayName: 'Paladin',
    color: 0xf0d060,
    maxHp: 220,
    speed: 160,
    damage: 25,
    attackSpeed: 1.0,
    attackRange: 60,
    ability: {
      id: 'kutsal_aura',
      name: 'Kutsal Aura',
      cooldown: 15,
      duration: 3,
      radius: 150,
      description: '150px içindeki tüm dost birimlere 3sn HP regen',
    },
  },
  Sövalye: {
    type: 'Sövalye',
    displayName: 'Şövalye',
    color: 0xa0c0ff,
    maxHp: 300,
    speed: 110,
    damage: 40,
    attackSpeed: 1.5,
    attackRange: 60,
    ability: {
      id: 'kalkan_duvari',
      name: 'Kalkan Duvarı',
      cooldown: 20,
      duration: 4,
      radius: 0,
      description: '4sn boyunca tüm hasarı sıfırlar',
    },
  },
  Barbar: {
    type: 'Barbar',
    displayName: 'Barbar',
    color: 0xff6644,
    maxHp: 150,
    speed: 160,
    damage: 40,
    attackSpeed: 1.0,
    attackRange: 60,
    ability: {
      id: 'ofke',
      name: 'Öfke',
      cooldown: 18,
      duration: 5,
      radius: 0,
      description: '5sn boyunca hasar çıktısı x2',
    },
  },
  Ranger: {
    type: 'Ranger',
    displayName: 'Ranger',
    color: 0x44ff88,
    maxHp: 100,
    speed: 230,
    damage: 15,
    attackSpeed: 0.5,
    attackRange: 60,
    ability: {
      id: 'ruzgar_kosusu',
      name: 'Rüzgar Koşusu',
      cooldown: 15,
      duration: 5,
      radius: 200,
      description: '200px içindeki tüm dost birimlerin hızını 5sn x1.5 yapar',
    },
  },
  Büyücü: {
    type: 'Büyücü',
    displayName: 'Büyücü',
    color: 0xcc44ff,
    maxHp: 100,
    speed: 150,
    damage: 25,
    attackSpeed: 1.0,
    attackRange: 80,
    ability: {
      id: 'buyu_patlamasi',
      name: 'Büyü Patlaması',
      cooldown: 12,
      duration: 0,
      radius: 100,
      description: '100px AoE anlık yüksek hasar patlaması',
    },
  },
  Druid: {
    type: 'Druid',
    displayName: 'Druid',
    color: 0x66cc44,
    maxHp: 150,
    speed: 155,
    damage: 15,
    attackSpeed: 0.7,
    attackRange: 60,
    ability: {
      id: 'doga_gucu',
      name: "Doğanın Gücü",
      cooldown: 20,
      duration: 10,
      radius: 150,
      description: '150px içindeki tüm dost birimlerin max HP\'sini 10sn %30 artırır',
    },
  },
};

export const HERO_TYPES = Object.keys(HERO_CONFIGS) as HeroType[];
