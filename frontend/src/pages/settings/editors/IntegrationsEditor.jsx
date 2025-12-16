import React from 'react';

export default function IntegrationsEditor({ integrations, onChange }) {
    const aws = integrations?.aws || {};

    const handleAwsChange = (field, value) => {
        const newAws = { ...aws, [field]: value };
        onChange({ ...integrations, aws: newAws });
    };

    const isVaulted = (val) => val && typeof val === 'string' && val.startsWith('{{VAULT:');

    return (
        <div className="editor-section">
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    AWS (Amazon Web Services)
                </h3>
                <p className="hint">
                    Configure base AWS credentials for this app. These will be used for:
                    <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                        <li>Signing HTTP requests (SigV4) to API Gateway or Lambda URLs.</li>
                        <li>Assuming IAM Roles defined in Actions.</li>
                        <li>Accessing S3 buckets (if not overridden in Bucket Source).</li>
                    </ul>
                </p>

                <div className="form-row">
                    <div className="form-group">
                        <label>Access Key ID</label>
                        {isVaulted(aws.accessKeyId) ? (
                            <div className="vault-placeholder">
                                <span>🔒 Stored in Vault</span>
                                <button 
                                    className="btn-text" 
                                    onClick={() => handleAwsChange('accessKeyId', '')}
                                >
                                    Overwrite
                                </button>
                            </div>
                        ) : (
                            <input 
                                type="text" 
                                value={aws.accessKeyId || ''} 
                                onChange={e => handleAwsChange('accessKeyId', e.target.value)}
                                placeholder="AKIA..."
                                autoComplete="off"
                                data-lpignore="true"
                            />
                        )}
                    </div>
                    <div className="form-group">
                        <label>Secret Access Key</label>
                        {isVaulted(aws.secretAccessKey) ? (
                            <div className="vault-placeholder">
                                <span>🔒 Stored in Vault</span>
                                <button 
                                    className="btn-text" 
                                    onClick={() => handleAwsChange('secretAccessKey', '')}
                                >
                                    Overwrite
                                </button>
                            </div>
                        ) : (
                            <input 
                                type="password" 
                                value={aws.secretAccessKey || ''} 
                                onChange={e => handleAwsChange('secretAccessKey', e.target.value)}
                                placeholder="EXAMPLEKEY"
                                autoComplete="new-password"
                                data-lpignore="true"
                            />
                        )}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Default Region</label>
                        <input 
                            type="text" 
                            value={aws.region || ''} 
                            onChange={e => handleAwsChange('region', e.target.value)}
                            placeholder="us-east-1"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
