class BaseMapScene extends Phaser.Scene {
    constructor(key) {
        super(key);
        this.moveSpeed = 200;
        this.isSliding = false;
        this.slideTimer = 0;
        this.slideCooldown = 1000; // 1 second cooldown
        this.isGameFrozen = false;
        this.slidePulseActive = false;
        this.slideLastUsed = 0; // Track when slide was last used
        this.invincibilityDuration = 2000; // 2 seconds
        this.hasBeenEntered = false; // Track if scene has been entered before
        this.isDestroyed = false;  // Add flag to track if scene is destroyed
        this.isBeingReset = false;  // Add flag to track if scene is being reset
        
        // Initialize logging system
        this.debugLogging = true; // Set to false in production
        this.logPrefix = `[${key}]`;
        this.logGroups = {
            SCENE: "🎬 SCENE",
            PLAYER: "🐧 PLAYER",
            ENEMIES: "👹 ENEMIES",
            PHYSICS: "⚛️ PHYSICS",
            ITEMS: "📦 ITEMS",
            INPUT: "🎮 INPUT",
            UI: "🖥️ UI",
            LIFECYCLE: "♻️ LIFECYCLE",
            ERROR: "❌ ERROR",
            WARNING: "⚠️ WARNING"
        };
    }

    // Add these logging methods to the BaseMapScene class
    log(group, message, data) {
        if (!this.debugLogging) return;
        
        const groupPrefix = this.logGroups[group] || "ℹ️ INFO";
        const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
        
        console.log(`${timestamp} ${this.logPrefix} ${groupPrefix}: ${message}`, data || '');
    }

    logError(message, error) {
        if (!this.debugLogging) return;
        
        const timestamp = new Date().toISOString().substr(11, 8);
        console.error(`${timestamp} ${this.logPrefix} ${this.logGroups.ERROR}: ${message}`, error || '');
    }

    logWarning(message, data) {
        if (!this.debugLogging) return;
        
        const timestamp = new Date().toISOString().substr(11, 8);
        console.warn(`${timestamp} ${this.logPrefix} ${this.logGroups.WARNING}: ${message}`, data || '');
    }

    init(data) {
        // Store data passed from GameManager
        this.mapKey = data.mapKey;
        this.floorLevel = data.floorLevel;
        this.playerCurrency = data.playerCurrency;
        this.nodeId = data.nodeId;
        this.nodeType = data.nodeType;
        this.difficultyRating = data.difficultyRating;
        
        this.log("SCENE", `Initializing with data`, {
            mapKey: this.mapKey,
            floorLevel: this.floorLevel,
            currency: this.playerCurrency,
            nodeId: this.nodeId,
            nodeType: this.nodeType,
            difficulty: this.difficultyRating
        });
        
        // If this is the first time entering the scene, no need to reset
        if (this.hasBeenEntered) {
            this.log("LIFECYCLE", `Re-entering scene ${this.scene.key}, performing reset`);
            this.resetScene();
        } else {
            this.log("LIFECYCLE", `First time entering scene ${this.scene.key}`);
            this.hasBeenEntered = true;
        }
    }

    create() {
        this.log("LIFECYCLE", `Creating scene ${this.scene.key}`);
        
        // Initialize groups for game objects
        this.initializeGroups();
        
        // Create the map
        this.createMap();
        
        // Create the player character
        this.createPlayer();
        
        // Create the player's weapon
        this.createPlayerWeapon();
        
        // Set up input handlers
        this.setupInput();
        
        // Set up physics
        this.setupPhysics();
        
        // Initialize pathfinding system
        this.pathfinding = new Pathfinding(this);
        
        // Spawn entities based on difficulty
        this.spawnEntities();
        
        // Create UI elements
        this.createUI();
        
        // Initialize perk system
        this.initializePerkSystem();
        
        // Create minimap
        this.createMinimap(this.physics.world.bounds.width, this.physics.world.bounds.height);
        
        // Create ocean background
        this.createOceanBackground();
        
        // Create whitecaps
        this.createWhitecaps();
        
        this.log("LIFECYCLE", `Scene creation complete`);
    }

    initializeGroups() {
        // Initialize enemy group
        this.enemies = this.physics.add.group();
        
        // Initialize crates group
        this.crates = this.physics.add.group({
            classType: Crate,
            runChildUpdate: true
        });
        
        // Initialize barrels group
        this.barrels = this.physics.add.group({
            classType: Crate, // Using Crate class for barrels initially
            runChildUpdate: true
        });
        
        // Initialize cash/collectibles group
        this.cash = this.physics.add.group();
    }

    createMap() {
        // Base implementation - override in specific map scenes
        console.log('Creating map:', this.mapKey);
        this.map = this.make.tilemap({ key: this.mapKey });
        
        // Calculate world bounds based on map size
        if (this.map) {
            const worldWidth = this.map.widthInPixels * 2; // assuming scale of 2
            const worldHeight = this.map.heightInPixels * 2;
            this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        }
    }

    createPlayer() {
        // Common player creation logic
        this.penguin = this.add.sprite(this.game.config.width / 2, this.game.config.height / 2, 'penguin').setScale(2);
        this.penguin.health = 102;  // Adjusted to survive 6 hits from basic enemies (17 damage per hit)
        this.penguin.maxHealth = 102;
        this.penguin.isInvincible = false;
        this.penguin.invincibilityTimer = null;
        
        // Enable physics
        this.physics.add.existing(this.penguin, false);
        this.penguin.body.setCollideWorldBounds(true);
        
        // Set physics properties for better movement
        this.penguin.body.setDrag(600, 600);
        this.penguin.body.setMaxVelocity(this.moveSpeed * 4, this.moveSpeed * 4);
        this.penguin.body.setDamping(true);
        
        // Add takeDamage method that uses the centralized system
        this.penguin.takeDamage = (amount) => {
            if (this.penguin.health <= 0 || this.penguin.isInvincible) return;
            this.handleDamage(this.penguin, amount);
            this.makePlayerInvincible();
        };
        
        // Create weapon
        this.createPlayerWeapon();
        
        // Initialize the state machine for the penguin
        this.penguin.stateMachine = new PenguinStateMachine(this.penguin);
        
        // Configure camera to follow player
        if (this.map) {
            const worldWidth = this.map.widthInPixels * 2;
            const worldHeight = this.map.heightInPixels * 2;
            this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        }
        this.cameras.main.startFollow(this.penguin, true, 0.09, 0.09);
    }

    makePlayerInvincible() {
        if (!this.penguin) return;
        
        // Set invincibility flag
        this.penguin.isInvincible = true;
        
        // CRITICAL: Ensure penguin stays active, visible and movable
        this.penguin.active = true;
        this.penguin.visible = true;
        
        // Make sure physics body is enabled
        if (this.penguin.body) {
            this.penguin.body.enable = true;
        }
        
        this.log("PLAYER", "Player became invincible", { duration: this.invincibilityDuration });
        
        // Clear any existing invincibility timer
        if (this.penguin.invincibilityTimer) {
            this.penguin.invincibilityTimer.remove();
            this.penguin.invincibilityTimer = null;
        }
        
        // Clear any existing flash effect
        if (this.penguin.invincibilityFlash) {
            this.penguin.invincibilityFlash.remove();
            this.penguin.invincibilityFlash = null;
        }
        
        // Use tint flashing instead of alpha changes which can cause issues
        let flashState = false;
        this.penguin.invincibilityFlash = this.time.addEvent({
            delay: 100, // Flash every 100ms
            callback: () => {
                if (this.penguin && this.penguin.active) {
                    // Toggle tint instead of alpha
                    flashState = !flashState;
                    if (flashState) {
                        this.penguin.setTint(0x99ccff); // Light blue tint for invincibility
                    } else {
                        this.penguin.clearTint();
                    }
                    
                    // Keep alpha at full visibility
                    this.penguin.alpha = 1;
                    
                    // Ensure the physics body stays enabled
                    if (this.penguin.body) {
                        this.penguin.body.enable = true;
                    }
                }
            },
            loop: true
        });
        
        // Set timer to remove invincibility
        this.penguin.invincibilityTimer = this.time.delayedCall(this.invincibilityDuration, () => {
            if (this.penguin) {
                this.penguin.isInvincible = false;
                
                // Clear any tint
                this.penguin.clearTint();
                
                // Ensure full visibility
                this.penguin.alpha = 1;
                
                // Make sure physics body is enabled
                if (this.penguin.body) {
                    this.penguin.body.enable = true;
                }
                
                if (this.penguin.invincibilityFlash) {
                    this.penguin.invincibilityFlash.remove();
                    this.penguin.invincibilityFlash = null;
                }
                
                this.log("PLAYER", "Player invincibility ended");
            }
        });
    }

    createPlayerWeapon() {
        // Create default weapon for player at the player's position
        if (!this.penguin.gun) {
            this.ak47 = new Gun(this, this.penguin.x, this.penguin.y);
            
            // Assign the gun to the player
            this.ak47.assignToPlayer(this.penguin);
            
            // Make sure the gun is positioned correctly initially
            this.ak47.setPosition(this.penguin.x, this.penguin.y);
        }
    }

    setupInput() {
        // Define keyboard keys for player input
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            slide: Phaser.Input.Keyboard.KeyCodes.SPACE,
            reload: Phaser.Input.Keyboard.KeyCodes.R
        });
        
        // Initialize slide timer
        this.slideTimer = this.slideCooldown;
        
        // Add reload key handler
        this.keys.reload.on('down', () => {
            if (this.penguin && this.penguin.gun) {
                this.penguin.gun.reload();
            }
        });
        
        // Add mouse input for shooting
        this.input.on('pointerdown', () => {
            if (this.penguin && this.penguin.gun) {
                this.penguin.gun.isFiring = true;
            }
        });
        
        this.input.on('pointerup', () => {
            if (this.penguin && this.penguin.gun) {
                this.penguin.gun.isFiring = false;
            }
        });
    }

    setupPhysics() {
        if (!this.penguin) return;
        
        // Set up collisions between player and enemies
        this.physics.add.collider(this.penguin, this.enemies, (penguin, enemy) => {
            // Only apply damage if penguin is not sliding
            if (!this.isSliding) {
                // Apply damage to penguin on contact with enemy
                if (penguin.health && !penguin.isInvulnerable) {
                    // Check enemy type and apply appropriate damage
                    let damageAmount = 10; // Default damage
                    
                    // Check enemy type and apply appropriate damage
                    if (enemy.attackDamage) {
                        damageAmount = enemy.attackDamage;
                    }
                    
                    penguin.takeDamage(damageAmount);
                }
            }
        });
        
        // Set up collisions between player and crates
        this.physics.add.collider(this.penguin, this.crates);
        
        // Set up collisions between player and barrels
        this.physics.add.collider(this.penguin, this.barrels);
        
        // Set up collisions between bullets and enemies
        if (this.penguin.gun && this.penguin.gun.bullets) {
            this.physics.add.collider(
                this.penguin.gun.bullets,
                this.enemies,
                this.handleBulletEnemyCollision,
                null,
                this
            );
            
            // Set up collisions between bullets and crates
            this.physics.add.collider(
                this.penguin.gun.bullets,
                this.crates,
                (bullet, crate) => {
                    bullet.destroy();
                    this.createBulletImpactEffect(bullet.x, bullet.y);
                    
                    // Debug: Check what type of object crate is
                    console.log('Crate object:', crate);
                    console.log('Is Crate instance:', crate instanceof Crate);
                    
                    // Try to damage the crate with error handling
                    try {
                        if (typeof crate.takeDamage === 'function') {
                            crate.takeDamage(bullet.damage || 20);
                            
                            // If crate is destroyed, handle explosion
                            if (crate.health <= 0) {
                                console.log('Crate health reached zero, triggering explosion');
                                this.handleCrateExplosion(crate);
                            }
                        } else {
                            // Fallback if takeDamage is not a function
                            console.warn('takeDamage is not a function on crate');
                            
                            // Add health property if it doesn't exist
                            if (crate.health === undefined) {
                                crate.health = 100;
                            }
                            
                            // Manually reduce health
                            crate.health -= (bullet.damage || 20);
                            
                            // If crate is destroyed, handle explosion
                            if (crate.health <= 0) {
                                console.log('Crate health reached zero (fallback), triggering explosion');
                                this.handleCrateExplosion(crate);
                            }
                        }
                    } catch (error) {
                        console.error('Error handling crate damage:', error);
                    }
                },
                null,
                this
            );
            
            // Set up collisions between bullets and barrels
            this.physics.add.collider(
                this.penguin.gun.bullets,
                this.barrels,
                (bullet, barrel) => {
                    bullet.destroy();
                    this.createBulletImpactEffect(bullet.x, bullet.y);
                    
                    // Debug: Check what type of object barrel is
                    console.log('Barrel object:', barrel);
                    console.log('Is Crate instance:', barrel instanceof Crate);
                    
                    // Try to damage the barrel with error handling
                    try {
                        if (typeof barrel.takeDamage === 'function') {
                            barrel.takeDamage(bullet.damage || 20);
                            
                            // If barrel is destroyed, handle explosion
                            if (barrel.health <= 0) {
                                console.log('Barrel health reached zero, triggering explosion');
                                this.handleCrateExplosion(barrel);
                            }
                        } else {
                            // Fallback if takeDamage is not a function
                            console.warn('takeDamage is not a function on barrel');
                            
                            // Add health property if it doesn't exist
                            if (barrel.health === undefined) {
                                barrel.health = 100;
                            }
                            
                            // Manually reduce health
                            barrel.health -= (bullet.damage || 20);
                            
                            // If barrel is destroyed, handle explosion
                            if (barrel.health <= 0) {
                                console.log('Barrel health reached zero (fallback), triggering explosion');
                                this.handleCrateExplosion(barrel);
                            }
                        }
                    } catch (error) {
                        console.error('Error handling barrel damage:', error);
                    }
                },
                null,
                this
            );
        }
        
        // Set up overlap between player and cash
        this.physics.add.overlap(
            this.penguin,
            this.cash,
            this.collectCash,
            null,
            this
        );
    }

    spawnEntities() {
        // Calculate difficulty parameters
        const diffParams = this.calculateDifficultyParams(this.floorLevel);
        
        // Set enemy health multiplier for the scene
        this.enemyHealthMultiplier = 1 + ((this.floorLevel - 1) * 0.2);
        
        console.log(`Spawning ${diffParams.enemyCount} enemies for floor level ${this.floorLevel}`);
        
        // Spawn enemies based on difficulty and type distribution
        for (let i = 0; i < diffParams.enemyCount; i++) {
            // Determine enemy type based on distribution
            const totalWeight = Object.values(diffParams.enemyTypeDistribution).reduce((a, b) => a + b, 0);
            let random = Math.random() * totalWeight;
            let selectedType = 'basic';
            
            for (const [type, weight] of Object.entries(diffParams.enemyTypeDistribution)) {
                if (random < weight) {
                    selectedType = type === 'default' ? 'basic' : type;
                    break;
                }
                random -= weight;
            }
            
            console.log(`Spawning enemy #${i+1} of type: ${selectedType}`);
            this.spawnEnemy(selectedType);
        }
        
        // Spawn crates
        for (let i = 0; i < diffParams.crateCount; i++) {
            this.spawnCrate();
        }
        
        // Removed ladder spawning from here - ladder will only spawn after all enemies are dead
        // The ladder spawning is handled in the Enemy.js die() method
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
            ranged: 0
        };
        
        // More gradual introduction of melee enemies
        if (floorLevel >= 3) {
            enemyTypeDistribution.melee = Math.min(floorLevel - 2, 8);
        }
        
        // More gradual introduction of ranged enemies
        if (floorLevel >= 6) {
            enemyTypeDistribution.ranged = Math.min((floorLevel - 5) * 0.8, 8);
        }
        
        // As floor level increases, gradually reduce basic enemies in favor of advanced types
        if (floorLevel >= 8) {
            enemyTypeDistribution.default = Math.max(10 - (floorLevel - 7), 1);
        }
        
        // Additional parameters for enemy scaling
        const params = {
            enemyCount,
            crateCount,
            enemyTypeDistribution,
            
            // Enemy health scales with floor level
            enemyHealth: 100 + (floorLevel * 15),
            
            // Cash rewards increase with floor level
            cashMultiplier: 1 + (floorLevel * 0.15),
            
            // Enemy speed increases slightly with floor level
            enemySpeedMultiplier: 1 + (floorLevel * 0.05)
        };
        
        this.log("SCENE", `Difficulty params for floor ${floorLevel}:`, params);
        return params;
    }

    spawnEnemy(type = 'basic', x, y) {
        // Default implementation - override in specific scenes for more complex logic
        if (x === undefined || y === undefined) {
            // Find a spawn position away from the player
            const spawnDistance = 300;
            let spawnX, spawnY;
            
            do {
                spawnX = Phaser.Math.Between(100, this.physics.world.bounds.width - 100);
                spawnY = Phaser.Math.Between(100, this.physics.world.bounds.height - 100);
            } while (
                Phaser.Math.Distance.Between(spawnX, spawnY, this.penguin.x, this.penguin.y) < spawnDistance
            );
            
            x = spawnX;
            y = spawnY;
        }
        
        // Ensure the enemy is within bounds (but don't add additional random offsets)
        x = Phaser.Math.Clamp(x, 100, this.physics.world.bounds.width - 100);
        y = Phaser.Math.Clamp(y, 100, this.physics.world.bounds.height - 100);
        
        // Create enemy based on type (only basic, ranged, and melee types)
        let enemy;
        
        // Create the appropriate enemy type
        if (type === 'ranged') {
            enemy = new RangedEnemy(this, x, y);
            this.log("ENEMIES", `Spawned ranged enemy at (${x}, ${y})`);
        } else if (type === 'melee') {
            enemy = new MeleeEnemy(this, x, y);
            this.log("ENEMIES", `Spawned melee enemy at (${x}, ${y})`);
        } else {
            // Default to basic enemy
            enemy = new Enemy(this, x, y, { type: 'Basic' });
            this.log("ENEMIES", `Spawned basic enemy at (${x}, ${y})`);
        }
        
        // Apply difficulty scaling ONLY to enemy health, not damage
        if (this.floorLevel > 1) {
            const healthMultiplier = 1 + ((this.floorLevel - 1) * 0.2);
            
            // Scale health with floor level
            enemy.maxHealth = Math.ceil(enemy.maxHealth * healthMultiplier);
            enemy.health = enemy.maxHealth;
            
            this.log("ENEMIES", `Applied difficulty scaling to enemy`, {
                healthMultiplier,
                newHealth: enemy.health
            });
        }
        
        // Add to enemies group
        this.enemies.add(enemy);
        
        return enemy;
    }

    spawnCrate(x, y) {
        // Default implementation - override in specific scenes for more complex logic
        if (x === undefined || y === undefined) {
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
            
            x = spawnX;
            y = spawnY;
        }
        
        const crate = new Crate(this, x, y);
        this.crates.add(crate);
        
        // Add physics properties to the new crate
        crate.body.setCollideWorldBounds(true);
        crate.body.setBounce(0.6);
        crate.body.setDrag(100);
        
        return crate;
    }

    spawnLadder() {
        this.log("ITEMS", "Attempting to spawn ladder");
        
        // Find a valid position on a walkable tile (tile index 9)
        let x, y;
        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 50; // Limit attempts to prevent infinite loops
        
        while (!validPosition && attempts < maxAttempts) {
            // Generate random position
            x = Phaser.Math.Between(100, this.physics.world.bounds.width - 100);
            y = Phaser.Math.Between(100, this.physics.world.bounds.height - 100);
            
            // Check if this position is on a walkable tile (index 9)
            if (this.backgroundLayer) {
                // Convert world coordinates to tile coordinates
                const tileX = Math.floor(x / (this.backgroundLayer.scaleX * this.map.tileWidth));
                const tileY = Math.floor(y / (this.backgroundLayer.scaleY * this.map.tileHeight));
                
                // Get the tile at this position
                const tile = this.backgroundLayer.getTileAt(tileX, tileY);
                
                // Check if it's a walkable tile (index 9)
                if (tile && tile.index === 9) {
                    validPosition = true;
                    this.log("ITEMS", `Ladder spawned on walkable tile at (${x}, ${y}), tile coordinates (${tileX}, ${tileY})`);
                }
            } else {
                // If there's no background layer, just use the random position
                validPosition = true;
                this.log("ITEMS", `No background layer found, ladder spawned at random position (${x}, ${y})`);
            }
            
            attempts++;
        }
        
        if (!validPosition) {
            this.logWarning(`Could not find a walkable tile for ladder after ${maxAttempts} attempts. Using last attempted position.`);
        }
        
        // Spawn the ladder at the determined position
        this.ladder = this.physics.add.sprite(x, y, 'ladder').setScale(2);
        
        // Add overlap with player
        this.physics.add.overlap(this.penguin, this.ladder, this.handleLevelComplete, null, this);
        
        this.log("ITEMS", "Ladder overlap with player configured");
    }

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
            if (this.penguin.takeDamage) {
                this.penguin.takeDamage(damage);
            } else if (this.penguin.health) {
                this.penguin.health -= damage;
                // Show damage number
                this.createDamageNumber(this.penguin.x, this.penguin.y, damage);
            }
        }

        // Check if any enemies are within blast radius
        this.enemies.getChildren().forEach(enemy => {
            const distToEnemy = Phaser.Math.Distance.Between(explosionX, explosionY, enemy.x, enemy.y);
            if (distToEnemy < explosionRadius) {
                const damage = Math.floor(100 * (1 - distToEnemy/explosionRadius));
                if (enemy.takeDamage) {
                    enemy.takeDamage(damage);
                }
            }
        });

        // Check for other crates in explosion radius
        this.crates.getChildren().forEach(otherCrate => {
            if (otherCrate !== crate && otherCrate.active) {
                const distToCrate = Phaser.Math.Distance.Between(explosionX, explosionY, otherCrate.x, otherCrate.y);
                if (distToCrate < explosionRadius) {
                    // Add a small delay to create a chain reaction effect
                    this.time.delayedCall(100, () => {
                        this.handleCrateExplosion(otherCrate);
                    });
                }
            }
        });

        // Check for barrels in explosion radius
        this.barrels.getChildren().forEach(barrel => {
            if (barrel !== crate && barrel.active) {
                const distToBarrel = Phaser.Math.Distance.Between(explosionX, explosionY, barrel.x, barrel.y);
                if (distToBarrel < explosionRadius) {
                    // Add a small delay to create a chain reaction effect
                    this.time.delayedCall(100, () => {
                        this.handleCrateExplosion(barrel);
                    });
                }
            }
        });

        // Trigger the crate explosion effects if it has an explode method
        if (typeof crate.explode === 'function') {
            this.log("ITEMS", "Calling crate.explode()");
            crate.explode();
        } else {
            // If no explode method, just destroy it
            this.logWarning("ITEMS", "No explode method found on crate, destroying it directly");
            crate.destroy();
        }
        
        // Spawn cash with 50% chance
        if (Phaser.Math.Between(0, 1) === 1) {
            this.spawnCash(explosionX, explosionY);
        }
    }

    createExplosion(x, y, radius) {
        // Play explosion sound if available
        if (this.sound.get('explosion')) {
            this.sound.play('explosion', {
                volume: 0.5,
                rate: 0.8 + Math.random() * 0.4
            });
        }
        
        // Apply screen shake
        this.cameras.main.shake(200, 0.01 * (radius / 50));
        
        // Create shockwave effect
        const shockwave = this.add.circle(x, y, 10, 0xffffff, 0.4);
        this.tweens.add({
            targets: shockwave,
            radius: radius * (this.explosionSizeMultiplier || 1),
            alpha: 0,
            duration: 300,
            onComplete: () => shockwave.destroy()
        });
        
        // Create explosion particles
        const particleCount = Math.floor(radius / 2);
        const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 100;
            const distance = Math.random() * (radius / 4);
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 2 + Math.random() * 3;
            
            const particle = this.add.circle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                size,
                color
            );
            
            this.tweens.add({
                targets: particle,
                x: particle.x + Math.cos(angle) * speed,
                y: particle.y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.1,
                duration: 150,
                onComplete: () => particle.destroy()
            });
        }
        
        // Create smoke particles
        for (let i = 0; i < particleCount / 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 50;
            const distance = Math.random() * (radius / 4);
            const size = 3 + Math.random() * 5;
            
            const smoke = this.add.circle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                size,
                0x333333,
                0.7
            );
            
            this.tweens.add({
                targets: smoke,
                x: smoke.x + Math.cos(angle) * speed,
                y: smoke.y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 2 + Math.random(),
                duration: 500 + Math.random() * 500,
                onComplete: () => smoke.destroy()
            });
        }
        
        // Create damage area to affect nearby entities
        const damageRadius = radius * (this.explosionSizeMultiplier || 1);
        const damageAmount = 30 * (this.explosionSizeMultiplier || 1);
        
        // Damage enemies in radius
        this.enemies.getChildren().forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (distance <= damageRadius) {
                const damage = Math.floor(damageAmount * (1 - distance / damageRadius));
                if (enemy.takeDamage) {
                    enemy.takeDamage(damage);
                }
            }
        });
        
        // Damage player if in radius
        const playerDistance = Phaser.Math.Distance.Between(x, y, this.penguin.x, this.penguin.y);
        if (playerDistance <= damageRadius && !this.isSliding && !this.penguin.isExplosionImmune) {
            const damage = Math.floor(damageAmount * 0.5 * (1 - playerDistance / damageRadius));
            this.penguin.takeDamage(damage);
        }
    }

    spawnCash(x, y, amount = 10) {
        // Spawn cash at the given position
        const cash = this.physics.add.sprite(x, y, 'icn_cash').setScale(2);
        cash.amount = amount * (1 + (this.floorLevel * 0.1)); // Scale with floor level
        
        this.cash.add(cash);
        
        // Add simple animation
        this.tweens.add({
            targets: cash,
            y: y - 10,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // Add sparkle effect
        this.createCashSparkleEffect(cash);
        
        return cash;
    }

    createCashSparkleEffect(cash) {
        // Create a timer to add sparkles periodically
        this.time.addEvent({
            delay: 500,
            callback: () => {
                if (!cash || !cash.active) return;
                
                // Create sparkle
                const sparkle = this.add.circle(
                    cash.x + (Math.random() * 20 - 10),
                    cash.y + (Math.random() * 20 - 10),
                    2,
                    0xffffff
                );
                
                // Animate sparkle
                this.tweens.add({
                    targets: sparkle,
                    alpha: 0,
                    scale: 2,
                    duration: 300,
                    onComplete: () => sparkle.destroy()
                });
            },
            repeat: -1
        });
    }

    collectCash(player, cash) {
        // Create collection effect
        this.createCashCollectEffect(cash.x, cash.y);
        
        // Collect cash and update currency
        this.playerCurrency += cash.amount;
        cash.destroy();
        
        // Emit event to GameManager
        this.events.emit('currencyChanged', this.playerCurrency);
    }

    createCashCollectEffect(x, y) {
        // Play collection sound if available
        if (this.sound.get('coin_collect')) {
            this.sound.play('coin_collect', {
                volume: 0.5,
                rate: 0.8 + Math.random() * 0.4
            });
        }
        
        // Create collection particles
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 5 + Math.random() * 10;
            
            const particle = this.add.circle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                2,
                0xffd700
            );
            
            this.tweens.add({
                targets: particle,
                y: particle.y - 30 - Math.random() * 20,
                alpha: 0,
                scale: 2,
                duration: 300 + Math.random() * 200,
                onComplete: () => particle.destroy()
            });
        }
        
        // Create floating text
        const text = this.add.text(x, y, '+$' + Math.floor(this.playerCurrency), {
            fontSize: '16px',
            fontFamily: 'Arial',
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: text,
            y: text.y - 40,
            alpha: 0,
            duration: 1000,
            ease: 'Power1',
            onComplete: () => text.destroy()
        });
    }

    handleBulletEnemyCollision(bullet, enemy) {
        // Handle bullet hitting enemy
        bullet.destroy();
        
        // Create impact effect
        this.createBulletImpactEffect(bullet.x, bullet.y);
        
        // Apply damage to enemy using centralized system
        const damage = bullet.damage || 15;
        this.handleDamage(enemy, damage);
    }

    createBulletImpactEffect(x, y) {
        // Create impact particles
        const particleCount = 8;
        const colors = [0xffffff, 0xffff00, 0xff6600];
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 50;
            const distance = Math.random() * 10;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const particle = this.add.circle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                2,
                color
            );
            
            this.tweens.add({
                targets: particle,
                x: particle.x + Math.cos(angle) * speed,
                y: particle.y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.1,
                duration: 150,
                onComplete: () => particle.destroy()
            });
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
        this.crateMarkers = []; 
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
        this.updateCrateMarkers();
        this.updateLadderMarker();
    }

    updateEnemyMarkers() {
        if (!this.minimap || !this.enemies) return;
        
        // Clear old markers
        this.enemyMarkers.forEach(marker => marker.destroy());
        this.enemyMarkers = [];
        
        // Create new markers for each enemy
        this.enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            
            // Calculate position on minimap
            const x = this.minimap.centerX + ((enemy.x / this.physics.world.bounds.width) - 0.5) * (this.minimap.width * 0.9);
            const y = this.minimap.centerY + ((enemy.y / this.physics.world.bounds.height) - 0.5) * (this.minimap.height * 0.9);
            
            // Create marker
            const marker = this.add.circle(x, y, 2, 0xff0000, 1);
            this.minimapContainer.add(marker);
            this.enemyMarkers.push(marker);
        });
    }

    updateCashMarkers() {
        if (!this.minimap || !this.cash) return;
        
        // Clear old markers
        this.cashMarkers.forEach(marker => marker.destroy());
        this.cashMarkers = [];
        
        // Create new markers for each cash item
        this.cash.getChildren().forEach(cash => {
            if (!cash.active) return;
            
            // Calculate position on minimap
            const x = this.minimap.centerX + ((cash.x / this.physics.world.bounds.width) - 0.5) * (this.minimap.width * 0.9);
            const y = this.minimap.centerY + ((cash.y / this.physics.world.bounds.height) - 0.5) * (this.minimap.height * 0.9);
            
            // Create marker
            const marker = this.add.circle(x, y, 2, 0xffd700, 1);
            this.minimapContainer.add(marker);
            this.cashMarkers.push(marker);
        });
    }

    updateCrateMarkers() {
        if (!this.minimap || !this.crates) return;
        
        // Clear old markers
        this.crateMarkers.forEach(marker => marker.destroy());
        this.crateMarkers = [];
        
        // Create new markers for each crate
        this.crates.getChildren().forEach(crate => {
            if (!crate.active) return;
            
            // Calculate position on minimap
            const x = this.minimap.centerX + ((crate.x / this.physics.world.bounds.width) - 0.5) * (this.minimap.width * 0.9);
            const y = this.minimap.centerY + ((crate.y / this.physics.world.bounds.height) - 0.5) * (this.minimap.height * 0.9);
            
            // Create marker
            const marker = this.add.circle(x, y, 2, 0x8B4513, 1); // Brown color for crates
            this.minimapContainer.add(marker);
            this.crateMarkers.push(marker);
        });
    }

    updateLadderMarker() {
        if (!this.minimap || !this.ladder) return;
        
        // Clear old marker
        if (this.ladderMarker) {
            this.ladderMarker.destroy();
            this.ladderMarker = null;
        }
        
        // Calculate position on minimap
        const x = this.minimap.centerX + ((this.ladder.x / this.physics.world.bounds.width) - 0.5) * (this.minimap.width * 0.9);
        const y = this.minimap.centerY + ((this.ladder.y / this.physics.world.bounds.height) - 0.5) * (this.minimap.height * 0.9);
        
        // Create marker
        this.ladderMarker = this.add.circle(x, y, 3, 0x00ff00, 1); // Green for ladder
        this.minimapContainer.add(this.ladderMarker);
    }

    initializePerkSystem() {
        // Create perk manager
        this.perkManager = new PerkManager(this, this.penguin);
        
        // Check if there's a selected perk in the game state
        const gameState = this.registry.get('gameState') || {};
        if (gameState.selectedPerk) {
            this.log("SCENE", `Adding selected perk: ${gameState.selectedPerk.name}`);
            
            // Create a new Perk instance from the selected perk data
            const selectedPerk = new Perk(gameState.selectedPerk);
            
            // Add the perk to the manager
            this.perkManager.addPerk(selectedPerk);
            
            // Clear the selected perk from the game state
            delete gameState.selectedPerk;
            this.registry.set('gameState', gameState);
        }
        
        // Create the perk UI
        this.createPerkUI();
        
        // Update the perk icons
        this.updatePerkIcons(this.perkManager.activePerks);
    }

    createPerkUI() {
        // Get screen dimensions
        const width = this.cameras.main.width;
        
        // Create a container for the perk UI
        this.perkContainer = this.add.container(width - 20, 100);
        
        // Perk UI background
        const perkBg = this.add.rectangle(0, 0, 70, 300, 0x000000, 0.7)
            .setOrigin(1, 0)
            .setStrokeStyle(2, 0xffffff);
        
        // Perk title
        const perkTitle = this.add.text(-35, -25, 'PERKS', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5, 0.5);
        
        // Add components to container
        this.perkContainer.add(perkBg);
        this.perkContainer.add(perkTitle);
        
        // Create empty array for perk icons
        this.perkIcons = [];
        
        // Add to UI container
        this.uiContainer.add(this.perkContainer);
        
        // Initialize with empty perks
        this.updatePerkIcons([]);
    }
    
    updatePerkIcons(perks) {
        // Clear existing perk icons
        this.perkIcons.forEach(icon => icon.destroy());
        this.perkIcons = [];
        
        // Add new perk icons
        perks.forEach((perk, index) => {
            // Create perk icon using the spritesheet
            const icon = this.add.sprite(-35, 20 + (index * 60), 'perk_icons', this.perkIconFrame(perk.icon))
                .setScale(1.5)
                .setInteractive({ useHandCursor: true });
            
            // Add tooltip on hover
            icon.on('pointerover', () => {
                this.showPerkTooltip(perk, icon.x - 100, icon.y);
            });
            
            icon.on('pointerout', () => {
                if (this.perkTooltip) {
                    this.perkTooltip.destroy();
                    this.perkTooltip = null;
                }
            });
            
            // Add to container and track
            this.perkContainer.add(icon);
            this.perkIcons.push(icon);
            
            // Add rarity border
            const border = this.add.rectangle(-35, 20 + (index * 60), 50, 50, this.getRarityColor(perk.rarity))
                .setStrokeStyle(2, this.getRarityColor(perk.rarity))
                .setFillStyle(0, 0);
            this.perkContainer.add(border);
            this.perkIcons.push(border);
        });
    }
    
    // Helper function to get the frame number for a perk icon
    perkIconFrame(iconName) {
        const frameMap = {
            'default_perk_icon': 0,
            'perk_rapid_fire': 1,
            'perk_heavy_bullets': 2,
            'perk_explosive_rounds': 3,
            'perk_quick_slide': 4,
            'perk_speed_boost': 5,
            'perk_vitality': 6,
            'perk_vampirism': 7,
            'perk_double_cash': 8,
            'perk_barrel_master': 9,
            'perk_enemy_weakener': 10
        };
        
        return frameMap[iconName] || 0; // Default to frame 0 if not found
    }

    showPerkTooltip(perk, x, y) {
        // Remove existing tooltip if any
        if (this.perkTooltip) {
            this.perkTooltip.destroy();
        }
        
        // Create tooltip container
        this.perkTooltip = this.add.container(x, y);
        
        // Tooltip background
        const tooltipBg = this.add.rectangle(0, 0, 200, 120, 0x000000, 0.9)
            .setStrokeStyle(2, this.getRarityColor(perk.rarity))
            .setOrigin(0, 0);
        
        // Perk name
        const nameText = this.add.text(10, 10, perk.name, {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff',
            fontWeight: 'bold'
        });
        
        // Perk rarity
        const rarityText = this.add.text(10, 35, perk.rarity.toUpperCase(), {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: this.getRarityColor(perk.rarity, true)
        });
        
        // Perk description
        const descText = this.add.text(10, 60, perk.description, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#cccccc',
            wordWrap: { width: 180 }
        });
        
        // Add components to tooltip
        this.perkTooltip.add(tooltipBg);
        this.perkTooltip.add(nameText);
        this.perkTooltip.add(rarityText);
        this.perkTooltip.add(descText);
        
        // Make sure tooltip is on top
        this.perkTooltip.setDepth(1100);
        
        // Add to UI container
        this.uiContainer.add(this.perkTooltip);
    }

    getRarityColor(rarity, isText = false) {
        const colors = {
            common: isText ? '#ffffff' : 0xffffff,
            uncommon: isText ? '#00ff00' : 0x00ff00,
            rare: isText ? '#0000ff' : 0x0000ff,
            epic: isText ? '#a335ee' : 0xa335ee,
            legendary: isText ? '#ff8000' : 0xff8000
        };
        
        return colors[rarity] || (isText ? '#ffffff' : 0xffffff);
    }

    createUI() {
        // Create a container for all UI elements with high depth to ensure it's on top
        this.uiContainer = this.add.container(0, 0).setDepth(1000);
        
        // Create individual UI components
        this.createHealthBar();
        this.createAmmoDisplay();
        this.createSlideCooldownIndicator();
        this.createPerkUI();
        
        // Make sure UI is fixed to camera
        this.uiContainer.setScrollFactor(0);
    }

    createHealthBar() {
        // Create a container for the health bar
        const healthBarContainer = this.add.container(20, 20);
        
        // Health bar background
        const healthBarBg = this.add.rectangle(0, 0, 200, 30, 0x000000)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0xffffff);
        
        // Health bar fill
        this.healthBarFill = this.add.rectangle(2, 2, 196, 26, 0xff0000)
            .setOrigin(0, 0);
        
        // Health text
        this.healthText = this.add.text(100, 15, '100/100', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Add components to container
        healthBarContainer.add(healthBarBg);
        healthBarContainer.add(this.healthBarFill);
        healthBarContainer.add(this.healthText);
        
        // Add to UI container
        this.uiContainer.add(healthBarContainer);
    }

    createAmmoDisplay() {
        // Get screen dimensions
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create a container for the ammo display
        const ammoContainer = this.add.container(width - 20, height - 20);
        
        // Ammo background
        const ammoBg = this.add.rectangle(0, 0, 120, 40, 0x000000, 0.7)
            .setOrigin(1, 1)
            .setStrokeStyle(2, 0xffffff);
        
        // Bullet icon
        const bulletIcon = this.add.sprite(-100, -20, 'icn_bullet')
            .setOrigin(0, 0.5)
            .setScale(2);
        
        // Ammo text
        this.ammoText = this.add.text(-50, -20, '30/30', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0, 0.5);
        
        // Add components to container
        ammoContainer.add(ammoBg);
        ammoContainer.add(bulletIcon);
        ammoContainer.add(this.ammoText);
        
        // Add to UI container
        this.uiContainer.add(ammoContainer);
    }

    createSlideCooldownIndicator() {
        // Get screen dimensions
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create a container for the slide cooldown
        const slideCooldownBar = this.add.container(width / 2, height - 20);
        
        // Slide cooldown background
        const slideCooldownBg = this.add.rectangle(0, 0, 200, 15, 0x000000, 0.7)
            .setOrigin(0.5, 1)
            .setStrokeStyle(2, 0xffffff);
        
        // Slide cooldown fill
        this.slideCooldownFill = this.add.rectangle(-99, -14, 198, 13, 0x00ffff)
            .setOrigin(0, 0);
        
        // Slide text
        const slideText = this.add.text(0, -25, 'SLIDE', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5, 0.5);
        
        // Add components to container
        slideCooldownBar.add(slideCooldownBg);
        slideCooldownBar.add(this.slideCooldownFill);
        slideCooldownBar.add(slideText);
        
        // Add to UI container
        this.uiContainer.add(slideCooldownBar);
    }

    updateSlideCooldown() {
        if (!this.slideCooldownFill) return;
        
        // Increment the slide timer if it's less than the cooldown
        if (this.slideTimer < this.slideCooldown) {
            this.slideTimer += this.game.loop.delta;
        }
        
        // Calculate cooldown percentage (0 to 1)
        const cooldownPercent = Math.min(this.slideTimer / this.slideCooldown, 1);
        this.slideCooldownFill.width = 198 * cooldownPercent;
        
        // Change color based on cooldown status
        if (cooldownPercent >= 1) {
            // Ready to use - bright cyan
            this.slideCooldownFill.fillColor = 0x00ffff;
        } else if (cooldownPercent >= 0.5) {
            // Half ready - light blue
            this.slideCooldownFill.fillColor = 0x0088ff;
        } else {
            // Not ready - darker blue
            this.slideCooldownFill.fillColor = 0x0044aa;
        }
        
        // Add a subtle pulsing effect when ready
        if (cooldownPercent >= 1 && !this.slidePulseActive) {
            this.slidePulseActive = true;
            this.tweens.add({
                targets: this.slideCooldownFill,
                alpha: { from: 1, to: 0.8 },
                duration: 800,
                yoyo: true,
                repeat: -1
            });
        } else if (cooldownPercent < 1 && this.slidePulseActive) {
            // Stop pulsing when not ready
            this.slidePulseActive = false;
            this.tweens.killTweensOf(this.slideCooldownFill);
            this.slideCooldownFill.alpha = 1;
        }
    }

    updateHealthBar() {
        if (!this.healthBarFill || !this.penguin) return;
        
        // Calculate health percentage (ensure it's not negative)
        const healthPercent = Math.max(0, this.penguin.health) / this.penguin.maxHealth;
        
        // Update health bar width
        this.healthBarFill.width = 196 * healthPercent;
        
        // Update health text
        this.healthText.setText(`${Math.max(0, Math.ceil(this.penguin.health))}/${this.penguin.maxHealth}`);
    }

    updateAmmoDisplay() {
        if (!this.ammoText || !this.penguin.gun) return;
        
        // Update ammo text
        this.ammoText.setText(`${this.penguin.gun.currentAmmo}/${this.penguin.gun.maxAmmo}`);
    }

    update() {
        // First check if the scene is being destroyed or reset
        if (this.isBeingReset || this.isDestroyed) {
            return;
        }
        
        try {
            // Skip updates if game is frozen
            if (this.isGameFrozen) return;
            
            // Update penguin state machine if it exists and penguin is valid
            if (this.penguin && this.penguin.stateMachine) {
                // CRITICAL: Verify penguin state is valid
                this.verifyPenguinState();
                
                // Update state machine
                this.penguin.stateMachine.update();
            }
            
            // Move gun with penguin if it exists
            this.updateWeapon();
            
            // Update all enemies
            if (this.enemies && this.enemies.getChildren) {
                this.enemies.getChildren().forEach(enemy => {
                    enemy.update(this.penguin, this.time.now);
                });
            }
            
            // Update slide cooldown UI
            if (this.slideCooldownFill) {
                this.updateSlideCooldown();
            }
            
            // Update minimap if it exists
            if (this.minimap && this.playerMarker && this.penguin) {
                this.updateMinimap();
            }
            
            // Check for player death
            if (this.penguin && this.penguin.health <= 0 && !this.isGameFrozen) {
                this.log("PLAYER", "Player health reached zero, triggering death sequence");
                this.checkPlayerDeath();
            }
            
            // Update perk system
            if (this.perkManager) {
                this.perkManager.update();
                if (this.perkContainer) {
                    this.updatePerkIcons(this.perkManager.activePerks);
                }
            }
        } catch (error) {
            this.logError("Error in update loop", error);
        }
    }
    
    // New method to verify and fix penguin state if needed
    verifyPenguinState() {
        // Skip if penguin doesn't exist
        if (!this.penguin) return;
        
        // Check if penguin is in a valid state
        const needsFixing = !this.penguin.active || !this.penguin.visible || 
                           (this.penguin.body && !this.penguin.body.enable);
        
        if (needsFixing) {
            this.log("PLAYER", "Fixing invalid penguin state", {
                wasActive: this.penguin.active,
                wasVisible: this.penguin.visible,
                wasBodyEnabled: this.penguin.body ? this.penguin.body.enable : "no body"
            });
            
            // Fix the penguin state
            this.penguin.active = true;
            this.penguin.visible = true;
            
            // Keep alpha reasonable
            if (this.penguin.alpha < 0.5) {
                this.penguin.alpha = 1;
            }
            
            // Fix physics body
            if (this.penguin.body) {
                this.penguin.body.enable = true;
            }
        }
    }

    handlePlayerMovement() {
        if (!this.penguin || this.isGameFrozen) return;
        
        // Get velocity from input
        const velocity = this.calculateVelocity();
        
        // Apply velocity to player if not sliding
        if (!this.isSliding) {
            this.penguin.body.setVelocity(velocity.x, velocity.y);
        }
        
        // Update player animation based on movement
        if (this.penguin.body.velocity.x !== 0 || this.penguin.body.velocity.y !== 0) {
            // Flip sprite based on horizontal movement
            if (this.penguin.body.velocity.x < 0) {
                this.penguin.flipX = true;
            } else if (this.penguin.body.velocity.x > 0) {
                this.penguin.flipX = false;
            }
            
            // Play walk animation (unless sliding)
            if (!this.isSliding) {
                this.penguin.play('walk_right', true);
            } else {
                // Play slide animation if we have one, otherwise use walk
                if (this.anims.exists('penguin_slide')) {
                    this.penguin.play('penguin_slide', true);
                } else {
                    this.penguin.play('walk_right', true);
                }
            }
        } else {
            // Play idle animation when not moving
            this.penguin.play('idle', true);
        }
        
        // IMPORTANT: Do NOT rotate the player sprite unless sliding
        // The penguin should only rotate slightly during sliding
        if (!this.isSliding) {
            this.penguin.rotation = 0;
        }
    }

    calculateVelocity() {
        // Define a zero velocity object
        const velocity = { x: 0, y: 0 };
        
        // If game is frozen or penguin is invalid, don't allow movement
        if (this.isGameFrozen || !this.penguin || !this.penguin.active) {
            return velocity;
        }
        
        // If sliding, don't change velocity
        if (this.isSliding) {
            return velocity;
        }
        
        // Make sure keys are available
        if (!this.keys) {
            this.logWarning("Input keys not available in calculateVelocity");
            return velocity;
        }
        
        // Check if any movement keys are pressed
        const inputActive = this.keys.left.isDown || this.keys.right.isDown || 
                           this.keys.up.isDown || this.keys.down.isDown;
        
        // Calculate velocity based on input
        if (this.keys.left.isDown) {
            velocity.x = -this.moveSpeed;
        } else if (this.keys.right.isDown) {
            velocity.x = this.moveSpeed;
        }
        
        if (this.keys.up.isDown) {
            velocity.y = -this.moveSpeed;
        } else if (this.keys.down.isDown) {
            velocity.y = this.moveSpeed;
        }
        
        // Normalize diagonal movement
        if (velocity.x !== 0 && velocity.y !== 0) {
            const normalizedVelocity = new Phaser.Math.Vector2(velocity.x, velocity.y).normalize();
            velocity.x = normalizedVelocity.x * this.moveSpeed;
            velocity.y = normalizedVelocity.y * this.moveSpeed;
        }
        
        // If we're calculating non-zero velocity, make sure penguin can move
        if (velocity.x !== 0 || velocity.y !== 0) {
            // Ensure penguin is in a valid state to move
            if (this.penguin && this.penguin.body) {
                this.penguin.body.enable = true;
            }
        }
        
        return velocity;
    }

    updateWeapon() {
        if (!this.penguin || !this.penguin.gun) return;
        
        // The Gun class's update method already handles positioning and rotation
        // Just pass the current time to update firing logic
        this.penguin.gun.update(this.time.now);
    }

    checkPlayerDeath() {
        if (!this.penguin) return;
        
        if (this.penguin.health <= 0 && !this.isGameFrozen) {
            // Ensure health is exactly 0 for visual consistency
            this.penguin.health = 0;
            
            // Update health bar one last time to show 0 health
            this.updateHealthBar();
            
            // Add a small delay before freezing the game to allow health bar to update
            this.time.delayedCall(100, () => {
                this.createDeathEffect();
                this.isGameFrozen = true;
                this.physics.pause();
                
                // Show death screen after a short delay to let particles play
                this.time.delayedCall(800, () => {
                    this.showDeathScreen();
                });
            });
        }
    }

    createDeathEffect() {
        this.penguin.setVisible(false);

        // Play explosion sound
        if (this.sound.get('death')) {
            this.sound.play('death', {
                volume: 1,
                rate: 1 + Math.random() * 0.5  // Random pitch between 1.0 and 1.5
            });
        }

        // Create explosion effect
        const particleCount = 30;
        
        // Create blood splatter effect
        for (let ring = 0; ring < 3; ring++) {
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
    }

    showDeathScreen() {
        const centerX = this.game.config.width / 2;
        const centerY = this.game.config.height / 2;

        // Create dark overlay with fade in
        const overlay = this.add.rectangle(centerX, centerY, this.game.config.width, this.game.config.height, 0x000000, 0);
        overlay.setDepth(10);
        overlay.setScrollFactor(0); // Fix to camera
        this.tweens.add({
            targets: overlay,
            alpha: 0.97,
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

        // Create main menu button
        const mainMenuButton = this.add.text(centerX, centerY + 150, 'RETURN TO MAIN MENU', {
            fontSize: '24px',
            fontFamily: 'Arial',
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
            targets: mainMenuButton,
            scale: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });

        // Fade in button
        this.tweens.add({
            targets: mainMenuButton,
            alpha: 1,
            duration: 500,
            delay: 800
        });

        // Go to main menu on button click
        mainMenuButton.on('pointerdown', () => {
            // Stop all active scenes properly
            const activeScenes = this.scene.manager.getScenes(true);
            activeScenes.forEach(scene => {
                if (scene.scene.key !== 'Menu') {
                    scene.scene.stop();
                }
            });
            
            // Reset game registry data
            this.registry.reset();
            
            // Return to menu scene
            this.scene.start('Menu');
        });

        // Enhanced hover effects for main menu button
        mainMenuButton.on('pointerover', () => {
            mainMenuButton.setBackgroundColor('#aa0000');
            this.game.canvas.style.cursor = 'pointer';
        });
        
        mainMenuButton.on('pointerout', () => {
            mainMenuButton.setBackgroundColor('#880000');
            this.game.canvas.style.cursor = 'default';
        });
    }

    getHighScore() {
        return localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 1;
    }
    
    setHighScore(newScore) {
        localStorage.setItem('highScore', newScore);
    }

    handlePlayerDeath() {
        // Emit event to GameManager
        this.events.emit('playerDeath');
    }

    handleLevelComplete() {
        // Emit event to GameManager
        this.events.emit('levelComplete');
    }

    // Add ocean background from Map scene
    createOceanBackground() {
        // Create a container fixed to the camera
        this.oceanContainer = this.add.container(0, 0);
        this.oceanContainer.setDepth(-100);
        this.oceanContainer.setScrollFactor(0);
        
        // Create the ocean gradient with extra padding to prevent any black edges
        this.oceanGradient = this.add.graphics();
        this.oceanContainer.add(this.oceanGradient);
        
        // Get current camera dimensions
        const { width, height } = this.cameras.main;
        
        // Draw the initial gradient with padding
        this.updateOceanGradient(width, height);
        
        // Add a resize listener to update the ocean background when the camera/window changes
        this.scale.on('resize', () => {
            const newWidth = this.cameras.main.width;
            const newHeight = this.cameras.main.height;
            this.updateOceanGradient(newWidth, newHeight);
        });
        
        // Listen for camera changes and update if needed
        this.cameras.main.on('cameraresize', (camera) => {
            this.updateOceanGradient(camera.width, camera.height);
        });
        
        // Initialize whitecap pool container
        this.whitecapPool = this.add.group();
        
        // Create whitecaps after initializing the pool
        this.createWhitecaps();
    }
    
    updateOceanGradient(width, height) {
        if (!this.oceanGradient) return;
        
        this.oceanGradient.clear();
        
        // Create a gradient from dark blue to light blue
        const startColor = 0x0a3b76;  // Dark blue
        const endColor = 0x00a9ff;    // Light blue
        
        // Add extra padding to the gradient to ensure no black shows at edges
        const padding = 100; // Extra pixels to draw beyond the visible area
        
        this.oceanGradient.fillGradientStyle(startColor, startColor, endColor, endColor, 1);
        this.oceanGradient.fillRect(-padding, -padding, width + (padding * 2), height + (padding * 2));
    }
    
    createWhitecaps() {
        // Create a container for all whitecaps
        this.whitecapsContainer = this.add.container(0, 0);
        
        // Add the whitecaps container to the ocean container
        this.oceanContainer.add(this.whitecapsContainer);
        
        // Create a pool of whitecaps for better performance
        this.whitecapPool = [];
        for (let i = 0; i < 20; i++) {
            const whitecap = this.createWhitecapShape(0, 0);
            whitecap.setVisible(false);
            this.whitecapPool.push(whitecap);
            this.whitecapsContainer.add(whitecap);
        }
        
        // Start spawning whitecaps at different rates
        this.time.addEvent({
            delay: 800, // Spawn a new whitecap every 800ms
            callback: this.spawnWhitecap,
            callbackScope: this,
            repeat: -1
        });
    }
    
    spawnWhitecap() {
        // Get a whitecap from the pool
        const whitecap = this.getWhitecapFromPool();
        if (!whitecap) return;
        
        // Position it randomly on screen
        const camera = this.cameras.main;
        const x = Phaser.Math.Between(0, this.game.config.width);
        const y = Phaser.Math.Between(0, this.game.config.height);
        
        // Reset the whitecap
        whitecap.setPosition(x, y);
        whitecap.setVisible(true);
        whitecap.setAlpha(0);
        whitecap.setScale(0.5);
        
        // Animate it
        this.tweens.add({
            targets: whitecap,
            alpha: { from: 0, to: 0.7 },
            scale: { from: 0.5, to: 1 },
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.tweens.add({
                    targets: whitecap,
                    alpha: { from: 0.7, to: 0 },
                    scale: { from: 1, to: 1.5 },
                    duration: 1000,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        whitecap.setVisible(false);
                    }
                });
            }
        });
    }
    
    getWhitecapFromPool() {
        // Find an invisible whitecap in the pool
        for (let i = 0; i < this.whitecapPool.length; i++) {
            if (!this.whitecapPool[i].visible) {
                return this.whitecapPool[i];
            }
        }
        return null;
    }
    
    createWhitecapShape(x, y) {
        // Create a whitecap shape (a small white circle)
        const whitecap = this.add.circle(x, y, 5, 0xFFFFFF, 0.7);
        return whitecap;
    }
    
    addWaterSparkle() {
        if (!this.oceanContainer) return;
        
        // Add a random water sparkle
        const x = Phaser.Math.Between(0, this.game.config.width);
        const y = Phaser.Math.Between(0, this.game.config.height);
        
        const sparkle = this.add.circle(x, y, 1, 0xFFFFFF, 0.8);
        
        // Add the sparkle to the ocean container
        this.oceanContainer.add(sparkle);
        
        // Animate the sparkle
        this.tweens.add({
            targets: sparkle,
            alpha: { from: 0.8, to: 0 },
            scale: { from: 1, to: 2 },
            duration: 1000,
            ease: 'Sine.easeOut',
            onComplete: () => {
                sparkle.destroy();
            }
        });
    }

    // Add a utility function to create damage number popups
    createDamageNumber(x, y, amount, isHealing = false) {
        // Choose color based on whether it's damage or healing
        const color = isHealing ? '#00ff00' : '#ff0000';
        const prefix = isHealing ? '+' : '-';
        
        // Create text object
        const damageText = this.add.text(x, y - 20, prefix + amount, {
            fontFamily: 'Arial',
            fontSize: '20px',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Set depth to ensure it's visible above other elements
        damageText.setDepth(1000);
        
        // Animate the text
        this.tweens.add({
            targets: damageText,
            y: damageText.y - 50, // Float upward
            alpha: 0,
            scale: 1.5,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                damageText.destroy();
            }
        });
    }

    // Centralized damage handling system
    handleDamage(target, amount, isHealing = false) {
        // Don't process if target is invalid or already dead
        if (!target || (target.health <= 0 && !isHealing)) return;
        
        // For player, don't apply damage if already invincible
        if (!isHealing && target === this.penguin && target.isInvincible) {
            this.log("PHYSICS", `Damage prevented due to player invincibility`);
            return;
        }
        
        // Apply damage/healing
        const oldHealth = target.health;
        
        if (isHealing) {
            target.health = Math.min(target.health + amount, target.maxHealth);
            this.log("PHYSICS", `Healing applied`, {
                target: target === this.penguin ? "player" : "enemy",
                amount,
                oldHealth,
                newHealth: target.health
            });
        } else {
            target.health -= amount;
            // Ensure health doesn't go below 0
            if (target.health < 0) target.health = 0;
            
            this.log("PHYSICS", `Damage applied`, {
                target: target === this.penguin ? "player" : "enemy",
                amount,
                oldHealth,
                newHealth: target.health
            });
        }
        
        // Show damage/healing number
        this.createDamageNumber(
            target.x, 
            target.y, 
            amount,
            isHealing
        );
        
        // Visual feedback
        if (!isHealing) {
            target.setTint(0xff0000);
            this.time.delayedCall(100, () => {
                if (target && target.active) {
                    target.clearTint();
                }
            });
            
            // Play hit sound
            this.sound.play('hit', {
                volume: 0.4,
                rate: isHealing ? 1.2 : (0.8 + Math.random() * 0.4)
            });
        }
        
        // Handle player specific behavior - CRITICAL section for penguin functionality
        if (target === this.penguin && !isHealing) {
            // CRITICAL: Double check the penguin's properties after damage
            this.penguin.active = true;
            this.penguin.visible = true;
            
            // CRITICAL: Make sure physics body is enabled and working
            if (this.penguin.body) {
                this.penguin.body.enable = true;
                
                // Reset any velocity issues
                const velocity = this.calculateVelocity();
                if (velocity.x !== 0 || velocity.y !== 0) {
                    this.penguin.body.setVelocity(velocity.x, velocity.y);
                } else {
                    // If no keys pressed, stop the penguin
                    this.penguin.body.setVelocity(0, 0);
                }
            }
            
            // For player only: make invincible after taking damage
            // This is different from enemy behavior
            this.makePlayerInvincible();
            
            // Update health bar
            this.updateHealthBar();
            
            // Log player state for debugging
            this.log("PLAYER", "Player state after damage", {
                health: this.penguin.health,
                active: this.penguin.active,
                visible: this.penguin.visible,
                bodyEnabled: this.penguin.body ? this.penguin.body.enable : "no body",
                isInvincible: this.penguin.isInvincible
            });
        }
        
        // Handle death if health reaches 0
        if (target.health <= 0) {
            if (target === this.penguin) {
                // Player death handling through state machine
                if (this.penguin.stateMachine) {
                    this.log("PLAYER", "Player died, transitioning to dead state");
                    this.penguin.stateMachine.transition('dead');
                }
            } else if (typeof target.die === 'function') {
                // Enemy death handling through die method
                this.log("ENEMIES", "Enemy died, calling die() method");
                target.die();
            }
        }
    }

    // Helper method for healing
    healTarget(target, amount) {
        this.handleDamage(target, amount, true);
    }

    // Add this new method to reset the scene state
    resetScene() {
        this.log("LIFECYCLE", "Starting reset of scene:", this.scene.key);
        
        try {
            // Set isBeingReset flag to prevent updates
            this.isBeingReset = true;
            
            // Kill all tweens
            this.tweens.killAll();
            this.log("LIFECYCLE", "Killed all tweens");
            
            // Remove all time events
            this.time.removeAllEvents();
            this.log("LIFECYCLE", "Removed all time events");
            
            // Stop all sounds
            this.sound.stopAll();
            this.log("LIFECYCLE", "Stopped all sounds");
            
            // Clean up penguin invincibility effects if they exist
            if (this.penguin) {
                // Remove invincibility timer
                if (this.penguin.invincibilityTimer) {
                    this.penguin.invincibilityTimer.remove();
                    this.penguin.invincibilityTimer = null;
                }
                
                // Remove flash effect
                if (this.penguin.invincibilityFlash) {
                    this.penguin.invincibilityFlash.remove();
                    this.penguin.invincibilityFlash = null;
                }
                
                // Remove overlay
                if (this.penguin.invincibilityOverlay) {
                    this.penguin.invincibilityOverlay.destroy();
                    this.penguin.invincibilityOverlay = null;
                }
                
                // Reset invincibility flag
                this.penguin.isInvincible = false;
                
                // Reset penguin's alpha
                this.penguin.setAlpha(1);
                
                // Reset active state
                this.penguin.active = true;
            }
            
            // Start game object cleanup
            this.log("LIFECYCLE", "Starting game object cleanup");
            
            // Clear physics groups
            this.safelyDestroyGameObjects();
            
            // Reset game state flags
            this.isGameFrozen = false;
            this.isSliding = false;
            this.slideTimer = 0;
            this.isBeingReset = false;
            
            this.log("LIFECYCLE", "Reset game state flags");
            
            // Reset input system
            this.safelyResetInput();
            this.log("LIFECYCLE", "Resetting input");
            
            // Reset physics
            this.safelyResetPhysics();
            this.log("LIFECYCLE", "Resetting physics");
            
            this.log("LIFECYCLE", "Reset complete for scene:", this.scene.key);
        } catch (error) {
            this.logError("Error during scene reset:", error);
        }
    }

    // New helper methods for safer cleanup
    safelyDestroyGameObjects() {
        // Safely destroy groups
        const groups = [this.enemies, this.crates, this.barrels, this.cash];
        groups.forEach(group => {
            if (group) {
                try {
                    // First try to destroy all children individually
                    if (group.children && group.children.entries) {
                        group.children.entries.forEach(child => {
                            if (child && child.active) {
                                if (typeof child.die === 'function') {
                                    try { child.die(); } catch (e) { this.logWarning('Error in die():', e); }
                                }
                                if (typeof child.destroy === 'function') {
                                    try { child.destroy(); } catch (e) { this.logWarning('Error destroying child:', e); }
                                }
                            }
                        });
                    }
                    
                    // Then try to clear the group
                    if (typeof group.clear === 'function') {
                        try {
                            group.clear(true, true);
                        } catch (e) {
                            this.logWarning('Error clearing group:', e);
                        }
                    }
                    
                    // Finally destroy the group itself
                    if (typeof group.destroy === 'function') {
                        try {
                            group.destroy(true, true);
                        } catch (e) {
                            this.logWarning('Error destroying group:', e);
                        }
                    }
                } catch (e) {
                    this.logWarning('Error in group cleanup:', e);
                }
            }
        });
        
        // Reset references to groups
        this.enemies = null;
        this.crates = null;
        this.barrels = null;
        this.cash = null;

        // Clean up player and related objects
        if (this.penguin) {
            try {
                if (this.penguin.gun) {
                    if (this.penguin.gun.bullets) {
                        try {
                            if (typeof this.penguin.gun.bullets.clear === 'function') {
                                this.penguin.gun.bullets.clear(true, true);
                            }
                            if (typeof this.penguin.gun.bullets.destroy === 'function') {
                                this.penguin.gun.bullets.destroy(true, true);
                            }
                        } catch (e) {
                            this.logWarning('Error cleaning up bullets:', e);
                        }
                    }
                    try {
                        this.penguin.gun.destroy();
                    } catch (e) {
                        this.logWarning('Error destroying gun:', e);
                    }
                }
                
                if (this.penguin.stateMachine) {
                    try {
                        // Clean up state machine
                        Object.values(this.penguin.stateMachine.states).forEach(state => {
                            if (state && typeof state.exit === 'function') {
                                state.exit();
                            }
                        });
                    } catch (e) {
                        this.logWarning('Error cleaning up state machine:', e);
                    }
                    this.penguin.stateMachine = null;
                }
                
                if (this.penguin.invincibilityTimer) {
                    try {
                        this.penguin.invincibilityTimer.remove();
                    } catch (e) {
                        this.logWarning('Error removing invincibility timer:', e);
                    }
                }
                
                if (this.penguin.invincibilityFlash) {
                    try {
                        this.penguin.invincibilityFlash.remove();
                    } catch (e) {
                        this.logWarning('Error removing invincibility flash:', e);
                    }
                }
                
                try {
                    this.penguin.destroy();
                } catch (e) {
                    this.logWarning('Error destroying penguin:', e);
                }
            } catch (e) {
                this.logWarning('Error in penguin cleanup:', e);
            }
            this.penguin = null;
        }

        // Clean up UI elements
        if (this.uiContainer) {
            try {
                this.uiContainer.destroy(true);
            } catch (e) {
                this.logWarning('Error destroying UI container:', e);
            }
            this.uiContainer = null;
        }

        // Clean up minimap
        if (this.minimapContainer) {
            try {
                this.minimapContainer.destroy(true);
            } catch (e) {
                this.logWarning('Error destroying minimap container:', e);
            }
            this.minimapContainer = null;
        }

        // Clean up ocean background
        if (this.oceanContainer) {
            try {
                this.oceanContainer.destroy(true);
            } catch (e) {
                this.logWarning('Error destroying ocean container:', e);
            }
            this.oceanContainer = null;
        }

        // Clean up map layers
        if (this.map) {
            try {
                if (this.map.layers) {
                    this.map.layers.forEach(layer => {
                        if (layer && layer.tilemapLayer) {
                            layer.tilemapLayer.destroy();
                        }
                    });
                }
                this.map.destroy();
            } catch (e) {
                this.logWarning('Error destroying map:', e);
            }
            this.map = null;
        }

        // Clean up specific layers
        ['backgroundLayer', 'buildingsLayer', 'collisionLayer'].forEach(layerName => {
            if (this[layerName]) {
                try {
                    this[layerName].destroy();
                } catch (e) {
                    this.logWarning(`Error destroying ${layerName}:`, e);
                }
                this[layerName] = null;
            }
        });
        
        // Clear any remaining game objects
        try {
            if (this.children) {
                this.children.removeAll(true);
            }
        } catch (e) {
            this.logWarning('Error removing children:', e);
        }
    }

    safelyResetInput() {
        try {
            if (this.input) {
                // Remove all input listeners
                this.input.off('pointerdown');
                this.input.off('pointerup');
                
                // Shutdown keyboard
                if (this.input.keyboard) {
                    this.input.keyboard.shutdown();
                }
                
                // Clean up key objects
                if (this.keys) {
                    Object.values(this.keys).forEach(key => {
                        if (key && typeof key.destroy === 'function') {
                            key.destroy();
                        }
                    });
                    this.keys = null;
                }
            }
        } catch (e) {
            this.logWarning('Error resetting input:', e);
        }
    }

    safelyResetPhysics() {
        try {
            if (this.physics && this.physics.world) {
                // Destroy all colliders
                if (this.physics.world.colliders) {
                    this.physics.world.colliders.destroy();
                }
                
                // Clear all bodies
                if (this.physics.world.bodies) {
                    this.physics.world.bodies.clear();
                }
            }
        } catch (e) {
            this.logWarning('Error resetting physics:', e);
        }
    }

    // Add this method to properly shutdown the scene
    shutdown() {
        this.log("LIFECYCLE", `Shutting down scene: ${this.scene.key}`);
        this.isDestroyed = true;  // Set flag to prevent further updates
        this.resetScene();
        super.shutdown();
    }

    // Add this method to properly destroy the scene
    destroy() {
        this.log("LIFECYCLE", `Destroying scene: ${this.scene.key}`);
        this.isDestroyed = true;  // Set flag to prevent further updates
        this.resetScene();
        super.destroy();
    }

    createSlideTrail() {
        // Create a particle manager for the slide trail
        const particles = this.add.particles(0, 0, 'bullet', {
            x: 0,
            y: 0,
            tint: 0x99ccff, // Light blue tint
            scale: { start: 0.5, end: 0.1 },
            alpha: { start: 0.4, end: 0 },
            speed: 0,
            lifespan: 300,
            blendMode: 'ADD',
            frequency: 15,
            emitting: true,
            follow: this.penguin
        });
        
        return particles;
    }

    // Add this method to BaseMapScene
    toggleDebugLogging() {
        this.debugLogging = !this.debugLogging;
    }
} 