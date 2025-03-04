class Perk {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.icon = config.icon || 'default_perk_icon';
        this.rarity = config.rarity || 'common'; // common, uncommon, rare, epic, legendary
        this.type = config.type || 'passive'; // passive, active, weapon
        this.onApply = config.onApply || (() => {});
        this.onRemove = config.onRemove || (() => {});
        this.onUpdate = config.onUpdate || (() => {});
        this.isTemporary = config.isTemporary || false;
        this.duration = config.duration || 0;
        this.startTime = 0;
    }

    apply(scene, player) {
        console.log(`Applying perk: ${this.name} (${this.id})`);
        this.onApply(scene, player);
        if (this.isTemporary) {
            this.startTime = scene.time.now;
        }
    }

    remove(scene, player) {
        console.log(`Removing perk: ${this.name} (${this.id})`);
        this.onRemove(scene, player);
    }

    update(scene, player) {
        if (this.isTemporary && this.startTime > 0) {
            const elapsed = scene.time.now - this.startTime;
            if (elapsed >= this.duration) {
                this.remove(scene, player);
                return false; // Return false to indicate perk should be removed
            }
        }
        
        // Call the onUpdate function
        this.onUpdate(scene, player);
        
        return true; // Return true to keep the perk
    }
} 