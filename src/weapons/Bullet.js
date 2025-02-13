class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'bullet');
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

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
    }
}

