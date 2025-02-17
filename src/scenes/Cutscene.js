class Cutscene extends Phaser.Scene {
    constructor() {
        super('Cutscene');
        this.isScrolling = true;
    }

    create() {
        // Create layers in order from back to front
        this.backgrounds = [
            {
                sprite: this.add.tileSprite(0, 0, 
                    this.game.config.width, 
                    this.game.config.height, 
                    'cs_sky'
                ).setOrigin(0, 0).setDepth(0).setScale(4),
                speedX: 0.1,
                totalScroll: 0
            },
            {
                sprite: this.add.tileSprite(0, 100, 
                    this.game.config.width, 
                    this.game.config.height, 
                    'cs_mountain_bg'
                ).setOrigin(0, 0).setDepth(1).setScale(4).setAlpha(0.7),
                speedX: 0.15,
                totalScroll: 0
            },
            {
                sprite: this.add.tileSprite(0, -50, 
                    this.game.config.width, 
                    this.game.config.height, 
                    'cs_mountain'
                ).setOrigin(0, 0).setDepth(2).setScale(4),
                speedX: 0.25,
                totalScroll: 0
            },
            {
                sprite: this.add.tileSprite(0, 125, 
                    this.game.config.width, 
                    this.game.config.height, 
                    'cs_water'
                ).setOrigin(0, 0).setDepth(3).setScale(4),
                speedX: 0.3,
                totalScroll: 0
            }
        ];

        // Play plane sound at scene start with slower playback rate
        this.sound.play('plane', { 
            volume: 0.5,
            rate: 0.5  // This makes the sound play at half speed
        });

        // Create plane sprite
        this.plane = this.add.sprite(
            -100, // Start off-screen to the left
            150,  // Height in the sky
            'cs_plane'
        ).setScale(3).setDepth(3);

        // Move plane across screen
        this.tweens.add({
            targets: this.plane,
            x: this.game.config.width + 200, // Move past right edge
            duration: 15000, // 15 seconds to cross
            ease: 'Linear', // Constant speed
            onUpdate: (tween) => {
                // Create falling penguin when plane reaches 1/3 of the screen
                if (tween.progress >= 0.52 && !this.penguinDropped) {
                    this.penguinDropped = true;
                    this.createFallingPenguin(this.plane.x, this.plane.y);
                }
            }
        });

        // Add skip text above all layers
        this.skipText = this.add.text(
            10,
            10,
            'Press SPACE to skip', {
                fontSize: '20px',
                fill: '#ffffff',
                fontFamily: 'Courier'
            }
        ).setOrigin(0, 0).setDepth(4);

        // Create continue text (initially invisible)
        this.continueText = this.add.text(
            this.game.config.width / 2,
            this.game.config.height / 2,
            'Hit SPACE to continue', {
                fontSize: '32px',
                fill: '#ffffff', 
                fontFamily: 'Courier',
                stroke: '#000000',
                strokeThickness: 6,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 8,
                    fill: true
                },
                padding: { x: 20, y: 10 },
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(4).setAlpha(0);

        // Add space key listener
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.spaceKey.on('down', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('TestLevel');
            });
        });
    }

    createFallingPenguin(planeX, planeY) {
        const penguin = this.add.sprite(
            planeX,  // Drop from plane's X position
            planeY,  // Drop from plane's Y position
            'penguin'
        ).setScale(2).setDepth(3);

        // Play penguin fall sound
        this.sound.play('penguin_fall', { volume: 0.5 });

        // Add falling, scaling, and rotation animation
        this.tweens.add({
            targets: penguin,
            y: this.game.config.height - 50, // Stop above bottom of screen
            scale: 0.1, // Get much smaller
            rotation: Math.PI, // Rotate 180 degrees (head down)
            duration: 2000, // Faster duration
            ease: 'Linear',
            onComplete: () => {
                penguin.destroy(); // Clean up sprite after animation
            }
        });
    }

    update() {
        // Only update if still scrolling
        if (this.isScrolling) {
            // Get the water layer (last layer)
            const waterLayer = this.backgrounds[this.backgrounds.length - 1];
            
            // Update each background layer with its own scroll speed
            this.backgrounds.forEach(bg => {
                bg.sprite.tilePositionX += bg.speedX;
                bg.totalScroll += bg.speedX;
            });

            // Check if water layer has scrolled enough
            if (waterLayer.totalScroll >= 250) {
                this.isScrolling = false;
                // Fade in the continue text
                this.tweens.add({
                    targets: this.continueText,
                    alpha: 1,
                    duration: 1000,
                    ease: 'Power2'
                });
            }
        }
    }
} 