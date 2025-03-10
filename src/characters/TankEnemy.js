class TankEnemy extends Enemy {
    constructor(scene, x, y) {
        // Configure tank enemy properties
        super(scene, x, y, {
            texture: 'enemy',
            health: 200,
            damage: 30,
            speed: 50,
            attackRange: 120,
            attackCooldown: 3000
        });
        
        // Make it larger and add a distinctive tint
        this.setScale(1.5);
        this.setTint(0x666666);
        
        // Add armor effect (damage reduction)
        this.damageReduction = 0.3; // 30% damage reduction
        
        // Create warning indicator for area attack
        this.warningCircle = scene.add.graphics();
        this.warningCircle.setDepth(5);
        
        // Add a stomp sound
        this.stompSound = scene.sound.add('hit', { volume: 0.7 });
        
        // Charging state
        this.isCharging = false;
        this.chargeTarget = null;
    }

    update(player, time) {
        if (!this.active) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        
        // Flip the enemy to face the player
        this.flipX = player.x < this.x;
        
        // Update health bar position
        if (this.healthBar) {
            this.healthBar.background.setPosition(this.x - 40, this.y - 40);
            this.healthBar.foreground.setPosition(this.x - 40, this.y - 40);
            const healthPercentage = this.health / this.maxHealth;
            this.healthBar.foreground.width = 80 * healthPercentage;
        }
        
        // Handle charging state
        if (this.isCharging) {
            if (this.chargeTarget) {
                // Move faster during charge
                this.scene.physics.moveToObject(this, this.chargeTarget, this.speed * 1.5);
                
                // Check if we've reached the target
                const chargeDistance = Phaser.Math.Distance.Between(
                    this.x, this.y, this.chargeTarget.x, this.chargeTarget.y
                );
                
                if (chargeDistance < 20) {
                    this.groundPound();
                    this.isCharging = false;
                    this.chargeTarget = null;
                }
            }
            return;
        }
        
        // Regular movement and attack logic
        if (distance < this.attackRange) {
            // In attack range, stop and attack
            this.setVelocity(0, 0);
            
            if (time - this.lastAttackTime > this.attackCooldown) {
                this.startGroundPoundAttack(player);
                this.lastAttackTime = time;
            } else {
                this.play('enemy_idle', true);
            }
        } else {
            // Move towards player
            this.scene.physics.moveToObject(this, player, this.speed);
            this.play('enemy_walk', true);
        }
    }
    
    startGroundPoundAttack(player) {
        // Play attack animation
        this.play('enemy_idle');
        
        // Show warning indicator
        this.showWarningCircle();
        
        // Set charging state
        this.isCharging = true;
        
        // Calculate a position near the player to charge to
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const targetDistance = Math.min(distance, 150); // Don't go too far
        
        this.chargeTarget = {
            x: this.x + Math.cos(angle) * targetDistance,
            y: this.y + Math.sin(angle) * targetDistance
        };
    }
    
    showWarningCircle() {
        // Show a warning circle that grows and fades
        this.warningCircle.clear();
        this.warningCircle.fillStyle(0xff0000, 0.3);
        this.warningCircle.fillCircle(this.x, this.y, 30);
        
        // Animate the warning circle
        this.scene.tweens.add({
            targets: this.warningCircle,
            alpha: { from: 0.3, to: 0 },
            duration: 1000,
            onUpdate: () => {
                this.warningCircle.clear();
                this.warningCircle.fillStyle(0xff0000, this.warningCircle.alpha);
                this.warningCircle.fillCircle(this.x, this.y, 30 + (1 - this.warningCircle.alpha) * 70);
            }
        });
    }
    
    groundPound() {
        // Play stomp sound
        this.stompSound.play();
        
        // Create simple explosion effect with graphics
        const explosionGraphics = this.scene.add.graphics();
        explosionGraphics.fillStyle(0xff0000, 0.6);
        explosionGraphics.fillCircle(this.x, this.y, 50);
        
        // Fade out and destroy
        this.scene.tweens.add({
            targets: explosionGraphics,
            alpha: 0,
            duration: 300,
            onComplete: () => explosionGraphics.destroy()
        });
        
        // Screen shake effect
        this.scene.cameras.main.shake(200, 0.01);
        
        // Deal area damage to player if in range
        const player = this.scene.player;
        if (player) {
            const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (distance < 100) {
                // Calculate damage based on distance (more damage closer to impact)
                const damageMultiplier = 1 - (distance / 100);
                const areaDamage = Math.ceil(this.damage * damageMultiplier);
                player.takeDamage(areaDamage);
                
                // Knockback effect
                const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
                const knockbackForce = 300 * damageMultiplier;
                player.setVelocity(
                    Math.cos(angle) * knockbackForce,
                    Math.sin(angle) * knockbackForce
                );
            }
        }
    }
    
    takeDamage(amount) {
        // Apply damage reduction
        const reducedDamage = Math.ceil(amount * (1 - this.damageReduction));
        
        // Show armor effect - simple rectangle
        const armorEffect = this.scene.add.rectangle(this.x, this.y, 30, 30, 0xaaaaaa, 0.7);
        this.scene.tweens.add({
            targets: armorEffect,
            alpha: 0,
            duration: 200,
            onComplete: () => armorEffect.destroy()
        });
            
        // Call parent method with reduced damage
        super.takeDamage(reducedDamage);
    }

    die() {
        // Clean up resources
        if (this.warningCircle) {
            this.warningCircle.destroy();
        }
        
        // Simple death effect
        const deathEffect = this.scene.add.graphics();
        deathEffect.fillStyle(0xff0000, 0.7);
        deathEffect.fillCircle(this.x, this.y, 40);
        
        this.scene.tweens.add({
            targets: deathEffect,
            alpha: 0,
            duration: 500,
            onComplete: () => deathEffect.destroy()
        });
        
        // Call the parent die method
        super.die();
    }
} 