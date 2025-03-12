class Load extends Phaser.Scene {
    constructor() {
        super('loadScene');
    }

    preload() {
        this.load.spritesheet('penguin', './assets/penguin.png', { frameWidth: 16, frameHeight: 16 });
        this.load.image('ak47', './assets/ak47.png');
        this.load.image('barrel', './assets/oildrum.png');
        this.load.image('cash', './assets/cash.png');
        this.load.image('ladder', './assets/ladder.png');
        this.load.image('shop_open', './assets/shop_open.png');
        this.load.image('shop_empty', './assets/shop_empty.png');
        this.load.image('icn_bullet', './assets/icons/icn_bullet.png');
        this.load.image('icn_cash', './assets/icons/icn_cash.png');
        this.load.image('icn_fish', './assets/icons/icn_fish.png');

        this.load.spritesheet('enemySprite', './assets/hazmat_guy.png', { frameWidth: 16, frameHeight: 16 });
        
        // Load enemy spritesheet with more frames for new enemy types
        this.load.spritesheet('enemy', './assets/hazmat_guy.png', { frameWidth: 16, frameHeight: 16 });
        
        // Create a spark texture for melee enemy
        const sparkGraphics = this.add.graphics();
        sparkGraphics.fillStyle(0xFFFFFF).fillCircle(0, 0, 3).generateTexture('sparkTexture', 6, 6).destroy();

        const bulletGraphics = this.add.graphics();
        bulletGraphics.fillStyle(0xFFFFFF).fillRect(0, 0, 4, 2).generateTexture('bullet', 4, 2).destroy();

        // Create a simple muzzle flash texture
        const muzzleFlashGraphics = this.add.graphics();
        muzzleFlashGraphics.fillStyle(0xFFFF00).fillCircle(0, 0, 5).generateTexture('muzzleFlash', 10, 10).destroy();

        // Load tileset image first
        this.load.image('bg_tileset', './assets/tilesets/bg_tileset.png');
        this.load.image('iceberg_tileset', './assets/tilesets/iceberg_tileset.png');
        this.load.image('iceberg_tileset_1', './assets/tilesets/iceberg_tileset_1.png');
        
        // Then load the tilemap JSON
        this.load.tilemapTiledJSON('test_map', './assets/tilesets/test_map.json');
        this.load.tilemapTiledJSON('test_map_1', './assets/tilesets/test_map_1.json');
        this.load.tilemapTiledJSON('test_map_2', './assets/tilesets/test_map_2.json');
        this.load.tilemapTiledJSON('test_map_3', './assets/tilesets/test_map_3.json');
        this.load.tilemapTiledJSON('iceberg_map', './assets/tilesets/iceberg_1.json');
        this.load.tilemapTiledJSON('iceberg_map_1', './assets/tilesets/iceberg_2.json');

        // Load new tileset image for map1
        this.load.image('map1_tileset', './assets/tilesets/map1_tileset.png');
        
        // Load the new tilemap JSON
        this.load.tilemapTiledJSON('map1', './assets/tilesets/map1.json');

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
        this.load.audio('slide', './assets/sfx/slide.wav');
        this.load.audio('enemyHit', './assets/sfx/hitHurt.wav');
        this.load.audio('dodge', './assets/sfx/slide.wav');

        this.load.audio('main_menu', './assets/sfx/menu.wav');
        this.load.audio('briefing', './assets/sfx/briefing.wav');
        this.load.audio('song_1', './assets/sfx/song_1.wav');

        // Cutscene Layers
        this.load.image('cs_sky', './assets/cutscene/sky.png');
        this.load.image('cs_mountain', './assets/cutscene/mountain.png');
        this.load.image('cs_water', './assets/cutscene/water_2.png');
        this.load.image('cs_mountain_bg', './assets/cutscene/mountain_bg.png');
        this.load.image('cs_plane', './assets/cutscene/plane.png');

        // Load perk sprite sheet with proper dimensions (16 columns x 22 rows)
        this.load.spritesheet('perk_icons', 'assets/perk_temp_sheet_32.png', { 
            frameWidth: 32, 
            frameHeight: 32,
            margin: 0,
            spacing: 0
        });

        // Load iceberg sprites for map nodes
        this.load.image('ice_berg_1', './assets/ice_berg_1.png');
        this.load.image('ice_berg_2', './assets/ice_berg_2.png');
        this.load.image('ice_berg_3', './assets/ice_berg_3.png');
    }

    create() {
        // Add a quick check to verify the assets loaded
        console.log('Tileset loaded:', this.textures.exists('bg_tileset'));
        console.log('Tilemap loaded:', this.cache.tilemap.exists('test_map'));
        console.log('Tilemap 1 loaded:', this.cache.tilemap.exists('test_map_1'));
        
        // Create penguin animations
        this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('penguin', { start: 0, end: 0 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk_right', frames: this.anims.generateFrameNumbers('penguin', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
        
        // Create slide animation (using the same frames but faster)
        this.anims.create({ 
            key: 'penguin_slide', 
            frames: this.anims.generateFrameNumbers('penguin', { start: 0, end: 3 }), 
            frameRate: 12, // Faster animation for sliding
            repeat: -1 
        });

        // Create animations for the enemy
        this.anims.create({
            key: 'enemy_walk',
            frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'enemy_idle',
            frames: this.anims.generateFrameNumbers('enemy', { start: 4, end: 5 }),
            frameRate: 8,
            repeat: -1
        });
        
        // Create muzzle flash animation
        this.anims.create({
            key: 'muzzleFlash',
            frames: [{ key: 'muzzleFlash' }],
            frameRate: 15,
            repeat: 0
        });
        
        // Define frame mappings for perk icons
        // Create a texture atlas for the perk icons
        const perkIconsAtlas = {
            'default_perk_icon': 0,
            'perk_rapid_fire': 1,
            'perk_heavy_bullets': 2,
            'perk_explosive_rounds': 3,
            'perk_quick_slide': 4,
            'perk_speed_boost': 5,
            'perk_vitality': 6,
            'perk_vampirism': 7,
            'perk_double_cash': 8,
            'perk_barrel_master': 9,
            'perk_enemy_weakener': 10
        };
        
        // Create animations for each perk icon
        Object.entries(perkIconsAtlas).forEach(([name, frame]) => {
            this.anims.create({
                key: name,
                frames: [{ key: 'perk_icons', frame: frame }],
                frameRate: 1
            });
        });

        this.scene.start('Menu');
    }
}