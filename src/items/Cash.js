class Cash extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'cash');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Create a glow sprite that sits behind the main sprite
        this.glowSprite = scene.add.sprite(0, 0, 'cash')
            .setScale(2.2)  // Slightly larger than main sprite
            .setTint(0xffff00)  // Yellow tint
            .setAlpha(0.5);  // Semi-transparent
        
        // Make the glow sprite follow the main sprite
        this.glowSprite.setDepth(this.depth - 1);  // Place behind main sprite
        
        this.setScale(2);
        this.value = 10; // Each cash drop worth 10 currency
        
        // Add some physics properties
        this.body.setDrag(100);
        this.body.setBounce(0.3);
        this.body.setCollideWorldBounds(true);
        
        // Add a small random velocity when spawned
        const angle = Math.random() * Math.PI * 2;
        const speed = 100;
        this.body.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );

        // Add floating animation
        scene.tweens.add({
            targets: this,
            y: '+=10', // Float up and down 10 pixels
            rotation: 0.1, // Slight rotation for visual interest
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add glow pulse animation
        scene.tweens.add({
            targets: this.glowSprite,
            alpha: 0.2,  // Fade between 0.5 and 0.2
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // Override the update method to make the glow follow the main sprite
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.glowSprite.setPosition(this.x, this.y);
    }

    // Override destroy to clean up the glow sprite
    destroy() {
        this.glowSprite.destroy();
        super.destroy();
    }
} 