class RangedEnemy extends Enemy {
    constructor(scene, x, y) {
        // Configure ranged enemy properties
        super(scene, x, y, {
            texture: 'enemy',
            health: 70,
            damage: 15,
            speed: 80,
            attackRange: 300,
            attackCooldown: 1500
        });
        
        // Make it slightly larger and add a distinctive tint
        this.setScale(1.2);
        this.setTint(0x99ccff);
        
        // Create a visible gun for the ranged enemy
        this.gun = new Gun(scene, this.x, this.y, true);
        this.gun.assignToPlayer(this);
        
        // Customize gun properties for enemy
        this.gun.damage = 10;
        this.gun.fireDelay = 1500; // Slower firing rate than player
        this.gun.bulletSpeed = 300; // Slower bullets that player can dodge
        
        // Create a laser sight
        this.laserSight = scene.add.graphics();
        this.laserSight.setDepth(5);
        
        // Add a targeting animation
        this.targetingCircle = scene.add.sprite(this.x, this.y, 'muzzleFlash')
            .setScale(0.5)
            .setAlpha(0.6)
            .setTint(0xff0000)
            .setVisible(false);
            
        // Custom animation for ranged enemy
        scene.anims.create({
            key: 'ranged_enemy_idle',
            frames: scene.anims.generateFrameNumbers('enemy', { start: 4, end: 7 }),
            frameRate: 8,
            repeat: -1
        });
    }

    update(player, time) {
        if (!this.active) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        
        // Flip the enemy to face the player
        this.flipX = player.x < this.x;
        
        // Movement behavior: keep distance from player
        if (distance < 150) {
            // Too close, back away
            const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
            this.setVelocity(
                Math.cos(angle) * this.speed,
                Math.sin(angle) * this.speed
            );
            this.play('enemy_walk', true);
        } else if (distance > this.attackRange) {
            // Too far, move closer
            this.scene.physics.moveToObject(this, player, this.speed);
            this.play('enemy_walk', true);
        } else {
            // In ideal range, stop moving
            this.setVelocity(0, 0);
            this.play('ranged_enemy_idle', true);
        }

        // Update gun and shoot when in range
        if (this.gun) {
            this.gun.update(time);
            
            // Update laser sight
            this.updateLaserSight(player);
            
            // Only shoot when in range and after cooldown
            if (distance < this.attackRange && time - this.lastAttackTime > this.attackCooldown) {
                // Show targeting animation before shooting
                this.targetingCircle.setVisible(true);
                this.targetingCircle.setPosition(player.x, player.y);
                
                // Delay the shot to give player time to dodge
                this.scene.time.delayedCall(400, () => {
                    if (this.active && this.gun && this.gun.active) {
                        this.gun.fire(time);
                        this.lastAttackTime = time;
                        
                        // Hide targeting circle after firing
                        this.targetingCircle.setVisible(false);
                    }
                });
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
    
    updateLaserSight(player) {
        // Clear previous laser
        this.laserSight.clear();
        
        if (this.targetingCircle.visible) {
            // Draw laser sight when targeting
            this.laserSight.lineStyle(1, 0xff0000, 0.3);
            this.laserSight.beginPath();
            this.laserSight.moveTo(this.x, this.y);
            this.laserSight.lineTo(player.x, player.y);
            this.laserSight.closePath();
            this.laserSight.strokePath();
        }
    }

    die() {
        // Clean up resources
        if (this.gun) {
            this.gun.destroy();
            this.gun = null;
        }
        
        if (this.laserSight) {
            this.laserSight.destroy();
            this.laserSight = null;
        }
        
        if (this.targetingCircle) {
            this.targetingCircle.destroy();
            this.targetingCircle = null;
        }
        
        // Call the parent die method
        super.die();
    }
} 