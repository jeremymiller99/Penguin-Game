class PerkManager {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.activePerks = [];
        this.availablePerks = [...PERKS]; // Copy all perks from the global PERKS array
        
        // Store original values for resetting
        this.originalValues = {};
    }

    addPerk(perkId) {
        const perkDef = this.availablePerks.find(p => p.id === perkId);
        if (!perkDef) {
            console.warn(`Perk with ID ${perkId} not found`);
            return;
        }
        
        // Create a new perk instance
        const perk = new Perk(perkDef);
        
        // Apply the perk
        perk.apply(this.scene, this.player);
        
        // Add to active perks
        this.activePerks.push(perk);
        
        // Update UI
        this.updatePerkUI();
    }

    removePerk(perkId) {
        const index = this.activePerks.findIndex(p => p.id === perkId);
        if (index !== -1) {
            const perk = this.activePerks[index];
            perk.remove(this.scene, this.player);
            this.activePerks.splice(index, 1);
            this.updatePerkUI();
        }
    }

    update() {
        // Update all perks and filter out expired ones
        this.activePerks = this.activePerks.filter(perk => 
            perk.update(this.scene, this.player));
            
        // Check if player has a gun and it doesn't have perk effects applied
        if (this.player.gun && !this.player.gun.perksApplied) {
            // Apply weapon perks to the new gun
            this.activePerks.forEach(perk => {
                if (perk.type === 'weapon') {
                    // Re-apply the perk to ensure it affects the new gun
                    perk.remove(this.scene, this.player); // Remove first to avoid stacking
                    perk.apply(this.scene, this.player);
                }
            });
            
            // Mark the gun as having perks applied
            this.player.gun.perksApplied = true;
        }
    }
    
    updatePerkUI() {
        if (this.scene.updatePerkIcons) {
            this.scene.updatePerkIcons(this.activePerks);
        }
    }
    
    getRandomPerks(count = 3, excludeIds = []) {
        // Filter out perks the player already has
        const currentPerkIds = this.activePerks.map(p => p.id);
        const eligiblePerks = this.availablePerks.filter(p => 
            !currentPerkIds.includes(p.id) && !excludeIds.includes(p.id));
            
        // Shuffle and take the requested number
        return this.shuffleArray(eligiblePerks).slice(0, count);
    }
    
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
    
    // Helper method to reapply all perks (useful after scene transitions)
    reapplyAllPerks() {
        this.activePerks.forEach(perk => {
            perk.remove(this.scene, this.player); // Remove first to avoid stacking
            perk.apply(this.scene, this.player);
        });
    }
}