// Global variable to store all perk definitions
const PERKS = [
    // Weapon Perks
    {
        id: 'rapid_fire',
        name: 'Rapid Fire',
        description: 'Increases fire rate by 30%',
        icon: 'perk_rapid_fire',
        rarity: 'uncommon',
        type: 'weapon',
        onApply: (scene, player) => {
            if (player.gun) {
                player.gun.originalFireDelay = player.gun.fireDelay;
                player.gun.fireDelay *= 0.7; // Lower delay = faster firing
                console.log(`Applied Rapid Fire: Fire delay reduced from ${player.gun.originalFireDelay} to ${player.gun.fireDelay}`);
            }
        },
        onRemove: (scene, player) => {
            if (player.gun && player.gun.originalFireDelay) {
                player.gun.fireDelay = player.gun.originalFireDelay;
                console.log(`Removed Rapid Fire: Fire delay restored to ${player.gun.fireDelay}`);
            }
        },
        onUpdate: (scene, player) => {
            // Ensure the effect is applied if the player gets a new gun
            if (player.gun && player.gun.fireDelay === undefined) {
                console.log("Reapplying Rapid Fire to new gun");
                if (player.gun.originalFireDelay) {
                    player.gun.fireDelay = player.gun.originalFireDelay * 0.7;
                } else {
                    player.gun.originalFireDelay = player.gun.fireDelay;
                    player.gun.fireDelay *= 0.7;
                }
            }
        }
    },
    {
        id: 'heavy_bullets',
        name: 'Heavy Bullets',
        description: 'Bullets deal 50% more damage but fire rate decreased by 20%',
        icon: 'perk_heavy_bullets',
        rarity: 'rare',
        type: 'weapon',
        onApply: (scene, player) => {
            if (player.gun) {
                player.gun.originalDamage = player.gun.damage;
                player.gun.originalFireDelay = player.gun.fireDelay;
                player.gun.damage = Math.ceil(player.gun.damage * 1.5);
                player.gun.fireDelay *= 1.2; // Higher delay = slower firing
                console.log(`Applied Heavy Bullets: Damage increased to ${player.gun.damage}, fire delay increased to ${player.gun.fireDelay}`);
            }
        },
        onRemove: (scene, player) => {
            if (player.gun) {
                if (player.gun.originalDamage) player.gun.damage = player.gun.originalDamage;
                if (player.gun.originalFireDelay) player.gun.fireDelay = player.gun.originalFireDelay;
                console.log(`Removed Heavy Bullets: Damage restored to ${player.gun.damage}, fire delay restored to ${player.gun.fireDelay}`);
            }
        },
        onUpdate: (scene, player) => {
            // Ensure the effect is applied if the player gets a new gun
            if (player.gun && (!player.gun.originalDamage || !player.gun.originalFireDelay)) {
                console.log("Reapplying Heavy Bullets to new gun");
                player.gun.originalDamage = player.gun.damage;
                player.gun.originalFireDelay = player.gun.fireDelay;
                player.gun.damage = Math.ceil(player.gun.damage * 1.5);
                player.gun.fireDelay *= 1.2;
            }
        }
    },
    {
        id: 'explosive_rounds',
        name: 'Explosive Rounds',
        description: 'Bullets create small explosions on impact',
        icon: 'perk_explosive_rounds',
        rarity: 'epic',
        type: 'weapon',
        onApply: (scene, player) => {
            player.hasExplosiveRounds = true;
            console.log("Applied Explosive Rounds");
        },
        onRemove: (scene, player) => {
            player.hasExplosiveRounds = false;
            console.log("Removed Explosive Rounds");
        },
        onUpdate: (scene, player) => {
            // Ensure the effect is consistently applied
            if (!player.hasExplosiveRounds) {
                console.log("Reapplying Explosive Rounds");
                player.hasExplosiveRounds = true;
            }
        }
    },
    
    // Movement Perks
    {
        id: 'quick_slide',
        name: 'Quick Slide',
        description: 'Slide cooldown reduced by 40%',
        icon: 'perk_quick_slide',
        rarity: 'common',
        type: 'passive',
        onApply: (scene, player) => {
            scene.originalSlideCooldown = scene.slideCooldown;
            scene.slideCooldown *= 0.6;
        },
        onRemove: (scene, player) => {
            if (scene.originalSlideCooldown) {
                scene.slideCooldown = scene.originalSlideCooldown;
            }
        }
    },
    {
        id: 'speed_boost',
        name: 'Speed Boost',
        description: 'Movement speed increased by 25%',
        icon: 'perk_speed_boost',
        rarity: 'uncommon',
        type: 'passive',
        onApply: (scene, player) => {
            scene.originalMoveSpeed = scene.moveSpeed;
            scene.moveSpeed *= 1.25;
        },
        onRemove: (scene, player) => {
            if (scene.originalMoveSpeed) {
                scene.moveSpeed = scene.originalMoveSpeed;
            }
        }
    },
    
    // Health Perks
    {
        id: 'vitality',
        name: 'Vitality',
        description: 'Maximum health increased by 25%',
        icon: 'perk_vitality',
        rarity: 'uncommon',
        type: 'passive',
        onApply: (scene, player) => {
            player.originalMaxHealth = player.maxHealth;
            player.maxHealth = Math.ceil(player.maxHealth * 1.25);
            player.health = Math.min(player.health + 20, player.maxHealth);
        },
        onRemove: (scene, player) => {
            if (player.originalMaxHealth) {
                player.maxHealth = player.originalMaxHealth;
                player.health = Math.min(player.health, player.maxHealth);
            }
        }
    },
    {
        id: 'vampirism',
        name: 'Vampirism',
        description: 'Heal 2 health on enemy kill',
        icon: 'perk_vampirism',
        rarity: 'rare',
        type: 'passive',
        onApply: (scene, player) => {
            // Define the healing function
            this.healOnKill = () => {
                if (player.health < player.maxHealth) {
                    player.health = Math.min(player.health + 2, player.maxHealth);
                    console.log(`Vampirism healed player to ${player.health}/${player.maxHealth}`);
                }
            };
            
            // Store the function reference so we can remove it later
            scene.vampirismHandler = this.healOnKill;
            
            // Add the event listener
            scene.events.on('enemyKilled', scene.vampirismHandler);
            console.log("Applied Vampirism");
        },
        onRemove: (scene, player) => {
            // Remove the event listener if it exists
            if (scene.vampirismHandler) {
                scene.events.off('enemyKilled', scene.vampirismHandler);
                delete scene.vampirismHandler;
                console.log("Removed Vampirism");
            }
        }
    },
    
    // Special Perks
    {
        id: 'double_cash',
        name: 'Cash Multiplier',
        description: 'Enemies drop twice as much cash',
        icon: 'perk_double_cash',
        rarity: 'uncommon',
        type: 'passive',
        onApply: (scene, player) => {
            scene.cashMultiplier = 2.0;
        },
        onRemove: (scene, player) => {
            scene.cashMultiplier = 1.0;
        }
    },
    {
        id: 'barrel_master',
        name: 'Barrel Master',
        description: 'Immune to barrel damage, explosions are 50% larger',
        icon: 'perk_barrel_master',
        rarity: 'rare',
        type: 'passive',
        onApply: (scene, player) => {
            player.isExplosionImmune = true;
            scene.explosionSizeMultiplier = 1.5;
        },
        onRemove: (scene, player) => {
            player.isExplosionImmune = false;
            scene.explosionSizeMultiplier = 1.0;
        }
    },
    {
        id: 'enemy_weakener',
        name: 'Enemy Weakener',
        description: 'All enemies have 30% less health',
        icon: 'perk_enemy_weakener',
        rarity: 'epic',
        type: 'passive',
        onApply: (scene, player) => {
            scene.enemyHealthMultiplier = 0.7;
            // Apply to existing enemies
            scene.enemies.getChildren().forEach(enemy => {
                enemy.maxHealth = Math.ceil(enemy.maxHealth * 0.7);
                enemy.health = Math.min(enemy.health, enemy.maxHealth);
            });
        },
        onRemove: (scene, player) => {
            scene.enemyHealthMultiplier = 1.0;
        }
    }
]; 