import React from 'react';

const SWATCHES = [
  { label: 'Black',  value: '#111111' },
  { label: 'White',  value: '#f8fafc' },
  { label: 'Red',    value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Cyan',   value: '#06b6d4' },
  { label: 'Blue',   value: '#6366f1' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink',   value: '#ec4899' },
  { label: 'Brown',  value: '#92400e' },
  { label: 'Gray',   value: '#64748b' },
];

/**
 * Toolbar – color swatches, brush-size slider, and a clear button.
 *
 * Props:
 *   color       string   Currently selected color.
 *   brushSize   number   Currently selected brush size.
 *   onColor     fn       Called with new color string.
 *   onBrushSize fn       Called with new brush size number.
 *   onClear     fn       Called when the Clear button is pressed.
 */
function Toolbar({ color, brushSize, onColor, onBrushSize, onClear, disabled }) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Drawing toolbar">
      {/* Color swatches */}
      <div className="toolbar-section toolbar-swatches" aria-label="Color swatches">
        {SWATCHES.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            id={`swatch-${label.toLowerCase()}`}
            className={`color-swatch ${color === value ? 'swatch-active' : ''}`}
            style={{ '--swatch-color': value }}
            title={label}
            aria-label={`Color: ${label}`}
            onClick={() => onColor(value)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Brush-size slider */}
      <div className="toolbar-section toolbar-brush" aria-label="Brush size">
        <label htmlFor="brush-size-input" className="toolbar-label">
          Size <span className="brush-size-value">{brushSize}px</span>
        </label>
        <div className="brush-preview-row">
          <input
            id="brush-size-input"
            type="range"
            min={2}
            max={20}
            step={1}
            value={brushSize}
            onChange={(e) => onBrushSize(Number(e.target.value))}
            className="brush-slider"
            disabled={disabled}
          />
          <span
            className="brush-dot-preview"
            style={{
              width: brushSize,
              height: brushSize,
              background: color,
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="toolbar-divider" aria-hidden="true" />

      {/* Clear button */}
      <button
        id="toolbar-clear-btn"
        type="button"
        className="toolbar-clear-btn"
        onClick={onClear}
        title="Clear canvas"
        disabled={disabled}
      >
        🗑 Clear
      </button>
    </div>
  );
}

export default Toolbar;
