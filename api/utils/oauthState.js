/**
 * @module utils/oauthState
 * @description Stateless, HMAC-signed OAuth state parameter generation and verification.
 *
 * ## Why stateless?
 * The traditional approach stores the state nonce in an httpOnly cookie and reads it
 * back on the callback.  This breaks when the OAuth initiation request and the
 * provider's callback travel through different HTTP origins:
 *
 *   Cloudflare Pages (frontend)
 *     → Cloudflare Worker (API proxy)
 *       → Render Node.js backend  ← state cookie set here, for the Render domain
 *   Provider callback → Render backend directly
 *     → browser has no cookie for Render domain → req.cookies.oauth_state undefined
 *       → "state mismatch" → auth failure
 *
 * The HMAC approach encodes the verification material inside the state string itself:
 *
 *   state = `${nonce}.${HMAC-SHA256(nonce, JWT_KEY)}`
 *
 * On callback the backend re-derives the HMAC from the nonce and compares using a
 * constant-time comparison.  No cookie — no cross-domain dependency.
 *
 * Security properties preserved:
 *  - CSRF protection: an attacker cannot forge a valid state without knowing JWT_KEY.
 *  - Uniqueness per flow: the 16-byte nonce makes each state value distinct.
 *  - Timing-safe comparison: crypto.timingSafeEqual prevents timing side-channels.
 */

const crypto = require('crypto');

/**
 * Return the HMAC signing secret, throwing early if it is not configured.
 * This prevents the use of a predictable fallback key in production.
 *
 * @returns {string} The JWT_KEY environment variable value.
 * @throws {Error} If JWT_KEY is not set.
 */
function getSecret() {
    const secret = process.env.JWT_KEY;
    if (!secret) {
        throw new Error(
            'JWT_KEY environment variable is not set. ' +
            'OAuth CSRF protection requires this secret to sign state tokens.'
        );
    }
    return secret;
}

/**
 * Generate a self-verifying HMAC OAuth state string.
 *
 * @returns {string} `<hex-nonce>.<hex-HMAC-SHA256(nonce, JWT_KEY)>`
 */
function generateOAuthState() {
    const nonce = crypto.randomBytes(16).toString('hex');
    const sig = crypto
        .createHmac('sha256', getSecret())
        .update(nonce)
        .digest('hex');
    return `${nonce}.${sig}`;
}

/**
 * Verify a state string returned by the OAuth provider in the callback.
 *
 * @param {string} state - The `state` query parameter from the callback URL.
 * @returns {boolean} `true` if the state is well-formed and the HMAC matches.
 */
function verifyOAuthState(state) {
    if (!state || typeof state !== 'string') return false;

    const dotIndex = state.indexOf('.');
    if (dotIndex === -1) return false;

    const nonce = state.slice(0, dotIndex);
    const providedSig = state.slice(dotIndex + 1);

    if (!nonce || !providedSig) return false;

    const expectedSig = crypto
        .createHmac('sha256', getSecret())
        .update(nonce)
        .digest('hex');

    // Both signatures must be hex strings of the same length (64 chars for SHA-256).
    // timingSafeEqual requires equal-length buffers; if lengths differ the state is
    // trivially invalid and we return false rather than throwing.
    try {
        const providedBuf = Buffer.from(providedSig, 'hex');
        const expectedBuf = Buffer.from(expectedSig, 'hex');
        if (providedBuf.length !== expectedBuf.length) return false;
        return crypto.timingSafeEqual(providedBuf, expectedBuf);
    } catch {
        return false;
    }
}

module.exports = { generateOAuthState, verifyOAuthState };
