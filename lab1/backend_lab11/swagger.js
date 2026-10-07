const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Lamp Store API',
    version: '1.0.0',
    description: 'REST API for Lamp Store'
  },
  servers: [
    {
      url: '/'
    }
  ],
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Application is healthy'
          }
        }
      }
    },

    '/api/products': {
      get: {
        summary: 'Get all products',
        responses: {
          '200': {
            description: 'List of products'
          }
        }
      },
      post: {
        summary: 'Create a product',
        responses: {
          '200': {
            description: 'Product created'
          }
        }
      }
    },

    '/api/products/{id}': {
      get: {
        summary: 'Get product by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'integer'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Product'
          },
          '404': {
            description: 'Product not found'
          }
        }
      }
    },

    '/api/cart': {
      get: {
        summary: 'Get shopping cart',
        responses: {
          '200': {
            description: 'Shopping cart'
          }
        }
      },
      post: {
        summary: 'Add product to cart',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  productId: {
                    type: 'integer'
                  },
                  quantity: {
                    type: 'integer'
                  },
                  temperature: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Product added to cart'
          }
        }
      },
      delete: {
        summary: 'Clear shopping cart',
        responses: {
          '200': {
            description: 'Cart cleared'
          }
        }
      }
    },

    '/api/cart/{productId}': {
      put: {
        summary: 'Update cart item quantity',
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: {
              type: 'integer'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Cart item updated'
          }
        }
      },
      delete: {
        summary: 'Remove product from cart',
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: {
              type: 'integer'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Product removed from cart'
          }
        }
      }
    },

    '/api/checkout': {
      post: {
        summary: 'Create an order from the cart',
        responses: {
          '200': {
            description: 'Order created'
          }
        }
      }
    },

    '/api/orders': {
      get: {
        summary: 'Get all orders',
        responses: {
          '200': {
            description: 'List of orders'
          }
        }
      }
    },

    '/api/orders/{orderNumber}': {
      get: {
        summary: 'Get order by number',
        parameters: [
          {
            name: 'orderNumber',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Order'
          },
          '404': {
            description: 'Order not found'
          }
        }
      }
    }
  }
};

module.exports = swaggerDocument;