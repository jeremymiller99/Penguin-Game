class TestLevel extends Phaser.Scene {
    constructor() {
        super('TestLevel');
        this.playerCurrency = 0;
        this.cash = null;
        this.currencyText = null;
        this.isGameFrozen = false;
        this.floorLevel = 1; // Initialize Floor Level
        this.highScore = this.getHighScore(); // Load high score from storage
        this.floorLevelText = null;
        this.highscoreText = null;
    }

    create() {
        // Set the background color of the scene
        this.cameras.main.setBackgroundColor('#87CEEB');

        // Create the tilemap using the loaded JSON
        const map = this.make.tilemap({ key: 'test_map' });
        console.log('Map created:', map);

        // Add the tileset image to the map
        const tileset = map.addTilesetImage('bg_tileset', 'bg_tileset');
        console.log('Tileset created:', tileset);
        
        // Create the background layer
        const backgroundLayer = map.createLayer('Tile Layer 1', tileset, 0, 0);
        backgroundLayer.setScale(2);

        // Set world bounds to match game config
        this.physics.world.setBounds(0, 0, this.game.config.width, this.game.config.height);

        // Add a penguin sprite to the center of the screen and scale it
        this.penguin = this.add.sprite(this.game.config.width / 2, this.game.config.height / 2, 'penguin').setScale(2);
        this.penguin.health = 100; // Add max health
        this.penguin.maxHealth = 100;

        // Enable physics on the penguin sprite and make it a dynamic body
        this.physics.add.existing(this.penguin, false); // false = dynamic body
        this.penguin.body.setCollideWorldBounds(true);

        // Define keyboard keys for player input
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            pickup: Phaser.Input.Keyboard.KeyCodes.E,
            reload: Phaser.Input.Keyboard.KeyCodes.R
        });

        // Set the movement speed of the penguin
        this.moveSpeed = 200;

        // Create a new gun object and set its scale
        this.ak47 = new Gun(this, this.game.config.width / 2 + 50, this.game.config.height / 2);
        this.ak47.assignToPlayer(this.penguin);

        // Create enemies group
        this.enemies = this.physics.add.group();

        // Randomly spawn 3-6 enemies of random types at random positions
        const numEnemies = Phaser.Math.Between(3, 6);
        const enemyTypes = ['ranged', 'melee', 'default'];
        
        for (let i = 0; i < numEnemies; i++) {
            const randomType = enemyTypes[Phaser.Math.Between(0, enemyTypes.length - 1)];
            const randomX = Phaser.Math.Between(100, this.game.config.width - 100);
            const randomY = Phaser.Math.Between(100, this.game.config.height - 100);
            this.spawnEnemy(randomType, randomX, randomY);
        }

        // Create a physics group to manage crates
        this.crates = this.physics.add.group({
            classType: Crate, // Ensure all objects in the group are instances of Crate
            runChildUpdate: true
        });

        // Spawn 1-3 random crates
        const numCrates = Phaser.Math.Between(1, 3);
        for (let i = 0; i < numCrates; i++) {
            const randomX = Phaser.Math.Between(100, this.game.config.width - 100);
            const randomY = Phaser.Math.Between(100, this.game.config.height - 100);
            const crate = new Crate(this, randomX, randomY);
            this.crates.add(crate);
            crate.setCollideWorldBounds(true);
        }

        // Add collision between penguin and crates with a debug log
        this.physics.add.collider(this.penguin, this.crates, () => {
            console.log('Penguin and crate are colliding!');
        });

        // Add collision between enemies and crates with a debug log
        this.physics.add.collider(this.enemies, this.crates, () => {
            console.log('Enemy and crate are colliding!');
        });

        // Add collision between bullets and crates
        this.physics.add.collider(this.ak47.bullets, this.crates, (bullet, crate) => {
            bullet.destroy();

            // Ensure the crate is an instance of Crate before calling explode()
            if (crate instanceof Crate) {
                this.handleCrateExplosion(crate);
            } else {
                console.error("Collision object is not a Crate instance:", crate);
            }
        });

        // Add collision between enemy bullets and crates
        this.enemies.getChildren().forEach(enemy => {
            if (enemy instanceof RangedEnemy && enemy.gun) {
                this.physics.add.collider(enemy.gun.bullets, this.crates, (bullet, crate) => {
                    bullet.destroy();
                    if (crate instanceof Crate) {
                        this.handleCrateExplosion(crate);
                    }
                });
            }
        });

        // Add collision between bullets and enemies
        this.physics.add.collider(this.ak47.bullets, this.enemies, this.handleBulletEnemyCollision, null, this);

        // Add overlap detection for guns with debug logging
        this.physics.add.overlap(
            this.penguin,
            this.children.list.filter(child => child instanceof Gun),
            (penguin, gun) => {
                console.log('Overlap detected with gun!'); // Log every frame there's an overlap
                
                if (Phaser.Input.Keyboard.JustDown(this.keys.pickup)) {
                    console.log('E key pressed during overlap!');
                    
                    if (gun.isDropped) {
                        console.log('Attempting to pick up dropped gun. Gun state:', {
                            isDropped: gun.isDropped,
                            hasPhysics: gun.body.enable,
                            position: { x: gun.x, y: gun.y }
                        });
                        gun.pickup(penguin);
                    } else if (penguin.gun) {
                        console.log('Attempting to drop current gun. Gun state:', {
                            isDropped: penguin.gun.isDropped,
                            hasPhysics: penguin.gun.body.enable,
                            position: { x: penguin.gun.x, y: penguin.gun.y }
                        });
                        penguin.gun.drop();
                    }
                }
            },
            null,
            this
        );

        // Create HUD container along the top of the screen
        const hudContainer = this.add.container(10, 10);

        // Starting x position
        let xPos = 20;
        const yPos = 30;
        const spacing = 120;
        const iconScale = 3;

        // Health section
        const healthIcon = this.add.sprite(xPos, yPos, 'icn_fish').setScale(iconScale);
        hudContainer.add(healthIcon);
        
        xPos += 30;
        this.playerHealthBar = this.drawHealthBar(this.penguin, xPos, yPos, 160, 14);
        this.playerHealthBar.background.setAlpha(0.3);
        this.playerHealthBar.foreground.setFillStyle(0xff3838);
        const healthGradient = this.add.graphics();
        healthGradient.fillGradientStyle(0xff5555, 0xff3838, 0xff5555, 0xff3838, 0.8);
        hudContainer.add(healthGradient);
        hudContainer.add(this.playerHealthBar.background);
        hudContainer.add(this.playerHealthBar.foreground);

        // Ammo section
        xPos += spacing + 80;
        const ammoIcon = this.add.sprite(xPos, yPos, 'icn_bullet').setScale(iconScale);
        hudContainer.add(ammoIcon);

        xPos += 20;
        this.ammoText = this.add.text(xPos, yPos - 15, this.ak47.currentAmmo + ' / ' + this.ak47.maxAmmo, {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            fontWeight: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });
        hudContainer.add(this.ammoText);

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

        // Floor level section
        xPos += 100;
        const floorIcon = this.add.sprite(xPos, yPos, 'ladder').setScale(2);
        hudContainer.add(floorIcon);

        xPos += 20;
        this.floorLevelText = this.add.text(xPos, yPos - 15, 'Floor ' + this.floorLevel, {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            fontWeight: 'bold',
            fill: '#4287f5',
            stroke: '#000000',
            strokeThickness: 4
        });
        hudContainer.add(this.floorLevelText);

        // Add cash group with enhanced particle effects
        this.cash = this.physics.add.group({
            classType: Cash,
            runChildUpdate: true
        });

        // Add collision between penguin and coins
        this.physics.add.overlap(this.penguin, this.cash, (penguin, cash) => {
            this.playerCurrency += cash.value;
            this.currencyText.setText('$' + this.playerCurrency);
            
            // Play pickup sound
            this.sound.play('cashPickup', { 
                volume: 0.5,
                rate: 1
            });
            
            cash.destroy();
        }, null, this);

        this.spawnShop();
        // Add this at the end of create()
        this.startCountdown();
    }

    update() {
        if (this.isGameFrozen) return;
        
        // Check if penguin is dead
        if (this.penguin.health <= 0) {
            this.checkPenguinDeath();
            return;
        }

        // Calculate the velocity based on input
        const velocity = this.calculateVelocity();
        
        // Apply velocity to penguin's physics body
        if (this.penguin && this.penguin.body) {
            this.penguin.body.setVelocity(velocity.x, velocity.y);
        }

        // Play walking or idle animation based on movement
        const currentAnimation = this.penguin.anims.getName();
        const newAnimation = velocity.x !== 0 || velocity.y !== 0 ? 'walk_right' : 'idle';
        if (currentAnimation !== newAnimation) {
            this.penguin.play(newAnimation, true);
        }

        // Flip the penguin sprite based on direction
        if (velocity.x < 0) {
            this.penguin.flipX = true;
        } else if (velocity.x > 0) {
            this.penguin.flipX = false;
        }

        // Handle pickup and reload actions
        if (Phaser.Input.Keyboard.JustDown(this.keys.pickup)) this.handlePickup();
        if (Phaser.Input.Keyboard.JustDown(this.keys.reload) && this.ak47.player === this.penguin) this.ak47.reload();

        // Auto-reload if ammo is zero
        if (this.ak47.currentAmmo === 0 && this.ak47.player === this.penguin) {
            this.ak47.reload();
        }

        // Update the gun
        this.ak47.update(this.time.now);

        // Update the ammo count display
        this.ammoText.setText(this.ak47.currentAmmo + ' / ' + this.ak47.maxAmmo);

        // Update all enemies
        this.enemies.getChildren().forEach(enemy => {
            enemy.update(this.penguin, this.time.now);
        });

        // Update health bars
        const playerHealthPercent = this.penguin.health / this.penguin.maxHealth;
        this.playerHealthBar.foreground.width = 80 * playerHealthPercent;
    }

    calculateVelocity() {
        // Calculate velocity based on input keys
        const velocity = { x: 0, y: 0 };
        if (this.keys.left.isDown) velocity.x = -this.moveSpeed;
        if (this.keys.right.isDown) velocity.x = this.moveSpeed;
        if (this.keys.up.isDown) velocity.y = -this.moveSpeed;
        if (this.keys.down.isDown) velocity.y = this.moveSpeed;

        // Normalize diagonal movement
        if (velocity.x !== 0 && velocity.y !== 0) {
            const length = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            velocity.x = velocity.x / length * this.moveSpeed;
            velocity.y = velocity.y / length * this.moveSpeed;
        }

        return velocity;
    }

    // Function to check penguin death
    checkPenguinDeath() {
        if (this.penguin.health > 0) return;

        this.penguin.setVisible(false);

        // Play explosion soundd
        this.sound.play('death', {
            volume: 1,
            rate: 1 + Math.random() * 0.5  // Random pitch between 1.0 and 1.5
        });

        // Create explosion effect
        const particleCount = 30;  // More particles
        const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff]; // Added white for extra pop
        
        // Create blood splatter effect
        for (let ring = 0; ring < 3; ring++) { // Reduced ring count
            const delay = ring * 35; // Slower sequence
            const scale = 2 + (ring * 0.6); // Smaller scaling
            
            for (let i = 0; i < particleCount; i++) {
                // Create random angles for splatter look
                const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
                const speed = 200 + Math.random() * 300; // Lower speeds
                const distance = 5 + Math.random() * 20;
                
                // Create blood droplet particle
                const particle = this.add.sprite(
                    this.penguin.x + Math.cos(angle) * distance,
                    this.penguin.y + Math.sin(angle) * distance,
                    'bullet'
                );
                
                // Set to red tint
                particle.setTint(0xff0000);
                particle.setScale(scale * (0.5 + Math.random()));
                particle.setAlpha(0.7 + Math.random() * 0.2);
                
                // Add rotation to particles
                particle.rotation = Math.random() * Math.PI * 2;
                
                this.time.delayedCall(delay, () => {
                    // Initial "burst" tween
                    this.tweens.add({
                        targets: particle,
                        scale: particle.scale * 1.2,
                        duration: 100,
                        onComplete: () => {
                            // Main trajectory tween
                            this.tweens.add({
                                targets: particle,
                                x: particle.x + Math.cos(angle) * speed,
                                y: particle.y + Math.sin(angle) * speed + 200, // Less gravity
                                alpha: 0,
                                scale: scale * 0.2,
                                rotation: particle.rotation + (Math.random() * 3 - 1.5) * Math.PI,
                                duration: 600 + Math.random() * 300,
                                ease: 'Power3.easeOut',
                                onComplete: () => particle.destroy()
                            });
                        }
                    });
                });
            }
        }

        this.isGameFrozen = true;
        this.physics.pause();

        // Show death screen after a short delay to let particles play
        this.time.delayedCall(800, () => {
            this.showDeathScreen();
        });
    }

    // Function to create a death screen with a restart button
    showDeathScreen() {
        const centerX = this.game.config.width / 2;
        const centerY = this.game.config.height / 2;

        // Create dark overlay with fade in
        const overlay = this.add.rectangle(centerX, centerY, this.game.config.width, this.game.config.height, 0x000000, 0);
        overlay.setDepth(10);
        this.tweens.add({
            targets: overlay,
            alpha: 0.97, // Increased darkness further
            duration: 800,
            ease: 'Power3'
        });

        // Create death message with animation
        const deathText = this.add.text(centerX, centerY - 100, 'YOU DIED', {
            fontSize: '64px',
            fill: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { blur: 10, color: '#ff0000', fill: true }
        }).setOrigin(0.5).setDepth(11).setAlpha(0).setScale(0.5);

        // Animate death text
        this.tweens.add({
            targets: deathText,
            alpha: 1,
            scale: 1,
            duration: 800,
            ease: 'Back.out'
        });

        // Array of possible death messages
        const deathMessages = [
            'Lost the battle, but not the war',
            'Keep your head up king',
            'You fought well', 
            'The darkness claims another',
            'Your journey ends here',
            'Even penguins fall in battle',
            'A warrior\'s waddle ends here',
            'The ice flows red today',
            'Not even arctic training could save you',
            'Your flippers fought bravely',
            'The emperor has fallen',
            'A cold day for penguin-kind',
            'Your fish-fueled fury wasn\'t enough'
        ];

        // Show floor reached
        const floorText = this.add.text(centerX, centerY - 20, `Floor ${this.floorLevel}`, {
            fontSize: '36px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(11).setAlpha(0);

        // Show random death message
        const messageText = this.add.text(centerX, centerY + 20, deathMessages[Math.floor(Math.random() * deathMessages.length)], {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(11).setAlpha(0);

        // Show high score
        const highScore = this.getHighScore();
        const highScoreText = this.add.text(centerX, centerY + 60, `High Score: Floor ${highScore}`, {
            fontSize: '24px',
            fill: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(11).setAlpha(0);

        // Fade in stats
        this.tweens.add({
            targets: [floorText, messageText, highScoreText],
            alpha: 1,
            duration: 500,
            delay: 600
        });

        // Create restart button with gradient and glow
        const restartButton = this.add.text(centerX, centerY + 120, 'Restart', {
            fontSize: '36px',
            fill: '#ffffff',
            backgroundColor: '#4a0000',
            padding: { left: 25, right: 25, top: 12, bottom: 12 },
            stroke: '#000000',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5).setInteractive().setDepth(11);

        // Add pulsing effect to button
        this.tweens.add({
            targets: restartButton,
            scale: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });

        // Restart game on button click
        restartButton.on('pointerdown', () => {
            this.scene.restart();
        });

        // Enhanced hover effects
        restartButton.on('pointerover', () => {
            restartButton.setBackgroundColor('#800000');
            restartButton.setScale(1.1);
            this.game.canvas.style.cursor = 'pointer';
        });
        
        restartButton.on('pointerout', () => {
            restartButton.setBackgroundColor('#4a0000');
            restartButton.setScale(1);
            this.game.canvas.style.cursor = 'default';
        });
    }
    
    getHighScore() {
        return localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 1;
    }
    
    setHighScore(newScore) {
        localStorage.setItem('highScore', newScore);
    }
    
    handlePickup() {
        const PICKUP_RANGE = 50; // Distance in pixels within which pickup is possible
        
        // Get all dropped guns in the scene
        const droppedGuns = this.children.list.filter(
            child => child instanceof Gun && child.isDropped
        );
        
        // Find the closest gun within pickup range
        let closestGun = null;
        let closestDistance = PICKUP_RANGE;
        
        droppedGuns.forEach(gun => {
            const distance = Phaser.Math.Distance.Between(
                this.penguin.x, 
                this.penguin.y, 
                gun.x, 
                gun.y
            );
            
            if (distance < closestDistance) {
                closestGun = gun;
                closestDistance = distance;
            }
        });

        // If we found a gun in range, pick it up
        if (closestGun) {
            closestGun.pickup(this.penguin);
            console.log('Picked up gun!');
        } else if (this.penguin.gun) {
            // If no gun to pick up and we have one, drop it
            this.penguin.gun.drop();
            console.log('Dropped gun!');
        }
    }

    handleBulletImpact(bullet) {
        // Create an impact sprite at the bullet's position
        // Create multiple impact particles in a burst pattern
        for (let i = 0; i < 8; i++) {
            const angle = Math.PI * 2 * (i / 8); // Evenly spaced angles
            const distance = 10; // Distance from impact point
            const impact = this.add.sprite(
                bullet.x + Math.cos(angle) * distance,
                bullet.y + Math.sin(angle) * distance,
                'impactImage'
            );
            
            impact.setRotation(angle);
            impact.setAlpha(1);
            impact.setScale(0.3);

            // Fade out and expand
            this.tweens.add({
                targets: impact,
                alpha: 0,
                scale: 0.6,
                duration: 200,
                onComplete: () => impact.destroy()
            });
        }

        // Destroy the bullet
        bullet.destroy();
    }

    handleBulletEnemyCollision(bullet, enemy) {
        bullet.destroy();
        enemy.takeDamage(10);
        
        // If enemy died, spawn cash
        if (enemy.health <= 0) {
            // Emit an event when an enemy is killed
            this.events.emit('enemyKilled');

            // Spawn 1-3 cash drops
            const cashCount = Phaser.Math.Between(1, 3);
            for (let i = 0; i < cashCount; i++) {
                this.cash.add(new Cash(this, enemy.x, enemy.y));
            }

            // Check if all enemies are dead and update shop animation
            if (this.enemies.countActive(true) === 0 && this.shop) {
                this.shop.handleShopSprite(this);
            }
        }

        // Add collision between enemy bullets and player
        if (enemy instanceof RangedEnemy && enemy.gun) {
            this.physics.add.collider(enemy.gun.bullets, this.penguin, (penguin, bullet) => {
                bullet.destroy();
                penguin.health -= enemy.attackDamage;
                
                // Play sound effect
                this.sound.play('hit', {
                    volume: 0.4,
                    rate: 0.8 + Math.random() * 0.4
                });

                // Apply visual feedback
                penguin.setTint(0xff0000);
                this.time.delayedCall(100, () => {
                    penguin.clearTint();
                });
            });
        }
    }

    drawHealthBar(entity, x, y, width = 80, height = 8) {
        // Draw background (red)
        const barBackground = this.add.rectangle(x, y, width, height, 0xff0000);
        barBackground.setOrigin(0, 0.5);
        
        // Draw foreground (green) based on health percentage
        const healthPercentage = entity.health / entity.maxHealth;
        const barForeground = this.add.rectangle(x, y, width * healthPercentage, height, 0x00ff00);
        barForeground.setOrigin(0, 0.5);
        
        return { background: barBackground, foreground: barForeground };
    }

    spawnEnemy(type, x, y) {
        // Ensure enemies spawn at least 200 pixels away from player
        let validPosition = false;
        let spawnX, spawnY;
        
        while (!validPosition) {
            spawnX = Phaser.Math.Between(100, this.game.config.width - 100);
            spawnY = Phaser.Math.Between(100, this.game.config.height - 100);
            
            const distanceFromPlayer = Phaser.Math.Distance.Between(
                spawnX, spawnY, this.penguin.x, this.penguin.y
            );
            
            if (distanceFromPlayer > 200) {
                validPosition = true;
            }
        }
        
        let enemy;
        switch(type) {
            case 'ranged':
                enemy = new RangedEnemy(this, spawnX, spawnY);
                break;
            case 'melee':
                enemy = new MeleeEnemy(this, spawnX, spawnY);
                break;
            default:
                enemy = new Enemy(this, spawnX, spawnY);
        }
        
        this.enemies.add(enemy);
        this.physics.add.collider(enemy, this.penguin);
        
        if (enemy instanceof RangedEnemy && enemy.gun) {
            this.physics.add.collider(enemy.gun.bullets, this.penguin, (penguin, bullet) => {
                bullet.destroy();
                penguin.health -= enemy.attackDamage;
                this.sound.play('hit', {
                    volume: 0.4,
                    rate: 0.8 + Math.random() * 0.4
                });
    
                // Apply visual feedback
                penguin.setTint(0xff0000);
                this.time.delayedCall(100, () => {
                    penguin.clearTint();
                });
            });
        }

        return enemy;
    }

    spawnLadder() {
        // Find a random position away from walls and other objects
        let validPosition = false;
        let x, y;
        
        while (!validPosition) {
            x = Phaser.Math.Between(100, this.game.config.width - 100);
            y = Phaser.Math.Between(100, this.game.config.height - 100);
            
            // Check distance from penguin
            const distanceFromPenguin = Phaser.Math.Distance.Between(
                x, y, this.penguin.x, this.penguin.y
            );
            
            if (distanceFromPenguin > 100) { // Minimum 100 pixels from penguin
                validPosition = true;
            }
        }
        
        this.ladder = new Ladder(this, x, y);
        
        // Add overlap with player
        this.physics.add.overlap(this.penguin, this.ladder, () => {
            console.log('Level Complete!');

            this.floorLevel += 1;
            this.floorLevelText.setText('Floor Level: ' + this.floorLevel);

            // Check if new high score is reached
            if (this.floorLevel > this.highScore) {
                this.highScore = this.floorLevel;
                this.setHighScore(this.highScore); // Save to local storage
                this.highScoreText.setText('High Score: ' + this.highScore);
            }

            this.scene.start('TestLevel');
        });
    }

    startCountdown() {
        // Freeze all physics objects
        this.physics.pause();
        
        // Pause all enemies
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.gun) enemy.gun.bullets.setVelocity(0, 0);
        });
        
        // Pause all player bullets
        if (this.ak47) {
            this.ak47.bullets.setVelocity(0, 0);
        }
        
        // Set game state to frozen
        this.isGameFrozen = true;

        // Create countdown text in center of screen
        this.countdownText = this.add.text(
            this.game.config.width / 2,
            this.game.config.height / 2,
            '3',
            {
                fontSize: '128px',
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 8,
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setAlpha(0).setScale(2);

        // Create the countdown timer
        let count = 3;
        this.countdownTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                // Fade out current number
                this.tweens.add({
                    targets: this.countdownText,
                    alpha: 0,
                    scale: 0.5,
                    duration: 200,
                    onComplete: () => {
                        count--;
                        if (count > 0) {
                            // Show next number
                            this.countdownText.setText(count.toString());
                            this.countdownText.setScale(2);
                            this.tweens.add({
                                targets: this.countdownText,
                                alpha: 1,
                                scale: 1,
                                duration: 200
                            });
                        } else {
                            // End countdown
                            this.countdownText.destroy();
                            this.physics.resume();
                            this.isGameFrozen = false;
                        }
                    }
                });
            },
            repeat: 2
        });

        // Fade in first number
        this.tweens.add({
            targets: this.countdownText,
            alpha: 1,
            scale: 1,
            duration: 200
        });
    }

    // Add this new method to handle crate explosions
    handleCrateExplosion(crate) {
        if (!crate.active || !crate.scene) return; // Skip if crate is already destroyed

        // Get explosion position
        const explosionX = crate.x;
        const explosionY = crate.y;
        const explosionRadius = 350; // Radius in pixels

        // Check if penguin is within blast radius
        const distToPenguin = Phaser.Math.Distance.Between(explosionX, explosionY, this.penguin.x, this.penguin.y);
        if (distToPenguin < explosionRadius) {
            // Deal damage to penguin based on distance
            const damage = Math.floor(50 * (1 - distToPenguin/explosionRadius));
            if (this.penguin.health) {
                this.penguin.health -= damage;
            }
            
            this.penguin.setTint(0xff0000);
            this.time.delayedCall(100, () => {
                this.penguin.clearTint();
            });
        }

        // Check if any enemies are within blast radius
        this.enemies.getChildren().forEach(enemy => {
            const distToEnemy = Phaser.Math.Distance.Between(explosionX, explosionY, enemy.x, enemy.y);
            if (distToEnemy < explosionRadius) {
                const damage = Math.floor(100 * (1 - distToEnemy/explosionRadius));
                enemy.takeDamage(damage);
            }
        });

        // Check for other crates in explosion radius
        this.crates.getChildren().forEach(otherCrate => {
            if (otherCrate !== crate && otherCrate instanceof Crate && otherCrate.active) {
                const distToCrate = Phaser.Math.Distance.Between(explosionX, explosionY, otherCrate.x, otherCrate.y);
                if (distToCrate < explosionRadius) {
                    // Add a small delay to create a chain reaction effect
                    this.time.delayedCall(100, () => {
                        this.handleCrateExplosion(otherCrate);
                    });
                }
            }
        });

        // Trigger the crate explosion effects
        crate.explode();
    }

    spawnCrate() {
        // Ensure crates spawn at least 200 pixels away from player
        let validPosition = false;
        let spawnX, spawnY;
        
        while (!validPosition) {
            spawnX = Phaser.Math.Between(100, this.game.config.width - 100);
            spawnY = Phaser.Math.Between(100, this.game.config.height - 100);
            
            const distanceFromPlayer = Phaser.Math.Distance.Between(
                spawnX, spawnY, this.penguin.x, this.penguin.y
            );
            
            if (distanceFromPlayer > 200) {
                validPosition = true;
            }
        }
        
        const crate = new Crate(this, spawnX, spawnY);
        this.crates.add(crate);
        return crate;
    }

    spawnShop() {
        this.shop = new Shop(this);
        
        // Add collision with player
        this.physics.add.collider(this.penguin, this.shop);

        // Add shop to update loop
        this.events.on('update', () => {
            if (this.shop) {
                this.shop.update(this);
            }
        });
    }
}