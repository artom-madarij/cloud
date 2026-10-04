import React, { useState, useEffect } from 'react';
import ProductTile from '../ProductTile/ProductTile';
import PrimaryButton from '../PrimaryButton/PrimaryButton';
import Loader from '../Loader/Loader';
import { productsAPI } from '../../services/api';

const ProductGrid = () => {
  const [products, setProducts] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const productsData = await productsAPI.getProducts();

        const initialProducts = productsData.slice(0, 3);
        setProducts(initialProducts);
        
      } catch (err) {
        setError('Помилка завантаження продуктів');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleViewMore = async () => {
    try {
      if (!showAll) {
        const allProducts = await productsAPI.getProducts();
        setProducts(allProducts);
      } else {
        const allProducts = await productsAPI.getProducts();
        const initialProducts = allProducts.slice(0, 3);
        setProducts(initialProducts);
      }
      setShowAll(!showAll);
    } catch (err) {
      console.error('Error in View More:', err);
    }
  };

  if (error) {
    return (
      <section className="product-grid">
        <div className="container">
          <div className="error-message">
            <p>{error}</p>
            <PrimaryButton onClick={() => window.location.reload()}>
              Спробувати ще раз
            </PrimaryButton>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="product-grid">
      <div className="container">
        {loading ? (
          <div className="loading-container">
            <Loader />
          </div>
        ) : (
          <>
            <div className="grid">
              {products.map(product => (
                <ProductTile 
                  key={product.id}
                  title={product.title}
                  description={product.description}
                  image={product.image} 
                />
              ))}
            </div>
            <div className="view-more">
              <PrimaryButton className="view-more-btn" onClick={handleViewMore}>
                {showAll ? 'Show Less' : 'View More'}
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;