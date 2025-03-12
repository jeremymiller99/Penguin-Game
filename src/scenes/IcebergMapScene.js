class IcebergMapScene extends BaseMapScene {
    constructor() {
        super('IcebergMapScene');
    }

    createMap() {
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
        }
        
        // Set world bounds
        const worldWidth = this.map.widthInPixels * 2;
        const worldHeight = this.map.heightInPixels * 2;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        
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
        }
    }

    // Override the create method to call setupCamera after player creation
    create() {
        // Call the parent create method first
        super.create();
        
        // Now set up the camera to follow the player
        this.setupCamera();
        
        // Debug visualization for collisions (uncomment to enable)
        // this.backgroundLayer.renderDebug(this.add.graphics(), {
        //     tileColor: null,
        //     collidingTileColor: new Phaser.Display.Color(243, 134, 48, 128),
        //     faceColor: new Phaser.Display.Color(40, 39, 37, 255)
        // });
    }

    setupPhysics() {
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
    }

    spawnEntities() {
        // Calculate difficulty parameters
        const diffParams = this.calculateDifficultyParams(this.floorLevel);
        
        // Use map-specific spawn points if available
        let usedMapSpawnPoints = this.spawnEntitiesFromMapLayers();
        
        // If no map spawn points were used or not enough entities were spawned,
        // fall back to the base implementation to spawn remaining entities
        if (!usedMapSpawnPoints) {
        super.spawnEntities();
        } else {
            // Just spawn the ladder if we used map spawn points
            this.spawnLadder();
        }
    }
    
    spawnEntitiesFromMapLayers() {
        let entitiesSpawned = false;
        
        // Spawn entities from SpawnPoints layer
        const spawnLayer = this.map.getObjectLayer('SpawnPoints');
        if (spawnLayer && spawnLayer.objects && spawnLayer.objects.length > 0) {
            this.spawnEntitiesFromSpawnLayer(spawnLayer.objects);
            entitiesSpawned = true;
        }
        
        // Spawn enemies from EnemySpawnPoints layer (if it exists)
        const enemySpawnLayer = this.map.getObjectLayer('EnemySpawnPoints');
        if (enemySpawnLayer && enemySpawnLayer.objects && enemySpawnLayer.objects.length > 0) {
            this.spawnEnemiesFromLayer(enemySpawnLayer.objects);
            entitiesSpawned = true;
        }
        
        // Spawn crates from CrateSpawnPoints layer (if it exists)
        const crateSpawnLayer = this.map.getObjectLayer('CrateSpawnPoints');
        if (crateSpawnLayer && crateSpawnLayer.objects && crateSpawnLayer.objects.length > 0) {
            this.spawnCratesFromLayer(crateSpawnLayer.objects);
            entitiesSpawned = true;
        }
        
        // Spawn barrels from BarrelSpawnPoints layer (if it exists)
        const barrelSpawnLayer = this.map.getObjectLayer('BarrelSpawnPoints');
        if (barrelSpawnLayer && barrelSpawnLayer.objects && barrelSpawnLayer.objects.length > 0) {
            this.spawnBarrelsFromLayer(barrelSpawnLayer.objects);
            entitiesSpawned = true;
        }
        
        return entitiesSpawned;
    }
    
    spawnEntitiesFromSpawnLayer(spawnPoints) {
        // Process each spawn point based on its type property
        spawnPoints.forEach(point => {
            // Scale coordinates by 2 to match the tilemap scale
            const x = point.x * 2;
            const y = point.y * 2;
            
            // Default type is 'enemy' if not specified
            let entityType = 'enemy';
            
            // Check if the point has a type property
            if (point.properties) {
                const typeProperty = point.properties.find(prop => prop.name === 'type');
                if (typeProperty) {
                    entityType = typeProperty.value;
                }
            }
            
            // Spawn the appropriate entity based on type
            switch (entityType.toLowerCase()) {
                case 'enemy':
                case 'basic':
                    this.spawnEnemy('basic', x, y);
                    break;
                case 'ranged':
                    this.spawnEnemy('ranged', x, y);
                    break;
                case 'crate':
                    this.spawnCrate(x, y);
                    break;
                case 'cash':
                    this.spawnCash(x, y);
                    break;
                default:
                    console.warn(`Unknown entity type: ${entityType}`);
            }
        });
    }
    
    spawnEnemiesFromLayer(spawnPoints) {
        // Calculate how many enemies to spawn based on difficulty
        const diffParams = this.calculateDifficultyParams(this.floorLevel);
        const maxEnemies = diffParams.enemyCount;
        
        // Limit the number of spawn points to use
        const pointsToUse = Math.min(spawnPoints.length, maxEnemies);
        
        // Shuffle the spawn points to randomize which ones we use
        const shuffledPoints = Phaser.Utils.Array.Shuffle([...spawnPoints]);
        
        // Spawn enemies at the selected points
        for (let i = 0; i < pointsToUse; i++) {
            const point = shuffledPoints[i];
            // Scale coordinates by 2 to match the tilemap scale
            const x = point.x * 2;
            const y = point.y * 2;
            
            // Check if the point has a type property to determine enemy type
            let enemyType = 'basic';
            if (point.properties) {
                const typeProperty = point.properties.find(prop => prop.name === 'type');
                if (typeProperty) {
                    enemyType = typeProperty.value;
                }
            }
            
            // Spawn the enemy
            this.spawnEnemy(enemyType, x, y);
        }
    }
    
    spawnCratesFromLayer(spawnPoints) {
        // Shuffle the spawn points to randomize which ones we use
        const shuffledPoints = Phaser.Utils.Array.Shuffle([...spawnPoints]);
        
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
} 