class PathNode {
    constructor(x, y, cost = 0, heuristic = 0) {
        this.x = x;
        this.y = y;
        this.cost = cost;          // G cost (distance from start)
        this.heuristic = heuristic; // H cost (estimated distance to goal)
        this.parent = null;        // Reference to parent node for path reconstruction
    }
    
    // F cost (total estimated cost)
    get totalCost() {
        return this.cost + this.heuristic;
    }
    
    // For comparing nodes in the priority queue
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }
}

class Pathfinding {
    constructor(scene) {
        this.scene = scene;
        this.tileSize = 32; // Default tile size (scaled)
        this.gridResolution = 16; // Size of each pathfinding grid cell
        this.maxPathLength = 20; // Maximum number of nodes in a path
        this.maxIterations = 100; // Prevent infinite loops
    }
    
    // Calculate Manhattan distance heuristic
    calculateHeuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }
    
    // Check if a position is walkable (not colliding with obstacles)
    isWalkable(x, y) {
        // Add a safety margin around obstacles
        const safetyMargin = 8; // pixels to keep away from obstacles
        
        // Check world bounds with safety margin
        const bounds = this.scene.physics.world.bounds;
        if (x < bounds.x + 16 + safetyMargin || 
            x > bounds.right - 16 - safetyMargin || 
            y < bounds.y + 16 + safetyMargin || 
            y > bounds.bottom - 16 - safetyMargin) {
            return false;
        }
        
        // Check multiple points around the position to ensure we don't get too close to walls
        const checkPoints = [
            { x: x, y: y },                           // Center
            { x: x + safetyMargin, y: y },            // Right
            { x: x - safetyMargin, y: y },            // Left
            { x: x, y: y + safetyMargin },            // Bottom
            { x: x, y: y - safetyMargin },            // Top
            { x: x + safetyMargin, y: y + safetyMargin }, // Bottom-right
            { x: x - safetyMargin, y: y + safetyMargin }, // Bottom-left
            { x: x + safetyMargin, y: y - safetyMargin }, // Top-right
            { x: x - safetyMargin, y: y - safetyMargin }  // Top-left
        ];
        
        // Check each point for collisions
        for (const point of checkPoints) {
            // Convert world coordinates to tile coordinates
            const tileX = Math.floor(point.x / this.tileSize);
            const tileY = Math.floor(point.y / this.tileSize);
            
            // Check buildings layer for collisions
            if (this.scene.buildingsLayer) {
                const tile = this.scene.buildingsLayer.getTileAt(tileX, tileY);
                if (tile && tile.collides) {
                    return false;
                }
            }
            
            // Check background layer for collisions
            if (this.scene.backgroundLayer) {
                const tile = this.scene.backgroundLayer.getTileAt(tileX, tileY);
                if (tile && tile.collides) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    // Check if a position is inside a building
    isInsideBuilding(x, y) {
        // Convert world coordinates to tile coordinates
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        
        // Check buildings layer
        if (this.scene.buildingsLayer) {
            const tile = this.scene.buildingsLayer.getTileAt(tileX, tileY);
            if (tile && tile.collides) {
                return true;
            }
        }
        
        // Check background layer for non-walkable tiles
        if (this.scene.backgroundLayer) {
            const tile = this.scene.backgroundLayer.getTileAt(tileX, tileY);
            if (tile && tile.collides) {
                return true;
            }
        }
        
        return false;
    }
    
    // Get neighboring grid positions
    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -this.gridResolution }, // Up
            { x: this.gridResolution, y: 0 },  // Right
            { x: 0, y: this.gridResolution },  // Down
            { x: -this.gridResolution, y: 0 }, // Left
            // Diagonals (optional, but helps with smoother paths)
            { x: this.gridResolution, y: -this.gridResolution }, // Up-Right
            { x: this.gridResolution, y: this.gridResolution },  // Down-Right
            { x: -this.gridResolution, y: this.gridResolution }, // Down-Left
            { x: -this.gridResolution, y: -this.gridResolution } // Up-Left
        ];
        
        for (const dir of directions) {
            const newX = node.x + dir.x;
            const newY = node.y + dir.y;
            
            // Check if the position is walkable
            if (this.isWalkable(newX, newY)) {
                // Calculate movement cost (diagonal movement costs more)
                let moveCost = 10; // Base cost for orthogonal movement
                if (dir.x !== 0 && dir.y !== 0) {
                    moveCost = 14; // Approximate cost for diagonal movement (√2 * 10)
                }
                
                neighbors.push({
                    x: newX,
                    y: newY,
                    cost: moveCost
                });
            }
        }
        
        return neighbors;
    }
    
    // Get a path from start to end position
    getPath(startX, startY, endX, endY) {
        // If either start or end is not walkable, return empty path
        if (!this.isWalkable(startX, startY) || !this.isWalkable(endX, endY)) {
            return [];
        }
        
        // Implementation of A* pathfinding algorithm
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        
        // Cost from start to current node
        const gScore = new Map();
        // Estimated total cost from start to goal through current node
        const fScore = new Map();
        
        // Helper function to get node key
        const getNodeKey = (x, y) => `${Math.floor(x / this.gridResolution)},${Math.floor(y / this.gridResolution)}`;
        
        // Initialize start node
        const startKey = getNodeKey(startX, startY);
        gScore.set(startKey, 0);
        fScore.set(startKey, this.calculateHeuristic(startX, startY, endX, endY));
        
        // Add start node to open set
        openSet.push({
            x: startX,
            y: startY,
            key: startKey,
            f: fScore.get(startKey)
        });
        
        // Main A* loop
        let iterations = 0;
        while (openSet.length > 0 && iterations < this.maxIterations) {
            iterations++;
            
            // Sort open set by f-score (lowest first)
            openSet.sort((a, b) => a.f - b.f);
            
            // Get node with lowest f-score
            const current = openSet.shift();
            
            // If we've reached the goal (or close enough)
            if (Phaser.Math.Distance.Between(current.x, current.y, endX, endY) < this.gridResolution) {
                // Reconstruct path
                return this.reconstructPath(cameFrom, current, startKey);
            }
            
            // Add current node to closed set
            closedSet.add(current.key);
            
            // Check neighbors
            const directions = [
                { x: 0, y: -1 },  // Up
                { x: 1, y: -1 },  // Up-right
                { x: 1, y: 0 },   // Right
                { x: 1, y: 1 },   // Down-right
                { x: 0, y: 1 },   // Down
                { x: -1, y: 1 },  // Down-left
                { x: -1, y: 0 },  // Left
                { x: -1, y: -1 }  // Up-left
            ];
            
            for (const dir of directions) {
                const neighborX = current.x + dir.x * this.gridResolution;
                const neighborY = current.y + dir.y * this.gridResolution;
                const neighborKey = getNodeKey(neighborX, neighborY);
                
                // Skip if in closed set
                if (closedSet.has(neighborKey)) {
                    continue;
                }
                
                // Skip if not walkable
                if (!this.isWalkable(neighborX, neighborY)) {
                    continue;
                }
                
                // Calculate tentative g-score
                const tentativeGScore = (gScore.get(current.key) || Infinity) + 
                    (dir.x !== 0 && dir.y !== 0 ? 1.414 : 1) * this.gridResolution;
                
                // If this path is better than any previous one
                if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
                    // Record this path
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    
                    // Calculate f-score
                    const h = this.calculateHeuristic(neighborX, neighborY, endX, endY);
                    fScore.set(neighborKey, tentativeGScore + h);
                    
                    // Add to open set if not already there
                    const existingIndex = openSet.findIndex(node => node.key === neighborKey);
                    if (existingIndex === -1) {
                        openSet.push({
                            x: neighborX,
                            y: neighborY,
                            key: neighborKey,
                            f: tentativeGScore + h
                        });
                    } else {
                        // Update existing node
                        openSet[existingIndex].f = tentativeGScore + h;
                    }
                }
            }
        }
        
        // No path found
        return [];
    }
    
    // Reconstruct path from A* search
    reconstructPath(cameFrom, current, startKey) {
        const path = [{ x: current.x, y: current.y }];
        let currentKey = current.key;
        
        while (currentKey !== startKey && path.length < this.maxPathLength) {
            const previous = cameFrom.get(currentKey);
            if (!previous) break;
            
            path.unshift({ x: previous.x, y: previous.y });
            currentKey = previous.key;
        }
        
        // Remove the first node (start position) to avoid redundancy
        if (path.length > 1) {
            path.shift();
        }
        
        return path;
    }
    
    // Debug method to visualize the path
    debugDrawPath(path, color = 0xff0000) {
        if (!path || path.length === 0) return;
        
        // Clear any existing debug graphics
        if (this.debugGraphics) {
            this.debugGraphics.clear();
        } else {
            this.debugGraphics = this.scene.add.graphics();
        }
        
        // Draw the path
        this.debugGraphics.lineStyle(2, color, 1);
        this.debugGraphics.beginPath();
        
        // Move to the first point
        this.debugGraphics.moveTo(path[0].x, path[0].y);
        
        // Draw lines to each subsequent point
        for (let i = 1; i < path.length; i++) {
            this.debugGraphics.lineTo(path[i].x, path[i].y);
        }
        
        this.debugGraphics.strokePath();
        
        // Draw points at each waypoint
        this.debugGraphics.fillStyle(0xffff00, 1);
        for (const point of path) {
            this.debugGraphics.fillCircle(point.x, point.y, 3);
        }
    }
} 