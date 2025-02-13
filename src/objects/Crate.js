class Crate extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'crate');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(2);
        this.setCollideWorldBounds(true);
        this.body.setAllowGravity(false);
        this.body.moves = true;
        this.body.setDrag(0.5);
        this.body.setBounce(0.2);
        this.body.setMass(1);
    }

    explode() {
        console.log('Crate exploded!');
        this.setActive(false);
        this.setVisible(false);

        const scene = this.scene;

        // Play explosion sound
        scene.sound.play('explosion', {
            volume: 0.4,
            rate: 0.8 + Math.random() * 0.4
        });

        // Create explosion effect
        const particleCount = 30;
        const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff];

        for (let ring = 0; ring < 4; ring++) {
            const delay = ring * 50;
            const scale = 1.5 + (ring * 0.8);

            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const speed = 300 + (ring * 100);
                const distance = 10 + (ring * 15);

                const particle = scene.add.sprite(
                    this.x + Math.cos(angle) * distance,
                    this.y + Math.sin(angle) * distance,
                    'bullet'
                );

                particle.setTint(colors[ring]);
                particle.setScale(scale);
                particle.setAlpha(0.9);

                scene.time.delayedCall(delay, () => {
                    scene.tweens.add({
                        targets: particle,
                        x: particle.x + Math.cos(angle) * speed,
                        y: particle.y + Math.sin(angle) * speed,
                        alpha: 0,
                        scale: 0,
                        duration: 800,
                        ease: 'Power2',
                        onComplete: () => particle.destroy()
                    });
                });
            }
        }

        // Destroy the crate
        this.destroy();
    }
}