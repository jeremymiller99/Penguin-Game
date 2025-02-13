class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, source) {
        super(scene, x, y, 'bullet');
        this.source = source; // 'player' or 'enemy'
        this.speed = 1000; // Set bullet speed
        this.lifespan = 1000; // Set bullet lifespan
        
        scene.physics.world.enable(this);
        this.body.setAllowGravity(false);
        this.body.setCollideWorldBounds(false);
    }

    fire(x, y, angle) {
        // Activate and position the bullet, then set its velocity
        this.setActive(true)
            .setVisible(true)
            .setPosition(x, y)
            .setRotation(angle);
        
        // Set velocity based on angle
        this.scene.physics.velocityFromRotation(
            angle,
            this.speed,
            this.body.velocity
        );

        // Destroy the bullet after its lifespan
        this.scene.time.delayedCall(this.lifespan, () => {
            if (this.active) this.destroy();
        });
    }

    handleCollision(target) {
        if (this.source === 'enemy' && target === this.scene.penguin) {
            target.health -= 10; // Example damage value
            this.scene.sound.play('hit', { volume: 0.4 });
            target.setTint(0xff0000);
            this.scene.time.delayedCall(100, () => target.clearTint());
        } else if (this.source === 'player' && target instanceof Enemy) {
            target.takeDamage(10);
        }
        this.destroy();
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
    }
}

