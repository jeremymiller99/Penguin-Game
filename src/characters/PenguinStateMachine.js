class PenguinState {
    constructor(penguin) {
        this.penguin = penguin;
    }
    
    enter() {}
    exit() {}
    update() {}
}

class IdleState extends PenguinState {
    enter() {
        this.penguin.play('idle', true);
    }

    update() {
        // Update gun if player has one
        if (this.penguin.gun) {
            this.penguin.gun.update(this.penguin.scene.time.now);
            
            // Handle reload
            if (Phaser.Input.Keyboard.JustDown(this.penguin.scene.keys.reload)) {
                this.penguin.gun.reload();
            }
        }

        // Check for slide
        if (Phaser.Input.Keyboard.JustDown(this.penguin.scene.keys.slide) && 
            this.canSlide()) {
            this.penguin.stateMachine.transition('sliding');
            return;
        }

        const velocity = this.penguin.scene.calculateVelocity();
        if (velocity.x !== 0 || velocity.y !== 0) {
            this.penguin.stateMachine.transition('moving');
            return;
        }

        if (this.penguin.gun && this.penguin.scene.input.activePointer.isDown) {
            this.penguin.stateMachine.transition('shooting');
            return;
        }

        if (this.penguin.health <= 0) {
            this.penguin.stateMachine.transition('dead');
            return;
        }
    }
    
    canSlide() {
        const now = this.penguin.scene.time.now;
        const lastSlide = this.penguin.scene.slideLastUsed || 0;
        const cooldown = this.penguin.scene.slideCooldown || 1000;
        
        return now - lastSlide >= cooldown;
    }
}

class MovingState extends PenguinState {
    enter() {
        this.penguin.play('walk_right', true);
    }

    update() {
        // Update gun if player has one
        if (this.penguin.gun) {
            this.penguin.gun.update(this.penguin.scene.time.now);
            
            // Handle reload
            if (Phaser.Input.Keyboard.JustDown(this.penguin.scene.keys.reload)) {
                this.penguin.gun.reload();
            }
        }

        // Check for slide
        if (Phaser.Input.Keyboard.JustDown(this.penguin.scene.keys.slide) && 
            this.canSlide()) {
            this.penguin.stateMachine.transition('sliding');
            return;
        }

        const velocity = this.penguin.scene.calculateVelocity();
        
        // Apply velocity to penguin's physics body
        if (this.penguin.body) {
            this.penguin.body.setVelocity(velocity.x, velocity.y);
        }

        // If no movement keys are pressed, transition to idle
        if (velocity.x === 0 && velocity.y === 0) {
            // Explicitly stop movement before transitioning
            if (this.penguin.body) {
                this.penguin.body.setVelocity(0, 0);
            }
            this.penguin.stateMachine.transition('idle');
            return;
        }

        // Flip the penguin sprite based on direction
        if (velocity.x < 0) {
            this.penguin.flipX = true;
        } else if (velocity.x > 0) {
            this.penguin.flipX = false;
        }

        if (this.penguin.gun && this.penguin.scene.input.activePointer.isDown) {
            this.penguin.stateMachine.transition('shooting');
            return;
        }

        if (this.penguin.health <= 0) {
            this.penguin.stateMachine.transition('dead');
            return;
        }
    }
    
    canSlide() {
        const now = this.penguin.scene.time.now;
        const lastSlide = this.penguin.scene.slideLastUsed || 0;
        const cooldown = this.penguin.scene.slideCooldown || 1000;
        
        return now - lastSlide >= cooldown;
    }
}

class ShootingState extends PenguinState {
    update() {
        // Can shoot while moving or standing still
        const velocity = this.penguin.scene.calculateVelocity();
        if (this.penguin.body) {
            this.penguin.body.setVelocity(velocity.x, velocity.y);
        }

        // Handle gun updates
        if (this.penguin.gun) {
            this.penguin.gun.update(this.penguin.scene.time.now);
            
            // Check for reload
            if (this.penguin.gun.currentAmmo === 0) {
                this.penguin.gun.reload();
                return;
            }
        }

        // Check for slide
        if (Phaser.Input.Keyboard.JustDown(this.penguin.scene.keys.slide) && 
            this.canSlide()) {
            this.penguin.stateMachine.transition('sliding');
            return;
        }

        if (!this.penguin.scene.input.activePointer.isDown) {
            this.penguin.stateMachine.transition(velocity.x !== 0 || velocity.y !== 0 ? 'moving' : 'idle');
            return;
        }

        if (this.penguin.health <= 0) {
            this.penguin.stateMachine.transition('dead');
            return;
        }
    }
    
    canSlide() {
        const now = this.penguin.scene.time.now;
        const lastSlide = this.penguin.scene.slideLastUsed || 0;
        const cooldown = this.penguin.scene.slideCooldown || 1000;
        
        return now - lastSlide >= cooldown;
    }
}

class DeadState extends PenguinState {
    enter() {
        this.penguin.scene.checkPenguinDeath();
    }

    // No updates needed in dead state
    update() {}
}

class SlideState extends PenguinState {
    enter() {
        // Get direction for slide
        const velocity = this.penguin.scene.calculateVelocity();
        this.direction = { x: 0, y: 0 };
        
        // If player is moving, slide in that direction with emphasis on horizontal
        if (velocity.x !== 0 || velocity.y !== 0) {
            // Normalize direction
            const length = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            this.direction.x = velocity.x / length;
            this.direction.y = velocity.y / length;
            
            // Emphasize horizontal movement more (more like a penguin belly slide)
            if (Math.abs(this.direction.x) > 0.1) {
                // Increase horizontal component
                const sign = Math.sign(this.direction.x);
                this.direction.x = sign * Math.max(Math.abs(this.direction.x), 0.7);
                // Reduce vertical component
                this.direction.y *= 0.5;
                
                // Re-normalize
                const newLength = Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
                this.direction.x /= newLength;
                this.direction.y /= newLength;
            }
        } 
        // If not moving, slide in the direction the penguin is facing (pure horizontal)
        else {
            this.direction.x = this.penguin.flipX ? -1 : 1;
            this.direction.y = 0;
        }
        
        // Play animation - instead of just idle animation, make it look like belly sliding
        this.penguin.play('idle', true);
        
        // Store original flip state
        this.originalFlipX = this.penguin.flipX;
        
        // Set flip based on horizontal direction
        if (this.direction.x < 0) {
            this.penguin.flipX = true;
        } else if (this.direction.x > 0) {
            this.penguin.flipX = false;
        }
        
        // Calculate rotation based on direction vector
        // atan2 gives us the angle in radians between the positive x-axis and our direction vector
        let angle = Math.atan2(this.direction.y, this.direction.x);
        
        // Adjust the angle based on which way the sprite is facing
        // When facing right (flipX = false), we want the rotation as is
        // When facing left (flipX = true), we need to mirror the rotation
        if (this.penguin.flipX) {
            // For left-facing sprites, we need to flip the angle
            angle = Math.PI - angle;
        }
        
        // Apply rotation
        this.penguin.setRotation(angle);
        
        // Adjust penguin scale to look flatter during slide
        this.originalScaleY = this.penguin.scaleY;
        this.penguin.setScale(this.penguin.scaleX, this.penguin.scaleX * 0.6); // Flatten vertically
        
        // Set slide properties
        this.slideSpeed = 550;
        this.minSlideDuration = 350;
        this.maxSlideDuration = 600;
        this.startTime = this.penguin.scene.time.now;
        this.isSliding = true;
        
        // Make invulnerable
        this.penguin.isInvulnerable = true;
        
        // Hide gun during slide
        if (this.penguin.gun) {
            this.gunVisible = this.penguin.gun.visible;
            this.penguin.gun.setVisible(false);
        }
        
        // Add slide effect (motion blur or trail)
        this.createSlideEffect();
        
        // Start cooldown timer
        this.penguin.scene.slideLastUsed = this.penguin.scene.time.now;
        this.penguin.scene.slideCooldown = 800;
        
        // Play slide sound
        this.penguin.scene.sound.play('slide', {
            volume: 0.5,
            rate: 1.4
        });
        
        // Add ice particle effects for belly slide
        this.createIceParticles();
    }
    
    createSlideEffect() {
        // Create a trail effect behind the penguin
        this.trailEmitter = this.penguin.scene.time.addEvent({
            delay: 30,
            callback: () => {
                const ghost = this.penguin.scene.add.sprite(
                    this.penguin.x, 
                    this.penguin.y, 
                    'penguin'
                ).setScale(this.penguin.scaleX, this.penguin.scaleY);
                
                ghost.setAlpha(0.3);
                ghost.setRotation(this.penguin.rotation);
                ghost.setFlipX(this.penguin.flipX);
                ghost.anims.play('idle');
                
                // Fade out and destroy the ghost
                this.penguin.scene.tweens.add({
                    targets: ghost,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => ghost.destroy()
                });
            },
            repeat: Math.floor(this.slideDuration / 30)
        });
    }
    
    createIceParticles() {
        // Create ice/snow particles for the belly slide effect
        this.particleEmitter = this.penguin.scene.time.addEvent({
            delay: 15,
            callback: () => {
                // Position particles behind the penguin based on movement direction
                const offsetX = -this.direction.x * 15;
                const offsetY = -this.direction.y * 15;
                
                // Create 2-3 particles per emission
                for (let i = 0; i < Phaser.Math.Between(1, 2); i++) {
                    const particle = this.penguin.scene.add.circle(
                        this.penguin.x + offsetX + Phaser.Math.Between(-10, 10),
                        this.penguin.y + offsetY + Phaser.Math.Between(-5, 5),
                        Phaser.Math.Between(2, 4),
                        0xFFFFFF
                    );
                    
                    // Random slight movement
                    const vx = -this.direction.x * Phaser.Math.Between(5, 20);
                    const vy = -this.direction.y * Phaser.Math.Between(5, 20);
                    
                    // Fade out and destroy particle
                    this.penguin.scene.tweens.add({
                        targets: particle,
                        x: particle.x + vx,
                        y: particle.y + vy,
                        alpha: 0,
                        scale: { from: 1, to: 0.5 },
                        duration: Phaser.Math.Between(200, 400),
                        onComplete: () => particle.destroy()
                    });
                }
            },
            repeat: Math.floor(this.slideDuration / 15)
        });
    }
    
    update() {
        const elapsed = this.penguin.scene.time.now - this.startTime;
        const keys = this.penguin.scene.keys;
        
        // End slide condition: exceeded max duration OR reached min duration and space released
        if (elapsed >= this.maxSlideDuration || 
            (elapsed >= this.minSlideDuration && !keys.slide.isDown)) {
            if (this.isSliding) {
                this.isSliding = false;
                this.getUp();
                return;
            }
        }
        
        // Apply slide velocity during slide
        if (this.isSliding) {
            // Calculate slide power (decrease over time but more gradually)
            const remainingFactor = 1 - (elapsed / this.maxSlideDuration);
            const currentSpeed = this.slideSpeed * Math.max(remainingFactor, 0.6); // Don't slow down too much
            
            // Apply velocity
            if (this.penguin.body) {
                this.penguin.body.setVelocity(
                    this.direction.x * currentSpeed,
                    this.direction.y * currentSpeed
                );
            }
            
            // Update the trail and particles while sliding
            if (elapsed % 30 < 16) { // Ensure we're not creating too many effects
                this.updateEffects();
            }
        }
    }
    
    updateEffects() {
        // Add additional trail effects for longer slides
        const ghost = this.penguin.scene.add.sprite(
            this.penguin.x, 
            this.penguin.y, 
            'penguin'
        ).setScale(this.penguin.scaleX, this.penguin.scaleY);
        
        ghost.setAlpha(0.3);
        ghost.setRotation(this.penguin.rotation);
        ghost.setFlipX(this.penguin.flipX);
        ghost.anims.play('idle');
        
        // Fade out and destroy the ghost
        this.penguin.scene.tweens.add({
            targets: ghost,
            alpha: 0,
            duration: 200,
            onComplete: () => ghost.destroy()
        });
        
        // Position particles behind the penguin based on movement direction
        const offsetX = -this.direction.x * 15;
        const offsetY = -this.direction.y * 15;
        
        // Create 1-2 ice particles for continued sliding
        for (let i = 0; i < Phaser.Math.Between(1, 2); i++) {
            const particle = this.penguin.scene.add.circle(
                this.penguin.x + offsetX + Phaser.Math.Between(-10, 10),
                this.penguin.y + offsetY + Phaser.Math.Between(-5, 5),
                Phaser.Math.Between(2, 4),
                0xFFFFFF
            );
            
            // Random slight movement
            const vx = -this.direction.x * Phaser.Math.Between(5, 20);
            const vy = -this.direction.y * Phaser.Math.Between(5, 20);
            
            // Fade out and destroy particle
            this.penguin.scene.tweens.add({
                targets: particle,
                x: particle.x + vx,
                y: particle.y + vy,
                alpha: 0,
                scale: { from: 1, to: 0.5 },
                duration: Phaser.Math.Between(200, 400),
                onComplete: () => particle.destroy()
            });
        }
    }
    
    getUp() {
        // Play quick "getting up" animation
        this.penguin.scene.tweens.add({
            targets: this.penguin,
            rotation: 0,
            scaleY: this.originalScaleY,
            duration: 150,
            onComplete: () => {
                // End invulnerability
                this.penguin.isInvulnerable = false;
                
                // Clean up effects
                if (this.trailEmitter) {
                    this.trailEmitter.remove();
                }
                
                if (this.particleEmitter) {
                    this.particleEmitter.remove();
                }
                
                // Transition based on inputs
                const velocity = this.penguin.scene.calculateVelocity();
                if (velocity.x !== 0 || velocity.y !== 0) {
                    this.penguin.stateMachine.transition('moving');
                } else {
                    this.penguin.stateMachine.transition('idle');
                }
            }
        });
    }
    
    exit() {
        // Ensure rotation and scale are reset
        this.penguin.setRotation(0);
        this.penguin.setScale(this.penguin.scaleX, this.originalScaleY || this.penguin.scaleX);
        
        // Restore original flip state if needed
        if (this.originalFlipX !== undefined) {
            this.penguin.flipX = this.originalFlipX;
        }
        
        // Ensure invulnerability is turned off
        this.penguin.isInvulnerable = false;
        
        // Show gun again if it was visible before
        if (this.penguin.gun && this.gunVisible !== undefined) {
            this.penguin.gun.setVisible(this.gunVisible);
        }
        
        // Clean up effects if they still exist
        if (this.trailEmitter) {
            this.trailEmitter.remove();
        }
        
        if (this.particleEmitter) {
            this.particleEmitter.remove();
        }
    }
}

class PenguinStateMachine {
    constructor(penguin) {
        this.penguin = penguin;
        this.states = {
            idle: new IdleState(penguin),
            moving: new MovingState(penguin),
            shooting: new ShootingState(penguin),
            sliding: new SlideState(penguin),
            dead: new DeadState(penguin)
        };
        this.currentState = this.states.idle;
        this.currentState.enter();
    }

    transition(newState) {
        if (this.states[newState]) {
            this.currentState.exit();
            this.currentState = this.states[newState];
            this.currentState.enter();
        }
    }

    update() {
        if (this.currentState) {
            this.currentState.update();
        }
    }
} 