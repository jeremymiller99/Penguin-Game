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
        // Set background color
        this.cameras.main.setBackgroundColor('#87CEEB');
        
        // Check if a map already exists in the registry
        const existingMap = this.registry.get('gameMap');
        
        if (!existingMap) {
            // First time creating the map
            this.nodeTypes = {
                BATTLE: { color: 0xff4444, sprite: 'enemySprite' },
                ELITE: { color: 0xff8800, sprite: 'enemySprite' },
                SHOP: { color: 0x44ff44, sprite: 'shop_empty' },
                BOSS: { color: 0x9932CC, sprite: 'enemySprite' }
            };

            this.createMap();
            
            this.registry.set('gameMap', {
                nodes: this.nodes,
                connections: this.connections,
                completedNodes: [],
                availableNodes: ['0-0']
            });
        } else {
            // Map exists, load it from registry
            this.nodes = existingMap.nodes;
            this.connections = existingMap.connections;
            this.completedNodes = new Set(existingMap.completedNodes);
            this.availableNodes = new Set(existingMap.availableNodes);
            
            this.nodeTypes = {
                BATTLE: { color: 0xff4444, sprite: 'enemySprite' },
                ELITE: { color: 0xff8800, sprite: 'enemySprite' },
                SHOP: { color: 0x44ff44, sprite: 'shop_empty' },
                BOSS: { color: 0x9932CC, sprite: 'enemySprite' }
            };
        }

        this.drawConnections();
        this.drawNodes();
        this.updateNodeStates();
        this.addPenguinMarker();
        this.createReturnButton();
    }

    createMap() {
        const levels = 7; // Number of vertical levels
        const spacing = {
            y: this.game.config.height / (levels + 1)
        };

        // Create starting node
        const startNode = {
            id: '0-0',
            type: 'BATTLE',
            position: {
                x: this.game.config.width / 2,
                y: spacing.y
            },
            connections: []
        };
        this.nodes.push(startNode);

        // Create paths
        const numPaths = Phaser.Math.Between(2, 3); // Random number of main paths
        const pathOffsets = [];
        
        // Calculate horizontal offsets for each path
        for (let i = 0; i < numPaths; i++) {
            // Divide the width into sections, leaving margins
            const margin = this.game.config.width * 0.2;
            const availableWidth = this.game.config.width - (margin * 2);
            const section = availableWidth / (numPaths - 1);
            pathOffsets.push(margin + (section * i));
        }

        // Create nodes for each level (except start and boss)
        for (let level = 1; level < levels - 1; level++) {
            const nodesInThisLevel = level === 1 ? numPaths : Phaser.Math.Between(1, numPaths);
            
            // Randomly select which paths will have nodes this level
            const selectedPaths = Phaser.Utils.Array.Shuffle([...pathOffsets])
                .slice(0, nodesInThisLevel);

            for (let i = 0; i < nodesInThisLevel; i++) {
                const nodeType = this.getRandomNodeType();
                
                // Add some randomness to x position around the path
                const baseX = selectedPaths[i];
                const xVariance = 60; // Pixels of random variance
                const x = baseX + Phaser.Math.Between(-xVariance, xVariance);

                const node = {
                    id: `${level}-${i}`,
                    type: nodeType,
                    position: {
                        x: x,
                        y: spacing.y * (level + 1)
                    },
                    connections: []
                };

                this.nodes.push(node);
            }
        }

        // Create boss node
        const bossNode = {
            id: `${levels-1}-0`,
            type: 'BOSS',
            position: {
                x: this.game.config.width / 2,
                y: spacing.y * levels
            },
            connections: []
        };
        this.nodes.push(bossNode);

        // Create connections between nodes
        for (let level = 0; level < levels - 1; level++) {
            const currentLevelNodes = this.nodes.filter(node => 
                parseInt(node.id.split('-')[0]) === level
            );
            const nextLevelNodes = this.nodes.filter(node => 
                parseInt(node.id.split('-')[0]) === level + 1
            );

            currentLevelNodes.forEach(currentNode => {
                // Sort next level nodes by distance to current node
                const sortedNextNodes = [...nextLevelNodes].sort((a, b) => {
                    const distA = Phaser.Math.Distance.Between(
                        currentNode.position.x, currentNode.position.y,
                        a.position.x, a.position.y
                    );
                    const distB = Phaser.Math.Distance.Between(
                        currentNode.position.x, currentNode.position.y,
                        b.position.x, b.position.y
                    );
                    return distA - distB;
                });

                // Connect to 1-2 closest nodes in the NEXT level only
                const numConnections = level === levels - 2 ? 1 : Phaser.Math.Between(1, 2);
                const connections = sortedNextNodes.slice(0, numConnections);
                
                // Only connect to nodes in the next level
                currentNode.connections = connections.map(node => node.id);
            });
        }

        // Ensure all nodes in each level (except the first) have at least one connection from the previous level
        for (let level = 1; level < levels; level++) {
            const currentLevelNodes = this.nodes.filter(node => 
                parseInt(node.id.split('-')[0]) === level
            );
            const prevLevelNodes = this.nodes.filter(node => 
                parseInt(node.id.split('-')[0]) === level - 1
            );

            currentLevelNodes.forEach(node => {
                const hasIncomingConnection = prevLevelNodes.some(prevNode => 
                    prevNode.connections.includes(node.id)
                );

                if (!hasIncomingConnection && prevLevelNodes.length > 0) {
                    // Connect to the closest previous level node
                    const closestPrevNode = prevLevelNodes.sort((a, b) => {
                        const distA = Phaser.Math.Distance.Between(
                            node.position.x, node.position.y,
                            a.position.x, a.position.y
                        );
                        const distB = Phaser.Math.Distance.Between(
                            node.position.x, node.position.y,
                            b.position.x, b.position.y
                        );
                        return distA - distB;
                    })[0];
                    
                    closestPrevNode.connections.push(node.id);
                }
            });
        }
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
        const nodeSize = 40; // Size of the square nodes

        this.nodes.forEach(node => {
            // Create square node
            const nodeSprite = this.add.rectangle(
                node.position.x, 
                node.position.y, 
                nodeSize, 
                nodeSize, 
                this.nodeTypes[node.type].color
            );
            
            // Add border
            nodeSprite.setStrokeStyle(2, 0xffffff);
            
            // Store sprite reference in node object
            node.sprite = nodeSprite;

            // Add hover effect
            nodeSprite.setInteractive();
            nodeSprite.on('pointerover', () => {
                nodeSprite.setScale(1.2);
                this.showNodeInfo(node);
            });

            nodeSprite.on('pointerout', () => {
                nodeSprite.setScale(1);
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

    addPenguinMarker() {
        const currentNodeId = this.registry.get('gameMap')?.completedNodes?.length > 0 
            ? this.registry.get('gameMap').completedNodes[this.registry.get('gameMap').completedNodes.length - 1]
            : '0-0';
        
        const currentNode = this.nodes.find(node => node.id === currentNodeId);
        
        if (!currentNode) return;
        
        // Create penguin sprite (now positioned directly on the node)
        this.penguinMarker = this.add.sprite(currentNode.position.x, currentNode.position.y - 15, 'penguin')
            .setScale(2)
            .play('idle');
    }

    handleNodeClick(node) {
        const currentNodeId = this.registry.get('gameMap')?.completedNodes?.length > 0 
            ? this.registry.get('gameMap').completedNodes[this.registry.get('gameMap').completedNodes.length - 1]
            : '0-0';
        
        const currentNode = this.nodes.find(n => n.id === currentNodeId);
        
        // Special case for starting node (0-0)
        if (node.id === '0-0' && !this.completedNodes.has('0-0')) {
            this.scene.start('TestLevel', { nodeId: node.id, nodeType: node.type });
            return;
        }
        
        if (currentNode) {
            // Check if the clicked node is directly connected to current node
            const isConnected = currentNode.connections.includes(node.id) || 
                              node.connections.includes(currentNode.id);
            
            // Only allow movement if the node is connected and either completed or available
            if (isConnected && (this.completedNodes.has(node.id) || this.availableNodes.has(node.id))) {
                // Create points along the connection line for the penguin to follow
                const points = this.createPathPoints(currentNode, node);
                
                // Move penguin along the path
                this.movePenguinAlongPath(points, () => {
                    // After movement completes
                    this.currentNode = node;
                    
                    // Update the registry with new current position
                    const gameMap = this.registry.get('gameMap');
                    const lastCompletedIndex = gameMap.completedNodes.length - 1;
                    gameMap.completedNodes[lastCompletedIndex] = node.id;
                    this.registry.set('gameMap', gameMap);
                    
                    // Only start the level if this is an unbeaten node
                    if (!this.completedNodes.has(node.id)) {
                        this.scene.start('TestLevel', { nodeId: node.id, nodeType: node.type });
                    }
                    
                    // Update node states to reflect new position
                    this.updateNodeStates();
                });
            }
        }
    }

    createPathPoints(startNode, endNode) {
        const points = [];
        const numPoints = 20;
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            points.push({
                x: startNode.position.x + (endNode.position.x - startNode.position.x) * t,
                y: (startNode.position.y - 15) + (endNode.position.y - startNode.position.y) * t - 15
            });
        }
        
        return points;
    }

    movePenguinAlongPath(points, onComplete) {
        if (!this.penguinMarker || points.length < 2) {
            onComplete();
            return;
        }

        // Calculate direction for sprite flipping
        const movingRight = points[points.length - 1].x > points[0].x;
        this.penguinMarker.setFlipX(!movingRight);
        
        // Play walking animation
        this.penguinMarker.play('walk_right');
        
        // Create tween configuration
        this.tweens.add({
            targets: this.penguinMarker,
            x: points[points.length - 1].x,
            y: points[points.length - 1].y,
            duration: 1000,
            ease: 'Linear',
            onComplete: () => {
                this.penguinMarker.play('idle');
                onComplete();
            }
        });
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
            
            // Clear any existing checkmark
            if (node.checkmark) {
                node.checkmark.destroy();
                node.checkmark = null;
            }
            
            // Get current node ID
            const currentNodeId = this.registry.get('gameMap')?.completedNodes?.length > 0 
                ? this.registry.get('gameMap').completedNodes[this.registry.get('gameMap').completedNodes.length - 1]
                : '0-0';
            
            const currentNode = this.nodes.find(n => n.id === currentNodeId);
            const isConnectedToCurrent = currentNode && 
                (currentNode.connections.includes(node.id) || node.connections.includes(currentNode.id));
            
            if (this.completedNodes.has(node.id)) {
                // Completed nodes
                const completedColor = Phaser.Display.Color.ValueToColor(this.nodeTypes[node.type].color)
                    .darken(50)
                    .color;
                
                node.sprite
                    .setFillStyle(completedColor)
                    .setAlpha(0.8);
                
                // Only make interactive if connected to current node
                if (isConnectedToCurrent) {
                    node.sprite
                        .setInteractive()
                        .on('pointerdown', () => this.handleNodeClick(node));
                } else {
                    node.sprite.disableInteractive();
                }

                // Add checkmark
                node.checkmark = this.add.text(
                    node.position.x, 
                    node.position.y, 
                    '✓', 
                    { 
                        fontSize: '24px',
                        color: '#ffffff'
                    }
                ).setOrigin(0.5);
            } else if (node.id === '0-0' && !this.completedNodes.has('0-0')) {
                // Special case for unbeaten starting node
                node.sprite
                    .setFillStyle(this.nodeTypes[node.type].color)
                    .setAlpha(1)
                    .setInteractive()
                    .on('pointerdown', () => this.handleNodeClick(node));
            } else if ((this.availableNodes.has(node.id) || node.id === '0-0') && isConnectedToCurrent) {
                // Available and connected nodes
                node.sprite
                    .setFillStyle(this.nodeTypes[node.type].color)
                    .setAlpha(1)
                    .setInteractive()
                    .on('pointerdown', () => this.handleNodeClick(node));
            } else {
                // Locked or unconnected nodes
                node.sprite
                    .setFillStyle(0x666666)
                    .setAlpha(0.5)
                    .disableInteractive();
            }
        });
    }
} 