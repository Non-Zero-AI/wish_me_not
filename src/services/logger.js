import { Platform } from 'react-native';

const LOG_WEBHOOK = 'https://n8n.srv1023211.hstgr.cloud/webhook/debug-log';

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

let logQueue = [];
let isFlushing = false;
let flushTimer = null;

const flushLogs = async () => {
    if (logQueue.length === 0 || isFlushing) return;
    isFlushing = true;
    
    // Take a batch
    const batch = logQueue.splice(0, 50);
    
    try {
        // Use fetch to avoid circular dependency if axios logs
        await fetch(LOG_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platform: Platform.OS,
                timestamp: new Date().toISOString(),
                logs: batch,
                userAgent: Platform.OS === 'web' ? navigator.userAgent : 'React Native'
            })
        });
    } catch (e) {
        // Silent fail to prevent loop
    } finally {
        isFlushing = false;
        // If more logs came in, schedule another flush
        if (logQueue.length > 0) {
            scheduleFlush();
        }
    }
};

const scheduleFlush = () => {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushLogs, 2000);
};

const queueLog = (level, args) => {
    try {
        const message = args.map(arg => {
            if (arg instanceof Error) {
                return `${arg.toString()}\nStack: ${arg.stack}`;
            }
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return '[Circular/Unserializable Object]';
                }
            }
            return String(arg);
        }).join(' ');

        logQueue.push({
            level,
            message,
            time: new Date().toISOString()
        });

        // Force flush on errors or if queue gets large
        if (level === 'error' || level === 'fatal' || logQueue.length >= 20) {
            flushLogs();
        } else {
            scheduleFlush();
        }
    } catch (e) {
        // Safety net
    }
};

export const initLogger = () => {
    // Wrap consoles
    try {
        console.log = (...args) => {
            originalConsoleLog(...args);
            queueLog('info', args);
        };

        console.warn = (...args) => {
            originalConsoleWarn(...args);
            queueLog('warn', args);
        };

        console.error = (...args) => {
            originalConsoleError(...args);
            queueLog('error', args);
        };
    } catch (e) {
        // If we can't override console, just ignore it.
        // This prevents 'Cannot set indexed properties' crashes on some platforms.
        originalConsoleWarn('Failed to initialize remote logger console overrides', e);
    }

    // Global Handlers
    if (Platform.OS === 'web') {
        window.onerror = (message, source, lineno, colno, error) => {
            queueLog('fatal', [`Uncaught Exception: ${message}`, { source, lineno, colno }, error]);
            return false; // Let default handler run
        };
        
        window.onunhandledrejection = (event) => {
             queueLog('fatal', ['Unhandled Promise Rejection:', event.reason]);
        };
    } else {
        if (global.ErrorUtils) {
            const defaultHandler = global.ErrorUtils.getGlobalHandler();
            global.ErrorUtils.setGlobalHandler((error, isFatal) => {
                queueLog('fatal', ['Global Error:', error, isFatal]);
                // Try to flush before crashing
                flushLogs().then(() => {
                    if (defaultHandler) defaultHandler(error, isFatal);
                });
            });
        }
    }
    
    console.log('Remote logger initialized');
};
