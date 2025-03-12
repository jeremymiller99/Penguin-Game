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
    }

    init(data) {
        // Initialize with data from previous scene or map
        this.currentNodeId = data.nodeId;
        this.nodeType = data.nodeType;
        this.difficultyRating = data.difficultyRating || 1;
        
        // If returning with currency, update it
        if (data.playerCurrency !== undefined) {
            this.playerCurrency = data.playerCurrency;
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
        
        console.log(`Node type: ${this.nodeType}, Difficulty: ${this.difficultyRating}, Floor Level: ${this.floorLevel}`);
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
        // Launch the appropriate map scene based on currentMapKey
        const sceneKey = this.getSceneKeyForMap(this.currentMapKey);
        
        // Pass necessary data to the map scene
        this.scene.launch(sceneKey, {
            mapKey: this.currentMapKey,
            floorLevel: this.floorLevel,
            playerCurrency: this.playerCurrency,
            nodeId: this.currentNodeId,
            nodeType: this.nodeType,
            difficultyRating: this.difficultyRating,
            // Add any other data needed by the map
        });
        
        // Listen for events from the map scene
        this.setupMapSceneListeners(sceneKey);
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
        
        // Handle player death
        mapScene.events.on('playerDeath', this.handlePlayerDeath, this);
        
        // Handle level completion
        mapScene.events.on('levelComplete', this.handleLevelComplete, this);
        
        // Handle currency updates
        mapScene.events.on('currencyChanged', this.updateCurrency, this);
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
        // Save current node to registry
        const gameMap = this.registry.get('gameMap');
        if (gameMap) {
            this.registry.set('gameMap', {
                ...gameMap,
                currentNode: this.currentNodeId
            });
        }

        // Stop current map scene
        const currentMapScene = this.getSceneKeyForMap(this.currentMapKey);
        this.scene.stop(currentMapScene);
        
        // Start new scene
        this.scene.start(sceneName, data);
    }

    getHighScore() {
        return localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 1;
    }
    
    setHighScore(newScore) {
        localStorage.setItem('highScore', newScore);
    }
} 