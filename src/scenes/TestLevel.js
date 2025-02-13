class TestLevel extends Phaser.Scene {
    constructor() {
        super('TestLevel');
        this.playerCurrency = 0;
        this.cash = null;
        this.currencyText = null;
        this.isGameFrozen = false;
    }

    create() {
        // Set the background color of the scene
        this.cameras.main.setBackgroundColor('#87CEEB');

        // Create the tilemap using the loaded JSON
        const map = this.make.tilemap({ key: 'test_map' });
        console.log('Map created:', map);

        // Add the tileset image to the mapdw
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

        // Create a group for walls and add collision detection with bullets
        this.walls = this.add.group();
        this.physics.add.collider(this.ak47.bullets, this.walls, this.handleBulletImpact, null, this);

        // Create a text object to display the ammo count
        this.ammoText = this.add.text(10, 10, 'Ammo: ' + this.ak47.currentAmmo, {
            fontSize: '20px',
            fill: '#ffffff'
        });

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

        // Add collision between bullets and crates
        this.physics.add.collider(this.ak47.bullets, this.crates, (bullet, crate) => {
            bullet.destroy();

            // Ensure the crate is an instance of Crate before calling explode()
            if (crate instanceof Crate) {
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
                        if (enemy.health) {
                            enemy.health -= damage;
                            if (enemy.health <= 0) {
                                enemy.die();
                            }
                        }

                        enemy.setTint(0xff0000);
                        this.time.delayedCall(100, () => {
                            enemy.clearTint();
                        });
                    }
                });

                crate.explode();
            } else {
                console.error("Collision object is not a Crate instance:", crate);
            }
        });

        
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

        // Create health bars
        this.playerHealthBar = this.drawHealthBar(this.penguin, 10, 40);

        // Add cash group
        this.cash = this.physics.add.group({
            classType: Cash,
            runChildUpdate: true
        });

        // Add currency text display (add after ammoText creation)
        this.currencyText = this.add.text(10, 70, 'Cash: ' + this.playerCurrency, {
            fontSize: '20px',
            fill: '#ffffff'
        });

        // Add collision between penguin and coins
        this.physics.add.overlap(this.penguin, this.cash, (penguin, cash) => {
            this.playerCurrency += cash.value;
            this.currencyText.setText('Cash: ' + this.playerCurrency);
            
            // Play pickup sound
            this.sound.play('cashPickup', { 
                volume: 0.5,
                rate: 1
            });
            
            cash.destroy();
        }, null, this);

        // Add this at the end of create()
        this.startCountdown();
    }

    update() {
        if (this.isGameFrozen) return;
        

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

        // Update the gun
        this.ak47.update(this.time.now);

        // Update the ammo count display
        this.ammoText.setText('Ammo: ' + this.ak47.currentAmmo);

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
            // Spawn 1-3 cash drops
            const cashCount = Phaser.Math.Between(1, 3);
            for (let i = 0; i < cashCount; i++) {
                this.cash.add(new Cash(this, enemy.x, enemy.y));
            }
            
            // Check if all enemies are dead
            if (this.enemies.getChildren().length === 1) { // 1 because this enemy hasn't been removed yet
                this.spawnLadder();
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
            // Handle level completion here
            console.log('Level Complete!');
            this.scene.start('TestLevel');
            // You can add your level completion logic here
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
}