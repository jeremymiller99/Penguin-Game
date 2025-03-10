class Building extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, config = {}) {
        // Use a default building sprite, but allow customization
        super(scene, x, y, config.texture || 'building');
        
        this.scene = scene;
        this.config = {
            texture: config.texture || 'building',
            scale: config.scale || 1.5,
            difficulty: config.difficulty || scene.difficultyRating,
            buildingType: config.buildingType || 'standard', // standard, shop, elite, etc.
            interiorKey: config.interiorKey || null, // Optional specific interior map key
            enemyMultiplier: config.enemyMultiplier || 1.0, // Adjust enemy count inside
            lootMultiplier: config.lootMultiplier || 1.0, // Adjust loot inside
            doorPosition: config.doorPosition || { x: 0, y: 10 } // Door offset from center
        };
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // true = static body (buildings don't move)
        
        // Set up the building appearance
        this.setScale(this.config.scale);
        
        // Create a door indicator
        this.createDoorIndicator();
        
        // Create interaction zone (slightly larger than the door)
        this.createInteractionZone();
        
        // Add hover effect
        this.setInteractive({ useHandCursor: true });
        this.on('pointerover', this.onHoverStart, this);
        this.on('pointerout', this.onHoverEnd, this);
        
        // Track if player is in range to enter
        this.playerInRange = false;
    }
    
    createDoorIndicator() {
        // Create a door visual at the bottom of the building
        const doorOffset = this.config.doorPosition;
        
        this.door = this.scene.add.rectangle(
            this.x + doorOffset.x, 
            this.y + doorOffset.y, 
            20, 
            30, 
            0x553311
        );
        
        // Add a small light above the door
        this.doorLight = this.scene.add.circle(
            this.x + doorOffset.x,
            this.y + doorOffset.y - 20,
            5,
            0xffff00,
            0.7
        );
        
        // Make the light pulse gently
        this.scene.tweens.add({
            targets: this.doorLight,
            alpha: 0.3,
            duration: 1500,
            yoyo: true,
            repeat: -1
        });
    }
    
    createInteractionZone() {
        // Create an invisible zone around the door for interaction
        const doorOffset = this.config.doorPosition;
        
        this.interactionZone = this.scene.add.zone(
            this.x + doorOffset.x,
            this.y + doorOffset.y,
            40,  // Wider than the door
            50   // Taller than the door
        );
        
        this.scene.physics.world.enable(this.interactionZone);
        this.interactionZone.body.setAllowGravity(false);
        this.interactionZone.body.moves = false;
        
        // Add overlap detection with player
        this.scene.physics.add.overlap(
            this.scene.penguin,
            this.interactionZone,
            this.handlePlayerOverlap,
            null,
            this
        );
    }
    
    handlePlayerOverlap() {
        if (!this.playerInRange) {
            this.playerInRange = true;
            this.showEnterPrompt();
        }
        
        // Check for key press to enter building
        if (this.scene.keys.pickup.isDown && !this.enterKeyPressed) {
            this.enterKeyPressed = true;
            this.enterBuilding();
        }
        
        if (!this.scene.keys.pickup.isDown) {
            this.enterKeyPressed = false;
        }
    }
    
    showEnterPrompt() {
        // Show a prompt above the door
        const doorOffset = this.config.doorPosition;
        
        if (this.enterPrompt) {
            this.enterPrompt.destroy();
        }
        
        this.enterPrompt = this.scene.add.text(
            this.x + doorOffset.x,
            this.y + doorOffset.y - 50,
            'Press E to enter',
            {
                fontSize: '16px',
                fill: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 5, y: 3 }
            }
        ).setOrigin(0.5);
        
        // Add a small bounce animation
        this.scene.tweens.add({
            targets: this.enterPrompt,
            y: this.enterPrompt.y - 5,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }
    
    hideEnterPrompt() {
        if (this.enterPrompt) {
            this.enterPrompt.destroy();
            this.enterPrompt = null;
        }
        this.playerInRange = false;
    }
    
    onHoverStart() {
        // Visual feedback on hover
        this.setTint(0xdddddd);
        
        // Show building info tooltip
        this.showBuildingInfo();
    }
    
    onHoverEnd() {
        // Remove hover effects
        this.clearTint();
        
        // Hide building info
        if (this.infoTooltip) {
            this.infoTooltip.destroy();
            this.infoTooltip = null;
        }
    }
    
    showBuildingInfo() {
        // Create a tooltip with building information
        if (this.infoTooltip) {
            this.infoTooltip.destroy();
        }
        
        // Get building type name for display
        let typeName = "Building";
        let typeColor = "#ffffff";
        
        if (this.config.buildingType === 'shop') {
            typeName = "Shop";
            typeColor = "#44ff44";
        } else {
            typeName = "Combat Room";
            typeColor = "#ff8800";
        }
        
        // Create tooltip container
        this.infoTooltip = this.scene.add.container(this.x, this.y - 100);
        
        // Background
        const bg = this.scene.add.rectangle(0, 0, 180, 70, 0x000000, 0.8);
        bg.setStrokeStyle(2, 0xffffff, 0.5);
        
        // Title
        const title = this.scene.add.text(0, -25, typeName, {
            fontSize: '18px',
            fontFamily: 'Arial',
            fill: typeColor,
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Difficulty
        const difficulty = this.scene.add.text(0, 0, `Difficulty: ${this.config.difficulty}/10`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Add components to tooltip
        this.infoTooltip.add([bg, title, difficulty]);
    }
    
    enterBuilding() {
        // Save current level state
        this.scene.saveGameState();
        
        console.log(`Entering ${this.config.buildingType} building`);
        
        // Create data to pass to the TestLevel scene
        const interiorData = {
            isInterior: true,
            parentScene: this.scene.scene.key,
            difficulty: this.config.difficulty,
            buildingType: this.config.buildingType,
            nodeId: this.scene.currentNodeId,
            nodeType: this.scene.nodeType,
            playerPosition: {
                x: this.scene.penguin.x,
                y: this.scene.penguin.y
            }
        };
        
        // Transition to TestLevel scene with interior flag
        this.scene.scene.start('TestLevel', interiorData);
    }
    
    update() {
        // Check if player has moved away from the interaction zone
        if (this.playerInRange) {
            const distance = Phaser.Math.Distance.Between(
                this.scene.penguin.x, 
                this.scene.penguin.y,
                this.interactionZone.x,
                this.interactionZone.y
            );
            
            if (distance > 50) {
                this.hideEnterPrompt();
            }
        }
    }
    
    destroy() {
        // Clean up all associated objects
        if (this.door) this.door.destroy();
        if (this.doorLight) this.doorLight.destroy();
        if (this.interactionZone) this.interactionZone.destroy();
        if (this.enterPrompt) this.enterPrompt.destroy();
        if (this.infoTooltip) this.infoTooltip.destroy();
        
        super.destroy();
    }
    enterBuilding() {
        console.log(`Entering building of type: ${this.buildingType}`);
        
        // Store the player's position for when they exit
        const returnPosition = {
            x: this.scene.penguin.x,
            y: this.scene.penguin.y
        };
        
        // Save the current scene state
        this.scene.saveGameState();
        
        // Create data to pass to the interior scene
        const interiorData = {
            isInterior: true,
            parentScene: this.scene.scene.key,
            buildingType: this.buildingType,
            difficulty: this.scene.difficultyRating,
            nodeId: this.scene.currentNodeId,
            nodeType: this.scene.nodeType,
            playerPosition: returnPosition,
            playerCurrency: this.scene.playerCurrency
        };
        
        // Start the BuildingInterior scene
        this.scene.scene.start('BuildingInterior', interiorData);
    } 
} 