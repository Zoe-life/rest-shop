/**
 * @module utils/authCodeStore
 * @description In-memory, single-use exchange code store for the OAuth token handoff.
 *
 * ## Why in-memory instead of a database?
 * Exchange codes are valid for only 30 seconds — far too short-lived to warrant
 * a round-trip to the database on every OAuth login.  An in-memory Map provides:
 *
 *  - O(1) insert and lookup with no network latency.
 *  - Guaranteed single-use: the entry is deleted atomically on first consumption.
 *  - Automatic expiry via setTimeout — no TTL index or background sweep needed.
 *  - Zero additional schema, migration, or collection-management overhead.
 *
 * The only trade-off is that codes do not survive a process restart, which is
 * acceptable because any in-flight OAuth login that spans a restart will simply
 * redirect the user back to the login page (the 30-second window makes this
 * extremely unlikely in practice).
 *
 * For a multi-instance deployment, replace createCode / consumeCode with a shared
 * store such as Redis while keeping the same interface.
 */

const crypto = require('crypto');

/** @type {Map<string, {userId: string, timer: NodeJS.Timeout}>} */
const store = new Map();

/**
 * Generate a random 16-character hex exchange code, store it mapped to the
 * given userId, and schedule its automatic removal after 30 seconds.
 *
 * @param {import('mongoose').Types.ObjectId|string} userId
 * @returns {string} The generated exchange code.
 */
function createCode(userId) {
    const code = crypto.randomBytes(8).toString('hex'); // 16 hex characters

    const timer = setTimeout(() => store.delete(code), 30 * 1000);
    // Allow the Node.js process to exit normally even if the timer is pending.
    if (timer.unref) timer.unref();

    store.set(code, { userId: userId.toString(), timer });
    return code;
}

/**
 * Consume an exchange code in a single atomic operation: look it up, delete it
 * immediately (so it can never be reused), and return the associated userId.
 *
 * @param {string} code - The exchange code received from the client.
 * @returns {string|null} The userId string if the code was valid, otherwise null.
 */
function consumeCode(code) {
    const entry = store.get(code);
    if (!entry) return null;

    clearTimeout(entry.timer);
    store.delete(code);
    return entry.userId;
}

module.exports = { createCode, consumeCode };
