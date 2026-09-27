// 子弹系统：记录每帧扫掠线段（prevX/prevY -> x/y），供碰撞系统做线段检测
const FIXED_DT = 1 / 60;

// 默认战场边界（含 50px 余量），飞出边界的子弹立即销毁
const DEFAULT_BOUNDS = { left: -50, right: 1330, top: -50, bottom: 770 };

class Bullet {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    // 本帧起点，碰撞系统据此做线段扫掠
    this.prevX = x; this.prevY = y;
    this.dead = false;
    this.radius = 3;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    // vx/vy 的单位是“每帧（60FPS）像素”，按 dt 占一帧的比例积分
    const frames = dt / FIXED_DT;
    this.x += this.vx * frames;
    this.y += this.vy * frames;
  }
}

class BulletSystem {
  constructor(bounds = DEFAULT_BOUNDS) {
    this.bullets = [];
    this.bounds = bounds;
  }

  shoot(x, y, vx, vy) {
    const bullet = new Bullet(x, y, vx, vy);
    this.bullets.push(bullet);
    return bullet;
  }

  update(dt) {
    for (const b of this.bullets) {
      if (b.dead) continue;
      b.update(dt);
      if (this._isOutOfBounds(b)) b.dead = true;
    }
    this.bullets = this.bullets.filter(b => !b.dead);
  }

  _isOutOfBounds(b) {
    const { left, right, top, bottom } = this.bounds;
    return b.x < left || b.x > right || b.y < top || b.y > bottom;
  }
}

module.exports = { Bullet, BulletSystem, DEFAULT_BOUNDS, FIXED_DT };
