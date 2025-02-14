class RangedEnemy extends Enemy {
    constructor(scene, x, y) {
        // Configure ranged enemy specific properties
        const config = {
            sprite: 'enemySprite',
            maxHealth: 120,
            speed: 80,
            attackRange: 300,
            attackCooldown: 2000,
            attackDamage: 15
        };
        
        super(scene, x, y, config);
        
        // Create AI-controlled gun
        this.gun = new Gun(scene, x, y, true);
        this.gun.assignToPlayer(this);
        
        // Add initial delay before first shot
        this.lastAttackTime = scene.time.now + 2000; // 2 second initial delay
    }

    update(player, time) {
        if (!this.active) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // Flip the enemy to face the player
        this.flipX = player.x < this.x;

        // Keep distance from player
        if (distance < this.attackRange / 2) {
            const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
            this.setVelocity(
                Math.cos(angle) * this.speed,
                Math.sin(angle) * this.speed
            );
            this.play('enemy_walk', true);
        } else if (distance > this.attackRange) {
            this.scene.physics.moveToObject(this, player, this.speed);
            this.play('enemy_walk', true);
        } else {
            this.setVelocity(0, 0);
            this.play('enemy_idle', true);
        }

        // Update gun and shoot when in range
        if (this.gun) {
            this.gun.update(time);
            if (distance < this.attackRange && time - this.lastAttackTime > this.attackCooldown) {
                this.gun.fire(time); // No need to capture the return value
                this.lastAttackTime = time;
            }
        }

        // Update health bar position
        if (this.healthBar) {
            this.healthBar.background.setPosition(this.x - 40, this.y - 30);
            this.healthBar.foreground.setPosition(this.x - 40, this.y - 30);
            const healthPercentage = this.health / this.maxHealth;
            this.healthBar.foreground.width = 80 * healthPercentage;
        }
    }

    die() {
        if (this.gun) {
            this.gun.destroy();  // Just destroy the gun instead of dropping it
            this.gun = null;
        }
        super.die();
    }
} 