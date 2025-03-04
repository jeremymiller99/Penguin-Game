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
        this.load.image('bg_tileset', './assets/bg_tileset.png');
        
        // Then load the tilemap JSON
        this.load.tilemapTiledJSON('test_map', './assets/test_map.json');
        this.load.tilemapTiledJSON('test_map_1', './assets/test_map_1.json');
        this.load.tilemapTiledJSON('test_map_2', './assets/test_map_2.json');
        this.load.tilemapTiledJSON('test_map_3', './assets/test_map_3.json');
        
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

        // Perk icons
        this.load.image('default_perk_icon', 'assets/images/perks/default_perk.png');
        this.load.image('perk_rapid_fire', 'assets/images/perks/rapid_fire.png');
        this.load.image('perk_heavy_bullets', 'assets/images/perks/heavy_bullets.png');
        this.load.image('perk_explosive_rounds', 'assets/images/perks/explosive_rounds.png');
        this.load.image('perk_quick_slide', 'assets/images/perks/quick_slide.png');
        this.load.image('perk_speed_boost', 'assets/images/perks/speed_boost.png');
        this.load.image('perk_vitality', 'assets/images/perks/vitality.png');
        this.load.image('perk_vampirism', 'assets/images/perks/vampirism.png');
        this.load.image('perk_double_cash', 'assets/images/perks/double_cash.png');
        this.load.image('perk_barrel_master', 'assets/images/perks/barrel_master.png');
        this.load.image('perk_enemy_weakener', 'assets/images/perks/enemy_weakener.png');
    }

    create() {
        // Add a quick check to verify the assets loaded
        console.log('Tileset loaded:', this.textures.exists('bg_tileset'));
        console.log('Tilemap loaded:', this.cache.tilemap.exists('test_map'));
        console.log('Tilemap 1 loaded:', this.cache.tilemap.exists('test_map_1'));
        
        this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('penguin', { start: 0, end: 0 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'walk_right', frames: this.anims.generateFrameNumbers('penguin', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });

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
            frames: this.anims.generateFrameNumbers('muzzleFlash', { start: 0, end: 0 }),
            frameRate: 15,
            repeat: 0
        });

        this.scene.start('Menu');
    }
}