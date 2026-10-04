import React from 'react';
import './Select.css';

const Select = ({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder = "Select...",
  className = '' 
}) => {
  return (
    <div className={`select-container ${className}`}>
      {label && <label className="select-label">{label}</label>}
      <select 
        className="select"
        value={value} 
        onChange={onChange}
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;