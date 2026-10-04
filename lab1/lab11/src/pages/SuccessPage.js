import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './SuccessPage.css';

const SuccessPage = () => {
  const location = useLocation();
  const { orderNumber, totalAmount, orderId } = location.state || {};

  return (
    <section className="success-page">
      <div className="success-container">
        <div className="success-icon">
          ✓
        </div>
        
        <h1 className="success-title">Дякуємо за замовлення!</h1>
        
        <p className="success-message">
          Ваше замовлення успішно оформлено. Ми зв'яжемося з вами найближчим часом 
          для підтвердження деталей та організації доставки.
        </p>
        
        {orderNumber && (
          <div className="success-order-details">
            <div className="order-number">
              <span className="order-label">Номер вашого замовлення:</span>
              <span className="order-value">{orderNumber}</span>
            </div>
            {totalAmount && (
              <div className="order-total">
                <span className="total-label">Загальна сума:</span>
                <span className="total-value">${parseFloat(totalAmount).toFixed(2)}</span>
              </div>
            )}
            <p className="order-note">
              Збережіть цей номер для подальшого звернення
            </p>
          </div>
        )}
        
        <div className="success-actions">
          <Link to="/" className="success-btn btn-home">
            Повернутися на головну
          </Link>
          
          <Link to="/catalog" className="success-btn btn-catalog">
            Переглянути каталог
          </Link>
        </div>
        
      </div>
    </section>
  );
};

export default SuccessPage;