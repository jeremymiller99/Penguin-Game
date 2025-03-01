class Load extends Phaser.Scene {
    constructor() {
        super('loadScene');
    }

    preload() {
        this.load.spritesheet('penguin', './assets/penguin.png', { frameWidth: 16, frameHeight: 16 });
        this.load.image('ak47', './assets/ak47.png');
        this.load.image('crate', './assets/oildrum.png');
        this.load.image('cash', './assets/cash.png');
        this.load.image('ladder', './assets/ladder.png');
        this.load.image('shop_open', './assets/shop_open.png');
        this.load.image('shop_empty', './assets/shop_empty.png');
        this.load.image('icn_bullet', './assets/icons/icn_bullet.png');
        this.load.image('icn_cash', './assets/icons/icn_cash.png');
        this.load.image('icn_fish', './assets/icons/icn_fish.png');
        this.load.spritesheet('enemySprite', './assets/hazmat_guy.png', { frameWidth: 16, frameHeight: 16 });

        const bulletGraphics = this.add.graphics();
        bulletGraphics.fillStyle(0xFFFFFF).fillRect(0, 0, 4, 2).generateTexture('bullet', 4, 2).destroy();

        // Create a simple muzzle flash texture
        const muzzleFlashGraphics = this.add.graphics();
        muzzleFlashGraphics.fillStyle(0xFFFF00).fillCircle(0, 0, 5).generateTexture('muzzleFlash', 10, 10).destroy();

        // Load tileset image first
        this.load.image('bg_tileset', './assets/bg_tileset.png');
        
        // Then load the tilemap JSON
        this.load.tilemapTiledJSON('test_map', './assets/test_map.json');
        
        // Add a load error handler to debug any loading issues
        this.load.on('loaderror', (fileObj) => {
            console.error('Error loading:', fileObj.src);
        });

        // Add sound effect loading
        this.load.audio('cashPickup', './assets/sfx/pickupCash.wav');
        this.load.audio('explosion', './assets/sfx/explosion.wav');
        this.load.audio('tone', './assets/sfx/tone.wav');
        this.load.audio('hit', './assets/sfx/hitHurt.wav');
        this.load.audio('ak47shot', './assets/sfx/ak47shot.wav');
        this.load.audio('death', './assets/sfx/death.wav');
        this.load.audio('music_with_enemies', './assets/sfx/music_with_enemies.wav');
        this.load.audio('music_no_enemies', './assets/sfx/music_no_enemies.wav');
        this.load.audio('penguin_fall', './assets/sfx/penguin_fall.wav');
        this.load.audio('plane', './assets/sfx/plane.wav');

        this.load.audio('main_menu', './assets/sfx/menu.wav');
        this.load.audio('briefing', './assets/sfx/briefing.wav');
        this.load.audio('song_1', './assets/sfx/song_1.wav');

        // Cutscene Layers
        this.load.image('cs_sky', './assets/cutscene/sky.png');
        this.load.image('cs_mountain', './assets/cutscene/mountain.png');
        this.load.image('cs_water', './assets/cutscene/water_2.png');
        this.load.image('cs_mountain_bg', './assets/cutscene/mountain_bg.png');
        this.load.image('cs_plane', './assets/cutscene/plane.png');
    }

    create() {
        // Add a quick check to verify the assets loaded
        console.log('Tileset loaded:', this.textures.exists('bg_tileset'));
        console.log('Tilemap loaded:', this.cache.tilemap.exists('test_map'));
        
        this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('penguin', { start: 0, end: 0 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk_right', frames: this.anims.generateFrameNumbers('penguin', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });

        // Create animations for the enemy
        this.anims.create({
            key: 'enemy_walk',
            frames: this.anims.generateFrameNumbers('enemySprite', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'enemy_idle',
            frames: this.anims.generateFrameNumbers('enemySprite', { start: 4, end: 5 }),
            frameRate: 8,
            repeat: -1
        });

        this.scene.start('Menu');
    }
}