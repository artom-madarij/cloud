import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const { totalQuantity } = useSelector(state => state.cart);

  return (
    <header className="header">
      <div className="container">
        <div className="logo-circle">
          <div className="logo-outer">
            <div className="logo-inner"></div>
          </div>
        </div>
        
        <nav className="navigation">
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/catalog">Catalog</Link>
            </li>
            <li>
              <Link to="/cart" className="cart-link">
                Cart
                {totalQuantity > 0 && (
                  <span className="cart-badge">{totalQuantity}</span>
                )}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;