import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.response.config.url
      });
    } else if (error.request) {
      console.error('API Error Request:', 'No response received');
    } else {
      console.error('API Error Message:', error.message);
    }
    return Promise.reject(error);
  }
);

export const productsAPI = {
  getProducts: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.type) params.append('type', filters.type);
      if (filters.manufacturer) params.append('manufacturer', filters.manufacturer);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await api.get(`/products?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Products API Error:', error);
      throw error;
    }
  },

  getProductById: async (id) => {
    try {
      const response = await api.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Product API Error:', error);
      throw error;
    }
  }
};

export const cartAPI = {
  getCart: async () => {
    try {
      const response = await api.get('/cart');
      return response.data;
    } catch (error) {
      console.error('Cart API Error:', error);
      throw error;
    }
  },

  addToCart: async (productId, quantity = 1, temperature = 'warm-white') => {
    try {
      const response = await api.post('/cart', { productId, quantity, temperature });
      return response.data;
    } catch (error) {
      console.error('Cart API Error:', error);
      throw error;
    }
  },

  updateCartItem: async (productId, quantity, temperature = 'warm-white') => {
    try {
      const response = await api.put(`/cart/${productId}`, { quantity, temperature });
      return response.data;
    } catch (error) {
      console.error('Cart API Error:', error);
      throw error;
    }
  },

  removeFromCart: async (productId, temperature = 'warm-white') => {
    try {
      const response = await api.delete(`/cart/${productId}`, { data: { temperature } });
      return response.data;
    } catch (error) {
      console.error('Cart API Error:', error);
      throw error;
    }
  },

  clearCart: async () => {
    try {
      const response = await api.delete('/cart');
      return response.data;
    } catch (error) {
      console.error('Cart API Error:', error);
      throw error;
    }
  },

  checkout: async (checkoutData) => {
    try {
      console.log('Відправка даних оформлення замовлення:', checkoutData);
      
      const requiredFields = ['firstName', 'lastName', 'age', 'email', 'phone'];
      const missingFields = requiredFields.filter(field => !checkoutData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Відсутні обов'язкові поля: ${missingFields.join(', ')}`);
      }

      const dataToSend = {
        ...checkoutData,
        age: parseInt(checkoutData.age, 10)
      };

      const response = await api.post('/checkout', dataToSend);
      console.log('Відповідь сервера на оформлення:', response.data);
      return response.data;
    } catch (error) {
      console.error('Checkout API Error:', error);
      
      let errorMessage = 'Помилка при оформленні замовлення';
      
      if (error.response) {
        const serverError = error.response.data?.error || error.response.statusText;
        const serverMessage = error.response.data?.message || '';
        errorMessage = `${serverError}${serverMessage ? ': ' + serverMessage : ''}`;
      } else if (error.request) {
        errorMessage = 'Не вдалося отримати відповідь від сервера';
      } else {
        errorMessage = error.message || 'Невідома помилка';
      }
      
      throw new Error(errorMessage);
    }
  }
};

export const checkoutAPI = {
  checkout: async (checkoutData) => {
    try {
      console.log('Checkout API - відправка даних:', checkoutData);
      
      const requiredFields = ['firstName', 'lastName', 'age', 'email', 'phone'];
      const missingFields = requiredFields.filter(field => !checkoutData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Відсутні обов'язкові поля: ${missingFields.join(', ')}`);
      }

      const dataToSend = {
        ...checkoutData,
        age: parseInt(checkoutData.age, 10)
      };

      const response = await api.post('/checkout', dataToSend);
      return response.data;
    } catch (error) {
      console.error('Checkout API Error:', error);
      
      let errorMessage = 'Помилка при оформленні замовлення';
      
      if (error.response) {
        const serverError = error.response.data?.error || 'Помилка сервера';
        const serverMessage = error.response.data?.message || '';
        errorMessage = `${serverError}${serverMessage ? ': ' + serverMessage : ''}`;
      }
      
      throw new Error(errorMessage);
    }
  },

  getOrders: async () => {
    try {
      const response = await api.get('/orders');
      return response.data;
    } catch (error) {
      console.error('Orders API Error:', error);
      throw error;
    }
  },

  getOrderByNumber: async (orderNumber) => {
    try {
      const response = await api.get(`/orders/${orderNumber}`);
      return response.data;
    } catch (error) {
      console.error('Order API Error:', error);
      throw error;
    }
  },

  getOrderById: async (orderId) => {
    try {
      const response = await api.get(`/orders/id/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Order API Error:', error);
      throw error;
    }
  }
};

export const healthAPI = {
  checkHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health API Error:', error);
      return { status: 'unhealthy', error: error.message };
    }
  },

  checkServerStatus: async () => {
    try {
      const response = await api.get('/health');
      return {
        status: 'healthy',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
};

export const apiUtils = {
  buildProductParams: (filters = {}) => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    
    return params;
  },

  formatPrice: (price) => {
    return `$${parseFloat(price).toFixed(2)}`;
  },

  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validatePhone: (phone) => {
    const phoneRegex = /^[0-9]{10,12}$/;
    return phoneRegex.test(phone);
  }
};

export const mockCheckoutAPI = {
  checkout: async (checkoutData) => {
    console.log('Mock Checkout - отримано дані:', checkoutData);

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (parseInt(checkoutData.age) < 18) {
      throw new Error('Вам має бути щонайменше 18 років');
    }
    
    if (!checkoutData.email.includes('@')) {
      throw new Error('Невірний формат email');
    }

    return {
      success: true,
      message: 'Замовлення успішно оформлено!',
      orderNumber: `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      orderId: Math.floor(Math.random() * 1000) + 1000,
      totalAmount: Math.floor(Math.random() * 500) + 50,
      totalQuantity: Math.floor(Math.random() * 5) + 1,
      timestamp: new Date().toISOString()
    };
  }
};

export default api;
export { cartAPI as defaultCartAPI };
export { checkoutAPI as orderAPI };