// This will be your main game manager class (renamed from TestLevel)
class GameManager extends Phaser.Scene {
    constructor() {
        super('GameManager');
        // Core game state that persists across all maps
        this.playerCurrency = 0;
        this.cash = null;
        this.currencyText = null;
        this.isGameFrozen = false;
        this.floorLevel = 1;
        this.highScore = this.getHighScore();
        this.floorLevelText = null;
        this.highScoreText = null;
        
        // Initialize logging system
        this.debugLogging = true; // Set to false in production
        this.logPrefix = "[GameManager]";
        this.logGroups = {
            SCENE: "🎬 SCENE",
            GAME: "🎮 GAME",
            MAP: "🗺️ MAP",
            TRANSITION: "🔄 TRANSITION",
            LIFECYCLE: "♻️ LIFECYCLE",
            ERROR: "❌ ERROR",
            WARNING: "⚠️ WARNING"
        };
    }

    init(data) {
        // Initialize with data from previous scene or map
        this.currentNodeId = data.nodeId;
        this.nodeType = data.nodeType;
        this.difficultyRating = data.difficultyRating || 1;
        
        this.log("LIFECYCLE", "Initializing GameManager", {
            nodeId: this.currentNodeId,
            nodeType: this.nodeType,
            difficultyRating: this.difficultyRating
        });
        
        // If returning with currency, update it
        if (data.playerCurrency !== undefined) {
            this.playerCurrency = data.playerCurrency;
            this.log("GAME", `Updated player currency: ${this.playerCurrency}`);
        }
        
        // Calculate floor level based on difficulty
        this.calculateFloorLevel();
        
        // Determine which map to load based on node type or other criteria
        this.determineMapToLoad();
    }

    calculateFloorLevel() {
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
        
        this.log("GAME", `Calculated floor level`, {
            nodeType: this.nodeType,
            difficultyRating: this.difficultyRating,
            floorLevel: this.floorLevel
        });
    }

    create() {
        // Add debug text to show current scene type
        this.sceneTypeText = this.add.text(10, 10, "Game Manager", {
            fontSize: '16px',
            fontFamily: 'Arial',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 3 }
        }).setScrollFactor(0).setDepth(1000);
        
        // Set up common UI elements, player stats, etc.
        this.setupCommonUI();
        
        // Launch the appropriate map scene
        this.launchMapScene();
    }

    setupCommonUI() {
        // Create a container for the HUD elements
        const hudContainer = this.add.container(10, 10);
        
        // Set the HUD container to be fixed to the camera (not affected by camera movement)
        hudContainer.setScrollFactor(0);
        
        // Starting x position
        let xPos = 20;
        const yPos = 30;
        const spacing = 120;
        const iconScale = 3;

        // Floor level section
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
    }

    determineMapToLoad() {
        // Logic to decide which map to load
        const mapKeys = ['iceberg_map', 'map1'];
        this.currentMapKey = mapKeys[Math.floor(Math.random() * mapKeys.length)];
        console.log('Selected map:', this.currentMapKey);
    }

    launchMapScene() {
        // Get the scene key for the map we want to launch
        const sceneKey = this.getSceneKeyForMap(this.currentMapKey);
        this.log("TRANSITION", `Preparing to launch map scene: ${sceneKey}`);
        
        try {
            // RADICAL CHANGE: Always recreate the scene
            // If scene exists, remove it completely first
            if (this.scene.get(sceneKey)) {
                this.log("TRANSITION", `Scene ${sceneKey} exists. Removing it completely to create fresh instance.`);
                
                try {
                    // Call resetScene explicitly if it exists to clean up resources
                    const sceneInstance = this.scene.get(sceneKey);
                    if (sceneInstance && typeof sceneInstance.resetScene === 'function') {
                        sceneInstance.resetScene();
                    }
                    
                    // Completely remove the scene
                    this.scene.remove(sceneKey);
                    this.log("TRANSITION", `Scene ${sceneKey} removed completely.`);
                } catch (error) {
                    this.logWarning(`Error removing scene ${sceneKey}:`, error);
                }
                
                // Small delay to ensure scene is fully removed
                this.time.delayedCall(50, () => {
                    this.createAndLaunchFreshScene(sceneKey);
                });
            } else {
                // First time creating this scene
                this.createAndLaunchFreshScene(sceneKey);
            }
        } catch (error) {
            this.logError(`Error launching map scene ${sceneKey}:`, error);
        }
    }

    createAndLaunchFreshScene(sceneKey) {
        // Determine which scene constructor to use
        let SceneConstructor;
        if (sceneKey === 'IcebergMapScene') {
            SceneConstructor = IcebergMapScene;
        } else if (sceneKey === 'Map1Scene') {
            SceneConstructor = Map1Scene;
        } else {
            this.logError(`No constructor found for scene key: ${sceneKey}`);
            return;
        }
        
        // Add the scene fresh to the scene manager
        this.log("TRANSITION", `Adding fresh instance of ${sceneKey}`);
        this.scene.add(sceneKey, SceneConstructor, false);
        
        // Launch with the necessary data
        this.log("TRANSITION", `Launching fresh scene: ${sceneKey}`);
        
        // Set up event that executes after scene is ready
        this.game.events.once('step', () => {
            // Launch with the necessary data (now the scene should be properly initialized)
            this.scene.launch(sceneKey, {
                mapKey: this.currentMapKey,
                floorLevel: this.floorLevel,
                playerCurrency: this.playerCurrency,
                nodeId: this.currentNodeId,
                nodeType: this.nodeType,
                difficultyRating: this.difficultyRating,
            });
            
            // Small delay to ensure the scene is fully initialized before setting up listeners
            this.time.delayedCall(50, () => {
                // Now set up listeners after the scene is fully initialized
                this.setupMapSceneListeners(sceneKey);
            });
        });
    }

    getSceneKeyForMap(mapKey) {
        // Convert map key to scene key
        const mapScenes = {
            'iceberg_map': 'IcebergMapScene',
            'map1': 'Map1Scene'
        };
        return mapScenes[mapKey] || 'DefaultMapScene';
    }

    setupMapSceneListeners(sceneKey) {
        // Listen for events from the map scene
        const mapScene = this.scene.get(sceneKey);
        
        // Safety check - make sure the scene exists and has events
        if (!mapScene || !mapScene.events) {
            this.logWarning(`Cannot setup listeners for ${sceneKey} - scene not yet initialized`);
            return;
        }
        
        // Remove any existing listeners first to prevent duplicates
        mapScene.events.off('playerDeath', this.handlePlayerDeath, this);
        mapScene.events.off('levelComplete', this.handleLevelComplete, this);
        mapScene.events.off('currencyChanged', this.updateCurrency, this);
        
        // Handle player death
        mapScene.events.on('playerDeath', this.handlePlayerDeath, this);
        
        // Handle level completion
        mapScene.events.on('levelComplete', this.handleLevelComplete, this);
        
        // Handle currency updates
        mapScene.events.on('currencyChanged', this.updateCurrency, this);
        
        this.log("TRANSITION", `Set up event listeners for scene: ${sceneKey}`);
    }

    handlePlayerDeath() {
        console.log('Player died');
        // Handle player death logic
    }

    handleLevelComplete() {
        console.log('Level completed');
        // Handle level completion logic
        
        // Mark the current node as completed
        this.completeCurrentNode();
        
        // Transition back to the map
        this.transitionToScene('Map');
    }

    updateCurrency(amount) {
        this.playerCurrency = amount;
        if (this.currencyText) {
            this.currencyText.setText('$' + this.playerCurrency);
        }
    }

    completeCurrentNode() {
        // Get the current game map from registry
        const gameMap = this.registry.get('gameMap');
        if (!gameMap) return;
        
        // Add current node to completed nodes if not already there
        if (!gameMap.completedNodes.includes(this.currentNodeId)) {
            gameMap.completedNodes.push(this.currentNodeId);
        }
        
        // Update available nodes based on connections
        const currentNode = gameMap.nodes.find(n => n.id === this.currentNodeId);
        if (currentNode) {
            currentNode.connections.forEach(connId => {
                if (!gameMap.availableNodes.includes(connId)) {
                    gameMap.availableNodes.push(connId);
                }
            });
        }
        
        // Update registry
        this.registry.set('gameMap', gameMap);
    }

    // Common methods shared across all maps
    saveGameState() {
        // Save game state to registry
        const gameState = this.registry.get('gameState') || {};
        
        // Update with current state
        gameState.playerCurrency = this.playerCurrency;
        
        // Update the registry
        this.registry.set('gameState', gameState);
        console.log("Game state saved:", gameState);
    }

    transitionToScene(sceneName, data = {}) {
        this.log("TRANSITION", `Transitioning from ${this.scene.key} to ${sceneName}`);
        
        try {
            // Save current node to registry
            const gameMap = this.registry.get('gameMap');
            if (gameMap) {
                this.registry.set('gameMap', {
                    ...gameMap,
                    currentNode: this.currentNodeId
                });
                this.log("GAME", "Updated gameMap in registry with current node", { currentNode: this.currentNodeId });
            }

            // Get all active scenes
            const activeScenes = this.scene.manager.getScenes(true);
            this.log("TRANSITION", `Found ${activeScenes.length} active scenes`);
            
            // Reset physics in all active scenes
            activeScenes.forEach(scene => {
                if (scene.physics && scene.physics.world && typeof scene.physics.world.resume === 'function') {
                    // Make sure physics is running before we stop the scene
                    scene.physics.world.resume();
                    this.log("TRANSITION", `Resumed physics in scene: ${scene.scene.key}`);
                }
            });
            
            // First set flags to prevent updates in all scenes
            activeScenes.forEach(scene => {
                if (scene.scene.key !== 'Menu' && scene.scene.key !== this.scene.key) {
                    if (scene.isBeingReset === undefined) {
                        scene.isBeingReset = true;
                        this.log("TRANSITION", `Set isBeingReset flag on scene: ${scene.scene.key}`);
                    }
                }
            });
            
            // Stop all active scenes except Menu and current scene
            activeScenes.forEach(scene => {
                if (scene.scene.key !== 'Menu' && scene.scene.key !== this.scene.key) {
                    this.log("TRANSITION", `Stopping scene: ${scene.scene.key}`);
                    try {
                        // Call resetScene if it exists
                        if (typeof scene.resetScene === 'function') {
                            scene.resetScene();
                        }
                        
                        // Reset critical components
                        if (scene.physics && scene.physics.world) {
                            // Stop any physics bodies - safely access physics bodies
                            try {
                                // For Arcade Physics
                                if (scene.physics.world.bodies && scene.physics.world.bodies.entries) {
                                    scene.physics.world.bodies.entries.forEach(body => {
                                        if (body) {
                                            body.setVelocity(0, 0);
                                            body.setAcceleration(0, 0);
                                        }
                                    });
                                    this.log("TRANSITION", `Reset arcade physics bodies in scene: ${scene.scene.key}`);
                                }
                                // If scene has any game objects with physics bodies
                                else if (scene.children && scene.children.list) {
                                    scene.children.list.forEach(obj => {
                                        if (obj.body) {
                                            obj.body.setVelocity(0, 0);
                                            if (obj.body.setAcceleration) {
                                                obj.body.setAcceleration(0, 0);
                                            }
                                        }
                                    });
                                    this.log("TRANSITION", `Reset game object physics in scene: ${scene.scene.key}`);
                                }
                            } catch (physicsError) {
                                this.logWarning(`Error resetting physics in scene ${scene.scene.key}:`, physicsError);
                            }
                        }
                        
                        // Make sure to clear the isBeingReset flag before stopping
                        scene.isBeingReset = false;
                        scene.scene.stop();
                    } catch (e) {
                        this.logWarning(`Error stopping scene ${scene.scene.key}:`, e);
                    }
                }
            });

            // Stop current map scene if it exists
            if (this.currentMapKey) {
                const currentMapScene = this.getSceneKeyForMap(this.currentMapKey);
                if (this.scene.manager.getScene(currentMapScene)) {
                    this.log("TRANSITION", `Stopping current map scene: ${currentMapScene}`);
                    try {
                        const mapScene = this.scene.manager.getScene(currentMapScene);
                        if (mapScene) {
                            mapScene.isBeingReset = true;
                            
                            // Reset critical components
                            if (mapScene.physics && mapScene.physics.world) {
                                // Stop any physics bodies - safely access physics bodies
                                try {
                                    // For Arcade Physics
                                    if (mapScene.physics.world.bodies && mapScene.physics.world.bodies.entries) {
                                        mapScene.physics.world.bodies.entries.forEach(body => {
                                            if (body) {
                                                body.setVelocity(0, 0);
                                                body.setAcceleration(0, 0);
                                            }
                                        });
                                        this.log("TRANSITION", `Reset arcade physics bodies in map scene: ${currentMapScene}`);
                                    }
                                    // If scene has any game objects with physics bodies
                                    else if (mapScene.children && mapScene.children.list) {
                                        mapScene.children.list.forEach(obj => {
                                            if (obj.body) {
                                                obj.body.setVelocity(0, 0);
                                                if (obj.body.setAcceleration) {
                                                    obj.body.setAcceleration(0, 0);
                                                }
                                            }
                                        });
                                        this.log("TRANSITION", `Reset game object physics in map scene: ${currentMapScene}`);
                                    }
                                } catch (physicsError) {
                                    this.logWarning(`Error resetting physics in map scene ${currentMapScene}:`, physicsError);
                                }
                            }
                            
                            // Clear any event listeners
                            if (mapScene.events) {
                                mapScene.events.off('playerDeath', this.handlePlayerDeath, this);
                                mapScene.events.off('levelComplete', this.handleLevelComplete, this);
                                mapScene.events.off('currencyChanged', this.updateCurrency, this);
                            }
                            
                            // Reset the isBeingReset flag before stopping
                            mapScene.isBeingReset = false;
                            this.scene.stop(currentMapScene);
                        }
                    } catch (e) {
                        this.logWarning(`Error stopping map scene ${currentMapScene}:`, e);
                    }
                }
            }
            
            // Increased delay to ensure all scenes are properly stopped and physics systems cleaned up
            this.time.delayedCall(250, () => {
                this.log("TRANSITION", `Starting new scene after clean-up delay: ${sceneName}`);
                
                // Force physics system reset on the game instance
                if (this.game.physics && typeof this.game.physics.reset === 'function') {
                    this.game.physics.reset();
                    this.log("TRANSITION", "Reset main physics system");
                }
                
                // Start new scene
                this.scene.start(sceneName, data);
            });
        } catch (error) {
            this.logError(`Error transitioning to scene ${sceneName}:`, error);
            
            // Fallback: force start the new scene
            // Reset main physics first
            if (this.game.physics && typeof this.game.physics.reset === 'function') {
                this.game.physics.reset();
            }
            this.scene.start(sceneName, data);
        }
    }

    getHighScore() {
        return localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 1;
    }
    
    setHighScore(newScore) {
        localStorage.setItem('highScore', newScore);
    }

    resetGameState() {
        try {
            this.log("LIFECYCLE", "Starting game state reset");
            
            // Reset core game state
            this.playerCurrency = 0;
            this.floorLevel = 1;
            this.isGameFrozen = false;
            
            // Reset UI elements if they exist
            if (this.currencyText) this.currencyText.setText('$0');
            if (this.floorLevelText) this.floorLevelText.setText('Difficulty: 1/10');
            
            // Clear any active timers or tweens
            if (this.tweens) this.tweens.killAll();
            if (this.time) this.time.removeAllEvents();
            
            // Reset registry data - this is critical for a fresh start
            this.registry.reset();
            
            // Explicitly remove the gameMap from registry to force a new map generation
            this.registry.remove('gameMap');
            this.registry.remove('gameState');
            
            // Stop all active scenes except Menu and current scene
            const activeScenes = this.scene.manager.getScenes(true);
            activeScenes.forEach(scene => {
                const sceneKey = scene.scene.key;
                if (sceneKey !== 'Menu' && sceneKey !== this.scene.key) {
                    this.log("LIFECYCLE", `Stopping scene: ${sceneKey}`);
                    // Reset isBeingReset flag
                    scene.isBeingReset = false;
                    this.scene.stop(sceneKey);
                }
            });
            
            this.log("LIFECYCLE", "Game state completely reset for a new playthrough");
        } catch (e) {
            this.logError("Error in resetGameState:", e);
        }
    }

    // Add these logging methods
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
} 