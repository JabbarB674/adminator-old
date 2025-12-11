import React from 'react';

export default function ResourceEditor({ resources, onChange }) {
  const list = resources || [];

  const handleAddResource = () => {
    const newResource = { 
      id: 'new_resource', 
      name: 'New Resource', 
      endpoint: '/api/resource',
      schema: { fields: [] },
      views: { list: { columns: [] } }
    };
    onChange([...list, newResource]);
  };

  const handleUpdateResource = (index, field, value) => {
    const newList = [...list];
    newList[index] = { ...newList[index], [field]: value };
    onChange(newList);
  };

  const handleDeleteResource = (index) => {
    const newList = list.filter((_, i) => i !== index);
    onChange(newList);
  };

  const handleAddField = (resIndex) => {
    const newList = [...list];
    const fields = newList[resIndex].schema?.fields || [];
    newList[resIndex].schema = {
        ...newList[resIndex].schema,
        fields: [...fields, { name: 'new_field', type: 'text' }]
    };
    onChange(newList);
  };

  const handleUpdateField = (resIndex, fieldIndex, key, value) => {
    const newList = [...list];
    const fields = [...newList[resIndex].schema.fields];
    fields[fieldIndex] = { ...fields[fieldIndex], [key]: value };
    newList[resIndex].schema.fields = fields;
    onChange(newList);
  };

  const handleDeleteField = (resIndex, fieldIndex) => {
    const newList = [...list];
    newList[resIndex].schema.fields = newList[resIndex].schema.fields.filter((_, i) => i !== fieldIndex);
    onChange(newList);
  };

  return (
    <div className="resource-editor">
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Data Resources</h3>
        <button className="btn-small" onClick={handleAddResource}>+ Add Resource</button>
      </div>

      {list.map((res, rIndex) => (
        <div key={rIndex} style={{ background: '#252525', padding: '1rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
                <label style={{fontSize: '0.8rem', color: '#888'}}>ID</label>
                <input
                type="text"
                value={res.id}
                onChange={(e) => handleUpdateResource(rIndex, 'id', e.target.value)}
                />
            </div>
            <div style={{ flex: 1 }}>
                <label style={{fontSize: '0.8rem', color: '#888'}}>Display Name</label>
                <input
                type="text"
                value={res.name}
                onChange={(e) => handleUpdateResource(rIndex, 'name', e.target.value)}
                />
            </div>
            <div style={{ flex: 2 }}>
                <label style={{fontSize: '0.8rem', color: '#888'}}>API Endpoint</label>
                <input
                type="text"
                value={res.endpoint}
                onChange={(e) => handleUpdateResource(rIndex, 'endpoint', e.target.value)}
                />
            </div>
            <button className="btn-secondary" onClick={() => handleDeleteResource(rIndex)} style={{ marginTop: '1.2rem', color: '#ff4d4d', borderColor: '#ff4d4d', height: '40px' }}>Delete</button>
          </div>

          <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #4caf50' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#888' }}>Schema Fields</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                <span>Field Name</span>
                <span>Type</span>
                <span>Required</span>
                <span></span>
            </div>

            {res.schema?.fields?.map((field, fIndex) => (
              <div key={fIndex} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                    type="text"
                    value={field.name}
                    onChange={(e) => handleUpdateField(rIndex, fIndex, 'name', e.target.value)}
                    placeholder="field_name"
                />
                <select
                    value={field.type}
                    onChange={(e) => handleUpdateField(rIndex, fIndex, 'type', e.target.value)}
                >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                    <option value="select">Select</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', borderRadius: '4px' }}>
                    <input 
                        type="checkbox"
                        checked={field.required || false}
                        onChange={(e) => handleUpdateField(rIndex, fIndex, 'required', e.target.checked)}
                    />
                </div>
                <button className="btn-small" onClick={() => handleDeleteField(rIndex, fIndex)}>×</button>
              </div>
            ))}
            <button className="btn-small" onClick={() => handleAddField(rIndex)} style={{ marginTop: '0.5rem' }}>+ Add Field</button>
          </div>
        </div>
      ))}

      {list.length === 0 && (
        <div className="empty-state">No resources defined. Add one to define your data model.</div>
      )}
    </div>
  );
}
