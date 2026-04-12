// Şimdilik lokal placeholder — Colyseus bağlantısı gelince server state ile senkronize edilecek

export class EconomySystem {
  private gold: number;
  onChange?: (gold: number) => void;

  constructor(startingGold = 200) {
    this.gold = startingGold;
  }

  getGold(): number {
    return this.gold;
  }

  canAfford(amount: number): boolean {
    return this.gold >= amount;
  }

  spend(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.gold -= amount;
    this.onChange?.(this.gold);
    return true;
  }

  earn(amount: number) {
    this.gold += amount;
    this.onChange?.(this.gold);
  }
}
