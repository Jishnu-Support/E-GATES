import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  HiHome,
  HiKey,
  HiCurrencyRupee,
  HiPhone,
  HiChatBubbleLeftEllipsis,
  HiPhoto,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiPlus,
  HiMapPin,
  HiTrash,
  HiArrowRight,
  HiShieldCheck,
  HiSparkles,
  HiMagnifyingGlass,
  HiFunnel,
  HiArrowPath,
  HiCheck,
  HiXMark,
  HiInformationCircle,
  HiChevronLeft,
  HiChevronRight
} from 'react-icons/hi2';
import api, { getFileUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

export default function Properties() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Tabs: 'browse' | 'my-listings'
  const [activeTab, setActiveTab] = useState('browse');

  // Listings State
  const [properties, setProperties] = useState([]);
  const [myProperties, setMyProperties] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);

  // Filters State
  const [listingTypeFilter, setListingTypeFilter] = useState('all'); // 'all' | 'sale' | 'rent' | 'lease'
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
  const [bhkFilter, setBhkFilter] = useState('all');
  const [assocFilter, setAssocFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [deletePropertyId, setDeletePropertyId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Detail Modal Active Photo Index
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Create Form State
  const initialForm = {
    listing_type: 'sale',
    property_type: 'Independent House',
    title: '',
    description: '',
    price: '',
    price_negotiable: true,
    maintenance_charges: '',
    bhk: '3 BHK',
    bathrooms: 2,
    built_up_sqft: '',
    plot_sqft: '',
    facing: 'East',
    door_number: user?.door_number || '',
    location_address: '',
    city: user?.association_city || '',
    contact_person: user?.name || '',
    contact_phone: user?.phone || '',
    contact_email: user?.email || '',
    association_id: user?.association_id || '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch approved properties
  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = {};
      if (listingTypeFilter !== 'all') params.listing_type = listingTypeFilter;
      if (propertyTypeFilter !== 'all') params.property_type = propertyTypeFilter;
      if (bhkFilter !== 'all') params.bhk = bhkFilter;
      if (assocFilter !== 'all') params.association_id = assocFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (sortBy) params.sort = sortBy;

      const res = await api.get('/properties', { params });
      setProperties(res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching properties:', err);
      toast.error('Failed to load property listings');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's own listings
  const fetchMyProperties = async () => {
    try {
      setMyLoading(true);
      const res = await api.get('/properties/my-listings');
      setMyProperties(res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching my listings:', err);
    } finally {
      setMyLoading(false);
    }
  };

  // Fetch associations list for filter
  const fetchAssociations = async () => {
    try {
      const res = await api.get('/associations');
      setAssociations(res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching associations:', err);
    }
  };

  useEffect(() => {
    fetchAssociations();
  }, []);

  useEffect(() => {
    if (activeTab === 'browse') {
      fetchProperties();
    } else {
      fetchMyProperties();
    }
  }, [activeTab, listingTypeFilter, propertyTypeFilter, bhkFilter, assocFilter, sortBy]);

  // Handle Search on Submit or Debounced
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProperties();
  };

  // Image Selection Handler
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (selectedImages.length + files.length > 8) {
      toast.error('You can upload up to 8 photos maximum');
      return;
    }

    const newFiles = [...selectedImages, ...files];
    setSelectedImages(newFiles);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeSelectedImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit New Listing
  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter property title');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid expected price or monthly rent');
      return;
    }
    if (!formData.contact_phone.trim()) {
      toast.error('Contact phone number is required for buyers/tenants to reach you');
      return;
    }

    try {
      setIsSubmitting(true);
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          submitData.append(key, val);
        }
      });

      selectedImages.forEach((file) => {
        submitData.append('images', file);
      });

      const res = await api.post('/properties', submitData);

      toast.success(
        res.data?.message ||
          'Property submitted! It will appear across all associations once approved by Super Admin.'
      );

      setIsCreateModalOpen(false);
      setFormData(initialForm);
      setSelectedImages([]);
      setImagePreviews([]);

      // Switch to my-listings tab so user sees their pending listing
      setActiveTab('my-listings');
      fetchMyProperties();
    } catch (err) {
      console.error('Error submitting property:', err);
      toast.error(err.response?.data?.message || 'Failed to submit property listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark Status (Sold / Rented / Active)
  const handleMarkStatus = async (id, status) => {
    try {
      await api.patch(`/properties/${id}/status`, { status });
      toast.success(`Property marked as ${status.toUpperCase()}`);
      if (activeTab === 'browse') fetchProperties();
      else fetchMyProperties();
      if (selectedProperty && selectedProperty.id === id) {
        setSelectedProperty((prev) => ({ ...prev, status }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update property status');
    }
  };

  // Super Admin Direct Approve
  const handleSuperAdminApprove = async (id, title) => {
    try {
      await api.put(`/properties/${id}/approve`);
      toast.success(`"${title}" approved and broadcasted to all associations!`);
      if (activeTab === 'browse') fetchProperties();
      else fetchMyProperties();
      if (selectedProperty && selectedProperty.id === id) {
        setSelectedProperty((prev) => ({ ...prev, status: 'approved' }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve property');
    }
  };

  // Delete Listing
  const handleDeleteConfirm = async () => {
    if (!deletePropertyId) return;
    try {
      setIsDeleting(true);
      await api.delete(`/properties/${deletePropertyId}`);
      toast.success('Property listing deleted');
      setDeletePropertyId(null);
      if (selectedProperty?.id === deletePropertyId) {
        setSelectedProperty(null);
      }
      if (activeTab === 'browse') fetchProperties();
      else fetchMyProperties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete listing');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format Indian Price
  const formatPrice = (val, listingType) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '₹0';

    if (listingType === 'sale') {
      if (num >= 10000000) {
        return `₹${(num / 10000000).toFixed(2)} Cr`;
      } else if (num >= 100000) {
        return `₹${(num / 100000).toFixed(2)} Lakhs`;
      }
      return `₹${num.toLocaleString('en-IN')}`;
    }

    // Rent / Lease
    return `₹${num.toLocaleString('en-IN')}${listingType === 'rent' ? ' / mo' : ''}`;
  };

  // WhatsApp Enquiry Generator
  const getWhatsAppLink = (prop) => {
    const cleanPhone = String(prop.contact_phone || '').replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = encodeURIComponent(
      `Hello ${prop.contact_person || 'Sir/Madam'}, I saw your property listing for "${prop.title}" (${prop.listing_type?.toUpperCase()}) in ${
        prop.association_name || 'EGATES Community'
      } on the EGATES Platform. I am interested. Please share more details and visiting time. Thank you!`
    );
    return `https://wa.me/${phoneWithCode}?text=${text}`;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* HERO BANNER & ACTION HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 p-6 sm:p-8 text-white shadow-xl border border-emerald-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <HiSparkles className="w-4 h-4 text-emerald-400" />
              <span>Cross-Association Real Estate Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>🏠 Houses for Sale & Rent</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Verified residential properties, villas, apartments, and plots posted by community homeowners across all layout associations. Direct owner contact with zero middlemen fees.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold text-emerald-300">
              <span className="flex items-center gap-1 bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                <HiCheckCircle className="w-4 h-4 text-emerald-400" /> Super Admin Verified
              </span>
              <span className="flex items-center gap-1 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700">
                💬 Direct WhatsApp & Call
              </span>
              <span className="flex items-center gap-1 bg-cyan-900/40 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                🌐 Broadcasted to All Layouts
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 transition cursor-pointer hover:scale-105 active:scale-95"
            >
              <HiPlus className="w-5 h-5" />
              <span>Post House for Sale / Rent</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center p-1.5 bg-gray-100 dark:bg-slate-800/80 rounded-2xl border border-gray-200 dark:border-slate-700 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>🌐 Browse All Properties</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
              {properties.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my-listings')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'my-listings'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>📋 My Listed Properties</span>
            {myProperties.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
                {myProperties.length}
              </span>
            )}
          </button>
        </div>

        {/* Quick Search */}
        {activeTab === 'browse' && (
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search house, villa, BHK, layout, or city..."
              className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Search
            </button>
          </form>
        )}
      </div>

      {/* FILTER PILLS (BROWSE TAB ONLY) */}
      {activeTab === 'browse' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Listing Type Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-gray-500 uppercase mr-1">Type:</span>
              {[
                { id: 'all', label: 'All Listings' },
                { id: 'sale', label: '🏠 For Sale' },
                { id: 'rent', label: '🔑 For Rent' },
                { id: 'lease', label: '📋 Lease' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setListingTypeFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
                    listingTypeFilter === btn.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
            {/* BHK Filter */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Bedrooms (BHK)
              </label>
              <select
                value={bhkFilter}
                onChange={(e) => setBhkFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All BHK Configurations</option>
                <option value="1 BHK">1 BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="3 BHK">3 BHK</option>
                <option value="4+ BHK">4+ BHK / Villa</option>
                <option value="Plot">Residential Plot</option>
              </select>
            </div>

            {/* Property Type Filter */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Property Category
              </label>
              <select
                value={propertyTypeFilter}
                onChange={(e) => setPropertyTypeFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Property Categories</option>
                <option value="Independent House">Independent House</option>
                <option value="Villa">Individual Villa</option>
                <option value="Apartment">Apartment / Flat</option>
                <option value="Residential Plot">Residential Plot</option>
                <option value="Commercial Space">Commercial / Shop</option>
              </select>
            </div>

            {/* Layout Association Filter */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                Layout Association
              </label>
              <select
                value={assocFilter}
                onChange={(e) => setAssocFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Layouts (Platform-wide)</option>
                {associations.map((assoc) => (
                  <option key={assoc.id} value={assoc.id}>
                    {assoc.name} {assoc.city ? `(${assoc.city})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: BROWSE ALL APPROVED PROPERTIES */}
      {/* ============================================================== */}
      {activeTab === 'browse' && (
        <>
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-xs font-bold text-gray-500">Loading verified property listings...</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto text-3xl">
                🏠
              </div>
              <h3 className="mt-4 text-base font-extrabold text-gray-900 dark:text-white">
                No Properties Found
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                No active properties match your selected filters. Try clearing filters or post your own house for sale/rent.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer"
              >
                + Post House for Sale / Rent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((prop) => {
                const photos = Array.isArray(prop.images) ? prop.images : [];
                const mainPhoto = photos[0] ? getFileUrl(photos[0]) : null;

                return (
                  <div
                    key={prop.id}
                    className="group bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 flex flex-col overflow-hidden"
                  >
                    {/* Property Photo & Badges */}
                    <div className="relative h-52 bg-slate-800 overflow-hidden cursor-pointer" onClick={() => setSelectedProperty(prop)}>
                      {mainPhoto ? (
                        <img
                          src={mainPhoto}
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                          <HiHome className="w-12 h-12 stroke-1" />
                          <span className="text-[11px] font-bold mt-1">No Photo Provided</span>
                        </div>
                      )}

                      {/* Listing Type Tag */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-md text-white ${
                            prop.listing_type === 'sale'
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                              : 'bg-gradient-to-r from-amber-600 to-orange-600'
                          }`}
                        >
                          {prop.listing_type === 'sale' ? '🏠 For Sale' : prop.listing_type === 'rent' ? '🔑 For Rent' : '📋 Lease'}
                        </span>

                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-white border border-white/20">
                          {prop.property_type || 'House'}
                        </span>
                      </div>

                      {/* Photo Count Pill */}
                      {photos.length > 1 && (
                        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                          <HiPhoto className="w-3.5 h-3.5" />
                          <span>{photos.length} Photos</span>
                        </div>
                      )}

                      {/* Price Badge Overlay */}
                      <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 text-emerald-400 font-black text-sm sm:text-base shadow-lg">
                        {formatPrice(prop.price, prop.listing_type)}
                        {prop.price_negotiable && (
                          <span className="text-[10px] font-semibold text-amber-300 ml-1.5 uppercase">
                            (Nego)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {/* Association & Location */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                          <HiMapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {prop.association_name || 'Community Layout'}
                            {prop.city ? `, ${prop.city}` : ''}
                          </span>
                        </div>

                        {/* Title */}
                        <h3
                          onClick={() => setSelectedProperty(prop)}
                          className="text-base font-extrabold text-gray-900 dark:text-white line-clamp-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
                        >
                          {prop.title}
                        </h3>

                        {/* Specifications Pills */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {prop.bhk && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                              🛏️ {prop.bhk}
                            </span>
                          )}
                          {prop.built_up_sqft && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                              📐 {prop.built_up_sqft} sq.ft
                            </span>
                          )}
                          {prop.facing && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                              🧭 {prop.facing} Facing
                            </span>
                          )}
                        </div>

                        {/* Description Preview */}
                        {prop.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-2 leading-relaxed">
                            {prop.description}
                          </p>
                        )}
                      </div>

                      {/* Owner Info & Actions */}
                      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="min-w-0">
                            <span className="text-[11px] text-gray-400 block font-semibold">
                              Owner Contact:
                            </span>
                            <span className="font-extrabold text-gray-800 dark:text-gray-200 truncate block">
                              {prop.contact_person || prop.owner_name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedProperty(prop)}
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            Details →
                          </button>
                        </div>

                        {/* Direct Contact Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          {prop.contact_phone ? (
                            <>
                              <a
                                href={`tel:${prop.contact_phone}`}
                                className="py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                              >
                                <HiPhone className="w-3.5 h-3.5 text-blue-500" />
                                <span>Call Owner</span>
                              </a>

                              <a
                                href={getWhatsAppLink(prop)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                              >
                                <HiChatBubbleLeftEllipsis className="w-4 h-4" />
                                <span>WhatsApp</span>
                              </a>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedProperty(prop)}
                              className="col-span-2 py-2 px-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold text-xs flex items-center justify-center gap-1.5"
                            >
                              <span>View Contact Details</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MY LISTED PROPERTIES */}
      {/* ============================================================== */}
      {activeTab === 'my-listings' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-300">
            <div className="flex items-center gap-2.5">
              <HiShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Verification Workflow:</strong> When you post a house for sale or rent, it is first reviewed by the <strong>Master Super Admin</strong>. Once approved, it is published and visible across all layout associations.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex-shrink-0"
            >
              + Post Another
            </button>
          </div>

          {myLoading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-xs font-bold text-gray-500">Loading your property listings...</p>
            </div>
          ) : myProperties.length === 0 ? (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center mx-auto text-3xl">
                📋
              </div>
              <h3 className="mt-4 text-base font-extrabold text-gray-900 dark:text-white">
                You haven't listed any properties yet
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Have a house or apartment you want to sell or rent out? Post it here to reach buyers and tenants across all layout associations.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer shadow-md"
              >
                + Post House for Sale / Rent
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myProperties.map((prop) => {
                const photos = Array.isArray(prop.images) ? prop.images : [];
                const mainPhoto = photos[0] ? getFileUrl(photos[0]) : null;

                return (
                  <div
                    key={prop.id}
                    className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-20 h-20 rounded-2xl bg-slate-800 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-slate-700">
                        {mainPhoto ? (
                          <img src={mainPhoto} alt={prop.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xl">
                            🏠
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              prop.listing_type === 'sale'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {prop.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
                          </span>

                          {/* Status Badge */}
                          {prop.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1">
                              <HiClock className="w-3 h-3" />
                              <span>Pending Super Admin Review</span>
                            </span>
                          )}
                          {prop.status === 'approved' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                              <HiCheckCircle className="w-3 h-3" />
                              <span>Approved & Live (All Layouts)</span>
                            </span>
                          )}
                          {prop.status === 'rejected' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-500/30 flex items-center gap-1">
                              <HiXCircle className="w-3 h-3" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {(prop.status === 'sold' || prop.status === 'rented') && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-gray-500/10 text-gray-500 border border-gray-500/30 flex items-center gap-1">
                              <span>Marked as {prop.status.toUpperCase()}</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white truncate">
                          {prop.title}
                        </h4>

                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                            {formatPrice(prop.price, prop.listing_type)}
                          </span>
                          <span>•</span>
                          <span>{prop.bhk || prop.property_type}</span>
                          {prop.built_up_sqft && <span>• {prop.built_up_sqft} sqft</span>}
                        </div>

                        {prop.rejection_reason && prop.status === 'rejected' && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                            Reason: "{prop.rejection_reason}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedProperty(prop)}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 text-xs font-bold transition cursor-pointer"
                      >
                        View
                      </button>

                      {prop.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleMarkStatus(prop.id, prop.listing_type === 'sale' ? 'sold' : 'rented')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-700 transition cursor-pointer"
                        >
                          Mark as {prop.listing_type === 'sale' ? 'Sold' : 'Rented'}
                        </button>
                      )}

                      {(prop.status === 'sold' || prop.status === 'rented') && (
                        <button
                          type="button"
                          onClick={() => handleMarkStatus(prop.id, 'approved')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-700 transition cursor-pointer"
                        >
                          Reactivate
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeletePropertyId(prop.id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Delete listing"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: POST HOUSE FOR SALE / RENT */}
      {/* ============================================================== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Post House for Sale or Rent"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          {/* Super Admin Review Note */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-start gap-2.5">
            <HiInformationCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Super Admin Review Requirement:</p>
              <p className="mt-0.5 text-slate-700 dark:text-slate-300">
                Your post will be submitted for verification. Once approved by the Master Super Admin, your listing will automatically be published and visible across all layout associations.
              </p>
            </div>
          </div>

          {/* Listing Type Radio */}
          <div>
            <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-2">
              Listing Category *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'sale', label: '🏠 House for Sale', desc: 'Selling property' },
                { id: 'rent', label: '🔑 House for Rent', desc: 'Rental / Tenant' },
                { id: 'lease', label: '📋 Lease', desc: 'Long-term lease' },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setFormData({ ...formData, listing_type: opt.id })}
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer text-center ${
                    formData.listing_type === opt.id
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-white'
                      : 'border-gray-200 dark:border-slate-800 hover:border-gray-300'
                  }`}
                >
                  <p className="text-xs font-black">{opt.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Property Title */}
          <div>
            <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
              Property Headline / Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. 3BHK Independent Luxury House with Borewell & Car Parking"
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Price, Negotiable, Maintenance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
                {formData.listing_type === 'sale' ? 'Expected Total Price (₹) *' : 'Monthly Rent (₹) *'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-500">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder={formData.listing_type === 'sale' ? 'e.g. 7500000 (75 Lakhs)' : 'e.g. 15000'}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center sm:pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.price_negotiable}
                  onChange={(e) => setFormData({ ...formData, price_negotiable: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Price Negotiable</span>
              </label>
            </div>
          </div>

          {/* Property Category & BHK */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Property Category
              </label>
              <select
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Independent House">Independent House</option>
                <option value="Villa">Individual Villa</option>
                <option value="Apartment">Apartment / Flat</option>
                <option value="Residential Plot">Residential Plot</option>
                <option value="Commercial Space">Commercial / Shop</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Bedrooms (BHK)
              </label>
              <select
                value={formData.bhk}
                onChange={(e) => setFormData({ ...formData, bhk: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="1 BHK">1 BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="3 BHK">3 BHK</option>
                <option value="4+ BHK">4+ BHK / Villa</option>
                <option value="Plot">Plot / Land</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Facing
              </label>
              <select
                value={formData.facing}
                onChange={(e) => setFormData({ ...formData, facing: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="East">East Facing</option>
                <option value="North">North Facing</option>
                <option value="West">West Facing</option>
                <option value="South">South Facing</option>
                <option value="North-East">North-East Facing</option>
              </select>
            </div>
          </div>

          {/* Area (Built-up & Plot) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Built-Up Area (sq.ft)
              </label>
              <input
                type="number"
                min="0"
                value={formData.built_up_sqft}
                onChange={(e) => setFormData({ ...formData, built_up_sqft: e.target.value })}
                placeholder="e.g. 1800"
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Plot / Land Area (sq.ft)
              </label>
              <input
                type="number"
                min="0"
                value={formData.plot_sqft}
                onChange={(e) => setFormData({ ...formData, plot_sqft: e.target.value })}
                placeholder="e.g. 1200"
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Door Number & Street / Landmark */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
                House / Door Number
              </label>
              <input
                type="text"
                value={formData.door_number}
                onChange={(e) => setFormData({ ...formData, door_number: e.target.value })}
                placeholder="e.g. Plot #42, Door #12"
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Street / Landmark
              </label>
              <input
                type="text"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="e.g. 2nd Cross, Near Community Park"
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
              Property Description & Features
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Mention key highlights: Cauvery water, borewell, covered car parking, modular kitchen, 24/7 security..."
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Owner name"
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Contact Phone / WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Photos Upload */}
          <div>
            <label className="block text-xs font-extrabold uppercase text-gray-700 dark:text-gray-300 mb-1.5">
              Property Photos (Up to 8 Images)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              multiple
              accept="image/*"
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 rounded-2xl border-2 border-dashed border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 text-xs font-bold flex items-center gap-2 cursor-pointer transition"
              >
                <HiPhoto className="w-5 h-5" />
                <span>Add Photos</span>
              </button>

              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-300 dark:border-slate-700 group">
                  <img src={preview} alt="Upload preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeSelectedImage(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-90 hover:opacity-100 transition cursor-pointer"
                  >
                    <HiXMark className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Super Admin...</span>
                </>
              ) : (
                <span>Submit for Verification</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: VIEW PROPERTY DETAILS */}
      {/* ============================================================== */}
      {selectedProperty && (
        <Modal
          isOpen={Boolean(selectedProperty)}
          onClose={() => {
            setSelectedProperty(null);
            setActivePhotoIdx(0);
          }}
          title={selectedProperty.title}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            {/* Photos Gallery */}
            {(() => {
              const photos = Array.isArray(selectedProperty.images) ? selectedProperty.images : [];
              if (photos.length === 0) return null;

              return (
                <div className="space-y-2">
                  <div className="relative h-64 sm:h-80 rounded-2xl bg-slate-900 overflow-hidden">
                    <img
                      src={getFileUrl(photos[activePhotoIdx] || photos[0])}
                      alt={selectedProperty.title}
                      className="w-full h-full object-cover"
                    />

                    {photos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition"
                        >
                          <HiChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePhotoIdx((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition"
                        >
                          <HiChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-white text-xs font-bold">
                      {activePhotoIdx + 1} / {photos.length}
                    </div>
                  </div>

                  {photos.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {photos.map((p, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActivePhotoIdx(idx)}
                          className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition ${
                            activePhotoIdx === idx ? 'border-emerald-500 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={getFileUrl(p)} alt="Thumbnail" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Price & Badges Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black uppercase text-white ${
                      selectedProperty.listing_type === 'sale' ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}
                  >
                    {selectedProperty.listing_type === 'sale' ? 'House for Sale' : 'House for Rent'}
                  </span>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                    {selectedProperty.property_type}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    {formatPrice(selectedProperty.price, selectedProperty.listing_type)}
                  </span>
                  {selectedProperty.price_negotiable && (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      (Negotiable)
                    </span>
                  )}
                </div>
              </div>

              {/* Direct Actions */}
              {selectedProperty.contact_phone && (
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedProperty.contact_phone}`}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-800 dark:text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <HiPhone className="w-4 h-4 text-blue-500" />
                    <span>Call Owner</span>
                  </a>
                  <a
                    href={getWhatsAppLink(selectedProperty)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition"
                  >
                    <HiChatBubbleLeftEllipsis className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              )}
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Bedrooms</span>
                <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 block">
                  {selectedProperty.bhk || 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Built-Up Area</span>
                <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 block">
                  {selectedProperty.built_up_sqft ? `${selectedProperty.built_up_sqft} sqft` : 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Facing</span>
                <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 block">
                  {selectedProperty.facing ? `${selectedProperty.facing} Facing` : 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Plot Area</span>
                <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 block">
                  {selectedProperty.plot_sqft ? `${selectedProperty.plot_sqft} sqft` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Location & Layout */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 space-y-2">
              <h4 className="text-xs font-extrabold uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                <HiMapPin className="w-4 h-4 text-emerald-600" />
                <span>Layout & Location Details</span>
              </h4>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {selectedProperty.association_name || 'Community Layout'}
                {selectedProperty.city ? ` (${selectedProperty.city})` : ''}
              </p>
              {selectedProperty.door_number && (
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Door / Plot: <span className="font-semibold">{selectedProperty.door_number}</span>
                </p>
              )}
              {selectedProperty.location_address && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Address: {selectedProperty.location_address}
                </p>
              )}
            </div>

            {/* Description */}
            {selectedProperty.description && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold uppercase text-gray-500 tracking-wider">
                  Features & Details
                </h4>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-gray-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                  {selectedProperty.description}
                </p>
              </div>
            )}

            {/* Super Admin Quick Controls (if logged in as Super Admin) */}
            {isSuperAdmin && selectedProperty.status === 'pending' && (
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3">
                <div className="text-xs text-blue-900 dark:text-blue-200">
                  <span className="font-bold">Super Admin Review:</span> This listing is awaiting your approval to broadcast across all associations.
                </div>
                <button
                  type="button"
                  onClick={() => handleSuperAdminApprove(selectedProperty.id, selectedProperty.title)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition cursor-pointer flex-shrink-0"
                >
                  ✓ Approve & Broadcast Live
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletePropertyId)}
        onClose={() => setDeletePropertyId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Property Listing"
        message="Are you sure you want to remove this property listing? This action cannot be undone."
        confirmText="Yes, Delete Listing"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
