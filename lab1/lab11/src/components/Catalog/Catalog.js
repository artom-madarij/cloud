import React, { useState, useCallback, useEffect } from 'react';
import CatalogProductTile from '../CatalogProductTile/CatalogProductTile';
import SearchBox from '../SearchBox/SearchBox';
import PrimaryButton from '../PrimaryButton/PrimaryButton';
import Select from '../Select/Select';
import Loader from '../Loader/Loader';
import { productsAPI } from '../../services/api';

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  const typeOptions = [
    { value: '', label: 'Всі типи' },
    { value: 'LED', label: 'LED' },
    { value: 'Smart LED', label: 'Smart LED' }
  ];

  const priceOptions = [
    { value: '', label: 'Всі ціни' },
    { value: '0-100', label: '$0 - $100' },
    { value: '100-150', label: '$100 - $150' },
    { value: '150-200', label: '$150 - $200' },
    { value: '200+', label: '$200+' }
  ];

  const manufacturerOptions = [
    { value: '', label: 'Всі виробники' },
    { value: 'LampTech', label: 'LampTech' },
    { value: 'BrightWorks', label: 'BrightWorks' },
    { value: 'Luminaire Co', label: 'Luminaire Co' },
    { value: 'TechLight', label: 'TechLight' },
    { value: 'Classic Lights', label: 'Classic Lights' },
    { value: 'Industrial Glow', label: 'Industrial Glow' }
  ];

  const sortOptions = [
    { value: '', label: 'Стандартний порядок' },
    { value: 'price-asc', label: 'Ціна: від низької до високої' },
    { value: 'price-desc', label: 'Ціна: від високої до низької' }
  ];

  const fetchAllProducts = async () => {
    try {
      setLoading(true);
      const productsData = await productsAPI.getProducts();
      
      if (Array.isArray(productsData)) {
        setProducts(productsData);
        setFilteredProducts(productsData);
      } else {
        throw new Error('Некоректний формат даних від сервера');
      }
    } catch (err) {
      setError('Помилка завантаження продуктів: ' + err.message);
      console.error('Error fetching products:', err);
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProducts();
  }, []);

  const applyClientSideFilters = useCallback(() => {
    if (!Array.isArray(products)) {
      setFilteredProducts([]);
      return;
    }

    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter) {
      filtered = filtered.filter(product => product.type === typeFilter);
    }

    if (manufacturerFilter) {
      filtered = filtered.filter(product => product.manufacturer === manufacturerFilter);
    }

    if (priceFilter) {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price);
        switch (priceFilter) {
          case '0-100': return price <= 100;
          case '100-150': return price > 100 && price <= 150;
          case '150-200': return price > 150 && price <= 200;
          case '200+': return price > 200;
          default: return true;
        }
      });
    }

    if (sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        const priceA = parseFloat(a.price);
        const priceB = parseFloat(b.price);
        
        switch (sortOrder) {
          case 'price-asc':
            return priceA - priceB;
          case 'price-desc':
            return priceB - priceA;
          default:
            return 0;
        }
      });
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, typeFilter, priceFilter, manufacturerFilter, sortOrder]);

  const applyFilters = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters = {};
      if (searchTerm) filters.search = searchTerm;
      if (typeFilter) filters.type = typeFilter;
      if (manufacturerFilter) filters.manufacturer = manufacturerFilter;
      
      if (priceFilter) {
        switch (priceFilter) {
          case '0-100':
            filters.minPrice = 0;
            filters.maxPrice = 100;
            break;
          case '100-150':
            filters.minPrice = 100;
            filters.maxPrice = 150;
            break;
          case '150-200':
            filters.minPrice = 150;
            filters.maxPrice = 200;
            break;
          case '200+':
            filters.minPrice = 200;
            break;
          default:
            break;
        }
      }
      
      if (sortOrder) {
        filters.sortBy = 'price';
        filters.sortOrder = sortOrder === 'price-asc' ? 'asc' : 'desc';
      }

      if (Object.keys(filters).length > 0) {
        const filteredData = await productsAPI.getProducts(filters);
        setFilteredProducts(filteredData);
      } else {
        setFilteredProducts(products);
      }
      
    } catch (err) {
      console.error('Filter API error:', err);
      applyClientSideFilters();
    } finally {
      setLoading(false);
    }
  }, [searchTerm, typeFilter, priceFilter, manufacturerFilter, sortOrder, products, applyClientSideFilters]);

  useEffect(() => {
    if (searchTerm || typeFilter || priceFilter || manufacturerFilter || sortOrder) {
      applyFilters();
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, typeFilter, priceFilter, manufacturerFilter, sortOrder, applyFilters, products]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setPriceFilter('');
    setManufacturerFilter('');
    setSortOrder('');
    fetchAllProducts();
  };

  const productsToDisplay = Array.isArray(filteredProducts) ? filteredProducts : [];

  if (error) {
    return (
      <section className="catalog">
        <div className="container">
          <div className="error-message">
            <p>{error}</p>
            <PrimaryButton onClick={() => window.location.reload()}>
              Спробувати ще раз
            </PrimaryButton>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="catalog">
      <div className="container">
        <div className="catalog-header">
          <h1 className="catalog-title">Каталог</h1>
          <div className="catalog-controls">
            <SearchBox 
              placeholder="Пошук продуктів..." 
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>
        
        <div className="catalog-content">
          <div className="catalog-filters">
            <div className="filter-section">
              <h3>Сортування за ціною</h3>
              <Select
                options={sortOptions}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="Сортувати..."
              />
            </div>

            <div className="filter-section">
              <h3>Фільтр за типом</h3>
              <Select
                options={typeOptions}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                placeholder="Оберіть тип лампи..."
              />
            </div>
            
            <div className="filter-section">
              <h3>Фільтр за ціною</h3>
              <Select
                options={priceOptions}
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                placeholder="Оберіть діапазон цін..."
              />
            </div>
            
            <div className="filter-section">
              <h3>Фільтр за виробником</h3>
              <Select
                options={manufacturerOptions}
                value={manufacturerFilter}
                onChange={(e) => setManufacturerFilter(e.target.value)}
                placeholder="Оберіть виробника..."
              />
            </div>
            
            <div className="filter-actions">
              <button className="reset-filters" onClick={resetFilters}>
                Скинути всі фільтри
              </button>
            </div>
          </div>
          
          <div className="catalog-products">
            <div className="products-info">
              <p>Знайдено {productsToDisplay.length} продуктів</p>
            </div>
            
            {loading ? (
              <div className="products-loading">
                <Loader />
              </div>
            ) : (
              <div className="products-grid">
                {productsToDisplay.map(product => (
                  <CatalogProductTile 
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    description={product.description}
                    image={product.image}
                    price={product.price}
                    type={product.type}
                    manufacturer={product.manufacturer}
                    diodes={product.diodes}
                  />
                ))}
              </div>
            )}
            
            {!loading && productsToDisplay.length === 0 && (
              <div className="no-products">
                <p>Не знайдено продуктів за вашими критеріями.</p>
                <PrimaryButton onClick={resetFilters}>
                  Скинути фільтри
                </PrimaryButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Catalog;