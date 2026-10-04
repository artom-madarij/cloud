import React from 'react';
import { Provider } from 'react-redux';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import ProductGrid from './components/ProductGrid/ProductGrid'; 
import Catalog from './components/Catalog/Catalog';
import Item from './components/Item/Item';
import Cart from './components/Cart/Cart';
import Footer from './components/Footer/Footer';
import CheckoutPage from './pages/CheckoutPage'; 
import SuccessPage from './pages/SuccessPage';

import { store } from './store';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={
            <>
              <Hero />
              <ProductGrid />
            </>
          } />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/item/:id" element={<Item />} />
          <Route path="/cart" element={<Cart />} />
          
          {}
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/success" element={<SuccessPage />} />

          <Route path="/home" element={
            <>
              <Hero />
              <ProductGrid />
            </>
          } />
        </Routes>
        <Footer />
      </div>
    </Provider>
  );
}

export default App;