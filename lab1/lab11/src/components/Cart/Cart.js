import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom'; 
import { cartAPI } from '../../services/api';
import PrimaryButton from '../PrimaryButton/PrimaryButton';
import Loader from '../Loader/Loader';
import { 
  setCartItems, 
  updateCartItemQuantity, 
  removeCartItem,
  clearCart as clearCartAction
} from '../../store/slices/cartSlice';
import './Cart.css';

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate(); 
  const { items, totalQuantity, totalAmount } = useSelector(state => state.cart);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingItems, setUpdatingItems] = useState({});

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const cartItems = await cartAPI.getCart();
      dispatch(setCartItems(cartItems));
    } catch (err) {
      setError('Помилка завантаження кошика');
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleUpdateQuantity = async (productId, temperature, newQuantity) => {
    try {
      setUpdatingItems(prev => ({ ...prev, [`${productId}-${temperature}`]: true }));

      await cartAPI.updateCartItem(productId, newQuantity, temperature);

      dispatch(updateCartItemQuantity({ 
        productId, 
        temperature, 
        quantity: newQuantity 
      }));
      
    } catch (error) {
      alert('Помилка при оновленні кількості: ' + (error.response?.data?.error || error.message));
      await fetchCart();
    } finally {
      setUpdatingItems(prev => ({ ...prev, [`${productId}-${temperature}`]: false }));
    }
  };

  const handleRemoveFromCart = async (productId, temperature) => {
    try {
      await cartAPI.removeFromCart(productId, temperature);
      
      dispatch(removeCartItem({ productId, temperature }));
      
    } catch (error) {
      alert('Помилка при видаленні: ' + (error.response?.data?.error || error.message));
      await fetchCart();
    }
  };

  const handleClearCart = async () => {
    try {
      await cartAPI.clearCart();

      dispatch(clearCartAction());
      
    } catch (error) {
      alert('Помилка при очищенні кошика: ' + (error.response?.data?.error || error.message));
      await fetchCart();
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      alert('Кошик порожній!');
      return;
    }
    
    navigate('/checkout');
  };

  const getTemperatureLabel = (value) => {
    const temperatures = {
      'warm-white': 'Теплий білий (2700K)',
      'cool-white': 'Холодний білий (4000K)',
      'daylight': 'Денне світло (5000K)'
    };
    return temperatures[value] || value;
  };

  const handleItemClick = (productId) => {
    navigate(`/item/${productId}`);
  };

  if (loading) {
    return (
      <section className="cart-page">
        <div className="container">
          <Loader />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="cart-page">
        <div className="container">
          <div className="error-message">
            <p>{error}</p>
            <PrimaryButton onClick={fetchCart}>
              Спробувати ще раз
            </PrimaryButton>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="cart-page">
        <div className="container">
          <h1 className="cart-title">Кошик</h1>
          <div className="empty-cart">
            <h2>Ваш кошик порожній</h2>
            <p>Додайте товари з каталогу, щоб зробити покупку</p>
            <PrimaryButton onClick={() => window.location.href = '/catalog'}>
              Перейти до каталогу
            </PrimaryButton>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <div className="container">
        <div className="cart-header">
          <h1 className="cart-title">Кошик</h1>
          <button className="clear-cart-btn" onClick={handleClearCart}>
            Очистити кошик
          </button>
        </div>

        <div className="cart-content">
          <div className="cart-items">
            {items.map(item => {
              const itemKey = `${item.product_id}-${item.temperature}`;
              const isUpdating = updatingItems[itemKey];

              return (
                <div key={itemKey} className="cart-item">
                  {}
                  <div 
                    className="item-image-"
                    onClick={() => handleItemClick(item.product_id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img
                      src={`${item.image}?size=cart&id=${item.product_id}`}
                      alt={item.title}
                      onError={(e) => {
                        e.target.src = '/images/placeholder.jpg';
                      }}
                    />
                  </div>

                  <div className="item-details">
                    {}
                    <h3 
                      className="item-title"
                      onClick={() => handleItemClick(item.product_id)}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {item.title}
                    </h3>
                    <p className="item-price">${item.price} за шт.</p>
                    <p className="item-temperature">
                      Температура: {getTemperatureLabel(item.temperature)}
                    </p>
                    <p className="item-stock">В наявності: {item.stock} шт.</p>
                  </div>

                  <div className="item-quantity">
                    <button
                      className="quantity-btn"
                      onClick={() => handleUpdateQuantity(item.product_id, item.temperature, item.quantity - 1)}
                      disabled={item.quantity <= 1 || isUpdating}
                    >
                      -
                    </button>
                    <span className="quantity">{isUpdating ? '...' : item.quantity}</span>
                    <button
                      className="quantity-btn"
                      onClick={() => handleUpdateQuantity(item.product_id, item.temperature, item.quantity + 1)}
                      disabled={item.quantity >= item.stock || item.quantity >= 10 || isUpdating}
                    >
                      +
                    </button>
                  </div>

                  <div className="item-total">
                    <span className="total-price">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                  </div>

                  <button
                    className="delete-btn"
                    onClick={() => handleRemoveFromCart(item.product_id, item.temperature)}
                    disabled={isUpdating}
                  >
                    delete
                  </button>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <div className="summary-card">
              <h3>Підсумок замовлення</h3>

              <div className="summary-row">
                <span>Кількість товарів:</span>
                <span>{totalQuantity}</span>
              </div>

              <div className="summary-row">
                <span>Загальна сума:</span>
                <span className="total-amount">${totalAmount.toFixed(2)}</span>
              </div>

              <div className="summary-divider"></div>

              <PrimaryButton className="checkout-btn" onClick={handleCheckout}>
                Оформити замовлення
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Cart;