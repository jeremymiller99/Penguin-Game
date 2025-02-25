class HUDManager {
    constructor(scene) {
        this.scene = scene;
        this.container = scene.add.container(10, 10);
        
        // Store references to UI elements
        this.playerHealthBar = null;
        this.ammoText = null;
        this.currencyText = null;
        this.floorLevelText = null;
        this.highScoreText = null;
    }

    create() {
        // Starting positions
        let xPos = 20;
        const yPos = 30;
        const spacing = 120;
        const iconScale = 3;

        // Health section
        const healthIcon = this.scene.add.sprite(xPos, yPos, 'icn_fish').setScale(iconScale);
        this.container.add(healthIcon);
        
        xPos += 30;
        this.playerHealthBar = this.drawHealthBar(xPos, yPos, 160, 14);
        this.playerHealthBar.background.setAlpha(0.3);
        this.playerHealthBar.foreground.setFillStyle(0xff3838);
        this.playerHealthBar.foreground.width = 160;
        
        const healthGradient = this.scene.add.graphics();
        healthGradient.fillGradientStyle(0xff5555, 0xff3838, 0xff5555, 0xff3838, 0.8);
        
        this.container.add([
            healthGradient,
            this.playerHealthBar.background,
            this.playerHealthBar.foreground
        ]);

        // Ammo section
        xPos += spacing + 80;
        const ammoIcon = this.scene.add.sprite(xPos, yPos, 'icn_bullet').setScale(iconScale);
        this.container.add(ammoIcon);

        xPos += 20;
        this.ammoText = this.createText(xPos, yPos - 15, '', {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            fill: '#ffffff'
        });
        this.container.add(this.ammoText);

        // Currency section
        xPos += spacing + 40;
        const coinIcon = this.scene.add.sprite(xPos, yPos, 'icn_cash').setScale(iconScale);
        this.container.add(coinIcon);
        
        xPos += 20;
        this.currencyText = this.createText(xPos, yPos - 15, '$0', {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            fill: '#ffd700'
        });
        this.container.add(this.currencyText);

        // Floor level section
        xPos += 100;
        const floorIcon = this.scene.add.sprite(xPos, yPos, 'ladder').setScale(2);
        this.container.add(floorIcon);

        xPos += 20;
        this.floorLevelText = this.createText(xPos, yPos - 15, 'Floor 1', {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            fill: '#4287f5'
        });
        this.container.add(this.floorLevelText);
    }

    createText(x, y, text, style) {
        return this.scene.add.text(x, y, text, {
            ...style,
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        });
    }

    drawHealthBar(x, y, width = 80, height = 8) {
        const barBackground = this.scene.add.rectangle(x, y, width, height, 0xff0000);
        barBackground.setOrigin(0, 0.5);
        
        const barForeground = this.scene.add.rectangle(x, y, width, height, 0x00ff00);
        barForeground.setOrigin(0, 0.5);
        
        return { background: barBackground, foreground: barForeground };
    }

    updateHealth(health, maxHealth) {
        const healthPercent = health / maxHealth;
        this.playerHealthBar.foreground.width = 160 * healthPercent;
    }

    updateAmmo(current, max) {
        this.ammoText.setText(`${current} / ${max}`);
    }

    updateCurrency(amount) {
        this.currencyText.setText('$' + amount);
    }

    updateFloorLevel(level) {
        this.floorLevelText.setText('Floor ' + level);
    }
}
