// Le serveur Next fixe son propre cwd. Les anciennes versions de MaVie y
// cherchent data/ : garder cette base dans userData, même avant fusion moteur.
const path = require('node:path');
const server = process.argv[2];
const chdir = process.chdir.bind(process);
process.chdir = (directory) => chdir(path.resolve(directory) === path.dirname(server)
  ? process.env.FINANCES_DATA_DIR : directory);
require(server);
