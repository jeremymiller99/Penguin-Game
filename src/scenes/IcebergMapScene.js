class IcebergMapScene extends BaseMapScene {
    constructor() {
        super('IcebergMapScene');
        this.logPrefix = "[❄️ ICEBERG]";
    }

    createMap() {
        this.log("Creating Iceberg tilemap");
        super.createMap();
        
        // Iceberg-specific map creation
        const tileset = this.map.addTilesetImage('iceberg_tileset', 'iceberg_tileset');
        
        // Create layers
        this.backgroundLayer = this.map.createLayer('Floor', tileset, 0, 0);
        this.backgroundLayer.setScale(2);
        
        // Set collision for edge tiles (any tile that is not 9 or 0)
        // First, set all tiles to non-colliding
        this.backgroundLayer.setCollisionByExclusion([0, 9]);
        
        // Then, explicitly set collision for specific tiles
        // This ensures that any tile that is not 0 (empty) or 9 (walkable) will collide
        const nonCollidingTiles = [0, 9]; // Empty and walkable tiles
        for (let i = 0; i < this.map.tilesets[0].total; i++) {
            if (!nonCollidingTiles.includes(i)) {
                this.backgroundLayer.setCollision(i);
            }
        }
        
        // Create buildings layer if it exists
        if (this.map.getLayerIndex('Buildings') !== null) {
            this.buildingsLayer = this.map.createLayer('Buildings', tileset, 0, 0);
            this.buildingsLayer.setScale(2);
            this.buildingsLayer.setCollisionByExclusion([-1]);
            this.log("Buildings layer created");
        } else {
            this.log("No Buildings layer found in tilemap");
        }
        
        // Set world bounds
        const worldWidth = this.map.widthInPixels * 2;
        const worldHeight = this.map.heightInPixels * 2;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.log("World bounds set", { width: worldWidth, height: worldHeight });
        
        // Configure camera bounds only (don't follow player yet)
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    }

    // Add a new method to set up the camera to follow the player
    setupCamera() {
        if (this.penguin) {
            const worldWidth = this.map.widthInPixels * 2;
            const worldHeight = this.map.heightInPixels * 2;
            this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
            this.cameras.main.startFollow(this.penguin, true, 0.09, 0.09);
            this.log("Camera following player", { 
                lerp: 0.09, 
                worldWidth, 
                worldHeight 
            });
        } else {
            this.logWarning("Cannot setup camera - penguin not created yet");
        }
    }

    // Override the create method to call setupCamera after player creation
    create() {
        this.log("Starting IcebergMapScene creation");
        
        // Call the parent create method first
        super.create();
        
        // Now set up the camera to follow the player
        this.setupCamera();
        
        this.log("IcebergMapScene creation complete");
        
        // Debug visualization for collisions (uncomment to enable)
        // this.backgroundLayer.renderDebug(this.add.graphics(), {
        //     tileColor: null,
        //     collidingTileColor: new Phaser.Display.Color(243, 134, 48, 128),
        //     faceColor: new Phaser.Display.Color(40, 39, 37, 255)
        // });
    }

    setupPhysics() {
        this.log("Setting up Iceberg physics");
        super.setupPhysics();
        
        // Iceberg-specific physics setup
        
        // Add collision between player and floor layer edges
        if (this.backgroundLayer) {
            // Ensure the collision is properly set up
            this.physics.add.collider(this.penguin, this.backgroundLayer);
            
            // Add collision between bullets and floor layer edges
            if (this.penguin.gun && this.penguin.gun.bullets) {
                this.physics.add.collider(
                    this.penguin.gun.bullets, 
                    this.backgroundLayer, 
                    (bullet, wall) => {
                        bullet.destroy();
                        this.createBulletImpactEffect(bullet.x, bullet.y);
                    }, 
                    null, 
                    this
                );
            }
            
            // Add collision between enemies and floor layer edges
            this.physics.add.collider(this.enemies, this.backgroundLayer);
            
            // Add collision between crates/barrels and floor layer edges
            this.physics.add.collider(this.crates, this.backgroundLayer);
            this.physics.add.collider(this.barrels, this.backgroundLayer);
            
            this.log("Background layer collisions set up");
        } else {
            this.logWarning("No background layer for collisions");
        }
        
        // Add collisions with buildings layer if it exists
        if (this.buildingsLayer) {
            // Set up collisions with buildings layer for player
            this.physics.add.collider(this.penguin, this.buildingsLayer);
            
            // Set up bullet collisions with buildings
            if (this.penguin.gun && this.penguin.gun.bullets) {
                this.physics.add.collider(
                    this.penguin.gun.bullets, 
                    this.buildingsLayer, 
                    (bullet, wall) => {
                        bullet.destroy();
                        this.createBulletImpactEffect(bullet.x, bullet.y);
                    }, 
                    null, 
                    this
                );
            }
            
            // Set up collisions with buildings layer for enemies
            this.physics.add.collider(this.enemies, this.buildingsLayer);
            
            // Set up collisions with buildings layer for crates and barrels
            this.physics.add.collider(this.crates, this.buildingsLayer);
            this.physics.add.collider(this.barrels, this.buildingsLayer);
            
            this.log("Buildings layer collisions set up");
        } else {
            this.logWarning("No buildings layer for collisions");
        }
        
        // Add enemy-to-enemy collisions
        this.physics.add.collider(this.enemies, this.enemies);
        
        // Add enemy-to-crate/barrel collisions
        this.physics.add.collider(this.enemies, this.crates);
        this.physics.add.collider(this.enemies, this.barrels);
        
        // Add crate-to-crate and barrel-to-barrel collisions
        this.physics.add.collider(this.crates, this.crates);
        this.physics.add.collider(this.barrels, this.barrels);
        this.physics.add.collider(this.crates, this.barrels);
        
        this.log("Entity collisions set up");
    }

    spawnEntities() {
        this.log("Spawning Iceberg entities");
        // Calculate difficulty parameters
        const diffParams = this.calculateDifficultyParams(this.floorLevel);
        
        // Use map-specific spawn points if available
        let usedMapSpawnPoints = this.spawnEntitiesFromMapLayers();
        
        // If no map spawn points were used or not enough entities were spawned,
        // fall back to the base implementation to spawn remaining entities
        if (!usedMapSpawnPoints) {
            this.log("No map spawn points used, falling back to base implementation");
            super.spawnEntities();
        } else {
            this.log("Entities spawned from map layers");
        }
    }
    
    spawnEntitiesFromMapLayers() {
        let entitiesSpawned = false;
        
        // Check if we have dedicated enemy spawn points first
        const enemySpawnLayer = this.map.getObjectLayer('EnemySpawnPoints');
        if (enemySpawnLayer && enemySpawnLayer.objects && enemySpawnLayer.objects.length > 0) {
            // Use dedicated enemy spawn points if available
            this.log("Found enemy spawn layer with", { count: enemySpawnLayer.objects.length });
            this.spawnEnemiesFromLayer(enemySpawnLayer.objects);
            entitiesSpawned = true;
        } else {
            // Fall back to generic SpawnPoints layer for enemies if no dedicated enemy spawn points
            const spawnLayer = this.map.getObjectLayer('SpawnPoints');
            if (spawnLayer && spawnLayer.objects && spawnLayer.objects.length > 0) {
                this.log("Found generic spawn layer with", { count: spawnLayer.objects.length });
                
                // Filter out only enemy-type spawn points
                const enemySpawnPoints = spawnLayer.objects.filter(point => {
                    if (!point.properties) return true; // Default to enemy if no properties
                    
                    const typeProperty = point.properties.find(prop => prop.name === 'type');
                    if (!typeProperty) return true; // Default to enemy if no type property
                    
                    const type = typeProperty.value.toLowerCase();
                    return type === 'enemy' || type === 'basic' || type === 'ranged' || type === 'melee';
                });
                
                if (enemySpawnPoints.length > 0) {
                    this.log("Found enemy spawn points in generic layer", { count: enemySpawnPoints.length });
                    this.spawnEnemiesFromLayer(enemySpawnPoints);
                    entitiesSpawned = true;
                } else {
                    this.log("No enemy spawn points found in generic layer");
                }
                
                // Process non-enemy spawn points separately
                const otherSpawnPoints = spawnLayer.objects.filter(point => {
                    if (!point.properties) return false;
                    
                    const typeProperty = point.properties.find(prop => prop.name === 'type');
                    if (!typeProperty) return false;
                    
                    const type = typeProperty.value.toLowerCase();
                    return type !== 'enemy' && type !== 'basic' && type !== 'ranged' && type !== 'melee';
                });
                
                if (otherSpawnPoints.length > 0) {
                    this.log("Found non-enemy spawn points", { count: otherSpawnPoints.length });
                    this.spawnNonEnemyEntities(otherSpawnPoints);
                    entitiesSpawned = true;
                } else {
                    this.log("No non-enemy spawn points found");
                }
            } else {
                this.log("No spawn layer found");
            }
        }
        
        // Spawn crates from CrateSpawnPoints layer (if it exists)
        const crateSpawnLayer = this.map.getObjectLayer('CrateSpawnPoints');
        if (crateSpawnLayer && crateSpawnLayer.objects && crateSpawnLayer.objects.length > 0) {
            this.log("Found crate spawn layer with", { count: crateSpawnLayer.objects.length });
            this.spawnCratesFromLayer(crateSpawnLayer.objects);
            entitiesSpawned = true;
        } else {
            this.log("No crate spawn layer found");
        }
        
        // Spawn barrels from BarrelSpawnPoints layer (if it exists)
        const barrelSpawnLayer = this.map.getObjectLayer('BarrelSpawnPoints');
        if (barrelSpawnLayer && barrelSpawnLayer.objects && barrelSpawnLayer.objects.length > 0) {
            this.log("Found barrel spawn layer with", { count: barrelSpawnLayer.objects.length });
            this.spawnBarrelsFromLayer(barrelSpawnLayer.objects);
            entitiesSpawned = true;
        } else {
            this.log("No barrel spawn layer found");
        }
        
        return entitiesSpawned;
    }
    
    // New method to handle non-enemy entities from SpawnPoints layer
    spawnNonEnemyEntities(spawnPoints) {
        this.log(`Spawning ${spawnPoints.length} non-enemy entities`);
        
        // Process each spawn point based on its type property
        spawnPoints.forEach(point => {
            // Scale coordinates by 2 to match the tilemap scale
            const x = point.x * 2;
            const y = point.y * 2;
            
            // Get entity type from properties
            let entityType = 'crate'; // Default to crate for non-enemy points
            
            if (point.properties) {
                const typeProperty = point.properties.find(prop => prop.name === 'type');
                if (typeProperty) {
                    entityType = typeProperty.value.toLowerCase();
                }
            }
            
            this.log(`Spawning non-enemy entity`, { 
                type: entityType, 
                position: { x, y } 
            });
            
            // Spawn the appropriate entity based on type
            switch (entityType) {
                case 'crate':
                    this.spawnCrate(x, y);
                    break;
                case 'cash':
                    this.spawnCash(x, y);
                    break;
                default:
                    this.logWarning(`Unknown entity type: ${entityType}`);
            }
        });
    }
    
    spawnEnemiesFromLayer(spawnPoints) {
        // Calculate how many enemies to spawn based on difficulty
        const diffParams = this.calculateDifficultyParams(this.floorLevel);
        const totalEnemies = diffParams.enemyCount;
        
        this.log(`Spawning ${totalEnemies} enemies for floor level ${this.floorLevel}`);
        
        // If we have no spawn points, use the default spawning method
        if (!spawnPoints || spawnPoints.length === 0) {
            this.logWarning("No spawn points provided, using default spawning method");
            // Use the parent spawnEntities method which now uses the type distribution
            super.spawnEntities();
            return;
        }
        
        // Instead of limiting to spawn points, we'll distribute enemies among available points
        // This allows multiple enemies to spawn at the same point with offsets
        
        // Calculate how many enemies per spawn point on average (can be fractional)
        const enemiesPerPoint = totalEnemies / spawnPoints.length;
        this.log(`Average enemies per spawn point: ${enemiesPerPoint.toFixed(2)}`);
        
        // Shuffle the spawn points to randomize which ones we use
        const shuffledPoints = Phaser.Utils.Array.Shuffle([...spawnPoints]);
        
        // Counter for spawned enemies
        let enemiesSpawned = 0;
        
        // First pass: distribute at least one enemy per spawn point if possible
        for (let i = 0; i < shuffledPoints.length && enemiesSpawned < totalEnemies; i++) {
            const point = shuffledPoints[i];
            
            // Scale coordinates by 2 to match the tilemap scale
            const baseX = point.x * 2;
            const baseY = point.y * 2;
            
            // Add random offset to prevent enemies from stacking exactly
            const offsetX = Phaser.Math.Between(-30, 30);
            const offsetY = Phaser.Math.Between(-30, 30);
            const x = baseX + offsetX;
            const y = baseY + offsetY;
            
            // Check if the point has a type property to determine enemy type
            let enemyType = null;
            if (point.properties) {
                const typeProperty = point.properties.find(prop => prop.name === 'type');
                if (typeProperty) {
                    // Only allow valid enemy types
                    const type = typeProperty.value;
                    if (['basic', 'ranged', 'melee'].includes(type)) {
                        enemyType = type;
                    }
                }
            }
            
            // If no valid type specified in the map, determine based on distribution
            if (!enemyType) {
                // Determine enemy type based on distribution
                const totalWeight = Object.values(diffParams.enemyTypeDistribution).reduce((a, b) => a + b, 0);
                let random = Math.random() * totalWeight;
                enemyType = 'basic';
                
                for (const [type, weight] of Object.entries(diffParams.enemyTypeDistribution)) {
                    if (random < weight) {
                        enemyType = type === 'default' ? 'basic' : type;
                        break;
                    }
                    random -= weight;
                }
            }
            
            this.log(`Spawning enemy #${enemiesSpawned+1}`, { 
                position: { x, y }, 
                basePosition: { x: baseX, y: baseY },
                offset: { x: offsetX, y: offsetY }, 
                type: enemyType 
            });
            
            this.spawnEnemy(enemyType, x, y);
            enemiesSpawned++;
        }
        
        // Second pass: distribute remaining enemies among random spawn points
        // This will result in multiple enemies at some spawn points
        while (enemiesSpawned < totalEnemies) {
            // Pick a random spawn point
            const pointIndex = Math.floor(Math.random() * shuffledPoints.length);
            const point = shuffledPoints[pointIndex];
            
            // Scale coordinates by 2 to match the tilemap scale
            const baseX = point.x * 2;
            const baseY = point.y * 2;
            
            // Add random offset to prevent enemies from stacking exactly
            // Use larger offsets for additional enemies at the same point
            const offsetX = Phaser.Math.Between(-50, 50);
            const offsetY = Phaser.Math.Between(-50, 50);
            const x = baseX + offsetX;
            const y = baseY + offsetY;
            
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
            
            this.log(`Spawning additional enemy #${enemiesSpawned+1}`, { 
                position: { x, y }, 
                basePosition: { x: baseX, y: baseY },
                offset: { x: offsetX, y: offsetY }, 
                type: selectedType 
            });
            
            this.spawnEnemy(selectedType, x, y);
            enemiesSpawned++;
        }
    }
    
    spawnCratesFromLayer(spawnPoints) {
        // Shuffle the spawn points to randomize which ones we use
        const shuffledPoints = Phaser.Utils.Array.Shuffle([...spawnPoints]);
        
        this.log(`Spawning ${shuffledPoints.length} crates from layer`);
        
        // Spawn crates at the selected points (use all of them)
        for (let i = 0; i < shuffledPoints.length; i++) {
            const point = shuffledPoints[i];
            // Scale coordinates by 2 to match the tilemap scale
            const x = point.x * 2;
            const y = point.y * 2;
            
            // Spawn the crate
            this.spawnCrate(x, y);
        }
    }

    spawnBarrelsFromLayer(spawnPoints) {
        // Shuffle the spawn points to randomize which ones we use
        const shuffledPoints = Phaser.Utils.Array.Shuffle([...spawnPoints]);
        
        this.log(`Spawning ${shuffledPoints.length} barrels from layer`);
        
        // Spawn barrels at the selected points (use all of them)
        for (let i = 0; i < shuffledPoints.length; i++) {
            const point = shuffledPoints[i];
            // Scale coordinates by 2 to match the tilemap scale
            const x = point.x * 2;
            const y = point.y * 2;
            
            // Create a barrel using the Crate class properly
            const barrel = new Crate(this, x, y);
            barrel.setTexture('barrel');
            barrel.setScale(2);
            
            // Reduce barrel health to make it explode in one shot
            barrel.health = 15; // Adjusted to be destroyed in one shot (15 damage)
            barrel.maxHealth = 15;
            
            // Make sure the barrel has the correct physics properties
            barrel.body.setCollideWorldBounds(true);
            barrel.body.setBounce(0.6);
            barrel.body.setDrag(100);
            
            // Add to barrels group
            this.barrels.add(barrel);
            
            // Set up collision with player
            this.physics.add.collider(this.penguin, barrel);
            
            // Set up collision with bullets
            if (this.penguin.gun && this.penguin.gun.bullets) {
                this.physics.add.collider(
                    this.penguin.gun.bullets,
                    barrel,
                    (bullet, barrel) => {
                        // Destroy the bullet
                        bullet.destroy();
                        this.createBulletImpactEffect(bullet.x, bullet.y);
                        
                        // Try to damage the barrel with error handling
                        try {
                            if (typeof barrel.takeDamage === 'function') {
                                barrel.takeDamage(bullet.damage || 20);
                                
                                // If barrel is destroyed, handle explosion
                                if (barrel.health <= 0) {
                                    this.log('Barrel health reached zero, triggering explosion');
                                    this.handleCrateExplosion(barrel);
                                }
                            } else {
                                // Fallback if takeDamage is not a function
                                this.logWarning('takeDamage is not a function on barrel');
                                
                                // Add health property if it doesn't exist
                                if (barrel.health === undefined) {
                                    barrel.health = 15; // Adjusted to be destroyed in one shot (15 damage)
                                }
                                
                                // Manually reduce health
                                barrel.health -= (bullet.damage || 20);
                                
                                // If barrel is destroyed, handle explosion
                                if (barrel.health <= 0) {
                                    this.log('Barrel health reached zero (fallback), triggering explosion');
                                    this.handleCrateExplosion(barrel);
                                }
                            }
                        } catch (error) {
                            this.logError('Error handling barrel damage:', error);
                        }
                    },
                    null,
                    this
                );
            }
        }
    }

    // Override the update method to fix aiming issues
    update() {
        // Call the parent update method first
        super.update();
        
        // Fix gun aiming to always point at mouse cursor, regardless of obstacles
        if (this.penguin && this.penguin.gun) {
            // Make sure the gun is positioned correctly at the player
            this.penguin.gun.setPosition(this.penguin.x, this.penguin.y);
            
            // Get raw screen coordinates of the mouse pointer
            const pointer = this.input.activePointer;
            
            // Convert screen coordinates to world coordinates
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            
            // Calculate angle between player and mouse cursor
            const angle = Phaser.Math.Angle.Between(
                this.penguin.x, this.penguin.y,
                worldPoint.x, worldPoint.y
            );
            
            // Set gun rotation directly - this should always work regardless of obstacles
            this.penguin.gun.rotation = angle;
            
            // Flip gun sprite based on angle
            this.penguin.gun.gunSprite.flipY = Math.abs(angle) > Math.PI / 2;
        }
    }

    // Add this method to the IcebergMapScene class
    resetScene() {
        this.log("Resetting IcebergMapScene");
        
        // Call parent resetScene method first
        super.resetScene();
        
        // Add IcebergMapScene-specific reset logic
        if (this.buildingsLayer) {
            this.buildingsLayer = null;
        }
        
        // Any other IcebergMapScene-specific properties to reset
        this.log("IcebergMapScene reset complete");
    }
    
    // Add logging methods if they don't exist in BaseMapScene
    log(message, data) {
        if (!this.debugLogging) return;
        
        const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
        console.log(`${timestamp} ${this.logPrefix}: ${message}`, data || '');
    }

    logWarning(message, data) {
        if (!this.debugLogging) return;
        
        const timestamp = new Date().toISOString().substr(11, 8);
        console.warn(`${timestamp} ${this.logPrefix}: ⚠️ ${message}`, data || '');
    }

    logError(message, error) {
        if (!this.debugLogging) return;
        
        const timestamp = new Date().toISOString().substr(11, 8);
        console.error(`${timestamp} ${this.logPrefix}: ❌ ${message}`, error || '');
    }
} 