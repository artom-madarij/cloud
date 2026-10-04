import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    totalQuantity: 0,
    totalAmount: 0,
  },
  reducers: {
    setCartItems: (state, action) => {
      state.items = action.payload;
      state.totalQuantity = action.payload.reduce((total, item) => total + item.quantity, 0);
      state.totalAmount = action.payload.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
    },
    
    addToCart: (state, action) => {
      const { id, title, price, image, temperature, quantity = 1 } = action.payload;
      const existingItemIndex = state.items.findIndex(
        item => item.product_id === id && item.temperature === temperature
      );
      
      if (existingItemIndex >= 0) {
        state.items[existingItemIndex].quantity += quantity;
      } else {
        state.items.push({
          product_id: id,
          title,
          price,
          image,
          temperature,
          quantity,
          stock: 50 
        });
      }
      
      state.totalQuantity += quantity;
      state.totalAmount = state.items.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
    },
    
    updateCartItemQuantity: (state, action) => {
      const { productId, temperature, quantity } = action.payload;
      const itemIndex = state.items.findIndex(
        item => item.product_id === productId && item.temperature === temperature
      );
      
      if (itemIndex >= 0) {
        const oldQuantity = state.items[itemIndex].quantity;
        state.items[itemIndex].quantity = quantity;
        
        state.totalQuantity += (quantity - oldQuantity);
        state.totalAmount = state.items.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
      }
    },
    
    removeCartItem: (state, action) => {
      const { productId, temperature } = action.payload;
      const itemIndex = state.items.findIndex(
        item => item.product_id === productId && item.temperature === temperature
      );
      
      if (itemIndex >= 0) {
        state.totalQuantity -= state.items[itemIndex].quantity;
        state.items.splice(itemIndex, 1);
        state.totalAmount = state.items.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
      }
    },
    
    clearCart: (state) => {
      state.items = [];
      state.totalQuantity = 0;
      state.totalAmount = 0;
    },
  },
});

export const { 
  setCartItems, 
  addToCart, 
  updateCartItemQuantity, 
  removeCartItem, 
  clearCart 
} = cartSlice.actions;
export default cartSlice.reducer;