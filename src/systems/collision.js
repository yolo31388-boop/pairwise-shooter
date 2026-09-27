const BULLET_DAMAGE = 10;

// 线段-圆形相交：返回沿线段方向首次相交的时间 t ∈ [0, 1]，不相交返回 null。
// 线段为 (x1, y1) -> (x2, y2)，圆心 (cx, cy)，半径 r。
// 起点在圆内时 t = 0（子弹当帧从敌人内部穿过也算命中）。
function segmentCircleTime(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;

  // 退化线段（速度为零）：静止子弹不做扫掠碰撞
  if (a === 0) {
    return null;
  }

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;

  if (disc < 0) return null;

  const sq = Math.sqrt(disc);
  const t1 = (-b - sq) / (2 * a); // 进入圆的时间
  const t2 = (-b + sq) / (2 * a); // 离开圆的时间

  if (t1 >= 0 && t1 <= 1) return t1;       // 当帧进入圆
  if (t1 < 0 && t2 >= 0) return 0;         // 起点已在圆内（含 t2>1）
  return null;
}

function checkBulletCollisions(bullets, enemies) {
  for (const b of bullets) {
    if (b.dead) continue;

    let nearestEnemy = null;
    let nearestT = Infinity;

    for (const e of enemies) {
      if (e.dead) continue;
      const hitRadius = b.radius + e.radius;
      // 沿子弹移动方向扫掠，基于实际相交时间，而非帧末位置
      const t = segmentCircleTime(
        b.prevX, b.prevY, b.x, b.y, e.x, e.y, hitRadius
      );
      if (t !== null && t < nearestT) {
        nearestT = t;
        nearestEnemy = e;
      }
    }

    if (nearestEnemy) {
      // 只命中最近的敌人；onHit 返回 false 表示敌人在本帧更早的子弹处理中已死
      const damaged = nearestEnemy.onHit(BULLET_DAMAGE);
      // 碰撞后立即停用并移除：该子弹本帧不再命中任何敌人，后续帧也不参与判定
      b.dead = true;
      if (!damaged) {
        // 理论上死敌人已从 enemies 中剔除，这里仅作防御性保证
        continue;
      }
      if (nearestEnemy.dead) {
        const idx = enemies.indexOf(nearestEnemy);
        if (idx !== -1) enemies.splice(idx, 1);
      }
    }
  }

  // 所有命中的子弹立即从碰撞系统移除
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].dead) bullets.splice(i, 1);
  }
}

module.exports = { checkBulletCollisions, segmentCircleTime };
