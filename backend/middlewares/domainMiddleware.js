/**
 * Domain Middleware
 * Handles organization domain validation and restrictions
 */

const logger = require('../config/logger');
const { isPublicDomain, getOrgDomain } = require('../utils/domainHelper');
const { sendForbidden } = require('../utils/responseHelper');

/**
 * Middleware to restrict access for public domain emails
 * Use this for routes that should only be accessible to organization users
 */
const restrictPublicDomain = (req, res, next) => {
    const userEmail = req.user?.email;
    
    if (!userEmail) {
        return sendForbidden(res, 'User email not found');
    }

    const domain = getOrgDomain(userEmail);
    
    if (isPublicDomain(domain)) {
        return sendForbidden(res, 'This feature is only available for organization accounts. Public email domains are not supported.');
    }

    // Attach domain to request for downstream use
    req.orgDomain = domain;
    next();
};

/**
 * Middleware to attach organization domain to request
 * Does not restrict, just adds domain info
 */
const attachOrgDomain = (req, res, next) => {
    const userEmail = req.user?.email;
    
    if (userEmail) {
        req.orgDomain = getOrgDomain(userEmail);
        req.isPublicDomain = isPublicDomain(req.orgDomain);
    }
    
    next();
};

/**
 * Middleware to ensure user can only access resources from same organization
 * @param {Function} getResourceEmail - Function to get resource owner's email from request
 */
const matchOrgDomain = (getResourceEmail) => {
    return async (req, res, next) => {
        try {
            const userDomain = getOrgDomain(req.user?.email);
            const resourceEmail = await getResourceEmail(req);
            const resourceDomain = getOrgDomain(resourceEmail);

            // Allow if same domain or if admin
            if (userDomain === resourceDomain || req.user?.role === 'admin') {
                next();
            } else {
                return sendForbidden(res, 'Access denied. Resource belongs to a different organization.');
            }
        } catch (error) {
            logger.error('Domain match error:', error);
            return sendForbidden(res, 'Unable to verify organization access');
        }
    };
};

module.exports = {
    restrictPublicDomain,
    attachOrgDomain,
    matchOrgDomain,
};
