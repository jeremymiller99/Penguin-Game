class MeleeEnemy extends Enemy {
    constructor(scene, x, y) {
        // Configure melee enemy specific properties
        const config = {
            sprite: 'enemySprite',
            maxHealth: 200,
            speed: 50,
            attackRange: 50,
            attackCooldown: 1000,
            attackDamage: 35
        };
        
        super(scene, x, y, config);

        // Make the enemy bigger
        this.setScale(3);
    }

    update(player, time) {
        if (!this.active) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // Flip the enemy to face the player
        this.flipX = player.x < this.x;

        // Always chase player aggressively
        if (distance > this.attackRange) {
            this.scene.physics.moveToObject(this, player, this.speed);
            this.play('enemy_walk', true);
        } else {
            this.setVelocity(0, 0);
            this.play('enemy_idle', true);
            this.attack(player, time);
        }

        // Update health bar position
        if (this.healthBar) {
            this.healthBar.background.setPosition(this.x - 40, this.y - 30);
            this.healthBar.foreground.setPosition(this.x - 40, this.y - 30);
            const healthPercentage = this.health / this.maxHealth;
            this.healthBar.foreground.width = 80 * healthPercentage;
        }
    }

    attack(player, time) {
        if (time - this.lastAttackTime > this.attackCooldown) {
            console.log('Melee enemy attacks!');
            player.health -= this.attackDamage;
            this.scene.sound.play('hit', {
                volume: 0.4,
                rate: 0.8 + Math.random() * 0.4
            });

            // Apply visual feedback
            player.setTint(0xff0000);
            this.scene.time.delayedCall(100, () => {
                player.clearTint();
            });
            this.lastAttackTime = time;

            // Optional: Add melee attack animation or effect here
            this.scene.tweens.add({
                targets: this,
                x: player.x,
                y: player.y,
                duration: 100,
                yoyo: true,
                ease: 'Power1'
            });
        }
    }
} 