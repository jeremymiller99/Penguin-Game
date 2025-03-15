// Helper function for logging
function logState(scene, message, data) {
    // Check if scene exists before trying to access its properties
    if (!scene || !scene.debugLogging) return;
    
    const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
    console.log(`${timestamp} [🐧 PENGUIN] ${message}`, data || '');
}

class PenguinState {
    constructor(penguin) {
        this.penguin = penguin;
        this.scene = penguin.scene;
    }
    
    enter() {
        // State entry
    }
    
    exit() {
        // State exit
    }
    
    update() {}
}

class IdleState extends PenguinState {
    enter() {
        super.enter();
        // Safety check before playing animation
        if (this.penguin) {
            try {
                this.penguin.play('idle', true);
            } catch (error) {
                // Error playing idle animation
            }
        }
    }

    update() {
        // Safety check for penguin object but don't check active flag
        if (!this.penguin) return;
        
        // Update gun if player has one
        if (this.penguin.gun) {
            this.penguin.gun.update(this.scene.time.now);
        }

        // Check for slide
        if (Phaser.Input.Keyboard.JustDown(this.scene.keys.slide) && 
            this.canSlide()) {
            this.penguin.stateMachine.transition('sliding');
            return;
        }

        // Check for movement
        const velocity = this.scene.calculateVelocity();
        if (velocity.x !== 0 || velocity.y !== 0) {
            // Apply velocity to penguin
            if (this.penguin.body) {
                this.penguin.body.setVelocity(velocity.x, velocity.y);
            }
            this.penguin.stateMachine.transition('moving');
            return;
        }

        // Check for shooting
        if (this.penguin.gun && this.scene.input.activePointer.isDown) {
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
    
    canSlide() {
        const now = this.scene.time.now;
        const lastSlide = this.scene.slideLastUsed || 0;
        const cooldown = this.scene.slideCooldown || 1000;
        return now - lastSlide >= cooldown;
    }
}

class MovingState extends PenguinState {
    enter() {
        super.enter();
        // Safety check before playing animation
        if (this.penguin) {
            try {
                this.penguin.play('walk_right', true);
                // Ensure the penguin's physics body is enabled for movement
                if (this.penguin.body) {
                    this.penguin.body.enable = true;
                }
            } catch (error) {
                // Error playing walk animation
            }
        }
    }

    update() {
        // Safety check for penguin object but don't check active flag
        if (!this.penguin) return;
        
        // First, make sure the physics body is enabled
        if (this.penguin.body) {
            this.penguin.body.enable = true;
        }
        
        // Update gun if player has one
        if (this.penguin.gun) {
            this.penguin.gun.update(this.scene.time.now);
        }

        // Check for slide
        if (Phaser.Input.Keyboard.JustDown(this.scene.keys.slide) && 
            this.canSlide()) {
            this.penguin.stateMachine.transition('sliding');
            return;
        }

        // Calculate and apply velocity
        const velocity = this.scene.calculateVelocity();
        
        // Apply velocity to penguin's physics body with safety check
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
        if (this.penguin.gun && this.scene.input.activePointer.isDown) {
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
    
    canSlide() {
        const now = this.scene.time.now;
        const lastSlide = this.scene.slideLastUsed || 0;
        const cooldown = this.scene.slideCooldown || 1000;
        return now - lastSlide >= cooldown;
    }
}

class ShootingState extends PenguinState {
    enter() {
        super.enter();
        // No specific animation to play in shooting state, we use the same as idle
        if (this.penguin) {
            try {
                this.penguin.play('idle', true);
            } catch (error) {
                // Error playing shooting animation
            }
        }
    }

    update() {
        // Safety check for penguin object but don't check active flag
        if (!this.penguin) return;
        
        // Can shoot while moving or standing still
        const velocity = this.scene.calculateVelocity();
        if (this.penguin.body) {
            this.penguin.body.setVelocity(velocity.x, velocity.y);
        }

        // Handle gun updates
        if (this.penguin.gun) {
            this.penguin.gun.update(this.scene.time.now);
            this.penguin.gun.isFiring = true;
            
            // Check for reload
            if (this.penguin.gun.currentAmmo === 0) {
                this.penguin.gun.reload();
            }
        }

        // Check for slide
        if (Phaser.Input.Keyboard.JustDown(this.scene.keys.slide) && 
            this.canSlide()) {
            this.penguin.stateMachine.transition('sliding');
            return;
        }

        // If no longer shooting, transition to appropriate state
        if (!this.scene.input.activePointer.isDown) {
            if (this.penguin.gun) {
                this.penguin.gun.isFiring = false;
            }
            
            const newState = velocity.x !== 0 || velocity.y !== 0 ? 'moving' : 'idle';
            this.penguin.stateMachine.transition(newState);
            return;
        }

        // Check for death
        if (this.penguin.health <= 0) {
            this.penguin.stateMachine.transition('dead');
            return;
        }
    }
    
    canSlide() {
        const now = this.scene.time.now;
        const lastSlide = this.scene.slideLastUsed || 0;
        const cooldown = this.scene.slideCooldown || 1000;
        return now - lastSlide >= cooldown;
    }
}

class DeadState extends PenguinState {
    enter() {
        super.enter();
        
        // Trigger death effect and screen
        this.scene.createDeathEffect();
        this.scene.isGameFrozen = true;
        this.scene.physics.pause();
        
        // Show death screen after a short delay
        this.scene.time.delayedCall(800, () => {
            this.scene.showDeathScreen();
        });
    }

    // No updates needed in dead state
    update() {}
}

class SlideState extends PenguinState {
    enter() {
        super.enter();
        
        // Check if slide is on cooldown
        const now = this.scene.time.now;
        const lastSlide = this.scene.slideLastUsed || 0;
        const cooldown = this.scene.slideCooldown || 1000;
        
        if (now - lastSlide < cooldown) {
            // If on cooldown, transition back to previous state
            this.penguin.stateMachine.transition('idle');
            return;
        }
        
        // Play slide sound if available
        if (this.scene.sound.get('slide')) {
            this.scene.sound.play('slide', {
                volume: 0.5,
                rate: 1.0 + Math.random() * 0.2
            });
        }
        
        // Set sliding flag and initialize slide parameters
        this.scene.isSliding = true;
        this.scene.slideLastUsed = now;
        this.scene.slideTimer = 0; // Reset the slide timer
        
        // Store slide start time and initialize tracking variables
        this.slideStartTime = now;
        this.maxSlideDuration = 400; // Reduced duration for more snappy feel
        this.endingSlide = false; // Flag to prevent multiple end slide calls
        
        // Cancel any existing slide end tween to prevent conflicts
        if (this.scene.slideEndTween) {
            this.scene.slideEndTween.stop();
            this.scene.slideEndTween = null;
        }
        
        // Fixed slide speed that never changes
        const FIXED_SLIDE_SPEED = 400; // Constant speed for consistent slides
        let slideDirection = { x: 0, y: 0 };
        
        // Determine slide direction based on input or facing direction
        if (this.scene.keys.left.isDown || this.scene.keys.right.isDown || this.scene.keys.up.isDown || this.scene.keys.down.isDown) {
            // Use input direction
            if (this.scene.keys.left.isDown) slideDirection.x = -1;
            if (this.scene.keys.right.isDown) slideDirection.x = 1;
            if (this.scene.keys.up.isDown) slideDirection.y = -1;
            if (this.scene.keys.down.isDown) slideDirection.y = 1;
        } else {
            // If no input, use the direction the penguin is facing
            if (this.penguin.gun) {
                const angle = this.penguin.gun.rotation;
                slideDirection.x = Math.cos(angle);
                slideDirection.y = Math.sin(angle);
            } else {
                // Default to the direction the penguin is facing based on flipX
                slideDirection.x = this.penguin.flipX ? -1 : 1;
            }
        }
        
        // Normalize direction vector to ensure consistent speed
        const normalizedDirection = new Phaser.Math.Vector2(slideDirection.x, slideDirection.y).normalize();
        
        // Apply fixed slide velocity
        const slideVelocity = {
            x: normalizedDirection.x * FIXED_SLIDE_SPEED,
            y: normalizedDirection.y * FIXED_SLIDE_SPEED
        };
        
        // Store original drag for restoration later
        this.scene.originalDrag = this.penguin.body.drag.clone();
        
        // Set very low drag during slide for consistent speed
        this.penguin.body.setDrag(0, 0);
        
        // Clear any existing velocity before applying slide
        this.penguin.body.setVelocity(0, 0);
        
        // Apply the fixed slide velocity
        this.penguin.body.setVelocity(slideVelocity.x, slideVelocity.y);
        
        // Store the slide direction for use in endSlide
        this.slideDirection = normalizedDirection;
        
        // Visual effects for sliding
        this.penguin.setAlpha(0.85);
        this.scene.slideTrailEmitter = this.scene.createSlideTrail();
        
        // Add a slight tilt to the penguin in the direction of movement
        const tiltAngle = Math.atan2(slideVelocity.y, slideVelocity.x);
        this.penguin.rotation = tiltAngle * 0.2; // Subtle tilt
        
        // Play slide animation if available
        if (this.scene.anims.exists('penguin_slide')) {
            this.penguin.play('penguin_slide', true);
        } else {
            this.penguin.play('walk_right', true);
        }
        
        // Set up a forced end to the slide after maxSlideDuration
        this.slideEndTimer = this.scene.time.delayedCall(this.maxSlideDuration, () => {
            if (this.scene.isSliding && !this.endingSlide) {
                this.beginEndingSlide();
            }
        });
    }
    
    update() {
        const now = this.scene.time.now;
        const elapsed = now - this.slideStartTime;
        
        // Safety check - if we're somehow still in slide state but the scene says we're not sliding
        if (!this.scene.isSliding) {
            this.penguin.stateMachine.transition('idle');
            return;
        }
        
        // End slide if max duration reached
        if (elapsed >= this.maxSlideDuration && !this.endingSlide) {
            this.beginEndingSlide();
            return;
        }
        
        // Update trail effect position
        if (this.scene.slideTrailEmitter) {
            this.scene.slideTrailEmitter.setPosition(this.penguin.x, this.penguin.y);
        }
        
        // Prevent any velocity changes during slide
        // This ensures the slide maintains its fixed speed
        const currentVelocity = this.penguin.body.velocity;
        if (currentVelocity.x !== 0 || currentVelocity.y !== 0) {
            const speed = Math.sqrt(currentVelocity.x * currentVelocity.x + currentVelocity.y * currentVelocity.y);
            if (Math.abs(speed - 400) > 1) { // If speed has changed from our fixed speed
                const normalized = new Phaser.Math.Vector2(currentVelocity.x, currentVelocity.y).normalize();
                this.penguin.body.setVelocity(
                    normalized.x * 400,
                    normalized.y * 400
                );
            }
        }
    }
    
    beginEndingSlide() {
        // Set flag to prevent multiple end slide calls
        this.endingSlide = true;
        
        // Clear any existing slide end timer
        if (this.slideEndTimer) {
            this.slideEndTimer.remove();
            this.slideEndTimer = null;
        }
        
        // Create a very short, sharp deceleration
        this.scene.slideEndTween = this.scene.tweens.add({
            targets: this.penguin.body.velocity,
            x: 0,
            y: 0,
            duration: 100, // Very short duration for snappy feel
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.endSlide();
            }
        });
    }
    
    endSlide() {
        // Restore original drag but with a slightly lower value for smoother transition
        if (this.scene.originalDrag) {
            // Use 80% of the original drag for a smoother transition
            this.penguin.body.setDrag(
                this.scene.originalDrag.x * 0.8,
                this.scene.originalDrag.y * 0.8
            );
            this.scene.originalDrag = null;
        }
        
        // Reset visual effects
        this.penguin.setAlpha(1);
        this.penguin.rotation = 0;
        
        // Stop trail effect
        if (this.scene.slideTrailEmitter) {
            this.scene.slideTrailEmitter.setActive(false);
            this.scene.slideTrailEmitter.setVisible(false);
            this.scene.slideTrailEmitter.destroy();
            this.scene.slideTrailEmitter = null;
        }
        
        // Reset sliding flag
        this.scene.isSliding = false;
        
        // Check if movement keys are being pressed
        const isMoving = this.scene.keys.left.isDown || this.scene.keys.right.isDown || 
                         this.scene.keys.up.isDown || this.scene.keys.down.isDown;
        
        // Calculate new velocity based on input
        let newVelocity = this.scene.calculateVelocity();
        
        // If player is pressing movement keys, immediately apply that velocity
        // This ensures no pause between slide end and movement
        if (isMoving && (newVelocity.x !== 0 || newVelocity.y !== 0)) {
            this.penguin.body.setVelocity(newVelocity.x, newVelocity.y);
            this.penguin.stateMachine.transition('moving');
        } 
        // If no keys are pressed but we still have momentum, preserve it and go to moving state
        else if (this.penguin.body.velocity.x !== 0 || this.penguin.body.velocity.y !== 0) {
            // Keep some momentum but transition to moving state
            this.penguin.stateMachine.transition('moving');
        } 
        // Only go to idle if completely stopped
        else {
            this.penguin.stateMachine.transition('idle');
        }
    }
    
    exit() {
        // Clear any existing slide end timer
        if (this.slideEndTimer) {
            this.slideEndTimer.remove();
            this.slideEndTimer = null;
        }
        
        // Ensure rotation is reset
        this.penguin.setRotation(0);
        
        // Ensure alpha is reset
        this.penguin.setAlpha(1);
        
        // Stop any active tweens
        if (this.scene.slideEndTween) {
            this.scene.slideEndTween.stop();
            this.scene.slideEndTween = null;
        }
        
        // Clean up trail effect
        if (this.scene.slideTrailEmitter) {
            this.scene.slideTrailEmitter.setActive(false);
            this.scene.slideTrailEmitter.setVisible(false);
            this.scene.slideTrailEmitter.destroy();
            this.scene.slideTrailEmitter = null;
        }
        
        // Reset sliding flag
        this.scene.isSliding = false;
        
        // Restore original drag if it wasn't already done
        if (this.scene.originalDrag) {
            this.penguin.body.setDrag(this.scene.originalDrag.x, this.scene.originalDrag.y);
            this.scene.originalDrag = null;
        }
        
        super.exit();
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
        
        // Initialize state machine
        this.currentState.enter();
    }

    transition(newState) {
        // Safety check but don't use active property which can be affected by visual effects
        if (!this.penguin) {
            return;
        }
        
        if (this.states[newState]) {
            this.currentState.exit();
            this.currentState = this.states[newState];
            this.currentState.enter();
        }
    }

    update() {
        // Safety check - make sure penguin is available but don't check active flag
        // which can be affected by visual effects
        if (!this.penguin) return;
        
        if (this.currentState) {
            this.currentState.update();
        }
    }
} 