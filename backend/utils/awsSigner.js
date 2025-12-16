const { SignatureV4 } = require('@smithy/signature-v4');
const { Sha256 } = require('@aws-crypto/sha256-js');
const { HttpRequest } = require('@smithy/protocol-http');
const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');
const secretsService = require('../services/secretsService');

/**
 * Signs an HTTP request using AWS SigV4.
 * 
 * @param {Object} params
 * @param {string} params.appId - The App ID context (used to fetch base creds)
 * @param {string} params.method - HTTP method (GET, POST, etc.)
 * @param {string} params.url - Full URL of the request
 * @param {string} params.region - AWS Region
 * @param {string} params.service - AWS Service (e.g., 'execute-api', 'lambda')
 * @param {string} [params.assumeRoleArn] - Optional IAM Role ARN to assume
 * @param {Object} [params.headers] - Request headers
 * @param {Object|string} [params.body] - Request body
 * @returns {Promise<Object>} - Signed headers
 */
async function signAwsRequest({ appId, method, url, region, service, assumeRoleArn, headers = {}, body }) {
    const urlObj = new URL(url);
    
    // 1. Get Base Credentials (Vault or Env)
    const baseCreds = await secretsService.getAwsBaseCreds(appId);
    
    let credentials = {
        accessKeyId: baseCreds.accessKeyId,
        secretAccessKey: baseCreds.secretAccessKey,
        sessionToken: baseCreds.sessionToken // Optional
    };

    // 2. Assume Role if requested
    if (assumeRoleArn) {
        try {
            // We use the base credentials to sign the AssumeRole request
            const sts = new STSClient({ 
                region: region || baseCreds.region,
                credentials 
            });
            
            const command = new AssumeRoleCommand({
                RoleArn: assumeRoleArn,
                RoleSessionName: 'AdminatorActionSession'
            });
            
            const response = await sts.send(command);
            credentials = {
                accessKeyId: response.Credentials.AccessKeyId,
                secretAccessKey: response.Credentials.SecretAccessKey,
                sessionToken: response.Credentials.SessionToken
            };
        } catch (err) {
            console.error('Error assuming role:', err);
            throw new Error(`Failed to assume role ${assumeRoleArn}: ${err.message}`);
        }
    }

    // Prepare the request for signing
    const request = new HttpRequest({
        method: method.toUpperCase(),
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        query: Object.fromEntries(urlObj.searchParams),
        headers: {
            host: urlObj.hostname,
            ...headers
        },
        body: typeof body === 'object' ? JSON.stringify(body) : (body || '')
    });

    // Create the signer
    const signer = new SignatureV4({
        credentials,
        region: region || baseCreds.region,
        service: service || 'execute-api',
        sha256: Sha256,
    });

    // Sign the request
    const signedRequest = await signer.sign(request);

    return signedRequest.headers;
}

module.exports = { signAwsRequest };