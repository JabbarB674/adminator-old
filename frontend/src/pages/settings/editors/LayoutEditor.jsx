import React from 'react';

export default function LayoutEditor({ layout, onChange, dataSource, actions }) {
  const sections = layout.sections || [];
  const tables = dataSource?.tables || [];
  const availableActions = actions || [];

  const handleAddSection = () => {
    const newSection = { title: 'New Section', widgets: [] };
    onChange({ ...layout, sections: [...sections, newSection] });
  };

  const handleUpdateSection = (index, field, value) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    onChange({ ...layout, sections: newSections });
  };

  const handleDeleteSection = (index) => {
    const newSections = sections.filter((_, i) => i !== index);
    onChange({ ...layout, sections: newSections });
  };

  const handleAddWidget = (sectionIndex) => {
    const newWidget = { type: 'markdown', title: 'New Widget', content: '' };
    const newSections = [...sections];
    newSections[sectionIndex].widgets = [...(newSections[sectionIndex].widgets || []), newWidget];
    onChange({ ...layout, sections: newSections });
  };

  const handleUpdateWidget = (sectionIndex, widgetIndex, field, value) => {
    const newSections = [...sections];
    const widgets = [...newSections[sectionIndex].widgets];
    widgets[widgetIndex] = { ...widgets[widgetIndex], [field]: value };
    newSections[sectionIndex].widgets = widgets;
    onChange({ ...layout, sections: newSections });
  };

  const handleDeleteWidget = (sectionIndex, widgetIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].widgets = newSections[sectionIndex].widgets.filter((_, i) => i !== widgetIndex);
    onChange({ ...layout, sections: newSections });
  };

  return (
    <div className="layout-editor">
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Dashboard Sections</h3>
        <button className="btn-small" onClick={handleAddSection}>+ Add Section</button>
      </div>

      {sections.map((section, sIndex) => (
        <div key={sIndex} style={{ background: '#252525', padding: '1rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={section.title}
              onChange={(e) => handleUpdateSection(sIndex, 'title', e.target.value)}
              placeholder="Section Title"
              style={{ flex: 1, fontWeight: 'bold' }}
            />
            <button className="btn-secondary" onClick={() => handleDeleteSection(sIndex)} style={{ color: '#ff4d4d', borderColor: '#ff4d4d' }}>Delete Section</button>
          </div>

          <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #444' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#888' }}>Widgets</h4>
            
            {section.widgets?.map((widget, wIndex) => (
              <div key={wIndex} style={{ background: '#333', padding: '1rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #444' }}>
                
                {/* Widget Header */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                  <select
                    value={widget.type}
                    onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'type', e.target.value)}
                    style={{ width: '150px', fontWeight: 'bold' }}
                  >
                    <option value="markdown">Markdown Text</option>
                    <option value="button">Action Button</option>
                    <option value="data-grid">Data Grid (Table)</option>
                  </select>
                  
                  <input
                    type="text"
                    value={widget.title || ''}
                    onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'title', e.target.value)}
                    placeholder="Widget Title (Optional)"
                    style={{ flex: 1 }}
                  />
                  
                  <button className="btn-small" onClick={() => handleDeleteWidget(sIndex, wIndex)} style={{ color: '#ff4d4d' }}>×</button>
                </div>

                {/* Widget Configuration Body */}
                <div style={{ background: '#222', padding: '1rem', borderRadius: '4px' }}>
                    
                    {/* MARKDOWN WIDGET */}
                    {widget.type === 'markdown' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#aaa' }}>Content (Markdown Supported)</label>
                            <textarea
                                value={widget.content || ''}
                                onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'content', e.target.value)}
                                placeholder="# Hello World&#10;This is a text widget."
                                rows={4}
                                style={{ width: '100%', fontFamily: 'monospace' }}
                            />
                        </div>
                    )}

                    {/* BUTTON WIDGET */}
                    {widget.type === 'button' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#aaa' }}>Button Label</label>
                                <input
                                    type="text"
                                    value={widget.label || ''}
                                    onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'label', e.target.value)}
                                    placeholder="e.g. Open User Manager"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#aaa' }}>Action Type</label>
                                <select
                                    value={widget.actionType || 'curl'}
                                    onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'actionType', e.target.value)}
                                >
                                    <option value="curl">API Invoker (cURL)</option>
                                    <option value="db-lookup">DB Editor (Table View)</option>
                                    <option value="bucket">Bucket Explorer</option>
                                    <option value="custom">Custom Action (Lambda)</option>
                                </select>
                            </div>

                            {/* Dynamic Config based on Action Type */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                {widget.actionType === 'db-lookup' && (
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#aaa' }}>Target Table</label>
                                        <select
                                            value={widget.target || ''}
                                            onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'target', e.target.value)}
                                        >
                                            <option value="">-- Select Table --</option>
                                            {tables.map(t => (
                                                <option key={t.name} value={t.name}>{t.displayName || t.name}</option>
                                            ))}
                                        </select>
                                        {tables.length === 0 && <div style={{ fontSize: '0.8rem', color: '#f88', marginTop: '0.25rem' }}>No tables defined in Data Source tab.</div>}
                                    </div>
                                )}

                                {widget.actionType === 'bucket' && (
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#aaa' }}>Root Folder Path</label>
                                        <input
                                            type="text"
                                            value={widget.target || ''}
                                            onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'target', e.target.value)}
                                            placeholder="e.g. uploads/users/"
                                        />
                                    </div>
                                )}

                                {widget.actionType === 'custom' && (
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#aaa' }}>Select Action</label>
                                        <select
                                            value={widget.target || ''}
                                            onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'target', e.target.value)}
                                        >
                                            <option value="">-- Select Action --</option>
                                            {availableActions.map(a => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                        {availableActions.length === 0 && <div style={{ fontSize: '0.8rem', color: '#f88', marginTop: '0.25rem' }}>No actions defined in Actions tab.</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* DATA GRID WIDGET */}
                    {widget.type === 'data-grid' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#aaa' }}>Data Source Table</label>
                            <select
                                value={widget.table || ''}
                                onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'table', e.target.value)}
                            >
                                <option value="">-- Select Table --</option>
                                {tables.map(t => (
                                    <option key={t.name} value={t.name}>{t.displayName || t.name}</option>
                                ))}
                            </select>
                            {tables.length === 0 && <div style={{ fontSize: '0.8rem', color: '#f88', marginTop: '0.25rem' }}>No tables defined in Data Source tab.</div>}
                        </div>
                    )}

                </div>
              </div>
            ))}
            
            <button className="btn-small" onClick={() => handleAddWidget(sIndex)} style={{ marginTop: '0.5rem', width: '100%' }}>+ Add Widget</button>
          </div>
        </div>
      ))}
      
      {sections.length === 0 && (
        <div className="empty-state">No sections defined. Add one to start building your dashboard.</div>
      )}
    </div>
  );
}
