/**
 * This file disables the archive-completed-template script to prevent console spam.
 */

// Patch the global console object to filter out the [Archiviert] messages
const originalConsoleLog = console.log;
console.log = function(...args: any[]) {
  // If the first argument is a string and contains [Archiviert], don't log it
  if (typeof args[0] === 'string' && args[0].includes('[ARCHIVIERT]')) {
    return; // Skip this log message
  }
  originalConsoleLog.apply(console, args);
};

// Empty implementation of the archive functions
export const archiveCompletedTemplate = () => Promise.resolve();
export const main = () => Promise.resolve();

// This will be imported early in the application startup
export default function disableArchiveScript() {
  // The function doesn't need to do anything; the console patch above is what matters
  return Promise.resolve();
}