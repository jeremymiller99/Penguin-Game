'use strict';

class Gun extends Phaser.GameObjects.Container {
    constructor(scene, x, y, isAIControlled = false) {
        super(scene, x, y);
        
        this.isAIControlled = isAIControlled;
        this.player = null;
        
        // Initialize gun properties
        this.shotsPerSecond = 10;
        this.fireDelay = 1000 / this.shotsPerSecond;
        this.damage = 50;
        this.maxAmmo = 30;
        this.currentAmmo = this.maxAmmo;
        this.reloadTime = 1000;
        this.lastFired = 0;
        this.isReloading = false;
        this.isFiring = false;

        // Add gun sprite with offset
        this.gunSprite = scene.add.sprite(20, 0, 'ak47')
            .setOrigin(0.5, 0.5)
            .setScale(2);
        this.add(this.gunSprite);

        // Create bullets group
        this.bullets = scene.physics.add.group({
            classType: Bullet,
            runChildUpdate: true,
            collideWorldBounds: false,
            allowGravity: false
        });

        // Add muzzle flash with adjusted position
        this.muzzleFlash = scene.add.sprite(60, 0, 'sparkTexture')
            .setOrigin(0.5)
            .setScale(0.5)
            .setVisible(false);
        this.add(this.muzzleFlash);

        // Define bullet spawn point with new offset
        this.bulletSpawnPoint = { x: 22, y: 0 };

        // Add mouse input handling if not AI controlled
        if (!isAIControlled) {
            scene.input.on('pointerdown', () => {
                this.isFiring = true;
            });
            
            scene.input.on('pointerup', () => {
                this.isFiring = false;
            });
        }

        scene.add.existing(this);
    }

    assignToPlayer(newPlayer) {
        if (newPlayer.gun && newPlayer.gun !== this) {
            console.warn('Player already has a different gun assigned');
            return;
        }
        
        this.player = newPlayer;
        newPlayer.gun = this;
        this.isAIControlled = newPlayer instanceof RangedEnemy;
    }

    update(time) {
        if (!this.player) return;

        // Update position to follow owner
        this.setPosition(this.player.x, this.player.y);

        // Handle rotation based on control type
        if (this.isAIControlled) {
            const player = this.scene.penguin;
            if (player) {
                this.rotation = Phaser.Math.Angle.Between(
                    this.x, this.y,
                    player.x, player.y
                );
            }
        } else {
            const pointer = this.scene.input.activePointer;
            this.rotation = Phaser.Math.Angle.Between(
                this.x, this.y,
                pointer.worldX, pointer.worldY
            );
        }

        this.gunSprite.flipY = Math.abs(this.rotation) > Math.PI / 2;

        // Handle auto-fire when mouse is held down
        if (this.isFiring && !this.isReloading && this.currentAmmo > 0) {
            if (time - this.lastFired >= this.fireDelay) {
                this.fire(time);
            }
        }
    }

    fire(time) {
        if (this.isReloading || (time - this.lastFired) < this.fireDelay || this.currentAmmo <= 0) return false;

        // Play gunshot sound with slight variation
        this.scene.sound.play('ak47shot', { 
            volume: 0.3,  // Lower volume since it will play frequently
            rate: 0.9 + Math.random() * 0.2  // Random pitch between 0.9 and 1.1
        });

        // Calculate bullet spawn position
        const adjustedSpawnPointY = this.gunSprite.flipY ? -this.bulletSpawnPoint.y : this.bulletSpawnPoint.y;
        const rotatedSpawnPoint = {
            x: this.bulletSpawnPoint.x * Math.cos(this.rotation) - adjustedSpawnPointY * Math.sin(this.rotation),
            y: this.bulletSpawnPoint.x * Math.sin(this.rotation) + adjustedSpawnPointY * Math.cos(this.rotation)
        };
        
        const bullet = this.bullets.get(
            this.x + rotatedSpawnPoint.x,
            this.y + rotatedSpawnPoint.y,
            'bullet'
        );

        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.source = this.isAIControlled ? 'enemy' : 'player'; // Set the bullet source
            bullet.fire(this.x + rotatedSpawnPoint.x, this.y + rotatedSpawnPoint.y, this.rotation);

            // Show the muzzle flash briefly
            for (let i = 0; i < 5; i++) {
                const angle = this.rotation + (Math.random() - 0.5) * Math.PI / 4; // Random spread
                const distance = 10 + Math.random() * 10; // Random distance from muzzle
                const flash = this.scene.add.sprite(
                    this.x + rotatedSpawnPoint.x + Math.cos(angle) * distance,
                    this.y + rotatedSpawnPoint.y + Math.sin(angle) * distance,
                    'muzzleFlash'
                );

                flash.setRotation(Math.random() * Math.PI * 2);
                flash.setAlpha(1);
                flash.setScale(2 + Math.random() * 0.5);

                // Fade out and destroy
                this.scene.tweens.add({
                    targets: flash,
                    alpha: 0,
                    scale: 0.1,
                    duration: 100,
                    onComplete: () => flash.destroy()
                });
            }

            // Decrease ammo and update last fired time
            this.currentAmmo--;
            this.lastFired = time;
        }
        return true;
    }

    reload() {
        // Reload the gun if not already reloading
        if (this.isReloading) {
            console.log('Already reloading...');
            return;
        }

        console.log('Starting reload...');
        this.isReloading = true;

        // Add spinning animation
        this.scene.tweens.add({
            targets: this.gunSprite,
            rotation: Math.PI * 4, // Spin around twice
            duration: this.reloadTime,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
                // Reset rotation at end
                this.gunSprite.rotation = 0;
            }
        });

        this.scene.time.delayedCall(this.reloadTime, () => {
            this.currentAmmo = this.maxAmmo;
            this.isReloading = false;
            console.log('Reload complete. Ammo refilled to:', this.currentAmmo);
        });
    }

    drop() {
        console.log('Dropping gun, previous owner:', this.player?.constructor.name);
        const dropX = this.player ? this.player.x : this.x;
        const dropY = this.player ? this.player.y : this.y;
        
        // Remove gun reference from previous owner
        if (this.player) {
            this.player.gun = null;
        }
        
        this.player = null;
        this.isDropped = true;
        this.isAIControlled = false;
        
        this.setPosition(dropX, dropY);
        this.setScale(1.5);
        this.gunSprite.setAlpha(0.8);
        
        // Enable physics body when dropped if it exists
        if (this.body) {
            this.body.enable = true;
        }
        console.log('Gun dropped at:', { x: dropX, y: dropY, isDropped: this.isDropped });
    }

    pickup(newPlayer) {
        console.log('Pickup called with player:', newPlayer?.constructor.name);
        
        // If new player already has a gun, make them drop it
        if (newPlayer.gun) {
            newPlayer.gun.drop();
        }
        
        // Disable physics body when picked up
        if (this.body) {
            this.body.enable = false;
        }
        
        // Assign to new player
        this.assignToPlayer(newPlayer);
        this.isDropped = false;
        
        // Set AI control based on player type
        this.isAIControlled = newPlayer instanceof RangedEnemy;
        
        // Reset ammo when picked up by player (not AI)
        if (!this.isAIControlled) {
            this.currentAmmo = this.maxAmmo;
        }
        
        this.setPosition(newPlayer.x, newPlayer.y);
        this.setScale(1);
        this.gunSprite.setAlpha(1);

        console.log('Gun picked up by:', newPlayer?.constructor.name, 'AI controlled:', this.isAIControlled);
    }
}