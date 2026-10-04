import React from 'react';

const Hero = () => {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-image">
            <img 
              src="/images/1.jpg" 
              alt="Modern Lamp Collection" 
              className="hero-img"
            />
          </div>
          <div className="hero-text">
            <h2>Заголовок</h2>
            <p>
              Опис бла бла бла бла бла бла
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;