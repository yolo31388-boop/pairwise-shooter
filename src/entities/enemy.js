class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 16;
    this.health = 30;
    this.dead = false;
  }

  onHit(damage = 10) {
    if (this.dead) return false;
    this.health -= damage;
    if (this.health <= 0) this.dead = true;
    return true;
  }
}

module.exports = { Enemy };
