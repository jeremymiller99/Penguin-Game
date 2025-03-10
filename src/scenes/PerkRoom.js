class PerkRoom extends Phaser.Scene {
    constructor() {
        super('PerkRoom');
    }

    init(data) {
        this.currentNodeId = data.nodeId;
        this.nodeType = data.nodeType;
        this.difficultyRating = data.difficultyRating || 1;
    }

    create() {
        // Background
        this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x111133)
            .setOrigin(0, 0);
        
        // Title
        this.add.text(this.game.config.width / 2, 60, 'CHOOSE A PERK', {
            fontFamily: 'Arial Black',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Get available perks from the registry (or generate random ones)
        const gameState = this.registry.get('gameState') || {};
        const perks = gameState.availablePerks || this.generateRandomPerks();
        
        // Display perk options
        this.displayPerkOptions(perks);
        
        // Back button
        const backButton = this.add.text(50, this.game.config.height - 50, 'BACK TO MAP', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 }
        }).setInteractive({ useHandCursor: true });
        
        backButton.on('pointerdown', () => {
            this.scene.start('Map');
        });
    }
    
    generateRandomPerks() {
        // Generate 3 random perks from the global PERKS array
        // Make sure we don't pick the same perk twice
        let availablePerks = [...PERKS];
        let selectedPerks = [];
        
        for (let i = 0; i < 3 && availablePerks.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availablePerks.length);
            selectedPerks.push(availablePerks[randomIndex]);
            availablePerks.splice(randomIndex, 1);
        }
        
        return selectedPerks;
    }
    
    displayPerkOptions(perks) {
        const startY = 150;
        const spacing = 180;
        
        perks.forEach((perk, index) => {
            const x = this.game.config.width / 2;
            const y = startY + (index * spacing);
            
            this.createPerkCard(perk, x, y, () => {
                this.selectPerk(perk);
            });
        });
    }
    
    createPerkCard(perk, x, y, callback) {
        // Card background
        const card = this.add.rectangle(x, y, 400, 150, 0x333366)
            .setStrokeStyle(3, this.getRarityColor(perk.rarity))
            .setInteractive({ useHandCursor: true });
            
        // Perk icon
        const icon = this.add.sprite(x - 170, y, perk.icon || 'default_perk_icon').setScale(2);
        
        // Perk name
        const nameText = this.add.text(x - 100, y - 50, perk.name, {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0, 0.5);
        
        // Perk rarity
        const rarityText = this.add.text(x - 100, y - 20, perk.rarity.toUpperCase(), {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: this.getRarityColor(perk.rarity, true)
        }).setOrigin(0, 0.5);
        
        // Perk description
        const descText = this.add.text(x - 100, y + 20, perk.description, {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#cccccc',
            wordWrap: { width: 280 }
        }).setOrigin(0, 0.5);
        
        // Hover effects
        card.on('pointerover', () => {
            card.setFillStyle(0x444488);
        });
        
        card.on('pointerout', () => {
            card.setFillStyle(0x333366);
        });
        
        // Click event
        card.on('pointerdown', callback);
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
    
    selectPerk(perk) {
        // Save the selected perk to the game state
        const gameState = this.registry.get('gameState') || {};
        gameState.selectedPerk = perk;
        this.registry.set('gameState', gameState);
        
        // Complete the node
        const gameMap = this.registry.get('gameMap');
        if (gameMap) {
            const completedNodes = new Set(gameMap.completedNodes);
            const availableNodes = new Set();
            
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
                currentNode: this.currentNodeId,
                completedNodes: Array.from(completedNodes),
                availableNodes: Array.from(availableNodes)
            });
        }
        
        // Apply visual confirmation effect
        this.cameras.main.flash(500, 200, 200, 255);
        this.time.delayedCall(600, () => {
            this.scene.start('Map');
        });
    }
} 