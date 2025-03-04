class MeleeEnemy extends Enemy {
    constructor(scene, x, y) {
        // Configure melee enemy to be faster but weaker
        super(scene, x, y, {
            texture: 'enemy',
            health: 30,         // Reduced health (was 50)
            damage: 25,         // Increased damage (was 10)
            speed: 180,         // Increased speed (was 100)
            attackRange: 50,    // Slightly reduced attack range
            attackCooldown: 800 // Faster attacks
        });
        
        // Make it smaller
        this.setScale(0.8);
        
        // Add a unique tint to distinguish it
        this.setTint(0xff9999);
        
        // Add some particle effects for speed visualization
        this.particles = scene.add.particles('sparkTexture');
        this.emitter = this.particles.createEmitter({
            speed: 20,
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            lifespan: 200,
            frequency: 50,
            tint: 0xff0000,
            on: false
        });
        
        // Custom animation for faster movement
        scene.anims.create({
            key: 'melee_enemy_run',
            frames: scene.anims.generateFrameNumbers('enemy', { start: 0, end: 3 }),
            frameRate: 12,
            repeat: -1
        });
    }

    update(player, time) {
        super.update(player, time);
        
        // Update particle emitter position
        if (this.emitter) {
            this.emitter.setPosition(this.x, this.y + 10);
            
            // Only emit particles when moving
            if (this.body.velocity.length() > 50) {
                this.emitter.on = true;
            } else {
                this.emitter.on = false;
            }
        }
        
        // Use custom animation when moving
        if (this.body.velocity.length() > 50) {
            this.play('melee_enemy_run', true);
        }
    }

    attack(player, time) {
        if (time - this.lastAttackTime > this.attackCooldown) {
            // Deal damage to player
            player.health -= this.damage;
            
            // Play attack sound with higher pitch for faster enemy
            this.scene.sound.play('hit', {
                volume: 0.5,
                rate: 1.2 + Math.random() * 0.3
            });
            
            // Apply visual feedback
            player.setTint(0xff0000);
            this.scene.time.delayedCall(100, () => {
                player.clearTint();
            });
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
                }
            });
        }
    }
    
    die() {
        // Add special death effect for fast enemy
        if (this.emitter) {
            this.emitter.explode(20, this.x, this.y);
            this.emitter.on = false;
        }
        
        // Call the parent die method
        super.die();
    }
} 