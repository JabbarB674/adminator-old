import React from 'react';

export default function LayoutEditor({ layout, onChange }) {
  const sections = layout.sections || [];

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
              style={{ flex: 1 }}
            />
            <button className="btn-secondary" onClick={() => handleDeleteSection(sIndex)} style={{ color: '#ff4d4d', borderColor: '#ff4d4d' }}>Delete</button>
          </div>

          <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #444' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#888' }}>Widgets</h4>
            {section.widgets?.map((widget, wIndex) => (
              <div key={wIndex} style={{ background: '#333', padding: '0.8rem', marginBottom: '0.5rem', borderRadius: '4px' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select
                    value={widget.type}
                    onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'type', e.target.value)}
                    style={{ width: '120px' }}
                  >
                    <option value="markdown">Markdown</option>
                    <option value="link-list">Link List</option>
                    <option value="stats-card">Stats Card</option>
                    <option value="action-buttons">Action Buttons</option>
                  </select>
                  <input
                    type="text"
                    value={widget.title || ''}
                    onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'title', e.target.value)}
                    placeholder="Widget Title (Optional)"
                    style={{ flex: 1 }}
                  />
                  <button className="btn-small" onClick={() => handleDeleteWidget(sIndex, wIndex)}>×</button>
                </div>

                {/* Widget Specific Config */}
                {widget.type === 'markdown' && (
                  <textarea
                    value={widget.content || ''}
                    onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'content', e.target.value)}
                    placeholder="Markdown Content..."
                    rows={3}
                    style={{ width: '100%', fontSize: '0.9rem' }}
                  />
                )}
                
                {widget.type === 'stats-card' && (
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        placeholder="Endpoint (e.g. /orders/stats)" 
                        value={widget.dataSource?.endpoint || ''}
                        onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'dataSource', { ...widget.dataSource, endpoint: e.target.value })}
                      />
                      <input 
                        placeholder="Field (e.g. count)" 
                        value={widget.dataSource?.field || ''}
                        onChange={(e) => handleUpdateWidget(sIndex, wIndex, 'dataSource', { ...widget.dataSource, field: e.target.value })}
                      />
                   </div>
                )}

                {/* Simplified Link List Editor */}
                {widget.type === 'link-list' && (
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                        Link editing not fully implemented in UI yet. Edit JSON for links.
                    </div>
                )}
              </div>
            ))}
            <button className="btn-small" onClick={() => handleAddWidget(sIndex)} style={{ marginTop: '0.5rem' }}>+ Add Widget</button>
          </div>
        </div>
      ))}
      
      {sections.length === 0 && (
        <div className="empty-state">No sections defined. Add one to start.</div>
      )}
    </div>
  );
}
