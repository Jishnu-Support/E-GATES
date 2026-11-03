import React, { useState, useEffect } from 'react';
import {
  HiBuildingStorefront,
  HiMagnifyingGlass,
  HiPhone,
  HiChatBubbleLeftRight,
  HiTag,
  HiClock,
  HiMapPin,
  HiArrowPath,
  HiCheckCircle,
  HiXCircle,
  HiCreditCard,
  HiShoppingBag,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Marketplace() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [onlyInStock, setOnlyInStock] = useState(false);

  const categories = [
    'All',
    'Grocery & Supermarket',
    'Dairy & Milk Products',
    'Fruits & Vegetables',
    'Food, Snacks & Bakery',
    'Electrical & Plumbing Services',
    'Home Cleaning & Maintenance',
    'Pharmacy & Healthcare',
    'Laundry & Dry Cleaning',
    'Water Purifier & RO Services',
    'Hardware & Paints',
    'Other Local Services',
  ];

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (user?.association_id) {
        params.association_id = user.association_id;
      }
      const res = await api.get('/products', { params });
      setProducts(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load marketplace products:', err);
      toast.error(err.response?.data?.message || 'Could not load marketplace items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user?.association_id]);

  const filteredProducts = products.filter((prod) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      (prod.category && prod.category.toLowerCase() === selectedCategory.toLowerCase());

    const matchesSearch =
      prod.name.toLowerCase().includes(search.toLowerCase()) ||
      (prod.shop_name && prod.shop_name.toLowerCase().includes(search.toLowerCase())) ||
      (prod.description && prod.description.toLowerCase().includes(search.toLowerCase())) ||
      (prod.category && prod.category.toLowerCase().includes(search.toLowerCase()));

    const matchesStock = onlyInStock ? prod.in_stock : true;

    return matchesCategory && matchesSearch && matchesStock;
  });

  const handleWhatsAppOrder = (prod) => {
    const rawPhone = (prod.shop_phone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) {
      toast.error('Vendor WhatsApp number not available');
      return;
    }
    // Prefix 91 for Indian phone numbers if 10 digits
    const intlPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const assocName = prod.association_name || user?.association_name || 'Layout Association';
    const priceText = prod.discount_price || prod.price;
    const msg = encodeURIComponent(
      `Hello ${prod.shop_name || 'Shop'}, I am a resident of ${assocName}.\nI would like to order / enquire about: *${prod.name}* (₹${priceText} / ${prod.unit || 'piece'}).\nPlease confirm availability.`
    );
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 mb-3">
            <HiBuildingStorefront className="w-4 h-4" />
            <span>Layout Directory & Marketplace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Local Market & Community Shops
          </h1>
          <p className="text-teal-100 text-xs sm:text-sm mt-2 leading-relaxed">
            Browse daily essentials, groceries, dairy, and trusted services offered by approved local merchants serving {user?.association_name || 'your layout association'}.
          </p>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <HiMagnifyingGlass className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, groceries, shops, or services..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 bg-white border-gray-300 dark:bg-slate-800 dark:border-slate-700"
              />
              <span>In Stock Only</span>
            </label>

            <button
              type="button"
              onClick={fetchProducts}
              className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-emerald-600 transition"
              title="Refresh Products"
            >
              <HiArrowPath className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* PRODUCTS DISPLAY */}
      {loading ? (
        <div className="p-16 text-center text-sm text-gray-400 font-medium">
          Loading marketplace products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center text-3xl">
            🛍️
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {search || selectedCategory !== 'All'
              ? 'No products found matching your filters'
              : 'No Products Listed Yet'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {search || selectedCategory !== 'All'
              ? 'Try selecting "All" categories or changing your search terms.'
              : 'Approved layout shops will appear here once they add products.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((prod) => {
            const hasDiscount = prod.discount_price && parseFloat(prod.discount_price) < parseFloat(prod.price);
            const displayPrice = hasDiscount ? prod.discount_price : prod.price;
            const originalPrice = hasDiscount ? prod.price : null;
            const discountPct = hasDiscount
              ? Math.round(((parseFloat(prod.price) - parseFloat(prod.discount_price)) / parseFloat(prod.price)) * 100)
              : null;

            return (
              <div
                key={prod.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800/60 transition group"
              >
                <div>
                  {/* Photo Header */}
                  <div className="relative h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                    {prod.image ? (
                      <img
                        src={getFileUrl(prod.image)}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="text-4xl text-gray-400">🛍️</div>
                    )}

                    {/* Stock Status Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                          prod.in_stock
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {prod.in_stock ? '● In Stock' : '✕ Out of Stock'}
                      </span>
                    </div>

                    {/* Discount Badge */}
                    {discountPct && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-900 shadow-sm">
                          {discountPct}% OFF
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="p-4 space-y-2">
                    {/* Shop Identity */}
                    <div className="flex items-center gap-2">
                      {prod.shop_logo ? (
                        <img
                          src={getFileUrl(prod.shop_logo)}
                          alt={prod.shop_name}
                          className="w-5 h-5 rounded-md object-cover border border-gray-200"
                        />
                      ) : (
                        <span className="text-xs">🏪</span>
                      )}
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 line-clamp-1">
                        {prod.shop_name || prod.vendor_name}
                      </span>
                    </div>

                    {/* Title & Category */}
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1">
                        {prod.name}
                      </h3>
                      <span className="text-[10px] font-semibold text-gray-400 block mt-0.5">
                        {prod.category || 'General'}
                      </span>
                    </div>

                    {/* Description */}
                    {prod.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    )}

                    {/* Pricing */}
                    <div className="pt-2 flex items-baseline gap-2">
                      <span className="text-xl font-black text-gray-900 dark:text-white">
                        ₹{parseFloat(displayPrice).toFixed(2)}
                      </span>
                      {originalPrice && (
                        <span className="text-xs text-gray-400 line-through">
                          ₹{parseFloat(originalPrice).toFixed(2)}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 font-medium">/ {prod.unit || 'piece'}</span>
                    </div>

                    {/* Shop Location & Hours */}
                    <div className="pt-2 text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5 border-t border-gray-100 dark:border-slate-800">
                      {prod.shop_address && (
                        <p className="flex items-center gap-1 line-clamp-1">
                          <HiMapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>{prod.shop_address}</span>
                        </p>
                      )}
                      {prod.business_hours && (
                        <p className="flex items-center gap-1">
                          <HiClock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>{prod.business_hours}</span>
                        </p>
                      )}
                      {prod.upi_id && (
                        <p className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                          <HiCreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>UPI: {prod.upi_id}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Ordering Actions */}
                <div className="p-3 bg-gray-50/70 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleWhatsAppOrder(prod)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>💬</span>
                    <span>Order via WhatsApp</span>
                  </button>

                  {prod.shop_phone && (
                    <a
                      href={`tel:${prod.shop_phone}`}
                      className="p-2 rounded-xl bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:text-emerald-600 border border-gray-200 dark:border-slate-600 transition"
                      title={`Call ${prod.shop_name}`}
                    >
                      <HiPhone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
