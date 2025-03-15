class Menu extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    create() {
        // Create the music instance
        this.bgMusic = this.sound.add('main_menu', {
            loop: true,
            volume: 0.5
        });
        this.bgMusic.play();

        // Create background
        this.createBackground();

        // Create title
        this.createTitle();

        // Create buttons
        this.createButtons();

        // Create version text
        this.createVersionText();

        // Create credits
        this.createCredits();

        // Create high score display
        this.createHighScoreDisplay();
    }

    startGame() {
        // Disable all buttons to prevent multiple clicks
        this.disableAllButtons();
        
        // Stop background music with fade
        if (this.bgMusic) {
            this.sound.stopAll();
        }
        
        // Reset GameManager if it exists
        try {
            const gameManager = this.scene.get('GameManager');
            if (gameManager && typeof gameManager.resetGameState === 'function') {
                console.log("Resetting GameManager state");
                gameManager.resetGameState();
            }
        } catch (e) {
            console.error("Error resetting GameManager:", e);
        }
        
        // Stop all active scenes except Menu
        const activeScenes = this.scene.manager.getScenes(true);
        activeScenes.forEach(scene => {
            if (scene.scene.key !== 'Menu') {
                console.log(`Stopping scene: ${scene.scene.key}`);
                this.scene.stop(scene.scene.key);
            }
        });
        
        // Fade out and transition to Briefing scene
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            console.log("Starting Briefing scene");
            this.scene.start('Briefing');
        });
    }

    createButtons() {
        // Create container for buttons
        this.buttonContainer = this.add.container(0, 0);
        
        // Create start button
        const startButton = this.add.text(this.game.config.width / 2, this.game.config.height / 2 + 50, 'Start Game', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive();

        // Add hover effects
        startButton.on('pointerover', () => {
            startButton.setScale(1.1);
            this.game.canvas.style.cursor = 'pointer';
        });
        
        startButton.on('pointerout', () => {
            startButton.setScale(1);
            this.game.canvas.style.cursor = 'default';
        });
        
        startButton.on('pointerdown', () => {
            this.startGame();
        });

        this.buttonContainer.add(startButton);
        this.startButton = startButton;
    }

    disableAllButtons() {
        if (this.buttonContainer) {
            this.buttonContainer.list.forEach(button => {
                if (button.setInteractive) {
                    button.disableInteractive();
                }
            });
        }
    }

    createBackground() {
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
    }

    createTitle() {
        const centerX = this.game.config.width / 2;
        const centerY = this.game.config.height / 2;

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
        const headerText = this.add.text(centerX, 60, '⚠ OPERATION: ICE BREAK ⚠', {
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

        // Enhanced fade in with scale effect
        this.tweens.add({
            targets: [headerText],
            alpha: 1,
            scale: { from: 0.5, to: 1 },
            duration: 1200,
            delay: function(target, index) { return index * 500; },
            ease: 'Back.out'
        });
    }

    createVersionText() {
        // Implementation of createVersionText method
    }

    createCredits() {
        // Implementation of createCredits method
    }

    createHighScoreDisplay() {
        // Implementation of createHighScoreDisplay method
    }
}