class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, config.sprite || 'enemySprite');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(2);
        this.setOrigin(0.5, 0.5);

        // Initialize with default values that can be overridden
        this.maxHealth = config.maxHealth || 100;
        this.health = this.maxHealth;
        this.speed = config.speed || 100;
        this.attackRange = config.attackRange || 50;
        this.attackCooldown = config.attackCooldown || 1000;
        this.attackDamage = config.attackDamage || 10;
        this.lastAttackTime = 0;

        this.body.setSize(16, 16);
        this.body.setOffset(0, 0);

        // Initialize health bar
        this.healthBar = scene.drawHealthBar(this, this.x - 40, this.y - 30);
    }

    update(player, time) {
        if (!this.active) return; // Check if the enemy is still active

        // Calculate distance to player
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // Flip the enemy to face the player
        this.flipX = player.x < this.x;

        // Move towards player if not in attack range
        if (distance > this.attackRange) {
            this.scene.physics.moveToObject(this, player, this.speed);
            this.play('enemy_walk', true);
        } else {
            this.body.setVelocity(0, 0);
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
            console.log('Enemy attacks!');
            // Implement attack logic here (e.g., reduce player health)sdw
            player.health -= this.attackDamage; // Example: reduce player health by attackDamage
            // Play sound effect
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
        }
    }

    // Add method to handle taking damage
    takeDamage(damage) {
        this.health -= damage;
        
        // Play hit sound
        this.scene.sound.play('hit', {
            volume: 0.4,
            rate: 0.8 + Math.random() * 0.4  // Random pitch between 0.8 and 1.2
        });

        // Flash red when hit
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            this.clearTint();
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        console.log('Enemy died!');
        this.setActive(false);
        this.setVisible(false);

        // Store scene reference
        const scene = this.scene;

        // Play explosion sound
        scene.sound.play('explosion', {
            volume: 0.4,
            rate: 0.8 + Math.random() * 0.4  // Random pitch between 0.8 and 1.2
        });

        // Create explosion effect
        const particleCount = 30;  // More particles
        const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff]; // Added white for extra pop
        
        // Create blood splatter effect
        for (let ring = 0; ring < 3; ring++) { // Reduced ring count
            const delay = ring * 35; // Slower sequence
            const scale = 2 + (ring * 0.6); // Smaller scaling
            
            for (let i = 0; i < particleCount; i++) {
                // Create random angles for splatter look
                const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
                const speed = 200 + Math.random() * 300; // Lower speeds
                const distance = 5 + Math.random() * 20;
                
                // Create blood droplet particle
                const particle = scene.add.sprite(
                    this.x + Math.cos(angle) * distance,
                    this.y + Math.sin(angle) * distance,
                    'bullet'
                );
                
                // Set to red tint
                particle.setTint(0xff0000);
                particle.setScale(scale * (0.5 + Math.random()));
                particle.setAlpha(0.7 + Math.random() * 0.2);
                
                // Add rotation to particles
                particle.rotation = Math.random() * Math.PI * 2;
                
                scene.time.delayedCall(delay, () => {
                    // Initial "burst" tween
                    scene.tweens.add({
                        targets: particle,
                        scale: particle.scale * 1.2,
                        duration: 100,
                        onComplete: () => {
                            // Main trajectory tween
                            scene.tweens.add({
                                targets: particle,
                                x: particle.x + Math.cos(angle) * speed,
                                y: particle.y + Math.sin(angle) * speed + 200, // Less gravity
                                alpha: 0,
                                scale: scale * 0.2,
                                rotation: particle.rotation + (Math.random() * 3 - 1.5) * Math.PI,
                                duration: 600 + Math.random() * 300,
                                ease: 'Power3.easeOut',
                                onComplete: () => particle.destroy()
                            });
                        }
                    });
                });
            }
        }

        // Create multiple flash rings
        for (let i = 0; i < 3; i++) {  // Three flash rings
            const flash = scene.add.sprite(this.x, this.y, 'muzzleFlash')
                .setScale(3 + i * 2)
                .setAlpha(1)
                .setTint(i === 0 ? 0xffffff : i === 1 ? 0xffff00 : 0xff6600);

            scene.tweens.add({
                targets: flash,
                alpha: 0,
                scale: 10 + (i * 5),  // Bigger expansion
                duration: 300 + (i * 100),
                ease: 'Power2',
                onComplete: () => flash.destroy()
            });
        }

        // Add a shockwave effect
        const shockwave = scene.add.sprite(this.x, this.y, 'muzzleFlash')
            .setScale(1)
            .setAlpha(0.5)
            .setTint(0xffffff);

        scene.tweens.add({
            targets: shockwave,
            alpha: 0,
            scale: 15,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => shockwave.destroy()
        });

        // Screen shake effect
        scene.cameras.main.shake(200, 0.01);

        // Destroy the health bar
        if (this.healthBar) {
            this.healthBar.background.destroy();
            this.healthBar.foreground.destroy();
        }

        // Destroy the enemy
        this.destroy();

        // Check if the ladder should be spawned
        if (scene.enemies.getChildren().length <= 1) {
            scene.spawnLadder();
        }
    }
} 