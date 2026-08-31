"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireProTier = requireProTier;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'omnistudio-secret-key-change-in-prod';
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        // Fallback default guest user in free tier
        req.user = { id: 'guest', email: 'guest@omnistudio.com', tier: 'free' };
        return next();
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            req.user = { id: 'guest', email: 'guest@omnistudio.com', tier: 'free' };
            return next();
        }
        req.user = user;
        next();
    });
}
function requireProTier(req, res, next) {
    if (req.user?.tier !== 'pro' && req.user?.tier !== 'enterprise') {
        return res.status(403).json({
            error: 'Pro Subscription Required',
            message: 'Upgrade to OmniStudio Pro to unlock Unlimited AI Transcriptions & 4K MP4 Exports.',
            upgradeUrl: '/checkout',
        });
    }
    next();
}
