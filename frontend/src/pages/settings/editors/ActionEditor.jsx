import React from 'react';

export default function ActionEditor({ actions, onChange }) {
  const list = actions || [];

  const handleAddAction = () => {
    const newAction = { 
      id: 'new_action', 
      name: 'New Action', 
      endpoint: '/api/action',
      method: 'POST',
      payloadTemplate: '{}',
      inputFields: []
    };
    onChange([...list, newAction]);
  };

  const handleUpdateAction = (index, field, value) => {
    const newList = [...list];
    newList[index] = { ...newList[index], [field]: value };
    onChange(newList);
  };

  const handleDeleteAction = (index) => {
    const newList = list.filter((_, i) => i !== index);
    onChange(newList);
  };

  const handleAddInputField = (actionIndex) => {
    const newList = [...list];
    const fields = newList[actionIndex].inputFields || [];
    newList[actionIndex].inputFields = [...fields, { name: 'new_field', label: 'New Field', type: 'text', defaultValue: '' }];
    onChange(newList);
  };

  const handleUpdateInputField = (actionIndex, fieldIndex, key, value) => {
    const newList = [...list];
    const fields = [...newList[actionIndex].inputFields];
    fields[fieldIndex] = { ...fields[fieldIndex], [key]: value };
    newList[actionIndex].inputFields = fields;
    onChange(newList);
  };

  const handleDeleteInputField = (actionIndex, fieldIndex) => {
    const newList = [...list];
    newList[actionIndex].inputFields = newList[actionIndex].inputFields.filter((_, i) => i !== fieldIndex);
    onChange(newList);
  };

  return (
    <div className="action-editor">
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Configurable Actions</h3>
        <button className="btn-small" onClick={handleAddAction}>+ Add Action</button>
      </div>

      {list.map((action, aIndex) => (
        <div key={aIndex} style={{ background: '#252525', padding: '1rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
                <label style={{fontSize: '0.8rem', color: '#888'}}>Action Name</label>
                <input
                type="text"
                value={action.name}
                onChange={(e) => handleUpdateAction(aIndex, 'name', e.target.value)}
                />
            </div>
            <div style={{ flex: 2 }}>
                <label style={{fontSize: '0.8rem', color: '#888'}}>Endpoint URL</label>
                <input
                type="text"
                value={action.endpoint}
                onChange={(e) => handleUpdateAction(aIndex, 'endpoint', e.target.value)}
                />
            </div>
            <div style={{ width: '100px' }}>
                <label style={{fontSize: '0.8rem', color: '#888'}}>Method</label>
                <select
                    value={action.method}
                    onChange={(e) => handleUpdateAction(aIndex, 'method', e.target.value)}
                >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                </select>
            </div>
            <button className="btn-secondary" onClick={() => handleDeleteAction(aIndex)} style={{ marginTop: '1.2rem', color: '#ff4d4d', borderColor: '#ff4d4d', height: '40px' }}>Delete</button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{fontSize: '0.8rem', color: '#888'}}>Payload Template (JSON)</label>
            <textarea
                value={action.payloadTemplate}
                onChange={(e) => handleUpdateAction(aIndex, 'payloadTemplate', e.target.value)}
                rows={3}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem' }}
                placeholder='{ "userId": "{{userId}}", "amount": {{amount}} }'
            />
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>Use <code>{`{{fieldName}}`}</code> syntax for dynamic values from input fields below.</p>
          </div>

          <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #2196f3' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#888' }}>Input Fields (User Configurable)</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 40px', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                <span>Field Name (ID)</span>
                <span>Label</span>
                <span>Type</span>
                <span>Default Value</span>
                <span></span>
            </div>

            {action.inputFields?.map((field, fIndex) => (
              <div key={fIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 40px', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                    type="text"
                    value={field.name}
                    onChange={(e) => handleUpdateInputField(aIndex, fIndex, 'name', e.target.value)}
                    placeholder="userId"
                />
                <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleUpdateInputField(aIndex, fIndex, 'label', e.target.value)}
                    placeholder="User ID"
                />
                <select
                    value={field.type}
                    onChange={(e) => handleUpdateInputField(aIndex, fIndex, 'type', e.target.value)}
                >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                </select>
                <input
                    type="text"
                    value={field.defaultValue}
                    onChange={(e) => handleUpdateInputField(aIndex, fIndex, 'defaultValue', e.target.value)}
                    placeholder="Optional"
                />
                <button className="btn-small" onClick={() => handleDeleteInputField(aIndex, fIndex)}>×</button>
              </div>
            ))}
            <button className="btn-small" onClick={() => handleAddInputField(aIndex)} style={{ marginTop: '0.5rem' }}>+ Add Input Field</button>
          </div>
        </div>
      ))}

      {list.length === 0 && (
        <div className="empty-state">No actions defined. Add one to create configurable buttons.</div>
      )}
    </div>
  );
}
