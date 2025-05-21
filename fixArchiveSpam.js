/**
 * This script completely disables the archive-completed-template functionality 
 * that's causing the [Archiviert] text spam in the console logs.
 */

const fs = require('fs');

// Create an empty noop replacement for the problematic script
const noopScript = `
/**
 * DISABLED - This script was causing console spam with [Archiviert] text
 * Original purpose: Archive the redundant "Reparatur abgeschlossen" template
 */
module.exports = {
  archiveCompletedTemplate: () => Promise.resolve(),
  main: () => Promise.resolve()
};
`;

// Write the replacement file
fs.writeFileSync('./archive-completed-template.js', noopScript);

console.log('Successfully disabled the archive-completed-template script!');