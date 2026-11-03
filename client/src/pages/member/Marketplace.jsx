import React, { useState, useEffect } from 'react';
import {
  HiBuildingStorefront,
  HiMagnifyingGlass,
  HiPhone,
  HiTag,
  HiClock,
  HiMapPin,
  HiArrowPath,
  HiCheckCircle,
  HiXCircle,
  HiCreditCard,
  HiShoppingBag,
  HiPlus,
  HiMinus,
  HiTrash,
  HiXMark,
  HiArrowRight,
  HiChatBubbleBottomCenterText,
  HiSparkles,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import AdBannerCarousel from '../../components/common/AdBannerCarousel';

export default function Marketplace() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Cart / Multi-product Selection State: { [productId]: { product, quantity } }
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('egates_marketplace_cart');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('egates_marketplace_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Could not persist cart:', e);
    }
  }, [cart]);

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

  // Cart operations
  const addToCart = (product) => {
    if (!product.in_stock) {
      toast.error('This product is currently out of stock');
      return;
    }
    setCart((prev) => {
      const currentQty = prev[product.id]?.quantity || 0;
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: currentQty + 1,
        },
      };
    });
    toast.success(`Added "${product.name}" to your order list`, { id: `cart-${product.id}`, duration: 1500 });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) => {
      const item = prev[productId];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: {
          ...item,
          quantity: newQty,
        },
      };
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const clearCart = () => {
    setCart({});
    setIsCartOpen(false);
    toast.success('Selected products cleared');
  };

  // Cart totals calculation
  const cartEntries = Object.values(cart);
  const totalItemCount = cartEntries.reduce((sum, item) => sum + item.quantity, 0);
  const totalProductCount = cartEntries.length;

  const totalBillAmount = cartEntries.reduce((sum, item) => {
    const price = parseFloat(item.product.discount_price || item.product.price) || 0;
    return sum + price * item.quantity;
  }, 0);

  const totalOriginalAmount = cartEntries.reduce((sum, item) => {
    const price = parseFloat(item.product.price) || 0;
    return sum + price * item.quantity;
  }, 0);

  const totalSavings = Math.max(0, totalOriginalAmount - totalBillAmount);

  // Group cart items by shop/vendor
  const shopGroups = {};
  cartEntries.forEach((item) => {
    const key = item.product.vendor_id || item.product.shop_name || 'general';
    if (!shopGroups[key]) {
      shopGroups[key] = {
        key,
        vendor_id: item.product.vendor_id,
        shop_name: item.product.shop_name || item.product.vendor_name || 'Local Vendor',
        shop_phone: item.product.shop_phone,
        shop_address: item.product.shop_address,
        upi_id: item.product.upi_id,
        items: [],
      };
    }
    shopGroups[key].items.push(item);
  });

  const shopGroupList = Object.values(shopGroups);

  // Send WhatsApp order for a specific shop group
  const sendShopOrderWhatsApp = (group) => {
    const rawPhone = (group.shop_phone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) {
      toast.error(`WhatsApp number not found for ${group.shop_name}`);
      return;
    }

    const intlPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const residentName = user?.name || 'Resident';
    const doorNo = user?.door_no ? `Door #${user.door_no}` : '';
    const street = user?.street || '';
    const assocName = user?.association_name || 'Layout Association';
    const residentPhone = user?.phone || '';

    // Calculate shop group total
    const groupTotal = group.items.reduce((sum, it) => {
      const pr = parseFloat(it.product.discount_price || it.product.price) || 0;
      return sum + pr * it.quantity;
    }, 0);

    // Format items list
    const itemsFormatted = group.items
      .map((it, idx) => {
        const pr = parseFloat(it.product.discount_price || it.product.price) || 0;
        const sub = (pr * it.quantity).toFixed(2);
        return `${idx + 1}. *${it.product.name}* × ${it.quantity} ${it.product.unit || 'pcs'} = ₹${sub}`;
      })
      .join('\n');

    const addressLine = [doorNo, street, assocName].filter(Boolean).join(', ');

    const message = `🛒 *NEW ORDER - EGATES RESIDENT PORTAL*
━━━━━━━━━━━━━━━━━━━━━━━━━━
*Shop:* ${group.shop_name}
*Resident:* ${residentName}
*Contact:* ${residentPhone}
*Address:* ${addressLine}
━━━━━━━━━━━━━━━━━━━━━━━━━━
*ORDERED ITEMS:*
${itemsFormatted}

━━━━━━━━━━━━━━━━━━━━━━━━━━
*TOTAL PAYABLE: ₹${groupTotal.toFixed(2)}*
*Payment:* UPI / Cash on Delivery
━━━━━━━━━━━━━━━━━━━━━━━━━━
Please confirm availability and approximate delivery time. Thank you!`;

    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Single product WhatsApp enquiry
  const handleSingleWhatsApp = (prod) => {
    const rawPhone = (prod.shop_phone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) {
      toast.error('Vendor WhatsApp number not available');
      return;
    }
    const intlPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const assocName = prod.association_name || user?.association_name || 'Layout Association';
    const priceText = prod.discount_price || prod.price;
    const msg = encodeURIComponent(
      `Hello ${prod.shop_name || 'Shop'}, I am a resident of ${assocName}.\nI would like to order: *${prod.name}* (₹${priceText} / ${prod.unit || 'piece'}).\nPlease confirm availability.`
    );
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  // Filtered product listing
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

  return (
    <div className="space-y-6 pb-28">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 mb-3">
              <HiBuildingStorefront className="w-4 h-4" />
              <span>Layout Directory & Marketplace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Local Market & Community Shops
            </h1>
            <p className="text-teal-100 text-xs sm:text-sm mt-2 leading-relaxed">
              Select multiple products, groceries, dairy, and trusted services. Place your multi-item order directly to local vendors via WhatsApp.
            </p>
          </div>

          {/* Cart Quick Status Pill */}
          {totalProductCount > 0 && (
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="px-5 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-sm shadow-xl transition flex items-center gap-3 cursor-pointer self-start md:self-center"
            >
              <div className="relative">
                <HiShoppingBag className="w-6 h-6 text-emerald-600" />
                <span className="absolute -top-1.5 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                  {totalItemCount}
                </span>
              </div>
              <div className="text-left">
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Selected Items
                </span>
                <span className="text-sm font-black text-emerald-800">
                  ₹{totalBillAmount.toFixed(2)}
                </span>
              </div>
              <HiArrowRight className="w-4 h-4 text-emerald-600" />
            </button>
          )}
        </div>
      </div>

      {/* Sponsored Partner & Vendor Advertisement Banners */}
      <AdBannerCarousel panel={user?.role === 'admin' ? 'admin' : 'member'} associationId={user?.association_id} />

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

      {/* PRODUCTS GRID */}
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

            const selectedQty = cart[prod.id]?.quantity || 0;

            return (
              <div
                key={prod.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition group ${
                  selectedQty > 0
                    ? 'border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-gray-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800/60'
                }`}
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

                    {/* Selected Badge */}
                    {selectedQty > 0 && (
                      <div className="absolute bottom-2.5 right-2.5">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-md flex items-center gap-1">
                          <span>✓ In Order</span>
                          <span>({selectedQty})</span>
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

                {/* MULTI-PRODUCT SELECTION CONTROLS */}
                <div className="p-3 bg-gray-50/70 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {selectedQty === 0 ? (
                    <button
                      type="button"
                      disabled={!prod.in_stock}
                      onClick={() => addToCart(prod)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                        prod.in_stock
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <HiPlus className="w-4 h-4" />
                      <span>{prod.in_stock ? 'Add to Order' : 'Out of Stock'}</span>
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800/60 rounded-xl p-1 shadow-xs">
                      <button
                        type="button"
                        onClick={() => updateQuantity(prod.id, -1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm shadow-xs transition"
                        title="Decrease Quantity"
                      >
                        <HiMinus className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 px-2">
                        {selectedQty} {prod.unit || 'pcs'}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(prod.id, 1)}
                        className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs transition"
                        title="Increase Quantity"
                      >
                        <HiPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Quick Single WhatsApp Button */}
                  <button
                    type="button"
                    onClick={() => handleSingleWhatsApp(prod)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 border border-gray-200 dark:border-slate-600 transition"
                    title={`Send instant WhatsApp enquiry for ${prod.name}`}
                  >
                    <span className="text-sm">💬</span>
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

      {/* FLOATING ORDER SUMMARY BAR (WHEN PRODUCTS ARE SELECTED) */}
      {totalProductCount > 0 && (
        <div className="fixed bottom-20 left-3 right-3 sm:bottom-6 sm:left-auto sm:right-[248px] sm:max-w-md z-40 animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900 text-white rounded-3xl p-3.5 sm:p-4 shadow-2xl border-2 border-emerald-500/80 flex items-center justify-between gap-3 sm:gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-lg flex-shrink-0">
                <HiShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                  {totalItemCount}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-300 truncate">
                  {totalProductCount} {totalProductCount === 1 ? 'Product' : 'Products'} Selected
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-base sm:text-lg font-black text-emerald-400">
                    ₹{totalBillAmount.toFixed(2)}
                  </span>
                  {totalSavings > 0 && (
                    <span className="text-[10px] font-bold text-amber-400 truncate">
                      (Save ₹{totalSavings.toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="py-2.5 px-3.5 sm:px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                <span>View Order</span>
                <HiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-PRODUCT CART & ORDER MODAL */}
      <Modal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        title="Review Your Selected Products"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          {totalProductCount === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="text-4xl">🛍️</div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Your order list is empty.
              </p>
              <p className="text-xs text-gray-400">
                Add products from the marketplace to select multiple items.
              </p>
            </div>
          ) : (
            <>
              {/* Resident Address & Delivery Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    📍 Resident Delivery Details:
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {user?.association_name || 'Community Layout'}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {user?.name} {user?.door_no ? `• Door #${user.door_no}` : ''} {user?.street ? `, ${user.street}` : ''}
                </p>
                <p className="text-gray-500 dark:text-gray-500 font-mono text-[11px]">
                  Phone: {user?.phone || 'Not provided'}
                </p>
              </div>

              {/* PRODUCTS GROUPED BY SHOP */}
              <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
                {shopGroupList.map((group) => {
                  const groupTotal = group.items.reduce((sum, it) => {
                    const price = parseFloat(it.product.discount_price || it.product.price) || 0;
                    return sum + price * it.quantity;
                  }, 0);

                  return (
                    <div
                      key={group.key}
                      className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs"
                    >
                      {/* Shop Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🏪</span>
                          <div>
                            <h4 className="font-black text-sm text-gray-900 dark:text-white">
                              {group.shop_name}
                            </h4>
                            {group.shop_address && (
                              <p className="text-[11px] text-gray-400">📍 {group.shop_address}</p>
                            )}
                          </div>
                        </div>

                        {group.upi_id && (
                          <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 self-start sm:self-auto">
                            UPI: {group.upi_id}
                          </span>
                        )}
                      </div>

                      {/* Items for this shop */}
                      <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {group.items.map(({ product, quantity }) => {
                          const unitPrice = parseFloat(product.discount_price || product.price) || 0;
                          const lineTotal = unitPrice * quantity;

                          return (
                            <div
                              key={product.id}
                              className="py-2.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {product.image ? (
                                  <img
                                    src={getFileUrl(product.image)}
                                    alt={product.name}
                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-sm flex-shrink-0">
                                    🛍️
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 dark:text-white truncate">
                                    {product.name}
                                  </p>
                                  <p className="text-[11px] text-gray-400">
                                    ₹{unitPrice.toFixed(2)} / {product.unit || 'pcs'}
                                  </p>
                                </div>
                              </div>

                              {/* Quantity Stepper */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-lg p-0.5 bg-gray-50 dark:bg-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(product.id, -1)}
                                    className="w-6 h-6 rounded bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:text-rose-600 flex items-center justify-center text-xs font-bold transition"
                                  >
                                    -
                                  </button>
                                  <span className="w-7 text-center font-bold text-xs text-gray-900 dark:text-white">
                                    {quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(product.id, 1)}
                                    className="w-6 h-6 rounded bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center text-xs font-bold transition"
                                  >
                                    +
                                  </button>
                                </div>

                                <span className="font-black text-gray-900 dark:text-white w-16 text-right">
                                  ₹{lineTotal.toFixed(2)}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => removeFromCart(product.id)}
                                  className="text-gray-400 hover:text-rose-500 transition p-1"
                                  title="Remove item"
                                >
                                  <HiTrash className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Group Order Action via WhatsApp */}
                      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-800/30 -mx-4 -mb-4 p-3 rounded-b-2xl">
                        <div>
                          <span className="text-[11px] text-gray-500 font-bold block">
                            Subtotal ({group.items.length} {group.items.length === 1 ? 'item' : 'items'}):
                          </span>
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            ₹{groupTotal.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => sendShopOrderWhatsApp(group)}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>💬</span>
                            <span>Send WhatsApp Order to {group.shop_name}</span>
                          </button>

                          {group.shop_phone && (
                            <a
                              href={`tel:${group.shop_phone}`}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:text-emerald-600 border border-gray-200 dark:border-slate-600 transition"
                              title={`Call ${group.shop_name}`}
                            >
                              <HiPhone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* OVERALL ORDER SUMMARY FOOTER */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Total Selected Items: {totalItemCount} ({totalProductCount} products)
                  </p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-emerald-400">
                      ₹{totalBillAmount.toFixed(2)}
                    </span>
                    {totalSavings > 0 && (
                      <span className="text-xs font-bold text-amber-400">
                        Total Savings: ₹{totalSavings.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-900/40 border border-rose-800/40 transition cursor-pointer"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                  >
                    Continue Browsing
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
