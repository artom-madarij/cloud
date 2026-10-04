import React from 'react';
import { FacebookFilled, LinkedinOutlined, TwitterSquareFilled, YoutubeFilled } from '@ant-design/icons';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-branding">
            <p>
              будь-який текст
            </p>
          </div>
          <div className="footer-logo">
            <div className="logo-circle">
              <div className="logo-outer">
                <div className="logo-inner"></div>
              </div>
            </div>
          </div>
          <div className="footer-social">
            <div className="social-icons">
              <span className="social-icon">
                <FacebookFilled />
              </span>
              <span className="social-icon">
                <TwitterSquareFilled />
              </span>
              <span className="social-icon">
                <LinkedinOutlined />
              </span>
              <span className="social-icon">
                <YoutubeFilled />
              </span>
            </div>
          </div>
        </div>
        <div className="copyright">
          <p>2025 LampStore © Copyright all rights reserved</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;