class Ladder extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'ladder');
        
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // true = static body
        
        this.setScale(2);
        
        // Add a simple fade-in effect
        this.setAlpha(0);
        scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 1000,
            ease: 'Power2'
        });
    }
} 