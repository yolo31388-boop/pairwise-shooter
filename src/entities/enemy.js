class Enemy {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.radius = 16;
    this.health = 30;
    this.dead = false;
  }

  // 公开的受击接口：死亡后立即标记 dead，由碰撞系统在后续判定中剔除
  onHit(damage = 10) {
    if (this.dead) return;
    this.health -= damage;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }
}

module.exports = { Enemy };
