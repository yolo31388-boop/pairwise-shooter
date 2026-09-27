// 碰撞系统：子弹以一帧内的扫掠线段（prev -> current）对敌人做
// 线段-圆形相交检测，并以实际相交时间（0~1）结算命中，
// 而不是只比较帧末位置。

const DAMAGE_PER_HIT = 10;

// 线段（p0 -> p1，t 为 [0,1] 的归一化时间）与圆心 c、半径 r 的圆相交，
// 返回最早的相交时间 t；不相交返回 null。
function segmentCircleHit(px0, py0, px1, py1, cx, cy, r) {
  const dx = px1 - px0;
  const dy = py1 - py0;
  const fx = px0 - cx;
  const fy = py0 - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  // 线段起点已在圆内（或恰在圆上）：t = 0 立即命中
  if (c <= 0) return 0;

  // a === 0：零长度线段（如速度为零的子弹），且起点在圆外，不碰撞
  if (a === 0) return null;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const sq = Math.sqrt(discriminant);
  const t1 = (-b - sq) / (2 * a); // 进入圆的时间
  const t2 = (-b + sq) / (2 * a); // 离开圆的时间

  // 圆完全位于线段前方
  if (t2 < 0) return null;
  // 起点在圆外时 t1 即进入时间；穿过区间与 [0,1] 有交集即命中
  if (t1 >= 0 && t1 <= 1) return t1;
  return null;
}

function checkBulletCollisions(bullets, enemies) {
  const hits = [];

  // 倒序遍历，命中后可直接从数组中移除（splice 不影响未处理的前序下标）
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const bullet = bullets[bi];
    if (bullet.dead) {
      bullets.splice(bi, 1);
      continue;
    }

    // 速度为零：本帧没有扫掠线段，不参与碰撞
    if (bullet.vx === 0 && bullet.vy === 0) continue;

    let best = null;

    for (const enemy of enemies) {
      // 已死亡敌人立即跳过：同一帧后续子弹也不能继续命中
      if (enemy.dead) continue;

      const reach = bullet.radius + enemy.radius;
      const t = segmentCircleHit(
        bullet.prevX, bullet.prevY, bullet.x, bullet.y,
        enemy.x, enemy.y, reach
      );
      if (t === null) continue;

      // 与多个敌人相交时取最近（最早相交时间）的敌人
      if (best === null || t < best.t) {
        best = { enemy, t };
      }
    }

    if (best === null) continue;

    const { enemy, t } = best;

    // 基于实际相交时间结算，而非帧末位置
    const hitX = bullet.prevX + (bullet.x - bullet.prevX) * t;
    const hitY = bullet.prevY + (bullet.y - bullet.prevY) * t;

    enemy.onHit(DAMAGE_PER_HIT);

    // 命中后子弹立即死亡并从碰撞系统移除，
    // 本帧及后续帧都不再参与任何判定（每颗子弹每敌人最多一次伤害）
    bullet.dead = true;
    bullets.splice(bi, 1);

    hits.push({ bullet, enemy, t, x: hitX, y: hitY });
  }

  return hits;
}

module.exports = { checkBulletCollisions, segmentCircleHit };
