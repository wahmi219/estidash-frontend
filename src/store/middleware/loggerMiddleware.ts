import { Middleware } from '@reduxjs/toolkit';
import { logger } from '@/utils/logger';

export const loggerMiddleware: Middleware = (store) => (next) => (action: any) => {
    const result = next(action);

    // Log Redux Actions
    if (action.type) {
        const context = 'Redux';

        if (action.type.endsWith('/rejected')) {
            logger.error(`Action Rejected: ${action.type}`, action.error || action.payload, context);
        } else if (action.type.endsWith('/fulfilled')) {
            // Avoid logging massive payloads if necessary, but for now we log it
            logger.debug(`Action Fulfilled: ${action.type}`, action.payload, context);
        } else if (action.type.endsWith('/pending')) {
            logger.debug(`Action Pending: ${action.type}`, action.meta, context);
        } else {
            // Standard action
            logger.debug(`Action Dispatched: ${action.type}`, action.payload, context);
        }
    }

    return result;
};
