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
        const scene = this.penguin.scene;
        
        // Update gun if player has one
        if (this.penguin.gun) {
            this.penguin.gun.update(scene.time.now);
        }

        // Check for slide
        if (Phaser.Input.Keyboard.JustDown(scene.keys.slide) && 
            this.canSlide(scene)) {
            this.penguin.stateMachine.transition('sliding');
            return;
        }

        // Check for movement
        const velocity = scene.calculateVelocity();
        if (velocity.x !== 0 || velocity.y !== 0) {
            // Apply velocity to penguin
            this.penguin.body.setVelocity(velocity.x, velocity.y);
            this.penguin.stateMachine.transition('moving');
            return;
        }

        // Check for shooting
        if (this.penguin.gun && scene.input.activePointer.isDown) {
            this.penguin.gun.isFiring = true;
            this.penguin.stateMachine.transition('shooting');
            return;
        }

        // Check for death
        if (this.penguin.health <= 0) {
            this.penguin.stateMachine.transition('dead');
            return;
        }
    }
    
    canSlide(scene) {
        const now = scene.time.now;
        const lastSlide = scene.slideLastUsed || 0;
        const cooldown = scene.slideCooldown || 1000;
        
        return now - lastSlide >= cooldown;
    }
}

class MovingState extends PenguinState {
    enter() {
        this.penguin.play('walk_right', true);
    }

    update() {
        const scene = this.penguin.scene;
        
        // Update gun if player has one
        if (this.penguin.gun) {
            this.penguin.gun.update(scene.time.now);
        }

        // Check for slide
        if (Phaser.Input.Keyboard.JustDown(scene.keys.slide) && 
            this.canSlide(scene)) {
            this.penguin.stateMachine.transition('sliding');
            return;
        }

        // Calculate and apply velocity
        const velocity = scene.calculateVelocity();
        
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

        // Check for shooting
        if (this.penguin.gun && scene.input.activePointer.isDown) {
            this.penguin.gun.isFiring = true;
            this.penguin.stateMachine.transition('shooting');
            return;
        }

        // Check for death
        if (this.penguin.health <= 0) {
            this.penguin.stateMachine.transition('dead');
            return;
        }
    }
    
    canSlide(scene) {
        const now = scene.time.now;
        const lastSlide = scene.slideLastUsed || 0;
        const cooldown = scene.slideCooldown || 1000;
        
        return now - lastSlide >= cooldown;
    }
}

class ShootingState extends PenguinState {
    update() {
        const scene = this.penguin.scene;
        
        // Can shoot while moving or standing still
        const velocity = scene.calculateVelocity();
        if (this.penguin.body) {
            this.penguin.body.setVelocity(velocity.x, velocity.y);
        }

        // Handle gun updates
        if (this.penguin.gun) {
            this.penguin.gun.update(scene.time.now);
            this.penguin.gun.isFiring = true;
            
            // Check for reload
            if (this.penguin.gun.currentAmmo === 0) {
                this.penguin.gun.reload();
            }
        }

        // Check for slide
        if (Phaser.Input.Keyboard.JustDown(scene.keys.slide) && 
            this.canSlide(scene)) {
            this.penguin.stateMachine.transition('sliding');
            return;
        }

        // If no longer shooting, transition to appropriate state
        if (!scene.input.activePointer.isDown) {
            if (this.penguin.gun) {
                this.penguin.gun.isFiring = false;
            }
            
            this.penguin.stateMachine.transition(velocity.x !== 0 || velocity.y !== 0 ? 'moving' : 'idle');
            return;
        }

        // Check for death
        if (this.penguin.health <= 0) {
            this.penguin.stateMachine.transition('dead');
            return;
        }
    }
    
    canSlide(scene) {
        const now = scene.time.now;
        const lastSlide = scene.slideLastUsed || 0;
        const cooldown = scene.slideCooldown || 1000;
        
        return now - lastSlide >= cooldown;
    }
}

class DeadState extends PenguinState {
    enter() {
        const scene = this.penguin.scene;
        
        // Trigger death effect and screen
        scene.createDeathEffect();
        scene.isGameFrozen = true;
        scene.physics.pause();
        
        // Show death screen after a short delay
        scene.time.delayedCall(800, () => {
            scene.showDeathScreen();
        });
    }

    // No updates needed in dead state
    update() {}
}

class SlideState extends PenguinState {
    enter() {
        // Get the scene for easier access
        const scene = this.penguin.scene;
        
        // Check if slide is on cooldown
        const now = scene.time.now;
        const lastSlide = scene.slideLastUsed || 0;
        const cooldown = scene.slideCooldown || 1000;
        
        if (now - lastSlide < cooldown) {
            // If on cooldown, transition back to previous state
            this.penguin.stateMachine.transition('idle');
            return;
        }
        
        // Play slide sound if available
        if (scene.sound.get('slide')) {
            scene.sound.play('slide', {
                volume: 0.5,
                rate: 1.0 + Math.random() * 0.2
            });
        }
        
        // Set sliding flag in scene
        scene.isSliding = true;
        
        // Reset slide timer
        scene.slideTimer = 0;
        scene.slideLastUsed = now;
        
        // Get current velocity or facing direction
        const slideSpeed = scene.moveSpeed * 1.2;
        let slideVelocity = { x: 0, y: 0 };
        
        // Get direction based on keys
        if (scene.keys.left.isDown || scene.keys.right.isDown || scene.keys.up.isDown || scene.keys.down.isDown) {
            // Slide in the direction of movement
            if (scene.keys.left.isDown) slideVelocity.x = -slideSpeed;
            if (scene.keys.right.isDown) slideVelocity.x = slideSpeed;
            if (scene.keys.up.isDown) slideVelocity.y = -slideSpeed;
            if (scene.keys.down.isDown) slideVelocity.y = slideSpeed;
            
            // Normalize diagonal movement
            if (slideVelocity.x !== 0 && slideVelocity.y !== 0) {
                const normalizedVelocity = new Phaser.Math.Vector2(slideVelocity.x, slideVelocity.y).normalize();
                slideVelocity.x = normalizedVelocity.x * slideSpeed;
                slideVelocity.y = normalizedVelocity.y * slideSpeed;
            }
        } else if (this.penguin.body.velocity.x !== 0 || this.penguin.body.velocity.y !== 0) {
            // Normalize current velocity and multiply by slide speed
            const normalizedVelocity = new Phaser.Math.Vector2(
                this.penguin.body.velocity.x, 
                this.penguin.body.velocity.y
            ).normalize();
            
            slideVelocity.x = normalizedVelocity.x * slideSpeed;
            slideVelocity.y = normalizedVelocity.y * slideSpeed;
        } else {
            // If not moving, slide in the direction the player is facing
            // For penguin, use the gun's rotation as reference
            if (this.penguin.gun) {
                const angle = this.penguin.gun.rotation;
                slideVelocity.x = Math.cos(angle) * slideSpeed;
                slideVelocity.y = Math.sin(angle) * slideSpeed;
            } else {
                // Default to right if no gun
                slideVelocity.x = slideSpeed;
            }
        }
        
        // Store original drag for restoration later
        scene.originalDrag = this.penguin.body.drag.clone();
        
        // Reduce drag to simulate ice sliding, but not as extreme
        this.penguin.body.setDrag(50, 50);
        
        // Apply slide velocity
        this.penguin.body.setVelocity(slideVelocity.x, slideVelocity.y);
        
        // Add visual effects for sliding
        
        // 1. Slight transparency
        this.penguin.setAlpha(0.85);
        
        // 2. Create a trail effect
        scene.slideTrailEmitter = scene.createSlideTrail();
        
        // 3. Add a slight tilt to the penguin in the direction of movement
        const tiltAngle = Math.atan2(slideVelocity.y, slideVelocity.x);
        this.penguin.rotation = tiltAngle * 0.2; // Subtle tilt
        
        // Store slide start time
        this.slideStartTime = now;
        
        // Play slide animation if available
        if (scene.anims.exists('penguin_slide')) {
            this.penguin.play('penguin_slide', true);
        } else {
            this.penguin.play('walk_right', true);
        }
    }
    
    update() {
        const scene = this.penguin.scene;
        const now = scene.time.now;
        const elapsed = now - this.slideStartTime;
        
        // End slide after a certain duration
        if (elapsed >= 500) {
            this.endSlide();
            return;
        }
        
        // Start gradual slowdown after a certain time
        if (elapsed >= 250 && !this.slowdownStarted) {
            this.slowdownStarted = true;
            
            // Start gradual slowdown with more intense deceleration
            scene.slideEndTween = scene.tweens.add({
                targets: this.penguin.body.velocity,
                x: { from: this.penguin.body.velocity.x, to: this.penguin.body.velocity.x * 0.2 }, // More intense slowdown (0.2 instead of 0.3)
                y: { from: this.penguin.body.velocity.y, to: this.penguin.body.velocity.y * 0.2 }, // More intense slowdown (0.2 instead of 0.3)
                duration: 250, // Shorter duration (250ms instead of 300ms)
                ease: 'Sine.easeOut'
            });
        }
    }
    
    endSlide() {
        const scene = this.penguin.scene;
        
        // Restore original drag
        if (scene.originalDrag) {
            this.penguin.body.setDrag(scene.originalDrag.x, scene.originalDrag.y);
        }
        
        // Reset visual effects
        this.penguin.setAlpha(1);
        this.penguin.rotation = 0;
        
        // Stop trail effect
        if (scene.slideTrailEmitter) {
            scene.slideTrailEmitter.setActive(false);
            scene.slideTrailEmitter.setVisible(false);
            scene.slideTrailEmitter.destroy();
            scene.slideTrailEmitter = null;
        }
        
        // Reset sliding flag
        scene.isSliding = false;
        
        // Transition to appropriate state based on input
        const velocity = scene.calculateVelocity();
        if (velocity.x !== 0 || velocity.y !== 0) {
            this.penguin.stateMachine.transition('moving');
        } else {
            this.penguin.stateMachine.transition('idle');
        }
    }
    
    exit() {
        const scene = this.penguin.scene;
        
        // Ensure rotation is reset
        this.penguin.setRotation(0);
        
        // Ensure alpha is reset
        this.penguin.setAlpha(1);
        
        // Stop any active tweens
        if (scene.slideEndTween) {
            scene.slideEndTween.stop();
        }
        
        // Clean up trail effect
        if (scene.slideTrailEmitter) {
            scene.slideTrailEmitter.setActive(false);
            scene.slideTrailEmitter.setVisible(false);
            scene.slideTrailEmitter.destroy();
            scene.slideTrailEmitter = null;
        }
        
        // Reset sliding flag
        scene.isSliding = false;
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