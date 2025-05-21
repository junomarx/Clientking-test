/**
 * This script completely disables the archive-completed-template functionality 
 * that's causing the [Archiviert] text spam in the console logs.
 */

import fs from 'fs';

// Create an empty noop replacement for the problematic script
const noopScript = `
/**
 * DISABLED - This script was causing console spam with [Archiviert] text
 * Original purpose: Archive the redundant "Reparatur abgeschlossen" template
 */
export const archiveCompletedTemplate = () => Promise.resolve();
export const main = () => Promise.resolve();
`;

// Write the replacement file
fs.writeFileSync('./server/archive-completed-template.js', noopScript);

console.log('Successfully disabled the archive-completed-template script!');