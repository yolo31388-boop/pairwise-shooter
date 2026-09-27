const { BulletSystem, Bullet } = require('../src/systems/bullet.js');
const { checkBulletCollisions, segmentCircleTime } = require('../src/systems/collision.js');
const { Enemy } = require('../src/entities/enemy.js');

const FRAME = 1 / 60;

function runFrame(bs, enemies) {
  bs.update(FRAME);
  checkBulletCollisions(bs.bullets, enemies);
}

describe('射击子弹碰撞', () => {
  // ===== 原有测试（按线段扫掠语义给出能真正相遇的配置）=====

  test('高速子弹应能命中', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 500, 0);
    const enemies = [new Enemy(100, 100)];
    for (let i = 0; i < 13; i++) runFrame(bs, enemies);
    expect(enemies[0].health).toBeLessThan(30);
  });

  test('单子弹单敌人只造成一次伤害', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 3000, 0);
    const enemies = [new Enemy(50, 100)];
    runFrame(bs, enemies);
    const h1 = enemies[0].health;
    expect(h1).toBe(20); // 确实命中且只扣一次
    checkBulletCollisions(bs.bullets, enemies); // 再次检测
    expect(enemies[0].health).toBe(h1);
  });

  test('碰撞后子弹应立即移除', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 3000, 0);
    const enemies = [new Enemy(50, 100)];
    runFrame(bs, enemies);
    expect(bs.bullets.length).toBe(0); // 当次检测即移除，无需等下一帧
    bs.update(FRAME);
    expect(bs.bullets.length).toBe(0);
  });

  test('敌人死亡后不应继续被命中', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 3000, 0);
    bs.shoot(10, 100, 3000, 0);
    const enemies = [new Enemy(50, 100)];
    const e = enemies[0];
    e.health = 5;
    runFrame(bs, enemies);
    expect(e.dead).toBe(true);
    expect(e.health).toBe(-5); // 仅一次伤害，没有多扣
    expect(enemies).toHaveLength(0); // 立即从碰撞系统移除
    // 剩余子弹下一帧不再与已死亡敌人结算
    const before = bs.bullets.length;
    runFrame(bs, enemies);
    expect(e.health).toBe(-5);
    expect(bs.bullets.length).toBe(before);
  });

  test('同帧多子弹分别结算', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 3000, 0);
    bs.shoot(0, 100, 3000, 0);
    const enemies = [new Enemy(50, 100)];
    runFrame(bs, enemies);
    expect(enemies[0].health).toBe(10); // 两颗各造成 10 点，均不丢失
    expect(bs.bullets).toHaveLength(0);
  });

  test('子弹出界后自动销毁', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 0, 1000, 0);
    for (let i = 0; i < 120; i++) bs.update(FRAME);
    expect(bs.bullets.length).toBe(0);
  });

  // ===== 新增断言 =====

  test('高速子弹整段跳过敌人时仍必须命中（穿透漏判回归）', () => {
    const b = new Bullet(65, 100, 3000, 0); // 单帧位移 50
    const e = new Enemy(90, 100);           // 线段 65→115 穿过圆 [71,109]
    b.update(FRAME);
    expect(Math.hypot(b.x - e.x, b.y - e.y)).toBeGreaterThan(b.radius + e.radius); // 帧末在圆外
    const enemies = [e];
    checkBulletCollisions([b], enemies);
    expect(e.health).toBe(20);
    expect(b.dead).toBe(true);
  });

  test('碰撞后子弹下一帧不再参与任何碰撞判定', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 3000, 0);
    const e1 = new Enemy(50, 100);
    const e2 = new Enemy(200, 100);
    const enemies = [e1, e2];
    runFrame(bs, enemies);
    expect(e1.health).toBe(20);
    expect(e2.health).toBe(30);
    expect(bs.bullets).toHaveLength(0);
  });

  test('敌人死亡当帧后续子弹不得再命中它，且各自独立结算', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 3000, 0);
    bs.shoot(1, 100, 3000, 0);
    bs.shoot(2, 100, 3000, 0);
    const enemies = [new Enemy(20, 100)];
    const e = enemies[0]; // 死亡后会被立即 splice，先持有引用
    e.health = 5; // 三发当帧全部穿过，第一发即击杀
    runFrame(bs, enemies);
    expect(e.dead).toBe(true);
    expect(e.health).toBe(-5); // 仅第一发结算，后两发未重复扣血
    expect(enemies).toHaveLength(0);
    expect(bs.bullets).toHaveLength(2); // 后两发未参与结算，继续飞行
  });

  test('子弹擦边（相切）命中，差一丝则不命中', () => {
    // 水平线 y=81，圆心 (100,100)，命中半径 19，擦边距离恰好 19
    const hit = segmentCircleTime(0, 81, 200, 81, 100, 100, 19);
    expect(hit).toBeCloseTo(0.5, 10);
    const miss = segmentCircleTime(0, 80.5, 200, 80.5, 100, 100, 19);
    expect(miss).toBeNull();

    const bs = new BulletSystem();
    bs.shoot(0, 81, 12000, 0);
    const e = new Enemy(100, 100);
    runFrame(bs, [e]);
    expect(e.health).toBe(20); // 高速擦边同样命中
  });

  test('子弹从敌人内部穿过时必须命中（帧首在圆内、帧末在圆外）', () => {
    const b = new Bullet(85, 100, 2000, 0);
    const e = new Enemy(90, 100);
    b.update(FRAME); // 85→118.3
    expect(Math.hypot(b.x - e.x, b.y - e.y)).toBeGreaterThan(e.radius + b.radius);
    const enemies = [e];
    checkBulletCollisions([b], enemies);
    expect(e.health).toBe(20);
    expect(b.dead).toBe(true);
  });

  test('碰撞时间计算正确：首次进入时间、圆内为 0、不相交为 null', () => {
    expect(segmentCircleTime(0, 100, 100, 100, 40, 100, 19)).toBeCloseTo(0.21, 10);
    expect(segmentCircleTime(45, 100, 145, 100, 40, 100, 19)).toBe(0);
    expect(segmentCircleTime(0, 0, 100, 0, 50, 100, 19)).toBeNull();
  });

  test('子弹与多个敌人相交时只命中最早相交（最近）的敌人', () => {
    const b = new Bullet(0, 100, 3000, 0); // 单帧 50
    b.update(FRAME);                        // 线段 0→50
    const near = new Enemy(20, 100);
    const far = new Enemy(40, 100);
    const enemies = [far, near];
    checkBulletCollisions([b], enemies);
    expect(near.health).toBe(20);
    expect(far.health).toBe(30);
    expect(near.dead).toBe(false); // 单发 10 点不足以致死
    expect(enemies).toContain(far);
    expect(enemies).toContain(near); // 存活敌人留在碰撞系统中
  });

  test('同帧前三发击杀前排后，第四发继续命中后排敌人', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 6000, 0);
    bs.shoot(0, 100, 6000, 0);
    bs.shoot(0, 100, 6000, 0);
    bs.shoot(0, 100, 6000, 0);
    const front = new Enemy(20, 100);
    const back = new Enemy(80, 100);
    const enemies = [front, back];
    runFrame(bs, enemies);
    expect(front.dead).toBe(true);
    expect(front.health).toBe(0);
    expect(back.health).toBe(20); // 第二发没有被死掉的前排吞掉
    expect(enemies).toEqual([back]);
  });

  test('连续快速射击不漏判、不重复伤害（每敌恰好 3 发击杀）', () => {
    const bs = new BulletSystem();
    const enemies = [];
    for (let i = 0; i < 5; i++) enemies.push(new Enemy(200 + i * 60, 100));
    const spies = enemies.map(e => jest.spyOn(e, 'onHit'));
    for (let frame = 0; frame < 60; frame++) {
      bs.shoot(0, 100, 900, 0); // 每帧一发，单帧位移 15 < 命中直径 38
      runFrame(bs, enemies);
    }
    expect(enemies).toHaveLength(0);
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(3);
  });

  test('子弹速度为零时不碰撞（静止在敌人附近）', () => {
    const b = new Bullet(70, 100, 0, 0); // 距敌人 30，半径和 19
    const e = new Enemy(100, 100);
    b.update(FRAME);
    const enemies = [e];
    checkBulletCollisions([b], enemies);
    expect(e.health).toBe(30);
    expect(b.dead).toBe(false);
    expect(enemies).toHaveLength(1);
  });

  test('子弹速度为零且与敌人重叠时也不触发碰撞', () => {
    const b = new Bullet(100, 100, 0, 0);
    const e = new Enemy(100, 100);
    b.update(FRAME);
    const enemies = [e];
    checkBulletCollisions([b], enemies);
    expect(e.health).toBe(30);
    expect(b.dead).toBe(false);
  });

  test('子弹向远离敌人的方向移动时不命中', () => {
    expect(segmentCircleTime(100, 100, 150, 100, 50, 100, 19)).toBeNull();
    const b = new Bullet(100, 100, 300, 0);
    const e = new Enemy(50, 100);
    b.update(FRAME);
    const enemies = [e];
    checkBulletCollisions([b], enemies);
    expect(e.health).toBe(30);
    expect(b.dead).toBe(false);
  });

  test('慢速子弹单次接触只造成一次伤害并被移除', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 60, 0); // 单帧位移 1
    const e = new Enemy(20, 100);
    const enemies = [e];
    let hits = 0;
    for (let i = 0; i < 60; i++) {
      const prev = e.health;
      runFrame(bs, enemies);
      if (e.health < prev) hits++;
      if (bs.bullets.length === 0) break;
    }
    expect(hits).toBe(1);
    expect(e.health).toBe(20);
  });

  test('子弹沿负方向射出界也会自动销毁', () => {
    const bs = new BulletSystem();
    bs.shoot(10, 10, -1000, 0);
    for (let i = 0; i < 120; i++) bs.update(FRAME);
    expect(bs.bullets.length).toBe(0);
  });

  test('onHit 对已死亡敌人幂等且不再扣血', () => {
    const e = new Enemy(0, 0);
    expect(e.onHit(30)).toBe(true);
    expect(e.dead).toBe(true);
    expect(e.onHit(10)).toBe(false);
    expect(e.health).toBe(0);
  });
});
