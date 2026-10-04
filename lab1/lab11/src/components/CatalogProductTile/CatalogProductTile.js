import React from 'react';
import { useNavigate } from 'react-router-dom';
import PrimaryButton from '../PrimaryButton/PrimaryButton';

const CatalogProductTile = ({ 
  id,
  title, 
  description, 
  image, 
  price, 
  type, 
  manufacturer, 
  diodes 
}) => {
  const navigate = useNavigate();

  const handleViewMore = () => {
    console.log('Navigating to product:', id, title); 
    navigate(`/item/${id}`);
  };

  return (
    <div className="catalog-product-tile">
      <div className="tile-image">
        <img 
          src={image} 
          alt={title}
          className="product-image"
          onError={(e) => {
            e.target.src = '/images/placeholder.jpg'; 
          }}
        />
      </div>
      <div className="tile-content">
        <h3>{title}</h3>
        <p>{description}</p>
        
        <div className="product-specs">
          <div className="spec-item">
            <span className="spec-label">Price:</span>
            <span className="spec-value">{price}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Type:</span>
            <span className="spec-value">{type}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Manufacturer:</span>
            <span className="spec-value">{manufacturer}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">LED Count:</span>
            <span className="spec-value">{diodes}</span>
          </div>
        </div>
        
        <div className="tile-actions">
          <PrimaryButton className="view-more-btn" onClick={handleViewMore}>
            View More
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default CatalogProductTile;