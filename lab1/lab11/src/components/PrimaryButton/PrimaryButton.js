import React from 'react';
import './PrimaryButton.css';

const PrimaryButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false,
  className = '',
  ...props 
}) => {
  return (
    <button
      className={`primary-button ${loading ? 'loading' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

export default PrimaryButton;