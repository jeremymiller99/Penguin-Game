class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, config.sprite || 'enemySprite');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Initialize logging
        this.debugLogging = scene.debugLogging || true;
        this.logPrefix = `[👹 ENEMY ${config.type || 'Basic'}]`;
        
        this.setScale(2);
        this.setOrigin(0.5, 0.5);

        // Scale enemy health based on difficulty and game balance
        const baseHealth = 45; // Adjusted to be killed in 3 shots (15 damage per shot)
        this.maxHealth = Math.ceil(baseHealth * (scene.enemyHealthMultiplier || 1.0));
        this.health = this.maxHealth;
        this.speed = config.speed || 100;
        this.attackRange = config.attackRange || 50;
        this.attackCooldown = config.attackCooldown || 1000;
        this.attackDamage = config.attackDamage || 17; // Adjusted to kill player in 6 hits (100/17 ≈ 6)
        this.lastAttackTime = 0;
        
        this.log("Created enemy", {
            health: this.health,
            speed: this.speed,
            attackRange: this.attackRange,
            attackDamage: this.attackDamage
        });
        
        // Attack state flags
        this.isAttacking = false;
        this.hasDamageBeenApplied = false;
        
        // Detection radius - enemies will only chase the player within this distance
        this.detectionRadius = config.detectionRadius || 300;
        
        // Store enemy type for display
        this.enemyType = config.type || 'Basic';

        this.body.setSize(16, 16);
        this.body.setOffset(0, 0);

        // Initialize health bar
        this.healthBar = scene.drawHealthBar(this, this.x - 40, this.y - 30);
        
        // Add nametag to show enemy type
        this.createNametag();
        
        // Simple movement properties
        this.movementTimer = 0;
        this.isInsideBuilding = false;
        
        // Override takeDamage to use centralized system
        this.takeDamage = (amount) => {
            scene.handleDamage(this, amount);
        };
    }
    
    createNametag() {
        // Create a text object for the nametag
        this.nametag = this.scene.add.text(this.x, this.y - 50, this.enemyType, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5, 0.5);
        
        // Set depth to ensure it's visible
        this.nametag.setDepth(100);
    }

    update(player, time) {
        if (!this.active) return; // Check if the enemy is still active

        // Calculate distance to player
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // Flip the enemy to face the player
        this.flipX = player.x < this.x;

        // Check if enemy is inside a building
        const wasInsideBuilding = this.isInsideBuilding;
        this.checkIfInsideBuilding();
        
        // Log only when building state changes
        if (wasInsideBuilding !== this.isInsideBuilding) {
            if (this.isInsideBuilding) {
                this.log("Enemy moved inside building, attempting to escape");
            } else {
                this.log("Enemy escaped from building");
            }
        }

        // Track state changes for logging
        const previousState = {
            isChasing: this._isChasing,
            isInAttackRange: this._isInAttackRange,
            isAttacking: this.isAttacking
        };
        
        // Update current state
        this._isChasing = distance <= this.detectionRadius && !this.isInsideBuilding && !this.isAttacking;
        this._isInAttackRange = distance <= this.attackRange;

        // Only chase player if within detection radius, not inside building, and not already attacking
        if (this._isChasing) {
            if (!this._isInAttackRange) {
                // Only log state change from not chasing to chasing
                if (!previousState.isChasing || previousState.isInAttackRange) {
                    this.log("Detected player, pursuing", { distance });
                }
                this.moveTowardsPlayer(player);
                this.play('enemy_walk', true);
            } else {
                // Only log when entering attack range
                if (!previousState.isInAttackRange) {
                    this.log("Player in attack range, preparing to attack", { distance });
                }
                this.body.setVelocity(0, 0);
                this.play('enemy_idle', true);
                this.attack(player, time);
            }
        } else {
            // Only log when state changes from chasing to not chasing
            if (previousState.isChasing) {
                if (distance > this.detectionRadius) {
                    this.log("Lost sight of player, returning to idle", { distance });
                } else if (this.isInsideBuilding) {
                    this.log("Stuck inside building, cannot pursue player");
                }
            }
            
            if (!this.isAttacking) {
                this.body.setVelocity(0, 0);
                this.play('enemy_idle', true);
            }
        }

        // Update health bar position
        if (this.healthBar) {
            this.healthBar.background.setPosition(this.x - 40, this.y - 30);
            this.healthBar.foreground.setPosition(this.x - 40, this.y - 30);
            const healthPercentage = this.health / this.maxHealth;
            this.healthBar.foreground.width = 80 * healthPercentage;
        }
        
        // Update nametag position
        if (this.nametag) {
            this.nametag.setPosition(this.x, this.y - 50);
        }
    }
    
    // Simple movement towards player
    moveTowardsPlayer(player) {
        // Check if we're inside a building first
        if (this.isInsideBuilding) {
            this.body.setVelocity(0, 0);
            return;
        }
        
        // Calculate direction to player
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        
        // Check for obstacles in the way
        const obstacles = this.simpleObstacleCheck(angle);
        
        if (obstacles) {
            // If there's an obstacle, try to move around it
            // Simple avoidance - move perpendicular to the obstacle
            const avoidAngle = angle + (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2);
            this.body.setVelocity(
                Math.cos(avoidAngle) * this.speed,
                Math.sin(avoidAngle) * this.speed
            );
        } else {
            // No obstacles, move directly towards player
            this.body.setVelocity(
                Math.cos(angle) * this.speed,
                Math.sin(angle) * this.speed
            );
        }
    }
    
    // Simple obstacle check - cast a single ray in the movement direction
    simpleObstacleCheck(angle) {
        const rayLength = 40; // Shorter ray for simpler checks
        const steps = 3; // Fewer steps for performance
        
        // Cast a ray in the movement direction
        for (let i = 1; i <= steps; i++) {
            const checkX = this.x + Math.cos(angle) * (rayLength * (i / steps));
            const checkY = this.y + Math.sin(angle) * (rayLength * (i / steps));
            
            // Convert to tile coordinates
            const tileX = Math.floor(checkX / 32);
            const tileY = Math.floor(checkY / 32);
            
            // Check for collisions with buildings and background
            if (this.scene.buildingsLayer) {
                const tile = this.scene.buildingsLayer.getTileAt(tileX, tileY);
                if (tile && tile.collides) {
                    return true;
                }
            }
            
            if (this.scene.backgroundLayer) {
                const tile = this.scene.backgroundLayer.getTileAt(tileX, tileY);
                if (tile && tile.collides) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Simple check if enemy is inside a building
    checkIfInsideBuilding() {
        const tileX = Math.floor(this.x / 32);
        const tileY = Math.floor(this.y / 32);
        
        // Check buildings layer
        if (this.scene.buildingsLayer) {
            const tile = this.scene.buildingsLayer.getTileAt(tileX, tileY);
            if (tile && tile.collides) {
                this.isInsideBuilding = true;
                // Try to move to a nearby safe position
                this.moveOutOfBuilding();
                return;
            }
        }
        
        // Check background layer
        if (this.scene.backgroundLayer) {
            const tile = this.scene.backgroundLayer.getTileAt(tileX, tileY);
            if (tile && tile.collides) {
                this.isInsideBuilding = true;
                // Try to move to a nearby safe position
                this.moveOutOfBuilding();
                return;
            }
        }
        
        this.isInsideBuilding = false;
    }
    
    // Simple method to move out of a building if stuck inside
    moveOutOfBuilding() {
        // Try to find a safe position nearby
        const directions = [
            { x: 0, y: -1 },  // Up
            { x: 1, y: 0 },   // Right
            { x: 0, y: 1 },   // Down
            { x: -1, y: 0 },  // Left
            { x: 1, y: -1 },  // Up-right
            { x: 1, y: 1 },   // Down-right
            { x: -1, y: 1 },  // Down-left
            { x: -1, y: -1 }  // Up-left
        ];
        
        // Try each direction with increasing distance
        for (let distance = 32; distance <= 96; distance += 32) {
            for (const dir of directions) {
                const testX = this.x + dir.x * distance;
                const testY = this.y + dir.y * distance;
                
                // Check if this position is safe
                if (this.isPositionSafe(testX, testY)) {
                    // Move to this position
                    this.x = testX;
                    this.y = testY;
                    this.body.reset(testX, testY);
                    this.isInsideBuilding = false;
                    return;
                }
            }
        }
    }
    
    // Simple check if a position is safe
    isPositionSafe(x, y) {
        const tileX = Math.floor(x / 32);
        const tileY = Math.floor(y / 32);
        
        // Check buildings layer
        if (this.scene.buildingsLayer) {
            const tile = this.scene.buildingsLayer.getTileAt(tileX, tileY);
            if (tile && tile.collides) {
                return false;
            }
        }
        
        // Check background layer
        if (this.scene.backgroundLayer) {
            const tile = this.scene.backgroundLayer.getTileAt(tileX, tileY);
            if (tile && tile.collides) {
                return false;
            }
        }
        
        return true;
    }

    attack(player, time) {
        // Don't attack if game is frozen
        if (this.scene.isGameFrozen) return;
        
        // Only attack if cooldown has passed
        if (time - this.lastAttackTime > this.attackCooldown && !this.isAttacking) {
            this.log("Attacking player", { 
                attackDamage: this.attackDamage,
                playerHealth: player.health
            });
            
            // Store original position for animation
            const originalX = this.x;
            const originalY = this.y;
            
            // Calculate target position (slightly closer to player)
            const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            const distance = Math.min(30, Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) * 0.5);
            const targetX = this.x + Math.cos(angle) * distance;
            const targetY = this.y + Math.sin(angle) * distance;
            
            // Set a flag to track if damage has been applied during this attack
            this.isAttacking = true;
            this.hasDamageBeenApplied = false;
            
            // Play attack animation - lunge forward then back
            this.scene.tweens.add({
                targets: this,
                x: targetX,
                y: targetY,
                duration: 100,
                ease: 'Power1',
                onComplete: () => {
                    // Deal damage at the peak of the lunge, but only if not already applied
                    if (!this.hasDamageBeenApplied) {
                        this.scene.handleDamage(player, this.attackDamage);
                        this.hasDamageBeenApplied = true;
                    }
                    
                    // Return to original position
                    this.scene.tweens.add({
                        targets: this,
                        x: originalX,
                        y: originalY,
                        duration: 200,
                        ease: 'Power2',
                        onComplete: () => {
                            // Reset attack flags when animation is complete
                            this.isAttacking = false;
                            this.hasDamageBeenApplied = false;
                            this.log("Attack completed");
                        }
                    });
                }
            });
            
            // Update last attack time
            this.lastAttackTime = time;
        }
    }

    // Add method to handle taking damage
    takeDamage(damage) {
        const previousHealth = this.health;
        this.health -= damage;
        
        // Log damage taken
        this.log("Took damage", {
            damage: damage,
            previousHealth: previousHealth,
            currentHealth: this.health
        });
        
        // Show damage number
        if (this.scene.createDamageNumber) {
            this.scene.createDamageNumber(this.x, this.y, damage);
        }
        
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
            this.log("Health depleted, dying");
            this.die();
        }
    }

    die() {
        this.log("Enemy died");
        this.setActive(false);
        this.setVisible(false);

        // Store scene references
        const scene = this.scene;
        
        // Emit enemyKilled event for perks like Vampirism
        scene.events.emit('enemyKilled', this);
        
        // Destroy nametag
        if (this.nametag) {
            this.nametag.destroy();
        }

        // Play explosion sound
        scene.sound.play('death', {
            volume: 1,
            rate: 1 + Math.random() * 0.5  // Random pitch between 1.0 and 1.5
        });

        // Create explosion effect
        const particleCount = 30;  // More particles
        const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff]; // Added white for extra pop
        
        // Create blood splatter effect
        for (let ring = 0; ring < 3; ring++) { // Reduced ring count
            const delay = ring * 35; // Slower sequence
            const scale = 2 + (ring * 0.6);
            
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

        // Check if this was the last enemy and handle ladder spawning
        const remainingEnemies = scene.enemies.getChildren().length;
        const ladderExists = scene.ladder && scene.ladder.active;
        
        if (!ladderExists && remainingEnemies === 0) {
            this.log("Last enemy killed, spawning ladder");
            scene.spawnLadder();
        }
    }

    // Add these logging methods to the Enemy class
    log(message, data) {
        if (!this.debugLogging) return;
        
        const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
        console.log(`${timestamp} ${this.logPrefix}: ${message}`, data || '');
    }

    logWarning(message, data) {
        if (!this.debugLogging) return;
        
        const timestamp = new Date().toISOString().substr(11, 8);
        console.warn(`${timestamp} ${this.logPrefix}: ⚠️ ${message}`, data || '');
    }

    logError(message, error) {
        if (!this.debugLogging) return;
        
        const timestamp = new Date().toISOString().substr(11, 8);
        console.error(`${timestamp} ${this.logPrefix}: ❌ ${message}`, error || '');
    }
}