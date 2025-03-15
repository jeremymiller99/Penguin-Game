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
        this.body.setBounce(1);
        this.body.setMass(1);
        
        // Add health property
        this.health = 15;  // Adjusted to be destroyed in one shot (15 damage)
        this.maxHealth = 15;
    }
    
    // Add takeDamage method
    takeDamage(amount) {
        this.health -= amount;
        
        // Flash effect when taking damage
        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 50,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                this.setAlpha(1);
            }
        });
        
        // Check if destroyed
        if (this.health <= 0) {
            // The explode method will be called by the scene
            return true; // Return true to indicate the crate was destroyed
        }
        
        return false; // Return false to indicate the crate survived
    }

    explode() {
        if (!this.active || !this.scene) return; // Prevent multiple explosions
        
        console.log('Crate exploded!');
        this.setActive(false);
        this.setVisible(false);

        // Store scene reference
        const scene = this.scene;

        // Play explosion sound
        scene.sound.play('explosion', {
            volume: 0.5,  // Slightly louder
            rate: 0.8 + Math.random() * 0.4
        });
        
        // Add screen shake
        scene.cameras.main.shake(200, 0.01);
        
        // Create shockwave effect
        const shockwave = scene.add.circle(this.x, this.y, 10, 0xffffff, 0.4);
        scene.tweens.add({
            targets: shockwave,
            radius: 350,
            alpha: 0,
            duration: 300,
            onComplete: () => shockwave.destroy()
        });

        // Create explosion effect
        const particleCount = 30;
        const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff];
        let activeParticles = 0;

        for (let ring = 0; ring < 4; ring++) {
            const delay = ring * 50;
            const scale = 1.5 + (ring * 0.8);

            for (let i = 0; i < particleCount; i++) {
                activeParticles++;
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
                        onComplete: () => {
                            particle.destroy();
                            activeParticles--;
                            if (activeParticles === 0) {
                                this.destroy();
                            }
                        }
                    });
                });
            }
        }
        
        // Add smoke particles
        for (let i = 0; i < particleCount / 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 50;
            const distance = Math.random() * 20;
            const size = 3 + Math.random() * 5;
            
            const smoke = scene.add.circle(
                this.x + Math.cos(angle) * distance,
                this.y + Math.sin(angle) * distance,
                size,
                0x333333,
                0.7
            );
            
            scene.tweens.add({
                targets: smoke,
                x: smoke.x + Math.cos(angle) * speed,
                y: smoke.y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 2 + Math.random(),
                duration: 500 + Math.random() * 500,
                onComplete: () => smoke.destroy()
            });
        }
    }
}