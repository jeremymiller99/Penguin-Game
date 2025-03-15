class MeleeEnemy extends Enemy {
    constructor(scene, x, y) {
        // Configure melee enemy to be faster but weaker
        super(scene, x, y, {
            texture: 'enemy',
            health: 60,         // Adjusted to be killed in 4 shots (15 damage per shot)
            damage: 19,         // 1.1x basic enemy damage (17 * 1.1 ≈ 19)
            speed: 180,         // Increased speed (was 100)
            attackRange: 50,    // Slightly reduced attack range
            attackCooldown: 800, // Faster attacks
            type: 'Melee'       // Add type for nametag
        });
        
        // Increase the size
        this.setScale(1.8);
        
        // Add a unique tint to distinguish it
        this.setTint(0xff9999);
        
        // Replace particle emitter with a simpler visual effect
        // Create a trail effect using graphics instead of particles
        this.trail = scene.add.graphics();
        this.trail.setDepth(1); // Set below the enemy
        
        // Store previous positions for trail effect
        this.previousPositions = [];
        this.maxTrailLength = 5;
        
        // Custom animation for faster movement
        scene.anims.create({
            key: 'melee_enemy_run',
            frames: scene.anims.generateFrameNumbers('enemy', { start: 0, end: 3 }),
            frameRate: 12,
            repeat: -1
        });
    }

    update(player, time) {
        // Call the parent update method, which now includes pathfinding
        super.update(player, time);
        
        // Store current position for trail effect
        if (this.body.velocity.length() > 50) {
            // Only add to trail when moving
            this.previousPositions.unshift({ x: this.x, y: this.y });
            
            // Limit trail length
            if (this.previousPositions.length > this.maxTrailLength) {
                this.previousPositions.pop();
            }
            
            // Draw trail
            this.updateTrail();
            
            // Use custom animation when moving
            this.play('melee_enemy_run', true);
        } else {
            // Clear trail when not moving
            this.previousPositions = [];
            this.trail.clear();
        }
    }
    
    updateTrail() {
        // Clear previous trail
        this.trail.clear();
        
        // Draw new trail
        if (this.previousPositions.length > 1) {
            for (let i = 0; i < this.previousPositions.length - 1; i++) {
                const alpha = 0.7 * (1 - i / this.previousPositions.length);
                const thickness = 8 * (1 - i / this.previousPositions.length);
                
                this.trail.lineStyle(thickness, 0xff9999, alpha);
                this.trail.beginPath();
                this.trail.moveTo(this.previousPositions[i].x, this.previousPositions[i].y);
                this.trail.lineTo(this.previousPositions[i+1].x, this.previousPositions[i+1].y);
                this.trail.strokePath();
            }
        }
    }

    attack(player, time) {
        if (time - this.lastAttackTime > this.attackCooldown && !this.isAttacking) {
            // Set attack flags
            this.isAttacking = true;
            this.hasDamageBeenApplied = false;
            
            // Deal damage to player
            if (!this.hasDamageBeenApplied) {
                player.takeDamage(this.damage);
                this.hasDamageBeenApplied = true;
            }
            
            this.lastAttackTime = time;
            
            // Add a quick dash attack animation
            this.scene.tweens.add({
                targets: this,
                x: player.x,
                y: player.y,
                duration: 80,  // Faster animation
                yoyo: true,
                ease: 'Power2',
                onStart: () => {
                    // Flash effect
                    this.setTint(0xffffff);
                },
                onComplete: () => {
                    this.clearTint();
                    this.setTint(0xff9999); // Restore original tint
                    
                    // Reset attack flags
                    this.isAttacking = false;
                    this.hasDamageBeenApplied = false;
                }
            });
        }
    }
    
    die() {
        // Add special death effect for fast enemy
        // Create a simple explosion effect instead of using particles
        const explosionSize = 30;
        const explosionCircle = this.scene.add.circle(this.x, this.y, explosionSize, 0xff9999, 0.8);
        
        // Animate the explosion
        this.scene.tweens.add({
            targets: explosionCircle,
            radius: explosionSize * 2,
            alpha: 0,
            duration: 300,
            onComplete: () => explosionCircle.destroy()
        });
        
        // Clear the trail
        if (this.trail) {
            this.trail.clear();
        }
        
        // Call the parent die method
        super.die();
    }
} 