import React from 'react';
import { SearchOutlined } from '@ant-design/icons';
import './SearchBox.css';

const SearchBox = ({ placeholder = "Search...", value, onChange }) => {
  return (
    <div className="search-box">
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <SearchOutlined className="search-icon" />
    </div>
  );
};

export default SearchBox;