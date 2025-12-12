const { GetObjectCommand } = require('@aws-sdk/client-s3');

// Helper to validate user access to app
const validateAppAccess = (req, appKey) => {
    // Global Admins have access to everything
    if (req.user && req.user.isGlobalAdmin) return true;

    // Check if appKey is in the user's allowed list
    if (req.user && req.user.allowedApps && req.user.allowedApps.includes(appKey)) {
        return true;
    }

    return false;
};

// Helper to get App Config (needs s3Client and BUCKET_NAME passed or imported)
// Since s3Client is usually local to the controller, we might keep this part in the controller
// or pass the client in. For now, we'll just export the access check.

module.exports = { validateAppAccess };
