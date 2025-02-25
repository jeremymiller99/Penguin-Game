// Jeremy Miller
// Time Spent: 40-50 hours
// Operation: Ice Break
// My game's creative tilt is that I have cutscenes and its not a regular endless runner.

let config = {
    parent: 'game-canvas',
    type: Phaser.WEBGL,
    width: 960,
    height: 512,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { x: 0, y: 0 }
        }
    },
    scene: [Load, Menu, Briefing, Cutscene, Map, TestLevel]
};

let game = new Phaser.Game(config);