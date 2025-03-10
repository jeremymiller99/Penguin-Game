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
        
        console.log("Creating ranged enemy with gun");
        
        // Create a gun exactly like the player's
        this.gun = new Gun(scene, this.x, this.y);
        
        // Set depth to ensure visibility
        this.gun.setDepth(10);
        
        // Customize gun appearance
        this.gun.gunSprite.setTexture('ak47');
        this.gun.gunSprite.setScale(2.0);
        this.gun.gunSprite.setVisible(true);
        this.gun.gunSprite.setDepth(10);
        
        // Assign to enemy
        this.gun.assignToPlayer(this);
        
        // Customize gun properties for enemy
        this.gun.damage = 10;
        this.gun.fireDelay = 1500; // Slower firing rate than player
        this.gun.bulletSpeed = 500; // Slightly slower bullets that player can dodge
        this.gun.currentAmmo = 999; // Infinite ammo for enemies
        this.gun.maxAmmo = 999;
        
        // Create a laser sight with high visibility
        this.laserSight = scene.add.graphics();
        this.laserSight.setDepth(5);
        
        // Add a targeting animation
        this.targetingCircle = scene.add.sprite(this.x, this.y, 'muzzleFlash')
            .setScale(0.8)
            .setAlpha(0.6)
            .setTint(0xff0000)
            .setVisible(false)
            .setDepth(10);
            
        // Custom animation for ranged enemy
        scene.anims.create({
            key: 'ranged_enemy_idle',
            frames: scene.anims.generateFrameNumbers('enemy', { start: 4, end: 7 }),
            frameRate: 8,
            repeat: -1
        });
        
        // Track last fire time separately from attack time
        this.lastFireTime = 0;
        
        // Add a debug visual to show the enemy has a gun
        this.debugText = scene.add.text(this.x, this.y - 50, "GUNNER", {
            fontSize: '14px',
            fontFamily: 'Arial',
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 2
        }).setDepth(10).setOrigin(0.5);
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

        // Update debug text position
        if (this.debugText) {
            this.debugText.setPosition(this.x, this.y - 50);
        }

        // Update gun position to follow the enemy
        if (this.gun) {
            // Position the gun relative to the enemy
            const gunOffsetX = this.flipX ? -20 : 20;
            this.gun.x = this.x + gunOffsetX;
            this.gun.y = this.y;
            
            // Rotate gun to aim at player
            const angle = Phaser.Math.Angle.Between(
                this.gun.x, this.gun.y,
                player.x, player.y
            );
            this.gun.rotation = angle;
            
            // Flip gun sprite based on enemy direction
            this.gun.gunSprite.setFlipY(Math.abs(angle) > Math.PI / 2);
            
            // Update laser sight
            this.updateLaserSight(player);
            
            // Only shoot when in range and after cooldown
            if (distance < this.attackRange && time - this.lastFireTime > this.gun.fireDelay) {
                // Show targeting animation before shooting
                this.targetingCircle.setVisible(true);
                this.targetingCircle.setPosition(player.x, player.y);
                
                // Delay the shot to give player time to dodge
                this.scene.time.delayedCall(400, () => {
                    if (this.active && this.gun && this.gun.active) {
                        // Set isFiring to true to make the gun fire using its own method
                        this.gun.isFiring = true;
                        
                        // Use the gun's built-in fire method - exactly like the player
                        const fired = this.gun.fire(time);
                        
                        if (fired) {
                            // Update last fire time
                            this.lastFireTime = time;
                            this.lastAttackTime = time; // Keep this for compatibility
                        }
                        
                        // Reset firing flag
                        this.gun.isFiring = false;
                        
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
            // Draw laser sight when targeting - make it more visible
            this.laserSight.lineStyle(2, 0xff0000, 0.7); // Thicker, more opaque
            this.laserSight.beginPath();
            this.laserSight.moveTo(this.x, this.y);
            this.laserSight.lineTo(player.x, player.y);
            this.laserSight.closePath();
            this.laserSight.strokePath();
        }
    }

    die() {
        // Clean up resources
        if (this.debugText) {
            this.debugText.destroy();
            this.debugText = null;
        }
        
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