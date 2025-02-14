// Jeremy Miller
// Time Spent: 30-40 hours
// Penguin Game

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
    scene: [Load, Menu, Briefing, TestLevel]
};

let game = new Phaser.Game(config);