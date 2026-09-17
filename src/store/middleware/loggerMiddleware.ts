import { Middleware } from '@reduxjs/toolkit';
import { logger } from '@/utils/logger';

/**
 * Phase 11.12 K1 — Redux action logging without the payload dump.
 *
 * This middleware was the single largest contributor to the 3,380+
 * console messages the independent audit recorded: it fired on EVERY
 * dispatched action and handed `action.payload` straight to the logger,
 * with a comment conceding the risk ("Avoid logging massive payloads if
 * necessary, but for now we log it"). A fulfilled permit-search action
 * carries a full page of permit records, so one ordinary page view
 * printed thousands of contractor names, addresses and contact details
 * into devtools.
 *
 * Action TYPE is the genuinely useful part for tracing a state
 * transition, and it is not sensitive. So the type is always what gets
 * logged, and the payload is passed only when payload logging is
 * explicitly enabled (development by default — see logger.ts). Rejections
 * keep their error, because an error with no detail is not worth logging,
 * and a rejection is rare enough not to flood anything.
 */
export const loggerMiddleware: Middleware = (store) => (next) => (action: any) => {
    const result = next(action);

    if (action?.type) {
        const context = 'Redux';
        const withPayload = logger.payloadLoggingEnabled;

        if (action.type.endsWith('/rejected')) {
            logger.error(`Action Rejected: ${action.type}`, action.error || action.payload, context);
        } else if (action.type.endsWith('/fulfilled')) {
            logger.debug(
                `Action Fulfilled: ${action.type}`,
                withPayload ? action.payload : undefined,
                context,
            );
        } else if (action.type.endsWith('/pending')) {
            // meta carries the request args, which for a search action is
            // the user's query text — payload-gated like everything else.
            logger.debug(`Action Pending: ${action.type}`, withPayload ? action.meta : undefined, context);
        } else {
            logger.debug(`Action Dispatched: ${action.type}`, withPayload ? action.payload : undefined, context);
        }
    }

    return result;
};
