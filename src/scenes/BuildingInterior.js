class BuildingInterior extends Phaser.Scene {
    constructor() {
        super('BuildingInterior');
        this.isInterior = true;
        this.parentSceneKey = null;
        this.returnPosition = null;
        this.playerCurrency = 0;
        this.isGameFrozen = false;
        this.floorLevel = 1;
    }
    
    init(data) {
        // Store the parent scene key for returning
        this.parentSceneKey = data.parentScene || 'TestLevel';
        this.returnPosition = data.playerPosition || { x: 0, y: 0 };
        
        // Initialize with the same difficulty as the parent level
        this.currentNodeId = data.nodeId;
        this.nodeType = data.nodeType;
        this.difficultyRating = data.difficulty || 1;
        this.buildingType = data.buildingType || 'standard';
        this.enemyMultiplier = data.enemyMultiplier || 1.0;
        this.lootMultiplier = data.lootMultiplier || 1.0;
        
        // Get player currency from parent scene
        this.playerCurrency = data.playerCurrency || 0;
        
        console.log(`Building Interior: Type: ${this.buildingType}, Difficulty: ${this.difficultyRating}`);
    }
    
    create() {
        // Set background color based on building type
        this.cameras.main.setBackgroundColor(this.getBuildingBackgroundColor());
        
        console.log("Creating building interior scene");
        
        // Initialize groups
        this.enemies = this.physics.add.group();
        this.crates = this.physics.add.group({
            classType: Crate,
            runChildUpdate: true
        });
        
        // Add penguin sprite and properties
        this.penguin = this.add.sprite(this.game.config.width / 2, this.game.config.height / 2, 'penguin').setScale(2);
        this.penguin.health = 100;
        this.penguin.maxHealth = 100;
        this.moveSpeed = 200;
        
        // Enable physics on the penguin sprite
        this.physics.add.existing(this.penguin, false);
        this.penguin.body.setCollideWorldBounds(true);
        
        // Configure camera to follow the player
        this.cameras.main.startFollow(this.penguin, true, 0.09, 0.09);
        
        // Define keyboard keys for player input
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            pickup: Phaser.Input.Keyboard.KeyCodes.E,
            reload: Phaser.Input.Keyboard.KeyCodes.R,
            slide: Phaser.Input.Keyboard.KeyCodes.SPACE
        });
        
        // Create penguin gun object
        this.ak47 = new Gun(this, this.game.config.width / 2 + 50, this.game.config.height / 2);
        this.ak47.assignToPlayer(this.penguin);
        
        // Create UI elements
        this.createUI();
        
        // Add building decorations based on type
        this.addBuildingDecorations();
        
        // Spawn enemies and crates
        this.spawnBuildingEntities();
        
        // Set up collisions
        this.setupCollisions();
        
        // Create exit door
        this.createExitDoor();
        
        // Create minimap
        this.createMinimap(this.physics.world.bounds.width, this.physics.world.bounds.height);
        
        // Initialize penguin state machine
        this.penguin.stateMachine = new PenguinStateMachine(this.penguin);
        
        // Start countdown
        this.startCountdown();
    }
    
    getBuildingBackgroundColor() {
        switch (this.buildingType) {
            case 'shop': return '#2c3e50';
            case 'elite': return '#4a235a';
            case 'armory': return '#641e16';
            case 'laboratory': return '#154360';
            default: return '#34495e';
        }
    }
    
    spawnBuildingEntities() {
        // Calculate how many enemies to spawn based on difficulty and multiplier
        const enemyCount = Math.floor(Math.min(
            Math.floor(1 + Math.sqrt(this.floorLevel) * 1.2), 
            50
        ) * this.enemyMultiplier);
        
        // Spawn enemies
        for (let i = 0; i < enemyCount; i++) {
            // Determine enemy type based on floor level
            let enemyType = 'default';
            const roll = Math.random();
            
            if (this.floorLevel >= 9 && roll < 0.2) {
                enemyType = 'tank';
            } else if (this.floorLevel >= 6 && roll < 0.4) {
                enemyType = 'ranged';
            } else if (this.floorLevel >= 3 && roll < 0.6) {
                enemyType = 'melee';
            }
            
            // Spawn enemy at random position
            const randomX = Phaser.Math.Between(100, this.physics.world.bounds.width - 100);
            const randomY = Phaser.Math.Between(100, this.physics.world.bounds.height - 100);
            this.spawnEnemy(enemyType, randomX, randomY);
        }
        
        // Spawn a few crates
        const crateCount = Math.min(Math.floor(Math.log(this.floorLevel + 1) * 1.2), 3);
        for (let i = 0; i < crateCount; i++) {
            this.spawnCrate();
        }
    }
    
    spawnEnemy(type, x, y) {
        // Find a valid position away from player
        let validPosition = false;
        let spawnX = x, spawnY = y;
        
        while (!validPosition) {
            spawnX = x || Phaser.Math.Between(100, this.physics.world.bounds.width - 100);
            spawnY = y || Phaser.Math.Between(100, this.physics.world.bounds.height - 100);
            
            const distanceFromPlayer = Phaser.Math.Distance.Between(
                spawnX, spawnY, this.penguin.x, this.penguin.y
            );
            
            if (distanceFromPlayer > 200) {
                validPosition = true;
            }
        }
        
        // Create the appropriate enemy type
        let enemy;
        switch(type) {
            case 'ranged':
                enemy = new RangedEnemy(this, spawnX, spawnY);
                break;
            case 'melee':
                enemy = new MeleeEnemy(this, spawnX, spawnY);
                break;
            case 'tank':
                enemy = new TankEnemy(this, spawnX, spawnY);
                break;
            default:
                enemy = new Enemy(this, spawnX, spawnY);
                break;
        }
        
        this.enemies.add(enemy);
        
        // Add collisions
        this.physics.add.collider(enemy, this.penguin);
        this.physics.add.collider(enemy, this.crates);
        
        // Handle ranged enemy bullets
        if (enemy instanceof RangedEnemy && enemy.gun) {
            this.physics.add.collider(enemy.gun.bullets, this.penguin, (penguin, bullet) => {
                bullet.destroy();
                penguin.health -= enemy.damage;
                
                // Visual feedback
                penguin.setTint(0xff0000);
                this.time.delayedCall(100, () => {
                    penguin.clearTint();
                });
            });
            
            this.physics.add.collider(enemy.gun.bullets, this.crates, (bullet, crate) => {
                bullet.destroy();
                crate.takeDamage(enemy.damage / 2);
            });
        }
        
        return enemy;
    }
    
    spawnCrate() {
        // Find a valid position away from player
        let validPosition = false;
        let spawnX, spawnY;
        
        while (!validPosition) {
            spawnX = Phaser.Math.Between(100, this.physics.world.bounds.width - 100);
            spawnY = Phaser.Math.Between(100, this.physics.world.bounds.height - 100);
            
            const distanceFromPlayer = Phaser.Math.Distance.Between(
                spawnX, spawnY, this.penguin.x, this.penguin.y
            );
            
            if (distanceFromPlayer > 200) {
                validPosition = true;
            }
        }
        
        const crate = new Crate(this, spawnX, spawnY);
        this.crates.add(crate);
        
        // Add physics properties
        crate.body.setCollideWorldBounds(true);
        crate.body.setBounce(0.6);
        crate.body.setDrag(100);
        
        return crate;
    }
    
    setupCollisions() {
        // Add collision between penguin and crates
        this.physics.add.collider(this.penguin, this.crates);
        
        // Add collision between enemies and crates
        this.physics.add.collider(this.enemies, this.crates);
        
        // Add collision between bullets and crates
        this.physics.add.collider(this.ak47.bullets, this.crates, (bullet, crate) => {
            bullet.destroy();
            if (crate instanceof Crate) {
                this.handleCrateExplosion(crate);
            }
        });
        
        // Add collision between bullets and enemies
        this.physics.add.collider(this.ak47.bullets, this.enemies, (bullet, enemy) => {
            bullet.destroy();
            enemy.takeDamage(10);
            
            // If enemy died, spawn cash
            if (enemy.health <= 0) {
                // Spawn 1-3 cash drops
                const cashCount = Phaser.Math.Between(1, 3);
                for (let i = 0; i < cashCount; i++) {
                    this.cash.add(new Cash(this, enemy.x, enemy.y));
                }
            }
        });
    }
    
    createUI() {
        // Create a container for the HUD elements
        const hudContainer = this.add.container(10, 10);
        hudContainer.setScrollFactor(0);
        
        // Health section
        const healthIcon = this.add.sprite(20, 30, 'icn_fish').setScale(3);
        hudContainer.add(healthIcon);
        
        this.playerHealthBar = this.drawHealthBar(this.penguin, 50, 30, 160, 14);
        this.playerHealthBar.background.setAlpha(0.3);
        this.playerHealthBar.foreground.setFillStyle(0xff3838);
        this.playerHealthBar.foreground.width = 160;
        hudContainer.add(this.playerHealthBar.background);
        hudContainer.add(this.playerHealthBar.foreground);
        
        // Ammo section
        const ammoIcon = this.add.sprite(250, 30, 'icn_bullet').setScale(3);
        hudContainer.add(ammoIcon);
        
        this.ammoText = this.add.text(270, 15, this.ak47.currentAmmo + ' / ' + this.ak47.maxAmmo, {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            fontWeight: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });
        hudContainer.add(this.ammoText);
        
        // Building indicator
        const buildingIndicator = this.add.text(
            this.game.config.width - 200,
            30,
            `INSIDE: ${this.getBuildingTypeName()}`,
            {
                fontSize: '18px',
                fontFamily: 'Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5);
        hudContainer.add(buildingIndicator);
        
        // Add cash group
        this.cash = this.physics.add.group({
            classType: Cash,
            runChildUpdate: true
        });
        
        // Add collision between penguin and coins
        this.physics.add.overlap(this.penguin, this.cash, (penguin, cash) => {
            this.playerCurrency += cash.value;
            
            // Play pickup sound
            this.sound.play('cashPickup', { 
                volume: 0.5,
                rate: 1
            });
            
            cash.destroy();
        });
    }
    
    getBuildingTypeName() {
        switch (this.buildingType) {
            case 'shop': return 'SHOP';
            case 'elite': return 'ELITE BUILDING';
            case 'armory': return 'ARMORY';
            case 'laboratory': return 'LABORATORY';
            default: return 'BUILDING';
        }
    }
    
    drawHealthBar(entity, x, y, width = 80, height = 8) {
        // Draw background (red)
        const barBackground = this.add.rectangle(x, y, width, height, 0xff0000);
        barBackground.setOrigin(0, 0.5);
        
        // Draw foreground (green) based on health percentage
        const healthPercentage = entity.health / entity.maxHealth;
        const barForeground = this.add.rectangle(x, y, width * healthPercentage, height, 0x00ff00);
        barForeground.setOrigin(0, 0.5);
        
        return { background: barBackground, foreground: barForeground };
    }
    
    createExitDoor() {
        // Create an exit door at the bottom of the screen
        this.exitDoor = this.add.rectangle(
            this.game.config.width / 2,
            this.game.config.height - 50,
            60,
            80,
            0x553311
        ).setScrollFactor(0);
        
        // Add a sign above the door
        this.exitSign = this.add.text(
            this.game.config.width / 2,
            this.game.config.height - 100,
            'EXIT',
            {
                fontSize: '18px',
                fill: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 5, y: 3 }
            }
        ).setOrigin(0.5).setScrollFactor(0);
        
        // Create interaction zone
        this.exitZone = this.add.zone(
            this.game.config.width / 2,
            this.game.config.height - 50,
            80,
            100
        ).setScrollFactor(0);
        
        this.physics.world.enable(this.exitZone);
        this.exitZone.body.setAllowGravity(false);
        this.exitZone.body.moves = false;
        
        // Add overlap detection
        this.physics.add.overlap(
            this.penguin,
            this.exitZone,
            this.handleExitOverlap,
            null,
            this
        );
    }
    
    handleExitOverlap() {
        // Show exit prompt if not already shown
        if (!this.exitPromptShown) {
            this.exitPromptShown = true;
            this.showExitPrompt();
        }
        
        // Check for key press to exit building
        if (this.keys.pickup.isDown && !this.exitKeyPressed) {
            this.exitKeyPressed = true;
            this.exitBuilding();
        }
        
        if (!this.keys.pickup.isDown) {
            this.exitKeyPressed = false;
        }
    }
    
    showExitPrompt() {
        this.exitPrompt = this.add.text(
            this.game.config.width / 2,
            this.game.config.height - 130,
            'Press E to exit',
            {
                fontSize: '16px',
                fill: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 5, y: 3 }
            }
        ).setOrigin(0.5).setScrollFactor(0);
        
        // Add a small bounce animation
        this.tweens.add({
            targets: this.exitPrompt,
            y: this.exitPrompt.y - 5,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }
    
    hideExitPrompt() {
        if (this.exitPrompt) {
            this.exitPrompt.destroy();
            this.exitPrompt = null;
        }
        this.exitPromptShown = false;
    }
    
    exitBuilding() {
        console.log(`Exiting building to ${this.parentSceneKey}`);
        
        // Create data to pass back to the parent scene
        const returnData = {
            returnFromBuilding: true,
            playerPosition: this.returnPosition,
            nodeId: this.currentNodeId,
            nodeType: this.nodeType,
            difficultyRating: this.difficultyRating,
            preserveIceberg: true, // Add this flag
            playerCurrency: this.playerCurrency // Pass back any currency collected
        };
        
        // Return to the parent scene
        this.scene.start(this.parentSceneKey, returnData);
    }
    
    addBuildingDecorations() {
        // Add decorations based on building type
        const worldWidth = this.physics.world.bounds.width;
        const worldHeight = this.physics.world.bounds.height;
        
        switch (this.buildingType) {
            case 'shop':
                this.addShopDecorations(worldWidth, worldHeight);
                break;
            case 'elite':
                this.addEliteDecorations(worldWidth, worldHeight);
                break;
            case 'armory':
                this.addArmoryDecorations(worldWidth, worldHeight);
                break;
            case 'laboratory':
                this.addLabDecorations(worldWidth, worldHeight);
                break;
            default:
                this.addStandardDecorations(worldWidth, worldHeight);
                break;
        }
    }
    
    addShopDecorations(width, height) {
        // Add shop counters along the walls
        for (let i = 0; i < 3; i++) {
            const counter = this.add.rectangle(
                100 + i * 200, 
                height - 100, 
                150, 
                40, 
                0x8B4513
            );
            this.physics.add.existing(counter, true);
            this.physics.add.collider(this.penguin, counter);
            this.physics.add.collider(this.enemies, counter);
        }
        
        // Add shelves on the walls
        for (let i = 0; i < 4; i++) {
            const shelf = this.add.rectangle(
                width - 50, 
                100 + i * 120, 
                80, 
                20, 
                0x8B4513
            );
            this.physics.add.existing(shelf, true);
            this.physics.add.collider(this.penguin, shelf);
            this.physics.add.collider(this.enemies, shelf);
        }
    }
    
    addEliteDecorations(width, height) {
        // Add fancy furniture
        const table = this.add.rectangle(
            width / 2, 
            height / 2, 
            120, 
            80, 
            0x8B0000
        );
        this.physics.add.existing(table, true);
        this.physics.add.collider(this.penguin, table);
        this.physics.add.collider(this.enemies, table);
        
        // Add trophy displays
        for (let i = 0; i < 3; i++) {
            const trophy = this.add.circle(
                100 + i * 200, 
                100, 
                15, 
                0xFFD700
            );
            
            const pedestal = this.add.rectangle(
                100 + i * 200, 
                130, 
                30, 
                40, 
                0x5D4037
            );
            
            this.physics.add.existing(pedestal, true);
            this.physics.add.collider(this.penguin, pedestal);
            this.physics.add.collider(this.enemies, pedestal);
        }
    }
    
    addArmoryDecorations(width, height) {
        // Add weapon racks
        for (let i = 0; i < 3; i++) {
            const rack = this.add.rectangle(
                100 + i * 200, 
                100, 
                150, 
                30, 
                0x5D4037
            );
            this.physics.add.existing(rack, true);
            this.physics.add.collider(this.penguin, rack);
            this.physics.add.collider(this.enemies, rack);
            
            // Add weapon displays on racks
            for (let j = 0; j < 3; j++) {
                this.add.rectangle(
                    50 + i * 200 + j * 50, 
                    90, 
                    10, 
                    30, 
                    0x7F8C8D
                );
            }
        }
        
        // Add ammo crates
        for (let i = 0; i < 4; i++) {
            const crate = this.add.rectangle(
                width - 100, 
                150 + i * 100, 
                60, 
                60, 
                0x7F8C8D
            );
            this.physics.add.existing(crate, true);
            this.physics.add.collider(this.penguin, crate);
            this.physics.add.collider(this.enemies, crate);
        }
    }
    
    addLabDecorations(width, height) {
        // Add lab tables
        for (let i = 0; i < 2; i++) {
            const table = this.add.rectangle(
                width / 3 + i * (width / 3), 
                height / 2, 
                200, 
                80, 
                0xECF0F1
            );
            this.physics.add.existing(table, true);
            this.physics.add.collider(this.penguin, table);
            this.physics.add.collider(this.enemies, table);
            
            // Add lab equipment on tables
            for (let j = 0; j < 3; j++) {
                this.add.circle(
                    width / 3 - 50 + i * (width / 3) + j * 50, 
                    height / 2 - 20, 
                    15, 
                    0x3498DB
                );
            }
        }
        
        // Add computers along the wall
        for (let i = 0; i < 4; i++) {
            const computer = this.add.rectangle(
                100 + i * 150, 
                100, 
                40, 
                30, 
                0x34495E
            );
            this.physics.add.existing(computer, true);
            this.physics.add.collider(this.penguin, computer);
            this.physics.add.collider(this.enemies, computer);
        }
    }
    
    addStandardDecorations(width, height) {
        // Add some basic furniture
        const table = this.add.rectangle(
            width / 2, 
            height / 2, 
            100, 
            60, 
            0x8B4513
        );
        this.physics.add.existing(table, true);
        this.physics.add.collider(this.penguin, table);
        this.physics.add.collider(this.enemies, table);
        
        // Add some chairs
        for (let i = 0; i < 4; i++) {
            const chair = this.add.rectangle(
                width / 2 - 70 + (i % 2) * 140, 
                height / 2 - 70 + Math.floor(i / 2) * 140, 
                40, 
                40, 
                0xA0522D
            );
            this.physics.add.existing(chair, true);
            this.physics.add.collider(this.penguin, chair);
            this.physics.add.collider(this.enemies, chair);
        }
    }
    
    createMinimap(worldWidth, worldHeight) {
        // Simple minimap configuration
        const minimapWidth = 160;
        const minimapHeight = 120;
        const minimapX = this.game.config.width - minimapWidth - 20;
        const minimapY = 20;
        const minimapScale = Math.min(minimapWidth / worldWidth, minimapHeight / worldHeight);
        
        // Create a container for the minimap elements
        this.minimapContainer = this.add.container(minimapX, minimapY);
        this.minimapContainer.setScrollFactor(0);
        
        // Simple background with border
        const background = this.add.rectangle(
            minimapWidth/2, 
            minimapHeight/2, 
            minimapWidth, 
            minimapHeight, 
            0x000000, 
            0.5
        );
        background.setStrokeStyle(2, 0xffffff, 0.8);
        this.minimapContainer.add(background);
        
        // Create room silhouette
        const roomOutline = this.add.rectangle(
            minimapWidth/2, 
            minimapHeight/2, 
            worldWidth * minimapScale, 
            worldHeight * minimapScale, 
            0x333333, 
            0.3
        );
        roomOutline.setStrokeStyle(1, 0x888888, 0.5);
        this.minimapContainer.add(roomOutline);
        
        // Create player marker
        this.playerMarker = this.add.circle(minimapWidth/2, minimapHeight/2, 3, 0xffffff, 1);
        this.minimapContainer.add(this.playerMarker);
        
        // Create collections for entity markers
        this.enemyMarkers = [];
        this.cashMarkers = [];
        this.crateMarkers = [];
        
        // Add simple label
        const minimapLabel = this.add.text(minimapWidth/2, -5, "MAP", {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5, 0.5);
        this.minimapContainer.add(minimapLabel);
        
        // Store minimap properties for update
        this.minimap = {
            width: minimapWidth,
            height: minimapHeight,
            scale: minimapScale,
            worldWidth: worldWidth,
            worldHeight: worldHeight,
            centerX: minimapWidth/2,
            centerY: minimapHeight/2
        };
    }
    
    updateMinimap() {
        if (!this.playerMarker || !this.minimap) return;
        
        // Calculate player position on minimap
        const playerX = this.minimap.centerX + ((this.penguin.x / this.physics.world.bounds.width) - 0.5) * (this.minimap.width * 0.9);
        const playerY = this.minimap.centerY + ((this.penguin.y / this.physics.world.bounds.height) - 0.5) * (this.minimap.height * 0.9);
        
        // Update player marker position
        this.playerMarker.setPosition(playerX, playerY);
        
        // Update entity markers
        this.updateEnemyMarkers();
        this.updateCashMarkers();
        this.updateCrateMarkers();
    }
    
    updateEnemyMarkers() {
        const enemies = this.enemies.getChildren();
        
        // Remove excess markers
        while (this.enemyMarkers.length > enemies.length) {
            const marker = this.enemyMarkers.pop();
            marker.destroy();
        }
        
        // Add new markers if needed
        while (this.enemyMarkers.length < enemies.length) {
            const marker = this.add.circle(0, 0, 2, 0xff0000, 1);
            this.minimapContainer.add(marker);
            this.enemyMarkers.push(marker);
        }
        
        // Update positions
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            const marker = this.enemyMarkers[i];
            
            // Skip inactive enemies
            if (!enemy.active || !enemy.body) {
                marker.setVisible(false);
                continue;
            }
            
            marker.setVisible(true);
        }
    }
    
    updateCashMarkers() {
        const cash = this.cash.getChildren();
        
        // Remove excess markers
        while (this.cashMarkers.length > cash.length) {
            const marker = this.cashMarkers.pop();
            marker.destroy();
        }
        
        // Add new markers if needed
        while (this.cashMarkers.length < cash.length) {
            const marker = this.add.circle(0, 0, 2, 0xff0000, 1);
            this.minimapContainer.add(marker);
            this.cashMarkers.push(marker);
        }
        
        // Update positions
        for (let i = 0; i < cash.length; i++) {
            const cash = cash[i];
            const marker = this.cashMarkers[i];
            
            // Skip inactive cash
            if (!cash.active || !cash.body) {
                marker.setVisible(false);
                continue;
            }
            
            marker.setVisible(true);
        }
    }
    
    updateCrateMarkers() {
        const crates = this.crates.getChildren();
        
        // Remove excess markers
        while (this.crateMarkers.length > crates.length) {
            const marker = this.crateMarkers.pop();
            marker.destroy();
        }
        
        // Add new markers if needed
        while (this.crateMarkers.length < crates.length) {
            const marker = this.add.circle(0, 0, 2, 0xff0000, 1);
            this.minimapContainer.add(marker);
            this.crateMarkers.push(marker);
        }
        
        // Update positions
        for (let i = 0; i < crates.length; i++) {
            const crate = crates[i];
            const marker = this.crateMarkers[i];
            
            // Skip inactive crates
            if (!crate.active || !crate.body) {
                marker.setVisible(false);
                continue;
            }
            
            marker.setVisible(true);
        }
    }
    
    handlePlayerDeath() {
        // Simple death handling - just return to the parent scene
        this.scene.start(this.parentSceneKey, {
            returnFromBuilding: true,
            playerPosition: this.returnPosition,
            nodeId: this.currentNodeId,
            nodeType: this.nodeType,
            difficultyRating: this.difficultyRating
        });
    }
    
    startCountdown() {
        // Freeze all physics objects
        this.physics.pause();
        
        // Pause all enemies
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.gun) enemy.gun.bullets.setVelocity(0, 0);
        });
        
        // Pause all player bullets
        if (this.ak47) {
            this.ak47.bullets.setVelocity(0, 0);
        }
        
        // Set game state to frozen
        this.isGameFrozen = true;

        // Create countdown text in center of screen
        this.countdownText = this.add.text(
            this.game.config.width / 2,
            this.game.config.height / 2,
            '3',
            {
                fontSize: '128px',
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 8,
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setAlpha(0).setScale(2).setScrollFactor(0);

        // Create the countdown timer
        let count = 3;
        this.countdownTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                // Fade out current number
                this.tweens.add({
                    targets: this.countdownText,
                    alpha: 0,
                    scale: 0.5,
                    duration: 200,
                    onComplete: () => {
                        count--;
                        if (count > 0) {
                            // Show next number
                            this.countdownText.setText(count.toString());
                            this.countdownText.setScale(2);
                            this.tweens.add({
                                targets: this.countdownText,
                                alpha: 1,
                                scale: 1,
                                duration: 200
                            });
                        } else {
                            // End countdown
                            this.countdownText.destroy();
                            this.physics.resume();
                            this.isGameFrozen = false;
                        }
                    }
                });
            },
            repeat: 2
        });

        // Fade in first number
        this.tweens.add({
            targets: this.countdownText,
            alpha: 1,
            scale: 1,
            duration: 200
        });
    }
    
    handleCrateExplosion(crate) {
        if (!crate.active || !crate.scene) return; // Skip if crate is already destroyed

        // Get explosion position
        const explosionX = crate.x;
        const explosionY = crate.y;
        const explosionRadius = 350; // Radius in pixels

        // Check if penguin is within blast radius
        const distToPenguin = Phaser.Math.Distance.Between(explosionX, explosionY, this.penguin.x, this.penguin.y);
        if (distToPenguin < explosionRadius) {
            // Deal damage to penguin based on distance
            const damage = Math.floor(50 * (1 - distToPenguin/explosionRadius));
            if (this.penguin.health) {
                this.penguin.health -= damage;
            }
            
            this.penguin.setTint(0xff0000);
            this.time.delayedCall(100, () => {
                this.penguin.clearTint();
            });
        }

        // Check if any enemies are within blast radius
        this.enemies.getChildren().forEach(enemy => {
            const distToEnemy = Phaser.Math.Distance.Between(explosionX, explosionY, enemy.x, enemy.y);
            if (distToEnemy < explosionRadius) {
                const damage = Math.floor(100 * (1 - distToEnemy/explosionRadius));
                enemy.takeDamage(damage);
            }
        });

        // Check for other crates in explosion radius
        this.crates.getChildren().forEach(otherCrate => {
            if (otherCrate !== crate && otherCrate instanceof Crate && otherCrate.active) {
                const distToCrate = Phaser.Math.Distance.Between(explosionX, explosionY, otherCrate.x, otherCrate.y);
                if (distToCrate < explosionRadius) {
                    // Add a small delay to create a chain reaction effect
                    this.time.delayedCall(100, () => {
                        this.handleCrateExplosion(otherCrate);
                    });
                }
            }
        });

        // Trigger the crate explosion effects
        crate.explode();
    }
    
    update() {
        if (this.isGameFrozen) return;

        // Update penguin state machine
        if (this.penguin.stateMachine) {
            this.penguin.stateMachine.update();
        }

        // Update the ammo count display
        if (this.ammoText && this.ak47) {
            this.ammoText.setText(this.ak47.currentAmmo + ' / ' + this.ak47.maxAmmo);
        }

        // Update all enemies
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.update) {
                enemy.update(this.penguin, this.time.now);
            }
        });

        // Update health bars
        if (this.playerHealthBar && this.penguin) {
            const playerHealthPercent = this.penguin.health / this.penguin.maxHealth;
            this.playerHealthBar.foreground.width = 160 * playerHealthPercent;
        }
        
        // Update minimap
        this.updateMinimap();
        
        // Check for player death
        if (this.penguin && this.penguin.health <= 0) {
            this.handlePlayerDeath();
        }

        // Check if player has moved away from exit
        if (this.exitPromptShown && this.exitZone) {
            const distance = Phaser.Math.Distance.Between(
                this.penguin.x, 
                this.penguin.y,
                this.exitZone.x,
                this.exitZone.y
            );
            
            if (distance > 80) {
                this.hideExitPrompt();
            }
        }
    }

    calculateVelocity() {
        // Calculate velocity based on input keys
        const velocity = { x: 0, y: 0 };
        if (this.keys.left.isDown) velocity.x = -this.moveSpeed;
        if (this.keys.right.isDown) velocity.x = this.moveSpeed;
        if (this.keys.up.isDown) velocity.y = -this.moveSpeed;
        if (this.keys.down.isDown) velocity.y = this.moveSpeed;

        // Normalize diagonal movement
        if (velocity.x !== 0 && velocity.y !== 0) {
            const length = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            velocity.x = velocity.x / length * this.moveSpeed;
            velocity.y = velocity.y / length * this.moveSpeed;
        }

        return velocity;
    }

    spawnLadder() {
        // In building interiors, we don't want to spawn ladders when enemies die
        // This is just an empty method to prevent errors in the Enemy class
        console.log("Ladder spawn attempted in building - ignoring");
        return null;
    }
} 