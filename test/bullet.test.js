
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
});
