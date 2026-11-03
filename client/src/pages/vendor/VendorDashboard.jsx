import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiBuildingStorefront,
  HiPlus,
  HiPencilSquare,
  HiTrash,
  HiPhoto,
  HiCheckCircle,
  HiXCircle,
  HiMagnifyingGlass,
  HiArrowPath,
  HiTag,
  HiClock,
  HiPhone,
  HiCurrencyRupee,
  HiEye,
  HiExclamationCircle,
  HiSparkles,
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

export default function VendorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStock, setFilterStock] = useState('all'); // 'all' | 'in_stock' | 'out_of_stock'

  // Product Modal State (Add or Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete State
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    category: 'Grocery & Supermarket',
    price: '',
    discount_price: '',
    unit: 'piece',
    description: '',
    in_stock: true,
  });
  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const imageInputRef = useRef(null);

  const categories = [
    'Grocery & Supermarket',
    'Dairy & Milk Products',
    'Fruits & Vegetables',
    'Food, Snacks & Bakery',
    'Electrical & Plumbing Services',
    'Home Cleaning & Maintenance',
    'Pharmacy & Healthcare',
    'Laundry & Dry Cleaning',
    'Water Purifier & RO Services',
    'Pest Control',
    'Hardware & Paints',
    'Security & CCTV',
    'Other Local Services',
  ];

  const units = [
    'piece',
    'kg',
    'packet',
    'liter',
    'box',
    'dozen',
    'service / visit',
    'hour',
    'month',
    'set',
  ];

  const fetchMyProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/vendor/my-products');
      setProducts(res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching vendor products:', err);
      toast.error(err.response?.data?.message || 'Failed to load shop products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      category: user?.shop_category || 'Grocery & Supermarket',
      price: '',
      discount_price: '',
      unit: 'piece',
      description: '',
      in_stock: true,
    });
    setProductImage(null);
    setImagePreview(null);
    setModalOpen(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setForm({
      name: prod.name,
      category: prod.category || 'General',
      price: String(prod.price),
      discount_price: prod.discount_price ? String(prod.discount_price) : '',
      unit: prod.unit || 'piece',
      description: prod.description || '',
      in_stock: Boolean(prod.in_stock),
    });
    setProductImage(null);
    setImagePreview(prod.image ? getFileUrl(prod.image) : null);
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Product image must be less than 5MB');
        return;
      }
      setProductImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('category', form.category);
      formData.append('price', form.price);
      if (form.discount_price) formData.append('discount_price', form.discount_price);
      formData.append('unit', form.unit);
      formData.append('description', form.description.trim());
      formData.append('in_stock', form.in_stock);

      if (productImage) {
        formData.append('image', productImage);
      }

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
        toast.success(`Product "${form.name}" updated successfully!`);
      } else {
        await api.post('/products', formData);
        toast.success(`Product "${form.name}" added to your shop catalog!`);
      }

      setModalOpen(false);
      fetchMyProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStock = async (prod) => {
    try {
      const res = await api.patch(`/products/${prod.id}/toggle-stock`);
      toast.success(res.data?.message || 'Stock status updated');
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, in_stock: !p.in_stock } : p))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle stock status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteProduct) return;
    try {
      setDeleting(true);
      await api.delete(`/products/${deleteProduct.id}`);
      toast.success(`Product "${deleteProduct.name}" removed from catalog`);
      setDeleteProduct(null);
      fetchMyProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      prod.name.toLowerCase().includes(search.toLowerCase()) ||
      (prod.description && prod.description.toLowerCase().includes(search.toLowerCase())) ||
      (prod.category && prod.category.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStock === 'in_stock') return prod.in_stock;
    if (filterStock === 'out_of_stock') return !prod.in_stock;
    return true;
  });

  const totalCount = products.length;
  const inStockCount = products.filter((p) => p.in_stock).length;
  const outOfStockCount = totalCount - inStockCount;

  return (
    <div className="space-y-6">
      {/* SHOP BANNER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {user?.shop_logo ? (
              <img
                src={getFileUrl(user.shop_logo)}
                alt={user.shop_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md bg-white"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl shadow-md">
                🏪
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30">
                  {user?.shop_category || 'Merchant Shop'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400 text-slate-900 flex items-center gap-1 shadow-sm">
                  <HiCheckCircle className="w-3.5 h-3.5" />
                  <span>Approved & Live</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">
                {user?.shop_name || user?.name || 'My Shop'}
              </h1>
              <div className="flex items-center gap-4 text-xs text-amber-100 font-medium mt-1.5 flex-wrap">
                {user?.shop_address && (
                  <span>📍 {user.shop_address}</span>
                )}
                {user?.business_hours && (
                  <span>⏰ {user.business_hours}</span>
                )}
                {user?.phone && (
                  <span>📞 {user.shop_phone || user.phone}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/vendor/ads')}
              className="px-4 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-white font-extrabold text-sm border border-white/20 backdrop-blur-md transition flex items-center gap-2 cursor-pointer"
            >
              <HiSparkles className="w-5 h-5 text-amber-300" />
              <span>Ad Campaigns</span>
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="px-5 py-3 rounded-2xl bg-white text-amber-700 hover:bg-amber-50 font-black text-sm shadow-lg hover:shadow-xl transition flex items-center gap-2 cursor-pointer"
            >
              <HiPlus className="w-5 h-5 text-amber-600" />
              <span>Add New Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Total Products Listed
            </p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {totalCount}
            </h3>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">In your shop list</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold">
            📦
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              In Stock & Available
            </p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {inStockCount}
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Active for member ordering</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold">
            ✅
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Out of Stock
            </p>
            <h3 className="text-2xl font-black text-rose-500 dark:text-rose-400 mt-1">
              {outOfStockCount}
            </h3>
            <span className="text-[11px] text-rose-500 dark:text-rose-400 font-semibold">Marked unavailable</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center text-xl font-bold">
            ⚠️
          </div>
        </div>
      </div>

      {/* MEMBER PORTAL NOTICE */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-emerald-900 dark:text-emerald-200 text-xs font-medium flex items-center gap-3">
        <HiCheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <span>
          <strong>Live in Member Portal:</strong> All products added below appear automatically on the Resident Member Portal under <strong>Local Market & Shops</strong>. Residents can view prices and place orders with you directly via WhatsApp or phone.
        </span>
      </div>

      {/* CONTROLS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <HiMagnifyingGlass className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or category..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 transition shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:border-amber-500 transition shadow-xs"
          >
            <option value="all">All Products ({totalCount})</option>
            <option value="in_stock">In Stock Only ({inStockCount})</option>
            <option value="out_of_stock">Out of Stock ({outOfStockCount})</option>
          </select>

          <button
            type="button"
            onClick={fetchMyProducts}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300 hover:text-amber-600 transition shadow-xs"
            title="Refresh Catalog"
          >
            <HiArrowPath className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* PRODUCTS GRID */}
      {loading ? (
        <div className="p-12 text-center text-sm text-gray-400 font-medium">
          Loading shop products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center text-3xl">
            🏪
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {search ? 'No products match your search.' : 'No Products Added Yet'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              {search
                ? 'Try modifying your search or clearing the stock filter.'
                : 'Start listing items you sell in your shop so community residents can view and order them.'}
            </p>
          </div>
          {!search && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition"
            >
              <HiPlus className="w-4 h-4" />
              <span>Add Your First Product</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-amber-300 dark:hover:border-amber-900/60 transition group"
              >
                <div>
                  {/* Image & Badges */}
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

                  {/* Details */}
                  <div className="p-4 space-y-2">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                      {prod.category || 'General'}
                    </span>
                    <h3 className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1">
                      {prod.name}
                    </h3>
                    {prod.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    )}

                    {/* Pricing */}
                    <div className="pt-2 flex items-baseline gap-2">
                      <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                        ₹{parseFloat(displayPrice).toFixed(2)}
                      </span>
                      {originalPrice && (
                        <span className="text-xs text-gray-400 line-through">
                          ₹{parseFloat(originalPrice).toFixed(2)}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400">/ {prod.unit || 'piece'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3 bg-gray-50/70 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStock(prod)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      prod.in_stock
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                    }`}
                    title="Click to toggle availability"
                  >
                    <span>{prod.in_stock ? 'Mark Out' : 'Mark In'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(prod)}
                      className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700 hover:text-amber-600 transition"
                      title="Edit Product"
                    >
                      <HiPencilSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteProduct(prod)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete Product"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Edit Shop Product' : 'Add New Product to Shop'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Product Title / Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Aavin Fresh Cow Milk 500ml, Switch Replacement"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Unit / Measurement
              </label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Price (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Discount / Offer Price (₹) (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.discount_price}
                  onChange={(e) => setForm({ ...form, discount_price: e.target.value })}
                  placeholder="Optional discounted rate"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Available every morning from 6am to 9am. Delivery to doorstep available."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Product Image */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              Product Photo
            </label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Product Preview"
                  className="w-16 h-16 rounded-xl object-cover border border-amber-500/50"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400">
                  <HiPhoto className="w-8 h-8" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition"
                >
                  {imagePreview ? 'Change Photo' : 'Upload Product Photo'}
                </button>
                <p className="text-[11px] text-gray-400 mt-1">PNG, JPG, or WebP up to 5MB</p>
              </div>
            </div>
          </div>

          {/* In Stock Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.in_stock}
                onChange={(e) => setForm({ ...form, in_stock: e.target.checked })}
                className="w-4 h-4 rounded text-amber-600 bg-white border-gray-300 dark:bg-slate-800 dark:border-slate-700"
              />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                Item is currently in stock and available for residents to order
              </span>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Saving Product...' : editingProduct ? 'Update Product' : 'Add Product to Shop'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteProduct)}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message={`Are you sure you want to remove "${deleteProduct?.name}" from your shop catalog? This product will no longer appear on the resident portal.`}
        confirmText={deleting ? 'Deleting...' : 'Delete Product'}
        danger
      />
    </div>
  );
}
