const DEFAULT_BOUNDS = { minX: -100, minY: -100, maxX: 900, maxY: 700 };

class Bullet {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 3;
    this.dead = false;
    // 本帧扫掠起点：碰撞检测基于 (prevX, prevY) -> (x, y) 的完整线段
    this.prevX = x;
    this.prevY = y;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

class BulletSystem {
  constructor(bounds) {
    this.bullets = [];
    this.bounds = Object.assign({}, DEFAULT_BOUNDS, bounds || {});
  }

  shoot(x, y, vx, vy) {
    const bullet = new Bullet(x, y, vx, vy);
    this.bullets.push(bullet);
    return bullet;
  }

  update(dt) {
    for (const b of this.bullets) {
      if (!b.dead) b.update(dt);
    }
    const { minX, minY, maxX, maxY } = this.bounds;
    this.bullets = this.bullets.filter(b =>
      !b.dead &&
      b.x >= minX - b.radius && b.x <= maxX + b.radius &&
      b.y >= minY - b.radius && b.y <= maxY + b.radius
    );
  }
}

module.exports = { Bullet, BulletSystem, DEFAULT_BOUNDS };
