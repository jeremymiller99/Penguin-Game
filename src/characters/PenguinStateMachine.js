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

        if (!this.penguin.scene.input.activePointer.isDown) {
            this.penguin.stateMachine.transition(velocity.x !== 0 || velocity.y !== 0 ? 'moving' : 'idle');
            return;
        }

        if (this.penguin.health <= 0) {
            this.penguin.stateMachine.transition('dead');
            return;
        }
    }
}

class DeadState extends PenguinState {
    enter() {
        this.penguin.scene.checkPenguinDeath();
    }

    // No updates needed in dead state
    update() {}
}

class PenguinStateMachine {
    constructor(penguin) {
        this.penguin = penguin;
        this.states = {
            idle: new IdleState(penguin),
            moving: new MovingState(penguin),
            shooting: new ShootingState(penguin),
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