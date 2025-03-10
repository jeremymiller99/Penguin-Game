class TestLevel extends Phaser.Scene {
    constructor() {
        super('TestLevel');
        this.playerCurrency = 0;
        this.cash = null;
        this.currencyText = null;
        this.isGameFrozen = false;
        this.floorLevel = 1;
        this.highScore = this.getHighScore();
        this.floorLevelText = null;
        this.highScoreText = null;
    }

    init(data) {
        this.currentNodeId = data.nodeId;
        this.nodeType = data.nodeType;
        this.difficultyRating = data.difficultyRating || 1; // Default to 1 if not provided
        
        // Create a smoother difficulty curve with more gradual progression
        // Instead of jumps of 10 floors per difficulty rating
        this.floorLevel = Math.ceil(Math.pow(this.difficultyRating, 1.7) + this.difficultyRating);
        
        // Adjust floor level based on node type (more subtle adjustments)
        if (this.nodeType === 'ELITE') {
            this.floorLevel = Math.ceil(this.floorLevel * 1.3); // 30% increase instead of flat +5
        } else if (this.nodeType === 'BOSS') {
            this.floorLevel = Math.ceil(this.floorLevel * 1.5); // 50% increase instead of flat +10
        } else if (this.nodeType === 'SHOP') {
            this.floorLevel = Math.max(1, Math.floor(this.floorLevel * 0.8)); // 20% decrease for shops
        }
        
        console.log(`Node type: ${this.nodeType}, Difficulty: ${this.difficultyRating}, Floor Level: ${this.floorLevel}`);
    }

    create() {
        this.cameras.main.setBackgroundColor('#87CEEB');

        // Randomly choose between test_map and test_map_1
        const mapKeys = ['test_map_3', 'test_map_1', 'test_map_2'];
        const randomMapKey = mapKeys[Math.floor(Math.random() * mapKeys.length)];
        console.log('Selected map:', randomMapKey);

        // Create the tilemap using the randomly selected map
        const map = this.make.tilemap({ key: randomMapKey });
        console.log('Map created:', map);

        // Add the tileset image to the map
        const tileset = map.addTilesetImage('bg_tileset', 'bg_tileset');
        console.log('Tileset created:', tileset);
        
        // Create the background layer
        const backgroundLayer = map.createLayer('Tile Layer 1', tileset, 0, 0);
        backgroundLayer.setScale(2);
        
        // Calculate the actual world size based on the map dimensions and scale
        const worldWidth = map.widthInPixels * 2; // multiply by the scale (2)
        const worldHeight = map.heightInPixels * 2; // multiply by the scale (2)
        
        // Set world bounds to match the map size, not just screen size
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        
        // Initialize groups first
        this.enemies = this.physics.add.group();
        this.crates = this.physics.add.group({
            classType: Crate,
            runChildUpdate: true
        });

        // Crate Properties
        this.crates.getChildren().forEach(crate => {
            crate.body.setCollideWorldBounds(true);
            crate.body.setBounce(0.6);
            crate.body.setDrag(100);
        });

        // Add penguin sprite and properties
        this.penguin = this.add.sprite(this.game.config.width / 2, this.game.config.height / 2, 'penguin').setScale(2);
        this.penguin.health = 100;
        this.penguin.maxHealth = 100;
        this.moveSpeed = 200;

        // Enable physics on the penguin sprite and make it a dynamic body
        this.physics.add.existing(this.penguin, false); // false = dynamic body
        this.penguin.body.setCollideWorldBounds(true);
        
        // Configure camera to follow the player with smooth movement
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.startFollow(this.penguin, true, 0.09, 0.09); // smooth follow with lerp factor
        this.cameras.main.setZoom(1); // adjust zoom if needed

        // Define keyboard keys for player input
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            pickup: Phaser.Input.Keyboard.KeyCodes.E,
            reload: Phaser.Input.Keyboard.KeyCodes.R,
            slide: Phaser.Input.Keyboard.KeyCodes.SPACE // Change from SHIFT to SPACE
        });

        
        // Create penguin gun object
        this.ak47 = new Gun(this, this.game.config.width / 2 + 50, this.game.config.height / 2);
        this.ak47.assignToPlayer(this.penguin);

        // INITIALIZATION IS OVER ----------------------------------------------------------------------------

        // Spawn level entities
        this.spawnLevelEntities();

        // Add collision between penguin and crates
        this.physics.add.collider(this.penguin, this.crates, () => {
            console.log('Penguin and crate are colliding!');
        });

        // Add collision between enemies and crates
        this.physics.add.collider(this.enemies, this.crates, () => {
            console.log('Enemy and crate are colliding!');
        });

        // Add collision between bullets and crates
        this.physics.add.collider(this.ak47.bullets, this.crates, (bullet, crate) => {
            bullet.destroy();

            if (crate instanceof Crate) {
                this.handleCrateExplosion(crate);
            } else {
                console.error("Collision object is not a Crate instance:", crate);
            }
        });

        // Add collision between enemy bullets and crates
        this.enemies.getChildren().forEach(enemy => {
            if (enemy instanceof RangedEnemy && enemy.gun) {
                this.physics.add.collider(enemy.gun.bullets, this.crates, (bullet, crate) => {
                    bullet.destroy();
                    if (crate instanceof Crate) {
                        this.handleCrateExplosion(crate);
                    }
                });
            }
        });

        // Add collision between bullets and enemies
        this.physics.add.collider(this.ak47.bullets, this.enemies, this.handleBulletEnemyCollision, null, this);

        // Overlap detection for guns with debug logging
        this.physics.add.overlap(
            this.penguin,
            this.children.list.filter(child => child instanceof Gun),
            (penguin, gun) => {
                console.log('Overlap detected with gun!'); // Log every frame there's an overlap
                
                if (Phaser.Input.Keyboard.JustDown(this.keys.pickup)) {
                    console.log('E key pressed during overlap!');
                    
                    if (gun.isDropped) {
                        console.log('Attempting to pick up dropped gun. Gun state:', {
                            isDropped: gun.isDropped,
                            hasPhysics: gun.body.enable,
                            position: { x: gun.x, y: gun.y }
                        });
                        gun.pickup(penguin);
                    } else if (penguin.gun) {
                        console.log('Attempting to drop current gun. Gun state:', {
                            isDropped: penguin.gun.isDropped,
                            hasPhysics: penguin.gun.body.enable,
                            position: { x: penguin.gun.x, y: penguin.gun.y }
                        });
                        penguin.gun.drop();
                    }
                }
            },
            null,
            this
        );

        // UI ------------------------------------------------------------------------------------------------

        // Create a container for the HUD elements
        const hudContainer = this.add.container(10, 10);
        
        // Set the HUD container to be fixed to the camera (not affected by camera movement)
        hudContainer.setScrollFactor(0);
        
        // Starting x position
        let xPos = 20;
        const yPos = 30;
        const spacing = 120;
        const iconScale = 3;

        // Health section
        const healthIcon = this.add.sprite(xPos, yPos, 'icn_fish').setScale(iconScale);
        hudContainer.add(healthIcon);
        
        xPos += 30;
        this.playerHealthBar = this.drawHealthBar(this.penguin, xPos, yPos, 160, 14);
        this.playerHealthBar.background.setAlpha(0.3);
        this.playerHealthBar.foreground.setFillStyle(0xff3838);
        this.playerHealthBar.foreground.width = 160; // Set initial width to full
        const healthGradient = this.add.graphics();
        healthGradient.fillGradientStyle(0xff5555, 0xff3838, 0xff5555, 0xff3838, 0.8);
        hudContainer.add(healthGradient);
        hudContainer.add(this.playerHealthBar.background);
        hudContainer.add(this.playerHealthBar.foreground);

        // Ammo section
        xPos += spacing + 80;
        const ammoIcon = this.add.sprite(xPos, yPos, 'icn_bullet').setScale(iconScale);
        hudContainer.add(ammoIcon);

        xPos += 20;
        this.ammoText = this.add.text(xPos, yPos - 15, this.ak47.currentAmmo + ' / ' + this.ak47.maxAmmo, {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            fontWeight: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });
        hudContainer.add(this.ammoText);

        // Cash section
        xPos += spacing + 40;
        const coinIcon = this.add.sprite(xPos, yPos, 'icn_cash').setScale(iconScale);
        hudContainer.add(coinIcon);
        
        xPos += 20;
        this.currencyText = this.add.text(xPos, yPos - 15, '$' + this.playerCurrency, {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            fontWeight: 'bold',
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4
        });
        hudContainer.add(this.currencyText);

        // Floor level section
        xPos += 100;
        const floorIcon = this.add.sprite(xPos, yPos, 'ladder').setScale(2);
        hudContainer.add(floorIcon);

        xPos += 20;
        this.floorLevelText = this.add.text(xPos, yPos - 15, `Difficulty: ${this.difficultyRating}/10`, {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            fontWeight: 'bold',
            fill: '#4287f5',
            stroke: '#000000',
            strokeThickness: 4
        });
        hudContainer.add(this.floorLevelText);

        // Add cash group with enhanced particle effects
        this.cash = this.physics.add.group({
            classType: Cash,
            runChildUpdate: true
        });

        // Add collision between penguin and coins
        this.physics.add.overlap(this.penguin, this.cash, (penguin, cash) => {
            this.playerCurrency += cash.value;
            this.currencyText.setText('$' + this.playerCurrency);
            
            // Play pickup sound
            this.sound.play('cashPickup', { 
                volume: 0.5,
                rate: 1
            });
            
            cash.destroy();
        }, null, this);

        this.spawnShop();

        this.startCountdown();

        // Initialize background music
        /* Original dual-music system
        this.musicWithEnemies = this.sound.add('music_with_enemies', {
            loop: true,
            volume: 0.3
        });
        this.musicNoEnemies = this.sound.add('music_no_enemies', {
            loop: true,
            volume: 0.3
        });
        
        // Start with combat music since we spawn with enemies
        this.musicWithEnemies.play();
        */

        // Simple single music track
        this.backgroundMusic = this.sound.add('song_1', {
            loop: true,
            volume: 0.3
        });
        this.backgroundMusic.play();

        this.events.on('shutdown', () => {
            /* Original cleanup
            if (this.musicWithEnemies) this.musicWithEnemies.stop();
            if (this.musicNoEnemies) this.musicNoEnemies.stop();
            */
            if (this.backgroundMusic) this.backgroundMusic.stop();
        });

        this.penguin.stateMachine = new PenguinStateMachine(this.penguin);

        // Create the minimap after setting up the world
        this.createMinimap(worldWidth, worldHeight);

        // Initialize slide properties
        this.slideLastUsed = 0;
        this.slideCooldown = 800; // 0.8 second cooldown to match the change in PenguinStateMachine

        // Add these to the UI section to show cooldown
        // After creating all your other UI elements:
        const slideCooldownBar = this.add.container(20, this.game.config.height - 40);
        slideCooldownBar.setScrollFactor(0);

        const slideCooldownLabel = this.add.text(0, 0, "SLIDE", {
            fontSize: '16px',
            fontFamily: 'Arial Black',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        slideCooldownBar.add(slideCooldownLabel);

        this.slideCooldownBg = this.add.rectangle(40, 10, 100, 10, 0x333333);
        this.slideCooldownFill = this.add.rectangle(40, 10, 100, 10, 0x3498db);
        this.slideCooldownFill.setOrigin(0, 0.5);
        this.slideCooldownBg.setOrigin(0, 0.5);

        slideCooldownBar.add(this.slideCooldownBg);
        slideCooldownBar.add(this.slideCooldownFill);
        hudContainer.add(slideCooldownBar);

        // Initialize perk manager
        this.perkManager = new PerkManager(this, this.penguin);
        
        // Initialize default game balance values
        this.cashMultiplier = 1.0;
        this.enemyHealthMultiplier = 1.0;
        this.explosionSizeMultiplier = 1.0;
        
        // Apply any selected perk from the perk room
        const gameState = this.registry.get('gameState') || {};
        
        // Apply previously acquired perks first
        if (gameState.activePerks && gameState.activePerks.length > 0) {
            gameState.activePerks.forEach(perkId => {
                this.perkManager.addPerk(perkId);
            });
        }
        
        // Then apply any newly selected perk
        if (gameState.selectedPerk) {
            this.perkManager.addPerk(gameState.selectedPerk.id);
            
            // Add the selected perk to the active perks list
            if (!gameState.activePerks) {
                gameState.activePerks = [];
            }
            gameState.activePerks.push(gameState.selectedPerk.id);
            
            // Clear the selected perk so it's not applied again
            delete gameState.selectedPerk;
            this.registry.set('gameState', gameState);
        }
        
        // Create perk UI
        this.createPerkUI();
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
        this.minimapContainer.setScrollFactor(0); // Fix to camera
        
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
        
        // Create room silhouette as a translucent shape
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
        
        // Create player marker (white dot)
        this.playerMarker = this.add.circle(minimapWidth/2, minimapHeight/2, 3, 0xffffff, 1);
        this.minimapContainer.add(this.playerMarker);
        
        // Create collections for entity markers
        this.enemyMarkers = [];
        this.cashMarkers = [];
        this.crateMarkers = []; // Add array for crate markers
        this.ladderMarker = null;
        
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
        this.updateCrateMarkers(); // Add crate marker updates
        this.updateLadderMarker();
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
            
            // Calculate position on minimap
            const x = this.minimap.centerX + ((enemy.x / this.physics.world.bounds.width) - 0.5) * (this.minimap.width * 0.9);
            const y = this.minimap.centerY + ((enemy.y / this.physics.world.bounds.height) - 0.5) * (this.minimap.height * 0.9);
            
            marker.setPosition(x, y);
        }
    }

    updateCashMarkers() {
        if (!this.cash) return;
        
        const cashItems = this.cash.getChildren();
        
        // Remove excess markers
        while (this.cashMarkers.length > cashItems.length) {
            const marker = this.cashMarkers.pop();
            marker.destroy();
        }
        
        // Add new markers if needed
        while (this.cashMarkers.length < cashItems.length) {
            const marker = this.add.circle(0, 0, 2, 0x00ff00, 1);
            this.minimapContainer.add(marker);
            this.cashMarkers.push(marker);
        }
        
        // Update positions
        for (let i = 0; i < cashItems.length; i++) {
            const cash = cashItems[i];
            const marker = this.cashMarkers[i];
            
            // Skip inactive cash
            if (!cash.active || !cash.body) {
                marker.setVisible(false);
                continue;
            }
            
            marker.setVisible(true);
            
            // Calculate position on minimap
            const x = this.minimap.centerX + ((cash.x / this.physics.world.bounds.width) - 0.5) * (this.minimap.width * 0.9);
            const y = this.minimap.centerY + ((cash.y / this.physics.world.bounds.height) - 0.5) * (this.minimap.height * 0.9);
            
            marker.setPosition(x, y);
        }
    }

    updateCrateMarkers() {
        if (!this.crates) return;
        
        const crates = this.crates.getChildren();
        
        // Remove excess markers
        while (this.crateMarkers.length > crates.length) {
            const marker = this.crateMarkers.pop();
            marker.destroy();
        }
        
        // Add new markers if needed
        while (this.crateMarkers.length < crates.length) {
            const marker = this.add.circle(0, 0, 2, 0xFFA500, 1); // Orange color for crates
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
            
            // Calculate position on minimap
            const x = this.minimap.centerX + ((crate.x / this.physics.world.bounds.width) - 0.5) * (this.minimap.width * 0.9);
            const y = this.minimap.centerY + ((crate.y / this.physics.world.bounds.height) - 0.5) * (this.minimap.height * 0.9);
            
            marker.setPosition(x, y);
        }
    }

    updateLadderMarker() {
        // Create ladder marker if it exists in the game but not on the minimap
        if (this.ladder && !this.ladderMarker) {
            this.ladderMarker = this.add.circle(0, 0, 3, 0x8B4513, 1); // Brown color
            this.minimapContainer.add(this.ladderMarker);
        }
        
        // Update ladder position if it exists
        if (this.ladder && this.ladderMarker) {
            // Calculate position on minimap
            const x = this.minimap.centerX + ((this.ladder.x / this.physics.world.bounds.width) - 0.5) * (this.minimap.width * 0.9);
            const y = this.minimap.centerY + ((this.ladder.y / this.physics.world.bounds.height) - 0.5) * (this.minimap.height * 0.9);
            
            this.ladderMarker.setPosition(x, y);
        }
    }

    update() {
        if (this.isGameFrozen) return;

        // Update penguin state machine
        if (!this.isGameFrozen) {
            this.penguin.stateMachine.update();
        }

        // Update the ammo count display
        this.ammoText.setText(this.ak47.currentAmmo + ' / ' + this.ak47.maxAmmo);

        // Update all enemies
        this.enemies.getChildren().forEach(enemy => {
            enemy.update(this.penguin, this.time.now);
        });

        // Update health bars
        const playerHealthPercent = this.penguin.health / this.penguin.maxHealth;
        this.playerHealthBar.foreground.width = 160 * playerHealthPercent;
        
        // Update minimap player position
        this.updateMinimap();
        
        // Check for player death
        if (this.penguin.health <= 0) {
            this.checkPenguinDeath();
        }

        // Update slide cooldown UI
        this.updateSlideCooldown();

        // Update perks
        if (this.perkManager) {
            this.perkManager.update();
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

    // Function to check penguin death
    checkPenguinDeath() {
        if (this.penguin.health > 0) return;

        this.penguin.setVisible(false);

        // Play explosion soundd
        this.sound.play('death', {
            volume: 1,
            rate: 1 + Math.random() * 0.5  // Random pitch between 1.0 and 1.5
        });

        // Create explosion effect
        const particleCount = 30;  // More particles
        const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff]; // Added white for extra pop
        
        // Create blood splatter effect
        for (let ring = 0; ring < 3; ring++) { // Reduced ring count
            const delay = ring * 35; // Slower sequence
            const scale = 2 + (ring * 0.6); // Smaller scaling
            
            for (let i = 0; i < particleCount; i++) {
                // Create random angles for splatter look
                const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
                const speed = 200 + Math.random() * 300; // Lower speeds
                const distance = 5 + Math.random() * 20;
                
                // Create blood droplet particle
                const particle = this.add.sprite(
                    this.penguin.x + Math.cos(angle) * distance,
                    this.penguin.y + Math.sin(angle) * distance,
                    'bullet'
                );
                
                // Set to red tint
                particle.setTint(0xff0000);
                particle.setScale(scale * (0.5 + Math.random()));
                particle.setAlpha(0.7 + Math.random() * 0.2);
                
                // Add rotation to particles
                particle.rotation = Math.random() * Math.PI * 2;
                
                this.time.delayedCall(delay, () => {
                    // Initial "burst" tween
                    this.tweens.add({
                        targets: particle,
                        scale: particle.scale * 1.2,
                        duration: 100,
                        onComplete: () => {
                            // Main trajectory tween
                            this.tweens.add({
                                targets: particle,
                                x: particle.x + Math.cos(angle) * speed,
                                y: particle.y + Math.sin(angle) * speed + 200, // Less gravity
                                alpha: 0,
                                scale: scale * 0.2,
                                rotation: particle.rotation + (Math.random() * 3 - 1.5) * Math.PI,
                                duration: 600 + Math.random() * 300,
                                ease: 'Power3.easeOut',
                                onComplete: () => particle.destroy()
                            });
                        }
                    });
                });
            }
        }

        this.isGameFrozen = true;
        this.physics.pause();

        // Show death screen after a short delay to let particles play
        this.time.delayedCall(800, () => {
            this.showDeathScreen();
        });
    }

    // Function to create a death screen with a restart button
    showDeathScreen() {
        const centerX = this.game.config.width / 2;
        const centerY = this.game.config.height / 2;

        // Create dark overlay with fade in
        const overlay = this.add.rectangle(centerX, centerY, this.game.config.width, this.game.config.height, 0x000000, 0);
        overlay.setDepth(10);
        overlay.setScrollFactor(0); // Fix to camera
        this.tweens.add({
            targets: overlay,
            alpha: 0.97, // Increased darkness further
            duration: 800,
            ease: 'Power3'
        });

        // Create death message with animation
        const deathText = this.add.text(centerX, centerY - 100, 'YOU DIED', {
            fontSize: '64px',
            fill: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 8
        })
        .setOrigin(0.5)
        .setDepth(11)
        .setScrollFactor(0) // Fix to camera
        .setAlpha(0)
        .setScale(0.5);

        // Animate death text
        this.tweens.add({
            targets: deathText,
            alpha: 1,
            scale: 1,
            duration: 800,
            ease: 'Back.out'
        });

        // Array of possible death messages
        const deathMessages = [
            'Lost the battle, but not the war',
            'Keep your head up king',
            'You fought well', 
            'The darkness claims another',
            'Your journey ends here',
            'Even penguins fall in battle',
            'A warrior\'s waddle ends here',
            'The ice flows red today',
            'Not even arctic training could save you',
            'Your flippers fought bravely',
            'The emperor has fallen',
            'A cold day for penguin-kind',
            'Your fish-fueled fury wasn\'t enough'
        ];

        // Display floor level with subtle animation
        const floorText = this.add.text(centerX, centerY - 20, `Floor ${this.floorLevel}`, {
            fontSize: '32px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        })
        .setOrigin(0.5)
        .setDepth(11)
        .setScrollFactor(0) // Fix to camera
        .setAlpha(0);

        // Display a random death message
        const messageText = this.add.text(centerX, centerY + 20, deathMessages[Math.floor(Math.random() * deathMessages.length)], {
            fontSize: '24px',
            fill: '#cccccc',
            fontStyle: 'italic',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
            wordWrap: { width: 600 }
        })
        .setOrigin(0.5)
        .setDepth(11)
        .setScrollFactor(0) // Fix to camera
        .setAlpha(0);

        // High score display
        const highScore = this.getHighScore();
        this.highScoreText = this.add.text(centerX, centerY + 60, `High Score: Floor ${highScore}`, {
            fontSize: '24px',
            fill: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        })
        .setOrigin(0.5)
        .setDepth(11)
        .setScrollFactor(0) // Fix to camera
        .setAlpha(0);

        // Fade in stats
        this.tweens.add({
            targets: [floorText, messageText, this.highScoreText],
            alpha: 1,
            duration: 500,
            delay: 600
        });

        // Create restart button
        const restartButton = this.add.text(centerX, centerY + 120, 'Restart', {
            fontSize: '36px',
            fill: '#ffffff',
            backgroundColor: '#880000',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setDepth(11)
        .setScrollFactor(0) // Fix to camera
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });

        // Add pulsing effect to button
        this.tweens.add({
            targets: restartButton,
            scale: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });

        // Restart game on button click
        restartButton.on('pointerdown', () => {
            // Reset floor level to 1
            this.floorLevel = 1;
            // Reset high score in memory (but not in storage)
            this.highScore = this.getHighScore();
            this.scene.restart();
        });

        // Enhanced hover effects
        restartButton.on('pointerover', () => {
            restartButton.setBackgroundColor('#800000');
            restartButton.setScale(1.1);
            this.game.canvas.style.cursor = 'pointer';
        });
        
        restartButton.on('pointerout', () => {
            restartButton.setBackgroundColor('#4a0000');
            restartButton.setScale(1);
            this.game.canvas.style.cursor = 'default';
        });
    }
    
    getHighScore() {
        return localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 1;
    }
    
    setHighScore(newScore) {
        localStorage.setItem('highScore', newScore);
    }
    
    handlePickup() {
        const PICKUP_RANGE = 50; // Distance in pixels within which pickup is possible
        
        // Get all dropped guns in the scene
        const droppedGuns = this.children.list.filter(
            child => child instanceof Gun && child.isDropped
        );
        
        // Find the closest gun within pickup range
        let closestGun = null;
        let closestDistance = PICKUP_RANGE;
        
        droppedGuns.forEach(gun => {
            const distance = Phaser.Math.Distance.Between(
                this.penguin.x, 
                this.penguin.y, 
                gun.x, 
                gun.y
            );
            
            if (distance < closestDistance) {
                closestGun = gun;
                closestDistance = distance;
            }
        });

        // If we found a gun in range, pick it up
        if (closestGun) {
            closestGun.pickup(this.penguin);
            console.log('Picked up gun!');
        } else if (this.penguin.gun) {
            // If no gun to pick up and we have one, drop it
            this.penguin.gun.drop();
            console.log('Dropped gun!');
        }
    }

    handleBulletImpact(bullet) {
        // Create an impact sprite at the bullet's position
        // Create multiple impact particles in a burst pattern
        for (let i = 0; i < 8; i++) {
            const angle = Math.PI * 2 * (i / 8); // Evenly spaced angles
            const distance = 10; // Distance from impact point
            const impact = this.add.sprite(
                bullet.x + Math.cos(angle) * distance,
                bullet.y + Math.sin(angle) * distance,
                'impactImage'
            );
            
            impact.setRotation(angle);
            impact.setAlpha(1);
            impact.setScale(0.3);

            // Fade out and expand
            this.tweens.add({
                targets: impact,
                alpha: 0,
                scale: 0.6,
                duration: 200,
                onComplete: () => impact.destroy()
            });
        }

        // Destroy the bullet
        bullet.destroy();
    }

    handleBulletEnemyCollision(bullet, enemy) {
        // Check if bullet and enemy are valid
        if (!bullet || !bullet.active || !enemy || !enemy.active) return;
        
        bullet.destroy();
        
        // Check for explosive rounds perk
        if (this.penguin.hasExplosiveRounds) {
            this.createExplosion(bullet.x, bullet.y, 100); // Small explosion
        }
        
        enemy.takeDamage(10);
        
        // If enemy died, spawn cash
        if (enemy.health <= 0) {
            // Emit an event when an enemy is killed
            this.events.emit('enemyKilled');

            // Spawn 1-3 cash drops
            const cashCount = Phaser.Math.Between(1, 3);
            for (let i = 0; i < cashCount; i++) {
                this.cash.add(new Cash(this, enemy.x, enemy.y));
            }

            // Check if all enemies are dead and update shop animation
            if (this.enemies.countActive(true) === 0 && this.shop) {
                this.shop.handleShopSprite(this);
            }
        }

        // Add collision between enemy bullets and player
        if (enemy instanceof RangedEnemy && enemy.gun) {
            this.physics.add.collider(enemy.gun.bullets, this.penguin, (penguin, bullet) => {
                if (!bullet || !bullet.active) return;
                
                bullet.destroy();
                penguin.health -= enemy.damage;
                this.sound.play('hit', {
                    volume: 0.4,
                    rate: 0.8 + Math.random() * 0.4
                });

                // Apply visual feedback
                penguin.setTint(0xff0000);
                this.time.delayedCall(100, () => {
                    penguin.clearTint();
                });
            });
            
            // Add collision between enemy bullets and crates
            this.physics.add.collider(enemy.gun.bullets, this.crates, (bullet, crate) => {
                if (!bullet || !bullet.active || !crate || !crate.active) return;
                
                bullet.destroy();
                crate.takeDamage(enemy.damage / 2);
            });
            
            // Add collision between enemy bullets and barrels
            if (this.barrels) {
                this.physics.add.collider(enemy.gun.bullets, this.barrels, (bullet, barrel) => {
                    if (!bullet || !bullet.active || !barrel || !barrel.active) return;
                    
                    bullet.destroy();
                    barrel.takeDamage(enemy.damage);
                });
            }
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

    spawnEnemy(type, x, y) {
        // Ensure enemies spawn at least 200 pixels away from player
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
            case 'bomber':
                enemy = new BomberEnemy(this, spawnX, spawnY);
                break;
            default:
                enemy = new Enemy(this, spawnX, spawnY);
                break;
        }
        
        this.enemies.add(enemy);
        this.physics.add.collider(enemy, this.penguin);
        
        // Add collision between enemy and crates
        this.physics.add.collider(enemy, this.crates);
        
        // Handle ranged enemy bullets
        if (enemy instanceof RangedEnemy && enemy.gun) {
            this.physics.add.collider(enemy.gun.bullets, this.penguin, (penguin, bullet) => {
                if (!bullet || !bullet.active) return;
                
                bullet.destroy();
                penguin.health -= enemy.damage;
                this.sound.play('hit', {
                    volume: 0.4,
                    rate: 0.8 + Math.random() * 0.4
                });

                // Apply visual feedback
                penguin.setTint(0xff0000);
                this.time.delayedCall(100, () => {
                    penguin.clearTint();
                });
            });
            
            // Add collision between enemy bullets and crates
            this.physics.add.collider(enemy.gun.bullets, this.crates, (bullet, crate) => {
                if (!bullet || !bullet.active || !crate || !crate.active) return;
                
                bullet.destroy();
                crate.takeDamage(enemy.damage / 2);
            });
            
            // Add collision between enemy bullets and barrels
            if (this.barrels) {
                this.physics.add.collider(enemy.gun.bullets, this.barrels, (bullet, barrel) => {
                    if (!bullet || !bullet.active || !barrel || !barrel.active) return;
                    
                    bullet.destroy();
                    barrel.takeDamage(enemy.damage);
                });
            }
        }
        
        return enemy;
    }

    spawnLadder() {
        // Find a random position away from walls and other objects
        let validPosition = false;
        let x, y;
        
        while (!validPosition) {
            // Use world bounds instead of game config width/height
            x = Phaser.Math.Between(100, this.physics.world.bounds.width - 100);
            y = Phaser.Math.Between(100, this.physics.world.bounds.height - 100);
            
            const distanceFromPenguin = Phaser.Math.Distance.Between(
                x, y, this.penguin.x, this.penguin.y
            );
            
            if (distanceFromPenguin > 100) {
                validPosition = true;
            }
        }
        
        this.ladder = new Ladder(this, x, y);
        
        this.physics.add.overlap(this.penguin, this.ladder, () => {
            const gameMap = this.registry.get('gameMap');
            
            if (gameMap) {
                const completedNodes = new Set(gameMap.completedNodes);
                const availableNodes = new Set();  // Start fresh with available nodes
                
                // Add current node to completed nodes
                completedNodes.add(this.currentNodeId);
                
                // Find the current node
                const currentNode = gameMap.nodes.find(n => n.id === this.currentNodeId);
                if (currentNode) {
                    // Make all unbeaten connected nodes available
                    currentNode.connections.forEach(nodeId => {
                        if (!completedNodes.has(nodeId)) {
                            availableNodes.add(nodeId);
                        }
                    });
                }
                
                // Update registry with new state
                this.registry.set('gameMap', {
                    ...gameMap,
                    currentNode: this.currentNodeId,  // Current node is the one just completed
                    completedNodes: Array.from(completedNodes),
                    availableNodes: Array.from(availableNodes)  // Only connected unbeaten nodes
                });
            }
            
            this.transitionToScene('Map');
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

    // Add this new method to handle crate explosions
    handleCrateExplosion(crate) {
        if (!crate.active || !crate.scene) return; // Skip if crate is already destroyed

        // Get explosion position
        const explosionX = crate.x;
        const explosionY = crate.y;
        const explosionRadius = 350; // Radius in pixels

        // Check if penguin is within blast radius
        const distToPenguin = Phaser.Math.Distance.Between(explosionX, explosionY, this.penguin.x, this.penguin.y);
        if (distToPenguin < explosionRadius && !this.penguin.isExplosionImmune) {
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

    spawnCrate() {
        // Ensure crates spawn at least 200 pixels away from player
        let validPosition = false;
        let spawnX, spawnY;
        
        while (!validPosition) {
            // Use world bounds instead of game config width/height
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
        
        // Add physics properties to the new crate
        crate.body.setCollideWorldBounds(true);
        crate.body.setBounce(0.6);
        crate.body.setDrag(100);
        
        return crate;
    }

    spawnShop() {
        this.shop = new Shop(this);
        
        // Add collision with player
        this.physics.add.collider(this.penguin, this.shop);

        // Add shop to update loop
        this.events.on('update', () => {
            if (this.shop) {
                this.shop.update(this);
            }
        });
    }

    calculateDifficultyParams(floorLevel) {
        // Base values adjustments for more gradual scaling
        const baseEnemies = 1;
        const baseCrates = 1;
        
        // More gradual enemy scaling with diminishing returns at higher levels
        const enemyCount = Math.min(
            Math.floor(baseEnemies + Math.sqrt(floorLevel) * 1.2), 
            50
        );
        
        // More gradual crate scaling
        const crateCount = Math.min(
            Math.floor(baseCrates + Math.log(floorLevel + 1) * 1.2), 
            5
        );
        
        // Calculate enemy type distribution with smoother transitions
        let enemyTypeDistribution = {
            default: 10,
            melee: 0,
            ranged: 0,
            tank: 0,
            bomber: 0
        };
        
        // More gradual introduction of melee enemies
        if (floorLevel >= 3) {
            enemyTypeDistribution.melee = Math.min(floorLevel - 2, 8);
        }
        
        // More gradual introduction of ranged enemies
        if (floorLevel >= 6) {
            enemyTypeDistribution.ranged = Math.min((floorLevel - 5) * 0.8, 8);
        }
        
        // Introduce tank enemies at higher levels
        if (floorLevel >= 9) {
            enemyTypeDistribution.tank = Math.min((floorLevel - 8) * 0.6, 6);
        }
        
        // Introduce bomber enemies at higher levels
        if (floorLevel >= 12) {
            enemyTypeDistribution.bomber = Math.min((floorLevel - 11) * 0.7, 7);
        }
        
        // As floor level increases, gradually reduce basic enemies in favor of advanced types
        if (floorLevel >= 8) {
            enemyTypeDistribution.default = Math.max(10 - (floorLevel - 7), 1);
        }
        
        return {
            enemyCount,
            crateCount,
            enemyTypeDistribution
        };
    }

    spawnLevelEntities() {
        const params = this.calculateDifficultyParams(this.floorLevel);
        
        // Spawn enemies
        for (let i = 0; i < params.enemyCount; i++) {
            // Calculate enemy type based on distribution
            const totalWeight = Object.values(params.enemyTypeDistribution).reduce((a, b) => a + b, 0);
            let random = Math.random() * totalWeight;
            let selectedType = 'default';
            
            for (const [type, weight] of Object.entries(params.enemyTypeDistribution)) {
                if (random < weight) {
                    selectedType = type;
                    break;
                }
                random -= weight;
            }
            
            // Spawn enemy with calculated position - use world bounds
            const randomX = Phaser.Math.Between(100, this.physics.world.bounds.width - 100);
            const randomY = Phaser.Math.Between(100, this.physics.world.bounds.height - 100);
            this.spawnEnemy(selectedType, randomX, randomY);
        }
        
        // Spawn crates
        for (let i = 0; i < params.crateCount; i++) {
            this.spawnCrate();
        }
    }

    // Add this method to handle updating the slide cooldown UI
    updateSlideCooldown() {
        if (!this.slideCooldownFill) return;
        
        const now = this.time.now;
        const elapsed = now - this.slideLastUsed;
        
        if (elapsed < this.slideCooldown) {
            // Cooldown not ready yet
            const progress = elapsed / this.slideCooldown;
            this.slideCooldownFill.width = progress * 100;
            this.slideCooldownFill.fillColor = 0x95a5a6; // Gray while on cooldown
        } else {
            // Cooldown ready
            this.slideCooldownFill.width = 100;
            this.slideCooldownFill.fillColor = 0x3498db; // Blue when ready
        }
    }

    // Add method to create perk UI
    createPerkUI() {
        // Create a container for perk icons positioned under the health bar
        // The health bar is at y position 30, so we'll position this at y=50
        this.perkIconsContainer = this.add.container(30, 50);
        this.perkIconsContainer.setScrollFactor(0);
        
        // Add a label
        const perkLabel = this.add.text(0, 0, 'PERKS', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.perkIconsContainer.add(perkLabel);
        
        // Update the icons
        this.updatePerkIcons([]);
    }

    // Method to update perk icons when perks change
    updatePerkIcons(perks) {
        // Clear existing icons
        this.perkIconsContainer.removeAll(true);
        
        // Re-add the label
        const perkLabel = this.add.text(0, 0, 'PERKS', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.perkIconsContainer.add(perkLabel);
        
        // Add each perk icon in a row under the label
        const iconSize = 35; // Space between icons
        const startY = 25;   // Y position under the label
        
        perks.forEach((perk, index) => {
            const icon = this.add.sprite(index * iconSize, startY, perk.icon || 'default_perk_icon')
                .setScale(1.5)
                .setInteractive({ useHandCursor: true });
            
            // Add a colored border based on rarity
            const border = this.add.graphics();
            border.lineStyle(2, this.getRarityColor(perk.rarity), 1);
            border.strokeCircle(index * iconSize, startY, 18);
            
            this.perkIconsContainer.add([border, icon]);
            
            // Add tooltip on hover
            icon.on('pointerover', () => {
                this.showPerkTooltip(perk, icon.x + this.perkIconsContainer.x, 
                                     icon.y + this.perkIconsContainer.y + 25);
            });
            
            icon.on('pointerout', () => {
                if (this.perkTooltip) {
                    this.perkTooltip.destroy();
                    this.perkTooltip = null;
                }
            });
        });
    }

    // Method to show a tooltip when hovering over a perk icon
    showPerkTooltip(perk, x, y) {
        if (this.perkTooltip) {
            this.perkTooltip.destroy();
        }
        
        this.perkTooltip = this.add.container(x, y);
        this.perkTooltip.setScrollFactor(0);
        
        // Background
        const bg = this.add.rectangle(0, 0, 200, 80, 0x000000, 0.8)
            .setOrigin(0.5, 0);
        this.perkTooltip.add(bg);
        
        // Name
        const nameText = this.add.text(0, 5, perk.name, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fill: this.getRarityColor(perk.rarity, true),
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5, 0);
        this.perkTooltip.add(nameText);
        
        // Description
        const descText = this.add.text(0, 30, perk.description, {
            fontSize: '12px',
            fontFamily: 'Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1,
            align: 'center',
            wordWrap: { width: 180 }
        }).setOrigin(0.5, 0);
        this.perkTooltip.add(descText);
        
        // Make sure tooltip stays within screen bounds
        const bounds = this.perkTooltip.getBounds();
        if (bounds.right > this.game.config.width) {
            this.perkTooltip.x -= (bounds.right - this.game.config.width + 10);
        }
        if (bounds.bottom > this.game.config.height) {
            this.perkTooltip.y -= (bounds.bottom - this.game.config.height + 10);
        }
        if (bounds.left < 0) {
            this.perkTooltip.x -= bounds.left - 10;
        }
    }

    getRarityColor(rarity, isText = false) {
        const colors = {
            common: isText ? '#aaaaaa' : 0xaaaaaa,
            uncommon: isText ? '#00cc00' : 0x00cc00,
            rare: isText ? '#0088ff' : 0x0088ff,
            epic: isText ? '#aa44ff' : 0xaa44ff,
            legendary: isText ? '#ffaa00' : 0xffaa00
        };
        
        return colors[rarity] || (isText ? '#ffffff' : 0xffffff);
    }

    // Add an explosion method for explosive rounds
    createExplosion(x, y, radius) {
        // Adjust explosion size based on perk
        const finalRadius = radius * (this.explosionSizeMultiplier || 1);
        
        // Create explosion effect
        const explosion = this.add.circle(x, y, 5, 0xffff00, 1);
        
        // Expand and fade out
        this.tweens.add({
            targets: explosion,
            radius: finalRadius,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => explosion.destroy()
        });
        
        // Deal damage to enemies in radius
        this.enemies.getChildren().forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (distance <= finalRadius) {
                const damage = Math.floor(5 * (1 - distance/finalRadius));
                enemy.takeDamage(damage);
            }
        });
        
        // Deal damage to player if in radius and not immune
        const distToPlayer = Phaser.Math.Distance.Between(x, y, this.penguin.x, this.penguin.y);
        if (distToPlayer <= finalRadius && !this.penguin.isExplosionImmune) {
            const damage = Math.floor(3 * (1 - distToPlayer/finalRadius));
            this.penguin.health -= damage;
            
            // Flash player
            this.penguin.setTint(0xff0000);
            this.time.delayedCall(100, () => {
                this.penguin.clearTint();
            });
        }
        
        // Add sound effect
        this.sound.play('explosion', { 
            volume: 0.4,
            rate: 0.8 + Math.random() * 0.4
        });
    }

    // Add this method to save game state when transitioning to another scene
    saveGameState() {
        // Get current game state or initialize a new one
        const gameState = this.registry.get('gameState') || {};
        
        // Save active perks
        if (this.perkManager) {
            gameState.activePerks = this.perkManager.activePerks.map(perk => perk.id);
        }
        
        // Save other important game state
        gameState.playerCurrency = this.playerCurrency;
        gameState.playerScore = this.playerScore;
        
        // Update the registry
        this.registry.set('gameState', gameState);
        console.log("Game state saved:", gameState);
    }
    
    // Call this method before transitioning to another scene
    transitionToScene(sceneName, data = {}) {
        this.saveGameState();
        this.scene.start(sceneName, data);
    }
}