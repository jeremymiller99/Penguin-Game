// Jeremy Miller
// Time Spent: 40-50 hours
// Operation: Ice Break
// My game's creative tilt is that I have cutscenes and its not a regular endless runner.

let config = {
    parent: 'game-canvas',
    type: Phaser.WEBGL,
    width: 1280,
    height: 720,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            debug: true,
            gravity: { x: 0, y: 0 }
        }
    },
    scene: [Load, Menu, Briefing, Cutscene, Map, GameManager, BaseMapScene, Map1Scene, IcebergMapScene, PerkRoom]
};

let game = new Phaser.Game(config);
