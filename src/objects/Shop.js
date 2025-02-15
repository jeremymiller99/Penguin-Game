class Shop extends Phaser.GameObjects.Sprite {
    constructor(scene) {
        // Calculate position in top right corner with padding
        const padding = 10; 
        const spriteWidth = 64; 
        const spriteHeight = 64;
        
        const x = scene.game.config.width - (spriteWidth + padding);
        const y = spriteHeight + padding;
        
        const isShopOpen = false;

        super(scene, x, y, 'shop_empty');
        
        scene.add.existing(this);
        scene.physics.add.existing(this, false);
        
        this.body.setImmovable(true);
        this.body.setCollideWorldBounds(true);
        this.body.setSize(32, 32);
        this.body.setOffset(16, 16);
        this.setScale(2);
        this.interactionCooldown = false;
        
        this.interactKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        // Text prompt for interaction
        this.promptText = scene.add.text(this.x, this.y + 40, "Press 'E'", {
            fontSize: '16px',
            fill: '#ffffff',
            fontStyle: 'bold',
            backgroundColor: '#000000',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5);
        this.promptText.setVisible(false); // Hide initially

        this.handleShopSprite(scene);
    }

    update(scene) {
        this.updateTextPrompt(scene);

        if (Phaser.Input.Keyboard.JustDown(this.interactKey) && !this.interactionCooldown) {
            const distanceToPlayer = Phaser.Math.Distance.Between(
                this.x, this.y,
                scene.penguin.x, scene.penguin.y
            );

            if (distanceToPlayer <= 100) {
                this.openShopMenu(scene);
            }
        }
    }

    updateTextPrompt(scene) {
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.x, this.y,
            scene.penguin.x, scene.penguin.y
        );

        if (distanceToPlayer <= 100 && this.isShopOpen) {
            this.promptText.setVisible(true);
            this.promptText.setPosition(this.x, this.y + 40);
        } else {
            this.promptText.setVisible(false);
        }
    }

    handleShopSprite(scene) {
        if (scene.enemies.countActive(true) > 0) {
            this.isShopOpen = false;
            this.setTexture('shop_empty');
            return false;
        }
        this.isShopOpen = true;
        this.setTexture('shop_open');
        return true;
    }

    openShopMenu(scene) {
        if (!this.handleShopSprite(scene)) return;

        console.log('Opening shop menu...');
        scene.isGameFrozen = true;
        scene.physics.pause();

        const centerX = scene.game.config.width / 2;
        const centerY = scene.game.config.height / 2;

        const overlay = scene.add.rectangle(centerX, centerY, 
            scene.game.config.width, scene.game.config.height, 
            0x000000, 0.85).setDepth(100);

        const menuContainer = scene.add.container(centerX, centerY);
        menuContainer.setDepth(101);

        const redCarpet = scene.add.rectangle(0, 0, 600, 500, 0x8B0000);
        redCarpet.setStrokeStyle(8, 0x4a0000);
        menuContainer.add(redCarpet);

        const goldBorder = scene.add.rectangle(0, 0, 580, 480, 0x000000, 0);
        goldBorder.setStrokeStyle(4, 0xFFD700);
        menuContainer.add(goldBorder);

        const titleText = scene.add.text(0, -200, 'SHOP', {
            fontSize: '48px',
            fill: '#FFD700',
            fontStyle: 'bold',
            fontFamily: 'Georgia',
            padding: { x: 20, y: 10 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5);
        menuContainer.add(titleText);

        // Add COMING SOON text in the middle
        const comingSoonText = scene.add.text(0, 0, '[ COMING SOON ]', {
            fontSize: '36px',
            fill: '#FFD700',
            fontStyle: 'bold',
            fontFamily: 'Georgia',
            padding: { x: 20, y: 10 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5);
        menuContainer.add(comingSoonText);

        const closeButton = scene.add.rectangle(250, -200, 70, 50, 0x2a0000)
            .setInteractive().setOrigin(0.5);
        closeButton.setStrokeStyle(2, 0xFFD700);
        menuContainer.add(closeButton);

        const closeText = scene.add.text(250, -200, '✕', {
            fontSize: '32px',
            fill: '#FFD700',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        menuContainer.add(closeText);

        closeButton.on('pointerover', () => {
            closeButton.setFillStyle(0x4a0000);
            closeButton.setStrokeStyle(3, 0xFFF000);
        });
        closeButton.on('pointerout', () => {
            closeButton.setFillStyle(0x2a0000);
            closeButton.setStrokeStyle(2, 0xFFD700);
        });

        closeButton.on('pointerdown', () => {
            console.log('Closing shop menu...');
            scene.isGameFrozen = false;
            scene.physics.resume();
            overlay.destroy();
            menuContainer.destroy();
            closeButton.removeAllListeners();
            
            this.interactionCooldown = true;
            scene.time.delayedCall(1000, () => { this.interactionCooldown = false; });
        });
    }
}
