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
        // Replace the solid background color with ocean layers
        this.createOceanBackground();
        
        // Check if a map already exists in the registry
        const existingMap = this.registry.get('gameMap');
        
        if (!existingMap) {
            // First time creating the map
            this.nodeTypes = {
                BATTLE: { color: 0xff4444, sprite: 'enemySprite' },
                ELITE: { color: 0xff8800, sprite: 'enemySprite' },
                SHOP: { color: 0x44ff44, sprite: 'shop_empty' },
                BOSS: { color: 0x9932CC, sprite: 'enemySprite' },
                PERK: { color: 0x00aaff, sprite: 'default_perk_icon' }
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
        this.initializeTraversedPaths(); // Initialize traversed paths
        this.addPenguinMarker();
        this.createReturnButton();
        this.debugNodeStatus();

        // If this is first time (no current node), start FTUE sequence
        if (!this.currentNode) {
            this.startFTUESequence();
        }
    }

    createOceanBackground() {
        // Create a top-down ocean view
        const width = this.game.config.width;
        const height = this.game.config.height;
        
        // Deep ocean background (single gradient from medium to dark blue)
        const oceanGradient = this.add.graphics();
        oceanGradient.fillGradientStyle(0x1E90FF, 0x1E90FF, 0x0F52BA, 0x0F52BA, 1);
        oceanGradient.fillRect(0, 0, width, height);
        
        // Add whitecaps instead of wave lines
        this.createWhitecaps();
        
        // Add random water sparkles throughout
        this.time.addEvent({
            delay: 800,
            callback: this.addWaterSparkle,
            callbackScope: this,
            repeat: -1
        });
    }

    createWhitecaps() {
        // Create a container for all whitecaps
        this.whitecapsContainer = this.add.container(0, 0);
        
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
        
        // Spawn a few whitecaps immediately
        for (let i = 0; i < 10; i++) {
            this.spawnWhitecap();
        }
    }

    spawnWhitecap() {
        const width = this.game.config.width;
        const height = this.game.config.height;
        
        // Get a whitecap from the pool or create a new one if needed
        let whitecap = this.whitecapPool.find(w => !w.visible);
        if (!whitecap) {
            whitecap = this.createWhitecapShape(0, 0);
            this.whitecapPool.push(whitecap);
            this.whitecapsContainer.add(whitecap);
        }
        
        // Random position for the whitecap
        const x = Phaser.Math.Between(0, width);
        const y = Phaser.Math.Between(0, height);
        
        // Reset and position the whitecap
        whitecap.setPosition(x, y);
        whitecap.setVisible(true);
        whitecap.setAlpha(0);
        whitecap.setScale(Phaser.Math.FloatBetween(0.6, 1.2));
        whitecap.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
        
        // Random movement direction
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = Phaser.Math.FloatBetween(10, 25);
        const moveX = Math.cos(angle) * speed;
        const moveY = Math.sin(angle) * speed;
        
        // Animate the whitecap with a more natural lifecycle
        // First fade in
        this.tweens.add({
            targets: whitecap,
            alpha: Phaser.Math.FloatBetween(0.6, 0.9),
            duration: Phaser.Math.Between(300, 600),
            ease: 'Sine.InOut',
            onComplete: () => {
                // Then drift and fade out
                this.tweens.add({
                    targets: whitecap,
                    x: whitecap.x + moveX,
                    y: whitecap.y + moveY,
                    alpha: 0,
                    scale: whitecap.scale * 0.7,
                    duration: Phaser.Math.Between(2000, 4000),
                    ease: 'Sine.Out',
                    onComplete: () => {
                        whitecap.setVisible(false);
                    }
                });
            }
        });
    }

    createWhitecapShape(x, y) {
        // Create a container for the whitecap elements
        const container = this.add.container(x, y);
        
        // Randomly choose between different whitecap styles
        const style = Phaser.Math.Between(1, 5);
        
        if (style === 1) {
            // Style 1: Realistic foam patch with multiple overlapping circles
            const foamBase = this.add.circle(0, 0, 8, 0xFFFFFF, 0.7);
            const foam1 = this.add.circle(4, -3, 6, 0xFFFFFF, 0.8);
            const foam2 = this.add.circle(-5, 2, 7, 0xFFFFFF, 0.75);
            const foam3 = this.add.circle(2, 5, 5, 0xFFFFFF, 0.65);
            const foam4 = this.add.circle(-3, -4, 4, 0xFFFFFF, 0.7);
            
            container.add([foamBase, foam1, foam2, foam3, foam4]);
        } 
        else if (style === 2) {
            // Style 2: Crescent wave with foam detail
            const graphics = this.add.graphics();
            
            // Main crescent shape
            graphics.fillStyle(0xFFFFFF, 0.8);
            graphics.beginPath();
            graphics.arc(-6, 0, 10, 0, Math.PI, true);
            graphics.arc(6, 0, 10, Math.PI, Math.PI * 2, true);
            graphics.fillPath();
            
            // Add foam details
            const foam1 = this.add.circle(-8, -2, 3, 0xFFFFFF, 0.9);
            const foam2 = this.add.circle(8, -1, 4, 0xFFFFFF, 0.85);
            const foam3 = this.add.circle(0, 3, 5, 0xFFFFFF, 0.7);
            
            container.add([graphics, foam1, foam2, foam3]);
        }
        else if (style === 3) {
            // Style 3: Breaking wave with spray
            const waveBase = this.add.graphics();
            waveBase.fillStyle(0xFFFFFF, 0.75);
            
            // Wave base
            waveBase.beginPath();
            waveBase.moveTo(-12, 0);
            waveBase.lineTo(-8, -4);
            waveBase.lineTo(-4, -1);
            waveBase.lineTo(0, -5);
            waveBase.lineTo(4, -2);
            waveBase.lineTo(8, -6);
            waveBase.lineTo(12, 0);
            waveBase.lineTo(-12, 0);
            waveBase.fillPath();
            
            // Add spray particles
            const spray1 = this.add.circle(-6, -7, 2, 0xFFFFFF, 0.6);
            const spray2 = this.add.circle(0, -8, 1.5, 0xFFFFFF, 0.7);
            const spray3 = this.add.circle(5, -9, 2, 0xFFFFFF, 0.65);
            
            container.add([waveBase, spray1, spray2, spray3]);
        }
        else if (style === 4) {
            // Style 4: Circular foam patch with gradient effect
            const foamCenter = this.add.circle(0, 0, 7, 0xFFFFFF, 0.85);
            const foamMiddle = this.add.circle(0, 0, 10, 0xFFFFFF, 0.6);
            const foamOuter = this.add.circle(0, 0, 13, 0xFFFFFF, 0.3);
            
            // Add some texture with small circles
            const detail1 = this.add.circle(3, -4, 2, 0xFFFFFF, 0.9);
            const detail2 = this.add.circle(-5, 2, 3, 0xFFFFFF, 0.8);
            const detail3 = this.add.circle(4, 3, 2, 0xFFFFFF, 0.85);
            
            container.add([foamOuter, foamMiddle, foamCenter, detail1, detail2, detail3]);
        }
        else {
            // Style 5: Elongated wave crest
            const graphics = this.add.graphics();
            
            // Main wave line with varying thickness
            graphics.lineStyle(3, 0xFFFFFF, 0.9);
            graphics.beginPath();
            graphics.moveTo(-15, 0);
            graphics.lineTo(-10, -2);
            graphics.lineTo(-5, 1);
            graphics.lineTo(0, -3);
            graphics.lineTo(5, 0);
            graphics.lineTo(10, -2);
            graphics.lineTo(15, 1);
            graphics.strokePath();
            
            // Add foam details along the wave
            const foam1 = this.add.circle(-10, -2, 3, 0xFFFFFF, 0.7);
            const foam2 = this.add.circle(0, -3, 4, 0xFFFFFF, 0.8);
            const foam3 = this.add.circle(10, -2, 3, 0xFFFFFF, 0.7);
            
            container.add([graphics, foam1, foam2, foam3]);
        }
        
        return container;
    }

    addWaterSparkle() {
        const width = this.game.config.width;
        const height = this.game.config.height;
        
        // Avoid spawning sparkles near the center of the screen where nodes are
        let sparkleX, sparkleY;
        const centerX = width / 2;
        const centerY = height / 2;
        const avoidRadius = Math.min(width, height) * 0.3;
        
        do {
            sparkleX = Phaser.Math.Between(0, width);
            sparkleY = Phaser.Math.Between(0, height);
        } while (
            Phaser.Math.Distance.Between(sparkleX, sparkleY, centerX, centerY) < avoidRadius &&
            Math.random() < 0.7 // 70% chance to avoid center, 30% chance to allow it anyway
        );
        
        // Create a more realistic sparkle effect
        const sparkleSize = Phaser.Math.FloatBetween(0.8, 1.5);
        const sparkle = this.add.circle(sparkleX, sparkleY, sparkleSize, 0xFFFFFF, 0.5);
        
        // Add a subtle glow
        const glow = this.add.circle(sparkleX, sparkleY, sparkleSize * 2, 0xFFFFFF, 0.2);
        
        // Animate both the sparkle and glow
        this.tweens.add({
            targets: [sparkle, glow],
            alpha: 0,
            scale: { from: 1, to: 1.5 },
            duration: Phaser.Math.Between(800, 1500),
            ease: 'Sine.Out',
            onComplete: () => {
                sparkle.destroy();
                glow.destroy();
            }
        });
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
            difficultyRating: 1, // Starting difficulty
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
                
                // Calculate difficulty rating based on level and node type
                let difficultyRating = Math.min(10, Math.ceil(level * 1.5));
                
                // Adjust difficulty based on node type
                if (nodeType === 'ELITE') {
                    difficultyRating = Math.min(10, difficultyRating + 2); // Elite nodes are harder
                } else if (nodeType === 'SHOP') {
                    difficultyRating = Math.max(1, difficultyRating - 1); // Shop nodes are easier
                }

                const node = {
                    id: `${level}-${i}`,
                    type: nodeType,
                    difficultyRating: difficultyRating,
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
            difficultyRating: 10, // Boss is always maximum difficulty
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
        const types = ['BATTLE', 'BATTLE', 'BATTLE', 'ELITE', 'SHOP', 'PERK'];
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
        // Create a container for all connections
        this.connectionContainer = this.add.container(0, 0);
        
        // Track connections for later reference
        this.connectionGraphics = [];
        
        this.nodes.forEach(node => {
            node.connections.forEach(connectionId => {
                const targetNode = this.nodes.find(n => n.id === connectionId);
                
                // Create a graphics object for this specific connection
                const graphics = this.add.graphics();
                
                // Store connection info for later reference
                const connectionInfo = {
                    graphics: graphics,
                    fromNodeId: node.id,
                    toNodeId: connectionId,
                    isActive: false, // Will be updated in updateNodeStates
                    isTraversed: false // Will be set to true when player moves along this path
                };
                
                this.connectionGraphics.push(connectionInfo);
                this.connectionContainer.add(graphics);
                
                // Draw a wavy line using multiple line segments
                const startX = node.position.x;
                const startY = node.position.y;
                const endX = targetNode.position.x;
                const endY = targetNode.position.y;
                
                // Calculate the distance and angle between nodes
                const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
                const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY);
                
                // Initially draw with a dim color - will be updated in updateNodeStates
                graphics.lineStyle(3, 0x6ECFF6, 0.3);
                
                // Create a wavy path with multiple segments
                graphics.beginPath();
                graphics.moveTo(startX, startY);
                
                // Number of segments in the path
                const segments = 12;
                
                for (let i = 1; i <= segments; i++) {
                    // Calculate position along the straight line
                    const t = i / segments;
                    const x = startX + (endX - startX) * t;
                    const y = startY + (endY - startY) * t;
                    
                    // Add a perpendicular offset to create a wave
                    // The sine function creates the wave pattern
                    const waveAmplitude = 10; // How high the waves are
                    const waveFrequency = 3;  // How many waves along the path
                    
                    const perpX = Math.sin(angle + Math.PI/2);
                    const perpY = Math.cos(angle + Math.PI/2);
                    
                    const offset = Math.sin(t * Math.PI * waveFrequency) * waveAmplitude;
                    
                    // Draw to the next point with the wave offset applied
                    graphics.lineTo(
                        x + perpX * offset,
                        y - perpY * offset
                    );
                }
                
                graphics.strokePath();
            });
        });
    }

    drawNodes() {
        this.nodes.forEach(node => {
            // Randomly select one of the three ice berg sprites
            const icebergNum = Phaser.Math.Between(1, 3);
            const icebergKey = `ice_berg_${icebergNum}`;
            
            // Create iceberg sprite instead of rectangle - always at full opacity
            const nodeSprite = this.add.sprite(
                node.position.x, 
                node.position.y, 
                icebergKey
            ).setScale(0.05); // Adjust scale as needed
            
            // Add floating animation to each iceberg
            this.addIcebergFloatingEffect(nodeSprite);
            
            // Add indicator text based on node type
            let indicatorText;
            if (node.type === 'SHOP') {
                indicatorText = '$';
            } else if (node.type === 'PERK') {
                indicatorText = 'P';
            } else {
                // For battle, elite, and boss nodes, show difficulty rating
                indicatorText = node.difficultyRating.toString();
            }
            
            // Create the text object with black color
            node.indicator = this.add.text(
                node.position.x, 
                node.position.y, 
                indicatorText, 
                { 
                    fontSize: '24px',
                    fontFamily: 'Arial',
                    fontWeight: 'bold',
                    color: '#000000', // Changed to black
                    stroke: '#ffffff', // White stroke for better visibility
                    strokeThickness: 3
                }
            ).setOrigin(0.5);
            
            // Store sprite reference in node object
            node.sprite = nodeSprite;

            // Add hover effect for ALL nodes, regardless of availability
            nodeSprite.setInteractive();
            nodeSprite.on('pointerover', () => {
                nodeSprite.setScale(0.055); // Slightly larger on hover
                this.showNodeInfo(node);
            });

            nodeSprite.on('pointerout', () => {
                nodeSprite.setScale(0.05); // Back to normal size
                this.hideNodeInfo();
            });
        });
    }

    addIcebergFloatingEffect(icebergSprite) {
        // Create a random gentle floating motion for each iceberg
        const floatDuration = Phaser.Math.Between(2000, 4000);
        const floatDistance = Phaser.Math.FloatBetween(2, 5);
        const rotationAmount = Phaser.Math.FloatBetween(-0.02, 0.02);
        
        // Random starting phase so icebergs don't all move in sync
        const startDelay = Phaser.Math.Between(0, 1000);
        
        // Slight rotation
        this.tweens.add({
            targets: icebergSprite,
            rotation: rotationAmount,
            duration: floatDuration * 1.5,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
            delay: startDelay
        });
        
        // Vertical floating motion
        this.tweens.add({
            targets: icebergSprite,
            y: icebergSprite.y + floatDistance,
            duration: floatDuration,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
            delay: startDelay
        });
        
        // Ensure the indicator text follows the iceberg
        if (icebergSprite.indicator) {
            this.tweens.add({
                targets: icebergSprite.indicator,
                y: icebergSprite.indicator.y + floatDistance,
                duration: floatDuration,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: startDelay
            });
        }
    }

    showNodeInfo(node, isCompleted) {
        if (this.nodeInfo) this.nodeInfo.destroy();
        
        // Check completion status if not provided
        if (isCompleted === undefined) {
            isCompleted = this.completedNodes.has(node.id);
        }
        
        // Get node state to determine availability
        const state = this.getNodeState(node);
        const isAvailable = state === NodeState.AVAILABLE_ACTIVE || state === NodeState.AVAILABLE_COMPLETED;
        
        // Build status text based on node state
        let statusText;
        if (isCompleted) {
            statusText = '(Completed)';
        } else if (isAvailable) {
            statusText = '(Available)';
        } else {
            statusText = '(Locked)';
        }
        
        // Enhanced node info to help with route planning
        let enemyText = '';
        if (node.type === 'BATTLE') {
            enemyText = '\nRegular Enemies';
        } else if (node.type === 'ELITE') {
            enemyText = '\nStronger Enemies';
        } else if (node.type === 'BOSS') {
            enemyText = '\nBoss Fight';
        }
        
        let typeText;
        switch(node.type) {
            case 'PERK':
                typeText = 'Upgrade Station\nObtain a new ability';
                break;
            default:
                typeText = node.type;
        }
        
        this.nodeInfo = this.add.text(node.position.x, node.position.y - 50, 
            `${typeText}${enemyText}\nDifficulty: ${node.difficultyRating}/10\n${statusText}`, {
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
            
            // Mark the connection as traversed
            this.markConnectionTraversed(this.currentNode, node.id);
            
            this.movePenguinAlongPath(points, () => {
                // Update current node
                this.currentNode = node.id;
                
                // If this is an unbeaten node, start the level
                if (!this.completedNodes.has(node.id)) {
                    // Update registry before starting level
                    const gameMap = this.registry.get('gameMap');
                    this.registry.set('gameMap', {
                        ...gameMap,
                        currentNode: this.currentNode,
                        completedNodes: Array.from(this.completedNodes),
                        availableNodes: Array.from(this.availableNodes)
                    });
                    
                    if (node.type === 'PERK') {
                        this.scene.start('PerkRoom', {
                            nodeId: node.id,
                            nodeType: node.type,
                            difficultyRating: node.difficultyRating
                        });
                    } else {
                        this.scene.start('TestLevel', { 
                            nodeId: node.id, 
                            nodeType: node.type,
                            difficultyRating: node.difficultyRating
                        });
                    }
                } else {
                    // Just moving to a completed node
                    // Update registry after movement
                    const gameMap = this.registry.get('gameMap');
                    this.registry.set('gameMap', {
                        ...gameMap,
                        currentNode: this.currentNode,
                        completedNodes: Array.from(this.completedNodes),
                        availableNodes: Array.from(this.availableNodes)
                    });
                    
                    this.updateNodeStates();
                    this.updateConnectionStates(); // Make sure connections update too
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
                // Make sure indicator texts remain on top after penguin movement
                this.nodes.forEach(node => {
                    if (node.indicator) {
                        node.indicator.setDepth(1);
                    }
                });
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
        // First update all connections
        this.updateConnectionStates();
        
        this.nodes.forEach(node => {
            if (!node.sprite) return;
            
            // Clear any existing visual indicators
            if (node.checkmark) node.checkmark.destroy();
            if (node.highlight) node.highlight.destroy();
            if (node.glow) node.glow.destroy();
            
            node.checkmark = null;
            node.highlight = null;
            node.glow = null;

            const state = this.getNodeState(node);
            const isCompleted = this.completedNodes.has(node.id);
            
            // Keep icebergs at full opacity and natural color always
            node.sprite.clearTint().setAlpha(1);
            
            // Add appropriate visual indicators based on state
            if (isCompleted) {
                // Completed nodes get a checkmark
                node.checkmark = this.add.text(
                    node.position.x, 
                    node.position.y + 20, // Position below the indicator text
                    '✓', 
                    { 
                        fontSize: '18px',
                        color: '#000000', // Black checkmark
                        stroke: '#ffffff', // White stroke
                        strokeThickness: 2
                    }
                ).setOrigin(0.5);
                
                // Add a subtle completed highlight (blue ring)
                node.highlight = this.add.circle(
                    node.position.x,
                    node.position.y,
                    30, // Slightly larger than the iceberg
                    0x3498db, // Blue color
                    0.3 // Subtle transparency
                ).setDepth(-1); // Behind the iceberg
                
                // Make the checkmark and highlight float with the iceberg
                this.syncFloatingEffects(node);
                
                // Update indicator text appearance for completed nodes
                if (node.indicator) {
                    node.indicator.setAlpha(1); // Keep text fully visible
                }
            } else if (state === NodeState.AVAILABLE_ACTIVE) {
                // Available nodes get a bright highlight to show they're clickable
                node.highlight = this.add.circle(
                    node.position.x,
                    node.position.y,
                    32, // Slightly larger than the iceberg
                    0xf1c40f, // Yellow/gold color
                    0.4 // More visible
                ).setDepth(-1); // Behind the iceberg
                
                // Add a pulsing glow effect to available nodes
                node.glow = this.add.sprite(
                    node.position.x, 
                    node.position.y, 
                    'sparkTexture'
                )
                    .setScale(5)
                    .setAlpha(0.3)
                    .setDepth(-2); // Behind the highlight
                
                this.tweens.add({
                    targets: node.glow,
                    alpha: 0.5,
                    scale: 6,
                    duration: 1500,
                    yoyo: true,
                    repeat: -1
                });
                
                // Make the highlight and glow float with the iceberg
                this.syncFloatingEffects(node);
                
                // Ensure indicator text is fully visible
                if (node.indicator) {
                    node.indicator.setAlpha(1);
                }
            } else {
                // Unavailable nodes get a subtle gray highlight
                node.highlight = this.add.circle(
                    node.position.x,
                    node.position.y,
                    30, // Same size as completed
                    0x95a5a6, // Gray color
                    0.2 // Very subtle
                ).setDepth(-1); // Behind the iceberg
                
                // Make the highlight float with the iceberg
                this.syncFloatingEffects(node);
                
                // Dim the indicator text slightly for unavailable nodes
                if (node.indicator) {
                    node.indicator.setAlpha(0.7); // Still readable but visually distinct
                }
            }

            // ONLY set click functionality for available nodes
            // But keep hover functionality for ALL nodes
            if (state === NodeState.AVAILABLE_ACTIVE || state === NodeState.AVAILABLE_COMPLETED) {
                node.sprite.on('pointerdown', () => this.handleNodeClick(node));
            } else {
                // Remove any existing click listeners but keep hover
                node.sprite.off('pointerdown');
            }
            
            // Make the cursor change to a pointer only for clickable nodes
            node.sprite.on('pointerover', () => {
                if (state === NodeState.AVAILABLE_ACTIVE || state === NodeState.AVAILABLE_COMPLETED) {
                    this.game.canvas.style.cursor = 'pointer';
                }
            });
            
            node.sprite.on('pointerout', () => {
                this.game.canvas.style.cursor = 'default';
            });
        });
    }

    updateConnectionStates() {
        if (!this.connectionGraphics) return;
        
        this.connectionGraphics.forEach(connection => {
            const fromNode = this.nodes.find(n => n.id === connection.fromNodeId);
            const toNode = this.nodes.find(n => n.id === connection.toNodeId);
            
            if (!fromNode || !toNode) return;
            
            // Clear previous drawing
            connection.graphics.clear();
            
            // Get states for both nodes
            const fromNodeState = this.getNodeState(fromNode);
            const toNodeState = this.getNodeState(toNode);
            
            // Check if either node is the current node
            const isFromCurrent = fromNode.id === this.currentNode;
            const isToCurrent = toNode.id === this.currentNode;
            
            // Check if both nodes are completed (traversed path)
            const isTraversed = this.completedNodes.has(fromNode.id) && this.completedNodes.has(toNode.id);
            
            // A path is active if:
            // 1. It connects to the current node and leads to an available node
            // 2. It connects two completed nodes (has been traversed)
            const isActive = 
                (isFromCurrent && (toNodeState === NodeState.AVAILABLE_ACTIVE || toNodeState === NodeState.AVAILABLE_COMPLETED)) ||
                (isToCurrent && (fromNodeState === NodeState.AVAILABLE_ACTIVE || fromNodeState === NodeState.AVAILABLE_COMPLETED)) ||
                isTraversed;
            
            // Update connection state
            connection.isActive = isActive;
            connection.isTraversed = isTraversed;
            
            // Set appropriate style based on state
            if (isTraversed) {
                // Traversed paths get a bright, solid appearance
                connection.graphics.lineStyle(4, 0x3498db, 0.8); // Bright blue, more visible
            } else if (isActive) {
                // Active but not traversed paths get a bright, slightly transparent appearance
                connection.graphics.lineStyle(3, 0x2ecc71, 0.7); // Green, fairly visible
            } else {
                // Inactive paths get a dim appearance
                connection.graphics.lineStyle(2, 0x6ECFF6, 0.3); // Light blue, very subtle
            }
            
            // Redraw the path with the new style
            this.drawWavyPath(
                connection.graphics, 
                fromNode.position.x, fromNode.position.y,
                toNode.position.x, toNode.position.y
            );
            
            // Add animation only to active paths
            if (isActive) {
                // If we don't already have a tween for this connection
                if (!connection.tween) {
                    connection.tween = this.tweens.add({
                        targets: connection.graphics,
                        alpha: isTraversed ? 0.9 : 0.6, // Traversed paths pulse less
                        duration: isTraversed ? 3000 : 2000, // Traversed paths pulse slower
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.InOut'
                    });
                }
            } else if (connection.tween) {
                // Remove animation from inactive paths
                connection.tween.stop();
                connection.tween = null;
                connection.graphics.setAlpha(1);
            }
        });
    }

    drawWavyPath(graphics, startX, startY, endX, endY) {
        // Calculate the distance and angle between nodes
        const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
        const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY);
        
        // Create a wavy path with multiple segments
        graphics.beginPath();
        graphics.moveTo(startX, startY);
        
        // Number of segments in the path
        const segments = 12;
        
        for (let i = 1; i <= segments; i++) {
            // Calculate position along the straight line
            const t = i / segments;
            const x = startX + (endX - startX) * t;
            const y = startY + (endY - startY) * t;
            
            // Add a perpendicular offset to create a wave
            // The sine function creates the wave pattern
            const waveAmplitude = 10; // How high the waves are
            const waveFrequency = 3;  // How many waves along the path
            
            const perpX = Math.sin(angle + Math.PI/2);
            const perpY = Math.cos(angle + Math.PI/2);
            
            const offset = Math.sin(t * Math.PI * waveFrequency) * waveAmplitude;
            
            // Draw to the next point with the wave offset applied
            graphics.lineTo(
                x + perpX * offset,
                y - perpY * offset
            );
        }
        
        graphics.strokePath();
    }

    syncFloatingEffects(node) {
        // Make visual indicators float with their iceberg
        if (!node.sprite || !node.sprite.floatTween) return;
        
        const floatDistance = node.sprite.floatDistance || 3;
        const floatDuration = node.sprite.floatDuration || 3000;
        const startDelay = node.sprite.startDelay || 0;
        
        // Sync highlight
        if (node.highlight) {
            this.tweens.add({
                targets: node.highlight,
                y: node.highlight.y + floatDistance,
                duration: floatDuration,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: startDelay
            });
        }
        
        // Sync checkmark
        if (node.checkmark) {
            this.tweens.add({
                targets: node.checkmark,
                y: node.checkmark.y + floatDistance,
                duration: floatDuration,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: startDelay
            });
        }
        
        // Sync glow
        if (node.glow) {
            this.tweens.add({
                targets: node.glow,
                y: node.glow.y + floatDistance,
                duration: floatDuration,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: startDelay
            });
        }
        
        // Sync indicator text
        if (node.indicator && !node.indicator.floatTween) {
            node.indicator.floatTween = this.tweens.add({
                targets: node.indicator,
                y: node.indicator.y + floatDistance,
                duration: floatDuration,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: startDelay
            });
        }
    }

    markConnectionTraversed(fromNodeId, toNodeId) {
        // Find the connection and mark it as traversed
        const connection = this.connectionGraphics.find(c => 
            (c.fromNodeId === fromNodeId && c.toNodeId === toNodeId) ||
            (c.fromNodeId === toNodeId && c.toNodeId === fromNodeId)
        );
        
        if (connection) {
            connection.isTraversed = true;
            
            // Store traversed connections in registry for persistence
            const gameMap = this.registry.get('gameMap');
            if (!gameMap.traversedConnections) {
                gameMap.traversedConnections = [];
            }
            
            // Add this connection if not already stored
            const connectionKey = [fromNodeId, toNodeId].sort().join('-');
            if (!gameMap.traversedConnections.includes(connectionKey)) {
                gameMap.traversedConnections.push(connectionKey);
                this.registry.set('gameMap', gameMap);
            }
            
            // Update the connection visually
            this.updateConnectionStates();
        }
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
                nodeType: 'BATTLE',
                difficultyRating: 1
            });
        });
    }

    initializeTraversedPaths() {
        if (!this.connectionGraphics) return;
        
        // Mark connections between completed nodes as traversed
        this.connectionGraphics.forEach(connection => {
            const fromNode = this.nodes.find(n => n.id === connection.fromNodeId);
            const toNode = this.nodes.find(n => n.id === connection.toNodeId);
            
            if (this.completedNodes.has(fromNode.id) && this.completedNodes.has(toNode.id)) {
                connection.isTraversed = true;
            }
        });
        
        // Update the visual state of all connections
        this.updateConnectionStates();
    }

    completeNode(nodeId) {
        // Mark the node as completed
        this.completedNodes.add(nodeId);
        
        // Update available nodes based on connections
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            node.connections.forEach(connId => {
                this.availableNodes.add(connId);
            });
        }
        
        // Update registry
        const gameMap = this.registry.get('gameMap');
        this.registry.set('gameMap', {
            ...gameMap,
            currentNode: nodeId,
            completedNodes: Array.from(this.completedNodes),
            availableNodes: Array.from(this.availableNodes)
        });
        
        // Update visual states
        this.updateNodeStates();
        this.updateConnectionStates();
    }
} 