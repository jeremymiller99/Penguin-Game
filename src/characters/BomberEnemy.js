class BomberEnemy extends Enemy {
    constructor(scene, x, y) {
        // Configure bomber enemy properties
        super(scene, x, y, {
            texture: 'enemy',
            health: 60,
            damage: 20,
            speed: 120,
            attackRange: 200,
            attackCooldown: 2500
        });
        
        // Make it distinctive with a yellow tint
        this.setScale(1.1);
        this.setTint(0xffcc00);
        
        // Track active mines
        this.activeMines = [];
        this.maxMines = 3; // Maximum number of mines allowed at once
        
        // Add sounds
        this.dropSound = scene.sound.add('hit', { volume: 0.4 });
        this.explosionSound = scene.sound.add('hit', { volume: 0.7 });
        
        // Erratic movement pattern
        this.movementTimer = 0;
        this.movementDirection = new Phaser.Math.Vector2(0, 0);
    }

    update(player, time) {
        if (!this.active) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        
        // Flip the enemy to face the player
        this.flipX = player.x < this.x;
        
        // Update health bar position
        if (this.healthBar) {
            this.healthBar.background.setPosition(this.x - 40, this.y - 30);
            this.healthBar.foreground.setPosition(this.x - 40, this.y - 30);
            const healthPercentage = this.health / this.maxHealth;
            this.healthBar.foreground.width = 80 * healthPercentage;
        }
        
        // Erratic movement pattern
        this.updateMovement(player, time);
        
        // Drop mines when in range
        if (distance < this.attackRange && time - this.lastAttackTime > this.attackCooldown) {
            if (this.activeMines.length < this.maxMines) {
                this.dropMine();
                this.lastAttackTime = time;
            }
        }
        
        // Update active mines
        this.updateMines();
    }
    
    updateMovement(player, time) {
        // Change direction randomly
        if (time > this.movementTimer) {
            // Set new timer
            this.movementTimer = time + Phaser.Math.Between(500, 1500);
            
            // Decide movement pattern
            const pattern = Phaser.Math.Between(0, 3);
            
            if (pattern === 0) {
                // Move toward player
                this.scene.physics.moveToObject(this, player, this.speed);
                this.play('enemy_walk', true);
            } else if (pattern === 1) {
                // Move away from player
                const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
                this.movementDirection.x = Math.cos(angle) * this.speed;
                this.movementDirection.y = Math.sin(angle) * this.speed;
                this.setVelocity(this.movementDirection.x, this.movementDirection.y);
                this.play('enemy_walk', true);
            } else if (pattern === 2) {
                // Move perpendicular to player
                const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
                const perpAngle = angle + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1);
                this.movementDirection.x = Math.cos(perpAngle) * this.speed;
                this.movementDirection.y = Math.sin(perpAngle) * this.speed;
                this.setVelocity(this.movementDirection.x, this.movementDirection.y);
                this.play('enemy_walk', true);
            } else {
                // Stop briefly
                this.setVelocity(0, 0);
                this.play('enemy_idle', true);
            }
        }
        
        // If too close to player, always move away
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (distance < 100) {
            const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
            this.movementDirection.x = Math.cos(angle) * this.speed * 1.2;
            this.movementDirection.y = Math.sin(angle) * this.speed * 1.2;
            this.setVelocity(this.movementDirection.x, this.movementDirection.y);
            this.play('enemy_walk', true);
        }
    }
    
    dropMine() {
        // Play animation
        this.play('enemy_idle');
        
        // Play sound
        this.dropSound.play();
        
        // Create mine - simple sprite with physics
        const mine = this.scene.physics.add.sprite(this.x, this.y, 'enemy');
        mine.setScale(0.5);
        mine.setTint(0xffcc00);
        mine.setDepth(3);
            
        // Add blinking effect to indicate countdown
        this.scene.tweens.add({
            targets: mine,
            alpha: { from: 1, to: 0.3 },
            duration: 300,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                // Faster blinking before explosion
                this.scene.tweens.add({
                    targets: mine,
                    alpha: { from: 1, to: 0.3 },
                    duration: 100,
                    yoyo: true,
                    repeat: 5,
                    onComplete: () => this.detonateMine(mine)
                });
            }
        });
        
        // Add to active mines
        this.activeMines.push({
            sprite: mine,
            createdAt: this.scene.time.now,
            detonationTime: this.scene.time.now + 3000 // Detonate after 3 seconds
        });
        
        // Add warning circle
        const warningCircle = this.scene.add.graphics();
        warningCircle.fillStyle(0xff0000, 0.2);
        warningCircle.fillCircle(mine.x, mine.y, 80);
        warningCircle.setDepth(2);
        
        // Store reference to warning circle
        mine.warningCircle = warningCircle;
        
        // Add collision with player
        this.scene.physics.add.overlap(mine, this.scene.player, () => {
            this.detonateMine(mine);
        });
    }
    
    updateMines() {
        const currentTime = this.scene.time.now;
        
        // Check for mines that should detonate
        for (let i = this.activeMines.length - 1; i >= 0; i--) {
            const mine = this.activeMines[i];
            
            // Update warning circle position (in case mine moved)
            if (mine.sprite.warningCircle) {
                mine.sprite.warningCircle.clear();
                mine.sprite.warningCircle.fillStyle(0xff0000, 0.2);
                mine.sprite.warningCircle.fillCircle(mine.sprite.x, mine.sprite.y, 80);
            }
            
            // Detonate if time is up
            if (currentTime >= mine.detonationTime) {
                this.detonateMine(mine.sprite);
                this.activeMines.splice(i, 1);
            }
        }
    }
    
    detonateMine(mine) {
        if (!mine.active) return; // Already detonated
        
        // Play explosion sound
        this.explosionSound.play();
        
        // Create simple explosion effect with graphics
        const explosion = this.scene.add.graphics();
        explosion.fillStyle(0xff8800, 0.7);
        explosion.fillCircle(mine.x, mine.y, 40);
        
        // Fade out and destroy
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            duration: 300,
            onComplete: () => explosion.destroy()
        });
            
        // Screen shake
        this.scene.cameras.main.shake(150, 0.008);
        
        // Deal damage to player if in range
        const player = this.scene.player;
        if (player) {
            const distance = Phaser.Math.Distance.Between(mine.x, mine.y, player.x, player.y);
            if (distance < 80) {
                // Calculate damage based on distance (more damage closer to explosion)
                const damageMultiplier = 1 - (distance / 80);
                const explosionDamage = Math.ceil(this.damage * damageMultiplier);
                player.takeDamage(explosionDamage);
                
                // Knockback effect
                const angle = Phaser.Math.Angle.Between(mine.x, mine.y, player.x, player.y);
                const knockbackForce = 250 * damageMultiplier;
                player.setVelocity(
                    Math.cos(angle) * knockbackForce,
                    Math.sin(angle) * knockbackForce
                );
            }
        }
        
        // Remove warning circle
        if (mine.warningCircle) {
            mine.warningCircle.destroy();
        }
        
        // Remove mine from active mines list
        this.activeMines = this.activeMines.filter(m => m.sprite !== mine);
        
        // Destroy mine sprite
        mine.destroy();
    }

    die() {
        // Detonate all mines when dying
        this.activeMines.forEach(mine => {
            this.detonateMine(mine.sprite);
        });
        
        // Clear active mines list
        this.activeMines = [];
        
        // Simple death effect
        const deathEffect = this.scene.add.graphics();
        deathEffect.fillStyle(0xffcc00, 0.7);
        deathEffect.fillCircle(this.x, this.y, 30);
        
        this.scene.tweens.add({
            targets: deathEffect,
            alpha: 0,
            duration: 400,
            onComplete: () => deathEffect.destroy()
        });
        
        // Call the parent die method
        super.die();
    }
} 