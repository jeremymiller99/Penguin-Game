class Briefing extends Phaser.Scene {
    constructor() {
        super('Briefing');
    }

    create() {
        // Create the music instance
        this.bgMusic = this.sound.add('music_no_enemies', {
            volume: 0.3,
            loop: true
        });
        
        // Start playing
        this.bgMusic.play();

        const centerX = this.game.config.width / 2;
        const centerY = this.game.config.height / 2;

        // Create dark background
        const background = this.add.rectangle(centerX, centerY, this.game.config.width, this.game.config.height, 0x001100);
        background.setAlpha(0.97);

        // Add subtle scanlines
        for (let y = 0; y < this.game.config.height; y += 4) {
            const line = this.add.rectangle(centerX, y, this.game.config.width, 1, 0x003300, 0.3);
            this.tweens.add({
                targets: line,
                alpha: 0.1,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        }

        // Create document container at starting position
        const documentContainer = this.add.container(50, this.game.config.height);
        
        // Document background (aged paper look)
        const documentBg = this.add.rectangle(350, 300, 700, 600, 0xf4e4bc);
        documentBg.setStrokeStyle(2, 0x000000, 0.3);
        documentContainer.add(documentBg);

        // Add decorative corners
        const cornerSize = 15;
        [[0,0], [700,0], [0,600], [700,600]].forEach(([x,y]) => {
            const corner = this.add.graphics();
            corner.lineStyle(2, 0x000000, 0.5);
            corner.beginPath();
            corner.moveTo(x - cornerSize + 350, y);
            corner.lineTo(x + cornerSize + 350, y);
            corner.moveTo(x + 350, y - cornerSize);
            corner.lineTo(x + 350, y + cornerSize);
            corner.strokePath();
            documentContainer.add(corner);
        });

        // Document content
        const headerText = 
            '⚠ TOP SECRET ⚠\n' +
            'DEPARTMENT OF PENGUIN OPERATIONS\n' +
            'ARCTIC DEFENSE INITIATIVE\n' +
            'DOCUMENT ID: ████████\n\n' +
            '════════════════════════════════\n\n' +
            'MISSION PARAMETERS:\n' +
            '► AGENT: EMPEROR-CLASS OPERATIVE\n' +
            '► OBJECTIVE: NEUTRALIZE HOSTILE FORCES\n' +
            '► LOCATION: ██████████ ARCTIC FACILITY\n' +
            '► STATUS: CRITICAL\n\n' +
            'TACTICAL BRIEFING:\n' +
            '► WASD: Movement\n' +
            '► MOUSE: Fire Weapon\n\n' +
            '════════════════════════════════\n\n' +
            'By signing below, you acknowledge the classified nature\n' +
            'of this operation and accept all mission parameters.\n\n' +
            'AGENT SIGNATURE: _____________________________\n' +
            'DATE: ' + new Date().toLocaleDateString();

        const missionText = this.add.text(50, 20, headerText, {
            fontSize: '18px',
            fill: '#000000',
            fontFamily: 'Courier',
            lineSpacing: 8
        });
        documentContainer.add(missionText);

        // Create signature input area
        const signatureBox = this.add.rectangle(390, 540, 300, 40, 0xffffff)
            .setStrokeStyle(1, 0x000000)
            .setInteractive();
        const signatureText = this.add.text(390, 540, 'Click to sign', {
            fontSize: '20px',
            fill: '#666666',
            fontFamily: 'Courier',
        }).setOrigin(0.5);

        documentContainer.add([signatureBox, signatureText]);

        // Move the classified stamp into the document container
        const stamp = this.add.text(600, 15, 'CLASSIFIED', {
            fontSize: '32px',
            fontFamily: 'Courier',
            fill: '#ff0000',
            stroke: '#660000',
            strokeThickness: 4,
            rotation: 0.3
        }).setOrigin(0.5).setAlpha(0.7);
        
        documentContainer.add(stamp);

        // Slide in animation
        this.tweens.add({
            targets: documentContainer,
            y: 50,
            duration: 1000,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Enable scrolling with adjusted clamp values
                this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
                    const newY = documentContainer.y - (deltaY * 0.5);
                    documentContainer.y = Phaser.Math.Clamp(newY, -200, 50);
                });

                // Enable drag scrolling with adjusted clamp values
                this.input.on('pointermove', (pointer) => {
                    if (pointer.isDown) {
                        const newY = documentContainer.y + (pointer.velocity.y / 10);
                        documentContainer.y = Phaser.Math.Clamp(newY, -200, 50);
                    }
                });
            }
        });

        // Signature interaction
        let signed = false;
        signatureBox.on('pointerdown', () => {
            if (!signed) {
                signatureText.setText('Agent Penguin-69')
                    .setFontFamily('Dancing Script, cursive')
                    .setFontSize('28px')
                    .setColor('#000066');
                signed = true;

                // Create deploy button immediately after signing
                const deployButton = this.add.container(centerX, centerY); // Adjusted y position
                
                const buttonGlow = this.add.rectangle(0, 0, 210, 70, 0xff0000, 0.2);
                const buttonBase = this.add.rectangle(0, 0, 200, 60, 0x800000);
                const buttonOverlay = this.add.rectangle(0, 0, 190, 50, 0x4a0000);
                const buttonText = this.add.text(0, 0, '[ DEPLOY ]', {
                    fontSize: '24px',
                    fill: '#ffffff',
                    fontFamily: 'Courier',
                    fontStyle: 'bold'
                }).setOrigin(0.5);

                deployButton.add([buttonGlow, buttonBase, buttonOverlay, buttonText]);
                deployButton.setSize(200, 60);
                deployButton.setInteractive(); // Ensure the button is interactive

                // Add pulsing animation to glow
                this.tweens.add({
                    targets: buttonGlow,
                    alpha: { from: 0.2, to: 0.4 },
                    scale: { from: 1, to: 1.05 },
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.InOut'
                });

                // Add floating animation to entire button
                this.tweens.add({
                    targets: deployButton,
                    y: '+=5',
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.InOut'
                });

                // Button interactions
                deployButton.on('pointerover', () => {
                    buttonOverlay.setFillStyle(0x600000);
                    this.game.canvas.style.cursor = 'pointer';
                    // Scale up animation on hover
                    this.tweens.add({
                        targets: deployButton,
                        scale: 1.1,
                        duration: 200,
                        ease: 'Back.Out'
                    });
                });

                deployButton.on('pointerout', () => {
                    buttonOverlay.setFillStyle(0x4a0000);
                    this.game.canvas.style.cursor = 'default';
                    // Scale back to normal
                    this.tweens.add({
                        targets: deployButton,
                        scale: 1,
                        duration: 200,
                        ease: 'Back.Out'
                    });
                });

                deployButton.on('pointerdown', () => {
                    this.tweens.add({
                        targets: this.bgMusic,
                        volume: 0,
                        duration: 500,
                        onComplete: () => {
                            this.bgMusic.stop();
                            // Fade to black instead of green flash
                            this.cameras.main.fadeOut(500, 0, 0, 0);
                            this.cameras.main.once('camerafadeoutcomplete', () => {
                                this.scene.start('TestLevel');
                            });
                        }
                    });
                });
            }
        });
    }
}