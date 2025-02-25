class Map extends Phaser.Scene {
    constructor() {
        super('Map');
        this.nodes = [];
        this.connections = [];
        this.currentNode = null;
        this.completedNodes = new Set();
        this.availableNodes = new Set();
    }

    create() {
        // Check if a map already exists in the registry
        const existingMap = this.registry.get('gameMap');
        
        if (!existingMap) {
            // First time creating the map
            this.cameras.main.setBackgroundColor('#87CEEB');
            
            this.nodeTypes = {
                BATTLE: { color: 0xff0000, sprite: 'enemySprite' },
                ELITE: { color: 0xff6600, sprite: 'enemySprite' },
                SHOP: { color: 0x00ff00, sprite: 'shop_empty' },
                BOSS: { color: 0x9932CC, sprite: 'enemySprite' }
            };

            // Generate new map
            this.createMap();
            
            // Store the generated map in registry
            this.registry.set('gameMap', {
                nodes: this.nodes,
                connections: this.connections,
                completedNodes: [],
                availableNodes: ['0-0'] // Start node is always available
            });
        } else {
            // Map exists, load it from registry
            this.nodes = existingMap.nodes;
            this.connections = existingMap.connections;
            this.completedNodes = new Set(existingMap.completedNodes);
            this.availableNodes = new Set(existingMap.availableNodes);
            
            // Set up nodeTypes for existing map
            this.nodeTypes = {
                BATTLE: { color: 0xff0000, sprite: 'enemySprite' },
                ELITE: { color: 0xff6600, sprite: 'enemySprite' },
                SHOP: { color: 0x00ff00, sprite: 'shop_empty' },
                BOSS: { color: 0x9932CC, sprite: 'enemySprite' }
            };
        }

        // Draw the map
        this.drawConnections();
        this.drawNodes();
        
        // Update node visuals based on state
        this.updateNodeStates();
        
        // Add return to game button
        this.createReturnButton();
    }

    createMap() {
        const levels = 5; // Number of vertical levels
        const maxNodesPerLevel = 3; // Maximum nodes per level
        const spacing = {
            x: this.game.config.width / (maxNodesPerLevel + 1),
            y: this.game.config.height / (levels + 1)
        };

        // Create nodes for each level
        for (let level = 0; level < levels; level++) {
            // Randomly decide number of nodes for this level (1-3)
            // First and last level always have 1 node
            const nodesInThisLevel = level === 0 || level === levels - 1 
                ? 1 
                : Math.floor(Math.random() * 3) + 1;
            
            for (let i = 0; i < nodesInThisLevel; i++) {
                let nodeType;
                if (level === 0) nodeType = 'BATTLE';
                else if (level === levels - 1) nodeType = 'BOSS';
                else nodeType = this.getRandomNodeType();

                // Calculate x position to center nodes
                const xOffset = (maxNodesPerLevel - nodesInThisLevel) * spacing.x / 2;
                
                const node = {
                    id: `${level}-${i}`,
                    type: nodeType,
                    position: {
                        x: xOffset + spacing.x * (i + 1),
                        y: spacing.y * (level + 1)
                    },
                    connections: []
                };

                this.nodes.push(node);
            }
        }

        // Create connections between nodes
        this.createConnections();
    }

    getRandomNodeType() {
        const types = ['BATTLE', 'BATTLE', 'BATTLE', 'ELITE', 'SHOP'];
        return types[Math.floor(Math.random() * types.length)];
    }

    createConnections() {
        // For each node (except the last level), connect to 1-2 nodes in the next level
        for (let i = 0; i < this.nodes.length; i++) {
            const currentNode = this.nodes[i];
            const currentLevel = parseInt(currentNode.id.split('-')[0]);
            const nextLevelNodes = this.nodes.filter(node => 
                parseInt(node.id.split('-')[0]) === currentLevel + 1
            );

            if (nextLevelNodes.length > 0) {
                // Create at least one connection
                const connections = [nextLevelNodes[Math.floor(Math.random() * nextLevelNodes.length)]];
                
                // 50% chance to add a second connection if available
                if (nextLevelNodes.length > 1 && Math.random() > 0.5) {
                    let secondConnection;
                    do {
                        secondConnection = nextLevelNodes[Math.floor(Math.random() * nextLevelNodes.length)];
                    } while (secondConnection === connections[0]);
                    connections.push(secondConnection);
                }

                currentNode.connections = connections.map(node => node.id);
            }
        }
    }

    drawConnections() {
        const graphics = this.add.graphics();
        graphics.lineStyle(3, 0xaaaaaa, 0.5);

        this.nodes.forEach(node => {
            node.connections.forEach(connectionId => {
                const targetNode = this.nodes.find(n => n.id === connectionId);
                graphics.beginPath();
                graphics.moveTo(node.position.x, node.position.y);
                graphics.lineTo(targetNode.position.x, targetNode.position.y);
                graphics.strokePath();
            });
        });
    }

    drawNodes() {
        this.nodes.forEach(node => {
            const nodeConfig = this.nodeTypes[node.type];
            
            // Create node sprite/circle
            const nodeSprite = this.add.sprite(node.position.x, node.position.y, nodeConfig.sprite)
                .setScale(2)
                .setTint(0x666666) // Greyed out
                .setAlpha(0.5);    // Transparent

            // Store sprite reference in node object
            node.sprite = nodeSprite;

            // Add hover effect
            nodeSprite.on('pointerover', () => {
                nodeSprite.setScale(2.5);
                this.showNodeInfo(node);
            });

            nodeSprite.on('pointerout', () => {
                nodeSprite.setScale(2);
                this.hideNodeInfo();
            });
        });
    }

    showNodeInfo(node) {
        if (this.nodeInfo) this.nodeInfo.destroy();
        
        this.nodeInfo = this.add.text(node.position.x, node.position.y - 40, 
            `${node.type}\nLevel ${node.id.split('-')[0]}`, {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 5 },
            align: 'center'
        }).setOrigin(0.5);
    }

    hideNodeInfo() {
        if (this.nodeInfo) this.nodeInfo.destroy();
    }

    handleNodeClick(node) {
        this.currentNode = node;
        // Store current map state in registry for persistence
        this.registry.set('mapState', {
            currentNode: this.currentNode,
            completedNodes: Array.from(this.completedNodes),
            availableNodes: Array.from(this.availableNodes)
        });
        
        // Start the level
        this.scene.start('TestLevel', { nodeId: node.id, nodeType: node.type });
    }

    createReturnButton() {
        const button = this.add.text(this.game.config.width - 10, 10, 'Return to Game', {
            fontSize: '20px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        })
        .setOrigin(1, 0)
        .setInteractive();

        button.on('pointerover', () => button.setScale(1.1));
        button.on('pointerout', () => button.setScale(1));
        button.on('pointerdown', () => this.scene.start('TestLevel'));
    }

    updateNodeStates() {
        this.nodes.forEach(node => {
            if (!node.sprite) return;
            
            if (this.completedNodes.has(node.id)) {
                // Completed nodes
                node.sprite
                    .setTint(0x666666)
                    .setAlpha(0.5)
                    .disableInteractive();
            } else if (this.availableNodes.has(node.id) || node.id === '0-0') {
                // Available nodes
                node.sprite
                    .setTint(this.nodeTypes[node.type].color)
                    .setAlpha(1)
                    .setInteractive()
                    .on('pointerdown', () => this.handleNodeClick(node));
            } else {
                // Locked nodes
                node.sprite
                    .setTint(0x666666)
                    .setAlpha(0.5)
                    .disableInteractive();
            }
        });
    }
} 