const { BulletSystem } = require('../src/systems/bullet.js');
const { checkBulletCollisions } = require('../src/systems/collision.js');
const { Enemy } = require('../src/entities/enemy.js');

describe('射击子弹碰撞', () => {
  test('高速子弹应能命中', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 500, 0); // 高速子弹
    const enemies = [new Enemy(100, 100)];
    bs.update(1/60);
    checkBulletCollisions(bs.bullets, enemies);
    expect(enemies[0].health).toBeLessThan(30);
  });

  test('单子弹单敌人只造成一次伤害', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 100, 0);
    const enemies = [new Enemy(50, 100)];
    bs.update(1/60);
    checkBulletCollisions(bs.bullets, enemies);
    const h1 = enemies[0].health;
    checkBulletCollisions(bs.bullets, enemies); // 再次检测
    expect(enemies[0].health).toBe(h1);
  });

  test('碰撞后子弹应立即移除', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 100, 0);
    const enemies = [new Enemy(50, 100)];
    bs.update(1/60);
    checkBulletCollisions(bs.bullets, enemies);
    bs.update(1/60);
    expect(bs.bullets.length).toBe(0);
  });

  test('敌人死亡后不应继续被命中', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 100, 0);
    bs.shoot(10, 100, 100, 0);
    const enemies = [new Enemy(50, 100)];
    enemies[0].health = 5;
    bs.update(1/60);
    checkBulletCollisions(bs.bullets, enemies);
    expect(enemies[0].dead).toBe(true);
  });

  test('同帧多子弹分别结算', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 80, 0);
    bs.shoot(0, 100, 90, 0);
    const enemies = [new Enemy(50, 100)];
    bs.update(1/60);
    checkBulletCollisions(bs.bullets, enemies);
    expect(enemies[0].health).toBeLessThanOrEqual(10);
  });

  test('子弹出界后自动销毁', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 0, 1000, 0);
    for (let i = 0; i < 120; i++) bs.update(1/60);
    expect(bs.bullets.length).toBe(0);
  });

  test('高速子弹一帧跨过敌人：线段检测命中而帧末单点检测漏判', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 1000, 0); // 一帧从 x=0 到 x=1000
    const enemy = new Enemy(500, 100);
    const enemies = [enemy];
    bs.update(1/60);
    // 帧末位置 x=1000，距敌人 500px，远超半径；只有扫掠线段能命中
    expect(bs.bullets[0].x).toBe(1000);
    checkBulletCollisions(bs.bullets, enemies);
    expect(enemy.health).toBe(20);
  });

  test('每颗子弹对同一敌人每帧仅造成一次伤害（onHit 只调用一次）', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 100, 0);
    const enemy = new Enemy(50, 100);
    enemy.health = 100;
    const enemies = [enemy];
    const spy = jest.spyOn(enemy, 'onHit');
    bs.update(1/60);
    checkBulletCollisions(bs.bullets, enemies);
    checkBulletCollisions(bs.bullets, enemies);
    checkBulletCollisions(bs.bullets, enemies);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(enemy.health).toBe(90);
  });

  test('碰撞后子弹在当帧立即从碰撞数组移除，无需等下次 update', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 100, 0);
    const enemies = [new Enemy(50, 100)];
    bs.update(1/60);
    expect(bs.bullets.length).toBe(1);
    checkBulletCollisions(bs.bullets, enemies);
    expect(bs.bullets.length).toBe(0);
    expect(bs.bullets.some(b => b.dead)).toBe(false);
  });

  test('敌人死亡当帧即剔除：其余子弹不再命中它', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 100, 0);
    bs.shoot(10, 100, 100, 0);
    bs.shoot(20, 100, 100, 0);
    const enemy = new Enemy(50, 100);
    enemy.health = 10; // 一颗子弹即可击杀
    const enemies = [enemy];
    const spy = jest.spyOn(enemy, 'onHit');
    bs.update(1/60);
    checkBulletCollisions(bs.bullets, enemies);
    expect(enemy.dead).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1); // 只有击杀的那一颗结算
    expect(enemy.health).toBe(0);
    expect(bs.bullets.length).toBe(2); // 另外两颗子弹仍在，但不能再命中
  });

  test('同帧多颗子弹命中存活敌人时分别结算，不合并不丢失', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 80, 0);
    bs.shoot(0, 100, 90, 0);
    bs.shoot(0, 100, 100, 0);
    const enemy = new Enemy(50, 100);
    enemy.health = 100;
    const enemies = [enemy];
    const spy = jest.spyOn(enemy, 'onHit');
    bs.update(1/60);
    checkBulletCollisions(bs.bullets, enemies);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(enemy.health).toBe(70);
    expect(bs.bullets.length).toBe(0);
  });

  test('子弹轨迹与敌人圆形相切（擦边）应判定命中，且相交时间为 0.5', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 119, 100, 0); // 轨迹 y=119，与圆心(50,100) 距离恰为 19=半径和
    const enemies = [new Enemy(50, 100)];
    bs.update(1/60);
    const hits = checkBulletCollisions(bs.bullets, enemies);
    expect(hits.length).toBe(1);
    expect(enemies[0].health).toBe(20);
    expect(hits[0].t).toBeCloseTo(0.5, 10);
  });

  test('子弹擦边但轨迹在半径和之外时不命中', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 120, 100, 0); // 距离 20 > 半径和 19
    const enemies = [new Enemy(50, 100)];
    bs.update(1/60);
    const hits = checkBulletCollisions(bs.bullets, enemies);
    expect(hits.length).toBe(0);
    expect(enemies[0].health).toBe(30);
    expect(bs.bullets.length).toBe(1); // 未命中，子弹保留
  });

  test('子弹从敌人内部生成并穿出：t=0 立即命中', () => {
    const bs = new BulletSystem();
    bs.shoot(100, 100, 100, 0); // 起点就在敌人圆心
    const enemies = [new Enemy(100, 100)];
    bs.update(1/60);
    const hits = checkBulletCollisions(bs.bullets, enemies);
    expect(hits.length).toBe(1);
    expect(hits[0].t).toBe(0);
    expect(enemies[0].health).toBe(20);
    expect(bs.bullets.length).toBe(0);
  });

  test('碰撞响应基于实际相交时间：t=0.31、命中点 x=31，而非帧末 x=100', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 100, 0);
    const enemies = [new Enemy(50, 100)]; // 进入边界 x = 50 - (3+16) = 31
    bs.update(1/60);
    const hits = checkBulletCollisions(bs.bullets, enemies);
    expect(hits.length).toBe(1);
    expect(hits[0].t).toBeCloseTo(0.31, 10);
    expect(hits[0].x).toBeCloseTo(31, 10);
    expect(hits[0].y).toBeCloseTo(100, 10);
  });

  test('子弹一帧内穿过多个敌人时只命中最近（最早相交）的敌人', () => {
    const bs = new BulletSystem();
    bs.shoot(0, 100, 1000, 0);
    const near = new Enemy(300, 100); // 进入时间 t=0.281
    const far = new Enemy(700, 100);  // 进入时间 t=0.681
    const enemies = [near, far];
    bs.update(1/60);
    const hits = checkBulletCollisions(bs.bullets, enemies);
    expect(hits.length).toBe(1);
    expect(hits[0].enemy).toBe(near);
    expect(near.health).toBe(20);
    expect(far.health).toBe(30);
  });

  test('自定义小战场：子弹向两侧飞出边界后自动销毁', () => {
    const bs = new BulletSystem({ left: 0, right: 200, top: 0, bottom: 200 });
    bs.shoot(0, 100, 150, 0);
    bs.shoot(100, 100, -150, 0);
    bs.update(1/60);
    expect(bs.bullets.length).toBe(1); // 150 在界内，-50 已出界销毁
    bs.update(1/60);
    expect(bs.bullets.length).toBe(0); // 300 与 -200 均出界
  });

  test('连续高射速射击不漏判：逐帧发射的 10 颗子弹全部依次命中（旧单点检测为 0 命中）', () => {
    const bs = new BulletSystem();
    const enemy = new Enemy(500, 100);
    enemy.health = 99999; // 敌人不死亡，统计每颗子弹的命中
    const enemies = [enemy];
    const spy = jest.spyOn(enemy, 'onHit');
    for (let frame = 0; frame < 20; frame++) {
      if (frame < 10) bs.shoot(0, 100, 60, 0); // 每帧一颗，步长 60，帧末位置全是 60 的倍数
      bs.update(1/60);
      checkBulletCollisions(bs.bullets, enemies);
    }
    expect(spy).toHaveBeenCalledTimes(10);
    expect(enemy.health).toBe(99999 - 10 * 10);
    expect(bs.bullets.length).toBe(0);
  });

  test('速度为零的子弹即使与敌人重叠也不发生碰撞', () => {
    const bs = new BulletSystem();
    bs.shoot(50, 100, 0, 0); // 静止在敌人圆心
    const enemy = new Enemy(50, 100);
    const enemies = [enemy];
    const spy = jest.spyOn(enemy, 'onHit');
    bs.update(1/60);
    const hits = checkBulletCollisions(bs.bullets, enemies);
    expect(hits.length).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    expect(enemy.health).toBe(30);
    expect(enemy.dead).toBe(false);
    expect(bs.bullets.length).toBe(1); // 静止子弹保留，等待后续逻辑
  });
});
