resetScene() {
    // ... existing code ...
    
    // Check if physics groups exist before clearing them
    if (this.enemies) {
        this.enemies.clear(true, true);
    }
    
    if (this.bullets) {
        this.bullets.clear(true, true);
    }
    
    if (this.crates) {
        this.crates.clear(true, true);
    }
    
    // Clear any other physics groups with null checks
    if (this.enemyBullets) {
        this.enemyBullets.clear(true, true);
    }
    
    if (this.explosions) {
        this.explosions.clear(true, true);
    }
    
    // ... existing code ...
}