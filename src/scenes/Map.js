class NodeState {
    static UNAVAILABLE_ACTIVE = 'UNAVAILABLE_ACTIVE';    // Unbeaten, can't reach yet
    static AVAILABLE_ACTIVE = 'AVAILABLE_ACTIVE';        // Unbeaten, can access
    static UNAVAILABLE_COMPLETED = 'UNAVAILABLE_COMPLETED'; // Beaten, can't reach
    static AVAILABLE_COMPLETED = 'AVAILABLE_COMPLETED';   // Beaten, can access
}

class Map extends Phaser.Scene {
    constructor() {
        super('Map');
        this.nodes = [];
        this.connections = [];
        this.currentNode = null;  // Will store just the current node ID
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
            this.currentNode = null;  // Start with no current node
            
            this.registry.set('gameMap', {
                nodes: this.nodes,
                connections: this.connections,
                completedNodes: [],
                availableNodes: ['0-0'],
                currentNode: null
            });
        } else {
            // Map exists, load it from registry
            this.nodes = existingMap.nodes;
            this.connections = existingMap.connections;
            this.completedNodes = new Set(existingMap.completedNodes);
            this.availableNodes = new Set(existingMap.availableNodes);
            this.currentNode = existingMap.currentNode;
        }

        this.drawConnections();
        this.drawNodes();
        this.updateNodeStates();
        this.addPenguinMarker();
        this.createReturnButton();
        this.debugNodeStatus();

        // If this is first time (no current node), start FTUE sequence
        if (!this.currentNode) {
            this.startFTUESequence();
        }
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
        const numPaths = 3; // Always create 3 paths for first two levels
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
            // Force 3 nodes for first two levels, then random afterwards
            const nodesInThisLevel = (level <= 2) ? 3 : Phaser.Math.Between(1, 3);
            
            // For first two levels, use all paths
            const selectedPaths = level <= 2 ? 
                [...pathOffsets] : // Use all paths for first two levels
                Phaser.Utils.Array.Shuffle([...pathOffsets]).slice(0, nodesInThisLevel);

            for (let i = 0; i < nodesInThisLevel; i++) {
                const nodeType = this.getRandomNodeType();
                
                // Add some randomness to x position around the path
                const baseX = selectedPaths[i];
                const xVariance = level <= 2 ? 30 : 60; // Less variance in first two levels
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
        // Check if the clicked node is connected to current node
        const isConnected = this.isNodeConnected(node.id, this.currentNode);
        const state = this.getNodeState(node);
        
        // Allow clicking if node is connected AND either:
        // 1. It's an available active node (unbeaten and connected)
        // 2. It's an available completed node (beaten and connected)
        if (isConnected && (state === NodeState.AVAILABLE_ACTIVE || state === NodeState.AVAILABLE_COMPLETED)) {
            const points = this.createPathPoints(
                this.nodes.find(n => n.id === this.currentNode), 
                node
            );
            
            this.movePenguinAlongPath(points, () => {
                // If this is an unbeaten node, start the level
                if (!this.completedNodes.has(node.id)) {
                    this.currentNode = node.id;
                    
                    // Update registry before starting level
                    const gameMap = this.registry.get('gameMap');
                    this.registry.set('gameMap', {
                        ...gameMap,
                        currentNode: this.currentNode,
                        completedNodes: Array.from(this.completedNodes),
                        availableNodes: Array.from(this.availableNodes)
                    });
                    
                    this.scene.start('TestLevel', { 
                        nodeId: node.id, 
                        nodeType: node.type 
                    });
                } else {
                    // Just moving to a completed node
                    this.currentNode = node.id;
                    
                    // Update registry after movement
                    const gameMap = this.registry.get('gameMap');
                    this.registry.set('gameMap', {
                        ...gameMap,
                        currentNode: this.currentNode,
                        completedNodes: Array.from(this.completedNodes),
                        availableNodes: Array.from(this.availableNodes)
                    });
                    
                    this.updateNodeStates();
                }
            });
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

    getNodeState(node) {
        const isCompleted = this.completedNodes.has(node.id);
        const isConnectedToCurrent = this.isNodeConnected(node.id, this.currentNode);

        if (isCompleted) {
            // Completed nodes are available if connected to current position
            return isConnectedToCurrent ? NodeState.AVAILABLE_COMPLETED : NodeState.UNAVAILABLE_COMPLETED;
        } else {
            // Unbeaten nodes are available if connected to current position
            return isConnectedToCurrent ? NodeState.AVAILABLE_ACTIVE : NodeState.UNAVAILABLE_ACTIVE;
        }
    }

    isNodeConnected(nodeId, currentNodeId) {
        if (!currentNodeId) return false;
        const currentNode = this.nodes.find(n => n.id === currentNodeId);
        return currentNode && (
            currentNode.connections.includes(nodeId) ||
            this.nodes.find(n => n.id === nodeId)?.connections.includes(currentNodeId)
        );
    }

    debugNodeStatus() {
        const availableActive = [];
        const unavailableActive = [];
        const availableCompleted = [];
        const unavailableCompleted = [];

        this.nodes.forEach(node => {
            const state = this.getNodeState(node);
            const nodeInfo = `${node.id} (${node.type})`;

            switch (state) {
                case NodeState.AVAILABLE_ACTIVE:
                    availableActive.push(nodeInfo);
                    break;
                case NodeState.UNAVAILABLE_ACTIVE:
                    unavailableActive.push(nodeInfo);
                    break;
                case NodeState.AVAILABLE_COMPLETED:
                    availableCompleted.push(nodeInfo);
                    break;
                case NodeState.UNAVAILABLE_COMPLETED:
                    unavailableCompleted.push(nodeInfo);
                    break;
            }
        });

        console.log('=== MAP NODE STATUS ===');
        console.log('Current Node:', this.currentNode);
        console.log('Available Active Nodes:', availableActive);
        console.log('Unavailable Active Nodes:', unavailableActive);
        console.log('Available Completed Nodes:', availableCompleted);
        console.log('Unavailable Completed Nodes:', unavailableCompleted);
        console.log('Current Registry State:', this.registry.get('gameMap'));
        console.log('====================');
    }

    updateNodeStates() {
        this.nodes.forEach(node => {
            if (!node.sprite) return;
            
            // Clear any existing checkmark
            if (node.checkmark) {
                node.checkmark.destroy();
                node.checkmark = null;
            }

            const state = this.getNodeState(node);
            const isCompleted = this.completedNodes.has(node.id);
            
            // Base appearance
            if (isCompleted) {
                // All completed nodes get darker color
                const completedColor = Phaser.Display.Color.ValueToColor(this.nodeTypes[node.type].color)
                    .darken(50)
                    .color;
                
                node.sprite
                    .setFillStyle(completedColor)
                    .setAlpha(0.8);

                // All completed nodes get checkmark
                node.checkmark = this.add.text(
                    node.position.x, 
                    node.position.y, 
                    '✓', 
                    { 
                        fontSize: '24px',
                        color: '#ffffff'
                    }
                ).setOrigin(0.5);
            } else {
                // Non-completed nodes
                node.sprite
                    .setFillStyle(state === NodeState.AVAILABLE_ACTIVE ? 
                        this.nodeTypes[node.type].color : 0x666666)
                    .setAlpha(state === NodeState.AVAILABLE_ACTIVE ? 1 : 0.5);
            }

            // Interactivity
            if (state === NodeState.AVAILABLE_ACTIVE || state === NodeState.AVAILABLE_COMPLETED) {
                node.sprite
                    .setInteractive()
                    .on('pointerdown', () => this.handleNodeClick(node));
                
                // Add hover effects
                node.sprite.on('pointerover', () => {
                    node.sprite.setScale(1.2);
                    this.showNodeInfo(node, isCompleted);
                });
                
                node.sprite.on('pointerout', () => {
                    node.sprite.setScale(1);
                    this.hideNodeInfo();
                });
            } else {
                node.sprite.disableInteractive();
            }
        });
    }

    showNodeInfo(node, isCompleted) {
        if (this.nodeInfo) this.nodeInfo.destroy();
        
        let statusText;
        if (isCompleted) {
            statusText = '(Completed)';
        } else {
            const state = this.getNodeState(node);
            statusText = state === NodeState.AVAILABLE_ACTIVE ? '(Available)' : '(Locked)';
        }
        
        this.nodeInfo = this.add.text(node.position.x, node.position.y - 40, 
            `${node.type}\n${statusText}`, {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 5 },
            align: 'center'
        }).setOrigin(0.5);
    }

    startFTUESequence() {
        // Position penguin at top center
        const startY = 50;
        this.penguinMarker.setPosition(this.game.config.width / 2, startY);
        
        // Find the starting node (0-0)
        const startNode = this.nodes.find(n => n.id === '0-0');
        
        // Create movement points
        const points = [
            { x: startNode.position.x, y: startNode.position.y - 100 }, // Point above node
            { x: startNode.position.x, y: startNode.position.y } // Node position
        ];
        
        // Move penguin to starting node
        this.movePenguinAlongPath(points, () => {
            this.currentNode = '0-0';
            this.showStartConfirmation();
        });
    }

    showStartConfirmation() {
        // Find the starting node position
        const startNode = this.nodes.find(n => n.id === '0-0');
        
        // Create a simple text banner above the node
        const banner = this.add.text(
            startNode.position.x,
            startNode.position.y - 32,  // Position above the node
            'Press SPACE to begin',
            {
                fontSize: '18px',
                fill: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 },
                align: 'center'
            }
        ).setOrigin(0.5);

        // Add a subtle bounce animation
        this.tweens.add({
            targets: banner,
            y: banner.y - 5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add space key listener
        const spaceKey = this.input.keyboard.addKey('SPACE');
        spaceKey.once('down', () => {
            // Clean up
            banner.destroy();
            this.tweens.killTweensOf(banner);
            
            // Update registry and start level
            const gameMap = this.registry.get('gameMap');
            this.registry.set('gameMap', {
                ...gameMap,
                currentNode: this.currentNode
            });
            
            // Start the first level
            this.scene.start('TestLevel', {
                nodeId: '0-0',
                nodeType: 'BATTLE'
            });
        });
    }
} 