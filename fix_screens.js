const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'public', 'games');
const games = [
  'spyfall',
  'tick-tock-bomb',
  'heads-up',
  'draw-and-guess',
  'dobble',
  'squid-game'
];

games.forEach(game => {
  const filePath = path.join(basePath, game, 'index.html');
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/class="screen hidden"/g, 'class="screen"');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${game}`);
  }
});
