// Lightweight global error logger for debugging runtime crashes on homepage
// Stores recent errors in localStorage under `centremart_debug_errors` and logs to console.
export function initGlobalErrorLogger(opts = {}) {
    const maxStored = opts.maxStored || 50;

    function storeError(obj) {
        try {
            const raw = localStorage.getItem('centremart_debug_errors');
            const arr = raw ? JSON.parse(raw) : [];
            arr.push({ ts: Date.now(), ...obj });
            while (arr.length > maxStored) arr.shift();
            localStorage.setItem('centremart_debug_errors', JSON.stringify(arr));
        } catch (e) {
            // ignore storage errors
        }
    }

    // Catch render / runtime errors
    window.addEventListener('error', (event) => {
        try {
            const err = event.error || { message: event.message };
            console.error('Global error captured:', err);
            storeError({ type: 'error', message: err.message || String(err), stack: err.stack || null, filename: event.filename || null, lineno: event.lineno || null });
        } catch (e) {}
    });

    // Catch promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        try {
            const reason = event.reason || { message: String(event) };
            console.error('Unhandled rejection captured:', reason);
            storeError({ type: 'unhandledrejection', message: reason.message || String(reason), stack: reason.stack || null });
        } catch (e) {}
    });

    // Provide a helper to dump errors to console on demand
    window.dumpCentremartDebugErrors = function() {
        try {
            const raw = localStorage.getItem('centremart_debug_errors');
            const arr = raw ? JSON.parse(raw) : [];
            console.warn('centremart_debug_errors:', arr);
            return arr;
        } catch (e) {
            console.error('Failed to read centremart_debug_errors', e);
            return [];
        }
    };

    // Add an explicit marker so devs can check the logger is active
    console.info('Global error logger initialized (centremart_debug_errors)');
}

export default initGlobalErrorLogger;