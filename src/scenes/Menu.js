class Menu extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    create() {
        const centerX = this.game.config.width / 2;
        const centerY = this.game.config.height / 2;

        // Create dark background with enhanced scanlines effect
        const background = this.add.rectangle(centerX, centerY, this.game.config.width, this.game.config.height, 0x001100);
        background.setAlpha(0.97);

        // Add animated scanlines with varying opacity
        for (let y = 0; y < this.game.config.height; y += 2) {
            const line = this.add.rectangle(centerX, y, this.game.config.width, 1, 0x00ff00, 0.1);
            this.tweens.add({
                targets: line,
                alpha: { from: 0.1, to: 0.3 },
                duration: 1000 + Math.random() * 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        }

        // Add a subtle vignette effect
        const vignette = this.add.graphics();
        vignette.fillStyle(0x000000, 0.3);
        vignette.fillRect(0, 0, this.game.config.width, this.game.config.height);
        vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);

        // Create enhanced classified stamp effect with rotation animation
        const stamp = this.add.text(centerX, centerY - 100, 'TOP SECRET MISSION', {
            fontSize: '47px',
            fontFamily: 'Courier',
            fill: '#ff0000',
            stroke: '#660000',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#660000', blur: 4, fill: true }
        }).setOrigin(0.5).setAlpha(0.8);

        this.tweens.add({
            targets: stamp,
            angle: { from: -5, to: 5 },
            duration: 4000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });

        // Create enhanced header with glowing effect
        const headerText = this.add.text(centerX, 60, '⚠ OPERATION: P.E.N.G.U.I.N. ⚠', {
            fontSize: '36px',
            fill: '#00ff00',
            fontStyle: 'bold',
            fontFamily: 'Courier',
            align: 'center',
            stroke: '#003300',
            strokeThickness: 6,
            shadow: { blur: 8, color: '#00ff00', fill: true }
        }).setOrigin(0.5).setAlpha(0);

        // Add pulsing glow to header
        this.tweens.add({
            targets: headerText,
            shadowBlur: 15,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });

        // Show high score with enhanced styling
        const highScore = this.scene.get('TestLevel').getHighScore() || 0;
        const recordText = this.add.text(centerX, centerY, 
            `HIGHEST FLOOR REACHED: ${highScore}`, {
            fontSize: '28px',
            fill: '#ffd700',
            fontFamily: 'Courier',
            fontStyle: 'bold',
            stroke: '#b8860b',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#b8860b', blur: 3, fill: true }
        }).setOrigin(0.5).setAlpha(0);

        // Enhanced fade in with scale effect
        this.tweens.add({
            targets: [headerText, recordText],
            alpha: 1,
            scale: { from: 0.5, to: 1 },
            duration: 1200,
            delay: function(target, index) { return index * 500; },
            ease: 'Back.out'
        });

        // Create enhanced start button with glowing effect
        const startButton = this.add.container(centerX, centerY + 100);
        
        const buttonGlow = this.add.rectangle(0, 0, 210, 70, 0xff0000, 0.2);
        const buttonBase = this.add.rectangle(0, 0, 200, 60, 0x800000);
        const buttonOverlay = this.add.rectangle(0, 0, 190, 50, 0x4a0000);
        const buttonText = this.add.text(0, 0, 'START MISSION', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Courier',
            fontStyle: 'bold',
            shadow: { offsetX: 1, offsetY: 1, color: '#ff0000', blur: 5, fill: true }
        }).setOrigin(0.5);

        startButton.add([buttonGlow, buttonBase, buttonOverlay, buttonText]);
        startButton.setSize(200, 60);
        startButton.setInteractive();

        // Enhanced button interactions
        startButton.on('pointerover', () => {
            buttonOverlay.setFillStyle(0x600000);
            this.game.canvas.style.cursor = 'pointer';
            this.tweens.add({
                targets: buttonGlow,
                alpha: 0.4,
                scale: 1.1,
                duration: 200
            });
            this.tweens.add({
                targets: buttonText,
                scale: 1.1,
                duration: 200
            });
        });

        startButton.on('pointerout', () => {
            buttonOverlay.setFillStyle(0x4a0000);
            this.game.canvas.style.cursor = 'default';
            this.tweens.add({
                targets: [buttonGlow, buttonText],
                alpha: 0.2,
                scale: 1,
                duration: 200
            });
        });

        startButton.on('pointerdown', () => {
            this.cameras.main.flash(500, 0, 255, 0);
            this.sound.play('tone');
            this.tweens.add({
                targets: startButton,
                scale: 0.9,
                duration: 100,
                yoyo: true
            });
            this.time.delayedCall(500, () => {
                this.scene.start('Briefing');
            });
        });

        // Add floating dots effect
        for (let i = 0; i < 20; i++) {
            const dot = this.add.rectangle(
                Math.random() * this.game.config.width,
                Math.random() * this.game.config.height,
                2,
                2,
                0x00ff00,
                0.3
            );
            
            this.tweens.add({
                targets: dot,
                x: '+=50',
                y: '+=50',
                alpha: 0,
                duration: 2000 + Math.random() * 2000,
                repeat: -1,
                repeatDelay: Math.random() * 1000,
                onRepeat: () => {
                    dot.x = Math.random() * this.game.config.width;
                    dot.y = Math.random() * this.game.config.height;
                    dot.alpha = 0.3;
                }
            });
        }
    }
}