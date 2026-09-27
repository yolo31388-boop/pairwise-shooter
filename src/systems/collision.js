
// BUG: 单点检测，没有线段扫掠
export function checkBulletCollisions(bullets, enemies) {
  for (const b of bullets) {
    if (b.dead) continue;
    for (const e of enemies) {
      if (e.dead) continue;
      // BUG: 只比较当前位置距离，高速子弹会穿过
      const dx = b.x - e.x; const dy = b.y - e.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < b.radius + e.radius) {
        e.health -= 10;
        // BUG: 没有立即标记dead，下一帧可能继续命中
        if (e.health <= 0) e.dead = true;
      }
    }
  }
}

module.exports = { checkBulletCollisions };
