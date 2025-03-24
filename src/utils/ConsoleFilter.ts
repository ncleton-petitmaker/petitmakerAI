/**
 * Console Filter Utility
 * 
 * This utility completely disables console.log and console.warn on the student side
 * of the application, while preserving error logs for debugging.
 */

// More aggressive detection of student side vs admin side
export function isStudentSide(): boolean {
  // If we're in development, allow all logs
  if (process.env.NODE_ENV === 'development') {
    return false;
  }
  
  // If we're not in the browser, assume we're on the server
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check URL path for student indicators
  const path = window.location.pathname.toLowerCase();
  
  // If path contains admin or dashboard, it's not student side
  if (path.includes('/admin') || 
      path.includes('/dashboard') || 
      path.includes('/crm')) {
    return false;
  }
  
  // Check for specific student context indicators
  if (path.includes('/espace-stagiaires') || 
      path.includes('/student') || 
      path.includes('/formation')) {
    return true;
  }
  
  // Default: check if the page has specific student elements
  const hasStudentUI = document.body?.classList.contains('student-view') ||
                      !!document.getElementById('student-dashboard') ||
                      !!document.querySelector('.student-interface');
  
  if (hasStudentUI) {
    return true;
  }
  
  // Default to allow logs if we can't determine
  return false;
}

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

// Empty function to replace log methods
const noop = function() {};

/**
 * Completely disable all console output except errors on student side
 */
export function silenceStudentLogs(): void {
  // Check if we're on the student side
  if (isStudentSide()) {
    // Replace all console methods except error with no-op function
    console.log = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
    
    // Keep console.error for critical issues
  }
}

/**
 * Restore original console behavior
 */
export function restoreConsole(): void {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
}

// Automatically run the silence function when imported
silenceStudentLogs(); 