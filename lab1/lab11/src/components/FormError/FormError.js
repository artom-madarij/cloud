import React from 'react';
import './FormError.css'; 

const FormError = ({ message }) => {
  if (!message) return null;
  
  return (
    <div className="error-message">
      <span>{message}</span>
    </div>
  );
};

export default FormError;