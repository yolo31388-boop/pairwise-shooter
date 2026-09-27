
// 子弹系统 - 存在高速漏判和重复伤害bug
class Bullet {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dead = false; this.radius = 3;
  }
  update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; }
}

class BulletSystem {
  constructor() { this.bullets = []; }
  shoot(x, y, vx, vy) { this.bullets.push(new Bullet(x, y, vx, vy)); }
  update(dt) {
    for (const b of this.bullets) b.update(dt);
    this.bullets = this.bullets.filter(b => !b.dead);
  }
}

module.exports = { Bullet, BulletSystem };
