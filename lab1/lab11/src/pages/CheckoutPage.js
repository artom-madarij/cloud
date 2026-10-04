import React from 'react';
import { useFormik } from 'formik';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { checkoutSchema } from '../schemas/validationSchema';
import FormError from '../components/FormError/FormError';
import { cartAPI } from '../services/api';
import { clearCart } from '../store/slices/cartSlice';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { totalAmount, items } = useSelector(state => state.cart);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      age: '',
      email: '',
      phone: ''
    },
    validationSchema: checkoutSchema,
    onSubmit: async (values) => {
      setIsSubmitting(true);
      setSubmitError('');
      
      try {
        if (items.length === 0) {
          setSubmitError('Кошик порожній. Додайте товари перед оформленням замовлення.');
          setIsSubmitting(false);
          return;
        }

        const result = await cartAPI.checkout({
          ...values,
          age: parseInt(values.age)
        });

        console.log('Замовлення успішно оформлено:', result);

        dispatch(clearCart());
        
        navigate('/success', { 
          state: { 
            orderNumber: result.orderNumber,
            totalAmount: result.totalAmount,
            orderId: result.orderId
          }
        });

      } catch (error) {
        console.error('Помилка при оформленні замовлення:', error);
        setSubmitError(
          error.response?.data?.error || 
          error.message || 
          'Сталася помилка при оформленні замовлення. Спробуйте ще раз.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <section className="checkout-page">
      <div className="container checkout-container">
        <h1 className="checkout-title">Оформлення замовлення</h1>
        
        {items.length === 0 ? (
          <div className="empty-cart-message">
            <p>Ваш кошик порожній</p>
            <button 
              className="back-to-cart-btn"
              onClick={() => navigate('/cart')}
            >
              Повернутися до кошика
            </button>
          </div>
        ) : (
          <>
            <div className="order-summary">
              <h3>Підсумок замовлення</h3>
              <p>Кількість товарів: {items.length}</p>
              <p>Загальна сума: <strong>${totalAmount.toFixed(2)}</strong></p>
            </div>
            
            <form onSubmit={formik.handleSubmit} className="checkout-form">
              
              {}
              <div className="form-group">
                <label className="form-label">Ім'я *</label>
                <input
                  name="firstName"
                  type="text"
                  placeholder="Введіть ваше ім'я"
                  className={`form-input ${
                    formik.touched.firstName && formik.errors.firstName ? 'input-error' : ''
                  }`}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.firstName}
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <FormError message={formik.errors.firstName} />
                )}
              </div>

              {}
              <div className="form-group">
                <label className="form-label">Прізвище *</label>
                <input
                  name="lastName"
                  type="text"
                  placeholder="Введіть ваше прізвище"
                  className={`form-input ${
                    formik.touched.lastName && formik.errors.lastName ? 'input-error' : ''
                  }`}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.lastName}
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <FormError message={formik.errors.lastName} />
                )}
              </div>

              {}
              <div className="form-group">
                <label className="form-label">Вік *</label>
                <input
                  name="age"
                  type="number"
                  placeholder="Введіть ваш вік"
                  className={`form-input ${
                    formik.touched.age && formik.errors.age ? 'input-error' : ''
                  }`}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.age}
                />
                {formik.touched.age && formik.errors.age && (
                  <FormError message={formik.errors.age} />
                )}
              </div>

              {}
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  className={`form-input ${
                    formik.touched.email && formik.errors.email ? 'input-error' : ''
                  }`}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.email}
                />
                {formik.touched.email && formik.errors.email && (
                  <FormError message={formik.errors.email} />
                )}
              </div>

              {}
              <div className="form-group">
                <label className="form-label">Телефон *</label>
                <input
                  name="phone"
                  type="text"
                  placeholder="0501234567 (10-12 цифр)"
                  className={`form-input ${
                    formik.touched.phone && formik.errors.phone ? 'input-error' : ''
                  }`}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.phone}
                />
                {formik.touched.phone && formik.errors.phone && (
                  <FormError message={formik.errors.phone} />
                )}
              </div>

              {submitError && (
                <div className="submit-error">
                  <FormError message={submitError} />
                </div>
              )}

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Обробка...' : `Підтвердити замовлення за $${totalAmount.toFixed(2)}`}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
};

export default CheckoutPage;