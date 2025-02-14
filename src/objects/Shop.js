class Shop extends Phaser.GameObjects.Sprite {
    constructor(scene) {
        // Calculate position in top right corner with padding
        const padding = 10; // Adjust this value for more/less padding
        const spriteWidth = 64; // Width of the shop sprite
        const spriteHeight = 64; // Height of the shop sprite
        
        // Calculate position accounting for sprite size and scale
        const x = scene.game.config.width - (spriteWidth + padding);
        const y = spriteHeight + padding;
        
        // Call parent constructor with calculated position
        super(scene, x, y, 'shop_empty');
        
        scene.add.existing(this);
        scene.physics.add.existing(this, false);
        
        // Set up collision body
        this.body.setImmovable(true);
        this.body.setCollideWorldBounds(true);
        
        // Customize collision body size and position
        this.body.setSize(32, 32);
        this.body.setOffset(16, 16);

        this.setScale(2);
        this.interactionCooldown = false;
        
        // Add interaction key
        this.interactKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        // Set initial state based on enemies
        this.handleShopAnimation(scene);
    }

    update(scene) {
        // Check for E key press when player is near
        if (Phaser.Input.Keyboard.JustDown(this.interactKey) && !this.interactionCooldown) {
            const distanceToPlayer = Phaser.Math.Distance.Between(
                this.x, this.y,
                scene.penguin.x, scene.penguin.y
            );
            
            // Only allow interaction within 100 pixels
            if (distanceToPlayer <= 100) {
                this.openShopMenu(scene);
            }
        }
    }

    handleShopAnimation(scene) {
        if (scene.enemies.countActive(true) > 0) {
            // Shop is not available, show empty sprite
            this.setTexture('shop_empty');
            return false;
        }

        // Shop is available, show open sprite
        this.setTexture('shop_open');
        return true;
    }

    openShopMenu(scene) {
        // Check shop availability first
        if (!this.handleShopAnimation(scene)) {
            return;
        }

        console.log('Opening shop menu...');
        
        // Pause the game
        scene.isGameFrozen = true;
        scene.physics.pause();

        const centerX = scene.game.config.width / 2;
        const centerY = scene.game.config.height / 2;

        // Create dark overlay
        const overlay = scene.add.rectangle(centerX, centerY, 
            scene.game.config.width, scene.game.config.height, 
            0x000000, 0.85);
        overlay.setDepth(100);

        // Create shop menu container
        const menuContainer = scene.add.container(centerX, centerY);
        menuContainer.setDepth(101);

        // Add red carpet background
        const redCarpet = scene.add.rectangle(0, 0, 600, 500, 0x8B0000);
        redCarpet.setStrokeStyle(8, 0x4a0000);
        menuContainer.add(redCarpet);

        // Add gold trim border
        const goldBorder = scene.add.rectangle(0, 0, 580, 480, 0x000000, 0);
        goldBorder.setStrokeStyle(4, 0xFFD700);
        menuContainer.add(goldBorder);

        // Add fancy title text with gold metallic look
        const titleText = scene.add.text(0, -200, 'MARKET', {
            fontSize: '48px',
            fill: '#FFD700',
            fontStyle: 'bold',
            fontFamily: 'Georgia',
            padding: { x: 20, y: 10 },
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 2,
                fill: true
            }
        }).setOrigin(0.5);
        menuContainer.add(titleText);

        // Add ornate close button
        const closeButton = scene.add.rectangle(250, -200, 70, 50, 0x2a0000)
            .setInteractive()
            .setOrigin(0.5);
        closeButton.setStrokeStyle(2, 0xFFD700);
        menuContainer.add(closeButton);

        const closeText = scene.add.text(250, -200, '✕', {
            fontSize: '32px',
            fill: '#FFD700',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        menuContainer.add(closeText);

        // Add hover effects with gold highlight
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
            
            if (overlay) overlay.destroy();
            if (menuContainer) menuContainer.destroy();
            
            closeButton.removeAllListeners();
            
            this.interactionCooldown = true;
            scene.time.delayedCall(1000, () => {
                this.interactionCooldown = false;
            });
        });
    }
}