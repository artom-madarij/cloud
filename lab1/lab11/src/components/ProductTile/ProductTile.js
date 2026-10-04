import React from 'react';

const ProductTile = ({ title, description, image }) => {
  return (
    <div className="product-tile">
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
      </div>
    </div>
  );
};

export default ProductTile;