import * as yup from 'yup';

export const checkoutSchema = yup.object().shape({
  firstName: yup.string()
    .min(2, "Занадто коротке!")
    .max(50, "Занадто довге!")
    .required("Ім'я обов'язкове"),
  lastName: yup.string()
    .min(2, "Занадто коротке!")
    .max(50, "Занадто довге!")
    .required("Прізвище обов'язкове"),
  age: yup.number()
    .typeError("Вік має бути числом") 
    .min(18, "Вам має бути 18 років")
    .required("Вкажіть вік"),
  email: yup.string()
    .email("Невірний формат email")
    .required("Email обов'язковий"),
  phone: yup.string()
    .matches(/^[0-9]{10,12}$/, "Тільки цифри (10-12 символів)")
    .required("Телефон обов'язковий"),
});