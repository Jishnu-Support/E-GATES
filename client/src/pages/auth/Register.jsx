import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiUser,
  HiUserGroup,
  HiEnvelope,
  HiPhone,
  HiLockClosed,
  HiBuildingOffice2,
  HiHome,
  HiMapPin,
  HiCheckCircle,
  HiExclamationCircle,
  HiShieldCheck,
  HiPhoto,
  HiCamera,
  HiArrowRight,
  HiArrowLeft,
  HiEye,
} from 'react-icons/hi2';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import FileUpload from '../../components/common/FileUpload';
import PoweredByLogo from '../../components/common/PoweredByLogo';
import Modal from '../../components/common/Modal';
import BrandingModal from '../../components/common/BrandingModal';
import api from '../../services/api';

export default function Register() {
  const { register, registerAssociationAdmin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active registration form mode: 'member' | 'assoc-admin'
  const initialType = searchParams.get('type') || 'member';
  const normalizedInitial =
    initialType === 'assoc_admin' || initialType === 'assoc-admin'
      ? 'assoc-admin'
      : 'member';

  const [activeForm, setActiveForm] = useState(normalizedInitial);
  const [associations, setAssociations] = useState([]);
  const [loadingAssocs, setLoadingAssocs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [viewPhotoModal, setViewPhotoModal] = useState(null); // { url, title }
  const [brandingModalType, setBrandingModalType] = useState(null); // 'egates' | 'jishnu' | null

  // If vendor type param is passed, direct to vendor registration
  useEffect(() => {
    if (searchParams.get('type') === 'vendor') {
      navigate('/vendor/register', { replace: true });
    }
  }, [searchParams, navigate]);

  // Member Registration Code auto-fetch state
  const [memberAssocCodeInput, setMemberAssocCodeInput] = useState('');
  const [memberFetchedAssoc, setMemberFetchedAssoc] = useState(null);
  const [memberCodeFetchLoading, setMemberCodeFetchLoading] = useState(false);
  const memberCodeTimerRef = useRef(null);

  // 1. Member Form State
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    association_id: '',
    door_no: '',
    street: '',
    layout_name: '',
    taluk: '',
    district: '',
    state: 'Tamil Nadu',
    password: '',
    confirm_password: '',
  });
  const [memberEbProof, setMemberEbProof] = useState(null);
  const [memberTaxProof, setMemberTaxProof] = useState(null);
  const [memberProfilePhoto, setMemberProfilePhoto] = useState(null);
  const [memberPhotoPreview, setMemberPhotoPreview] = useState(null);
  const memberPhotoInputRef = useRef(null);
  const memberCameraInputRef = useRef(null);

  // 2. Association + Admin Form State (Combined new association creation)
  const [assocAdminForm, setAssocAdminForm] = useState({
    association_name: '',
    association_city: '',
    association_address: '',
    name: '',
    email: '',
    phone: '',
    door_no: '',
    street: '',
    taluk: '',
    district: '',
    state: 'Tamil Nadu',
    password: '',
    confirm_password: '',
  });
  const [assocLogo, setAssocLogo] = useState(null);
  const [assocEbProof, setAssocEbProof] = useState(null);
  const [assocTaxProof, setAssocTaxProof] = useState(null);
  const [assocAdminProfilePhoto, setAssocAdminProfilePhoto] = useState(null);
  const [assocAdminPhotoPreview, setAssocAdminPhotoPreview] = useState(null);
  const assocAdminPhotoInputRef = useRef(null);
  const assocAdminCameraInputRef = useRef(null);

  // Camera Modal State & Handlers
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState('member'); // 'member' | 'admin' | 'assoc-admin'
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const videoRef = useRef(null);

  // Bind video element when stream is active
  useEffect(() => {
    if (cameraModalOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play().catch((err) => console.warn('Camera play warning:', err));
      };
      videoRef.current.play().catch(() => {});
    }
  }, [cameraModalOpen, cameraStream]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const openCameraModal = async (target) => {
    setCameraTarget(target);
    setCameraError('');
    setCapturedBlob(null);
    setCapturedPreview(null);
    setCameraModalOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam is not directly accessible. Please use device camera.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      setCameraError(
        'Unable to open webcam stream. You can still use your native device camera below.'
      );
    }
  };

  const closeCameraModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
    setCameraModalOpen(false);
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    setCapturedPreview(null);
    if (videoRef.current) {
      if (cameraStream && videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
      videoRef.current.play().catch(() => {});
    }
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 640;
    if (vw === 0 || vh === 0) return;
    const canvas = document.createElement('canvas');
    const size = Math.min(vw, vh);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Mirror snapshot to match live mirror view
    ctx.translate(size, 0);
    ctx.scale(-1, 1);

    // Center-crop to square portrait
    const sx = (vw - size) / 2;
    const sy = (vh - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `profile_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedBlob(file);
          setCapturedPreview(canvas.toDataURL('image/jpeg', 0.92));
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleConfirmCapturedPhoto = () => {
    if (!capturedBlob || !capturedPreview) return;
    if (cameraTarget === 'member') {
      setMemberProfilePhoto(capturedBlob);
      setMemberPhotoPreview(capturedPreview);
    } else if (cameraTarget === 'assoc-admin') {
      setAssocAdminProfilePhoto(capturedBlob);
      setAssocAdminPhotoPreview(capturedPreview);
    }
    clearFieldError('profile_photo');
    closeCameraModal();
  };

  const triggerNativeCamera = () => {
    closeCameraModal();
    if (cameraTarget === 'member') {
      memberCameraInputRef.current?.click();
    } else if (cameraTarget === 'assoc-admin') {
      assocAdminCameraInputRef.current?.click();
    }
  };

  // Handle Photo Selection with live preview
  const handlePhotoSelect = (file, setPhoto, setPreview) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Profile photo size must be less than 5MB.');
      return;
    }
    setErrorMessage('');
    setPhoto(file);
    clearFieldError('profile_photo');
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Sync with URL query parameter
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'assoc-admin' || type === 'assoc_admin') {
      setActiveForm('assoc-admin');
    } else {
      setActiveForm('member');
    }
  }, [searchParams]);

  const handleTabChange = (mode) => {
    setActiveForm(mode);
    setSearchParams({ type: mode });
    setErrorMessage('');
    setFieldErrors({});
    setSuccessData(null);
  };

  // Fetch associations for dropdowns
  useEffect(() => {
    let isMounted = true;
    const fetchAssociations = async () => {
      try {
        setLoadingAssocs(true);
        const res = await api.get('/associations');
        const list = res.data?.data || res.data || [];
        if (isMounted) {
          setAssociations(list);
          if (list.length > 0) {
            setMemberForm((prev) => ({
              ...prev,
              association_id: prev.association_id || list[0].id,
            }));
            const initialAssoc = list[0];
            setMemberFetchedAssoc((prev) => prev || initialAssoc);
            if (initialAssoc.code) {
              setMemberAssocCodeInput((prev) => prev || initialAssoc.code);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load associations list:', err.message);
      } finally {
        if (isMounted) setLoadingAssocs(false);
      }
    };

    fetchAssociations();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleMemberAssocCodeChange = (val) => {
    const uppercaseVal = val.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setMemberAssocCodeInput(uppercaseVal);
    clearFieldError('association_id');

    if (memberCodeTimerRef.current) {
      clearTimeout(memberCodeTimerRef.current);
    }

    if (!uppercaseVal.trim()) {
      setMemberFetchedAssoc(null);
      setMemberCodeFetchLoading(false);
      return;
    }

    // Try finding in preloaded associations first
    const localMatch = associations.find(
      (a) => a.code && a.code.toUpperCase() === uppercaseVal.trim()
    );
    if (localMatch) {
      setMemberFetchedAssoc(localMatch);
      setMemberForm((prev) => ({ ...prev, association_id: localMatch.id }));
      setMemberCodeFetchLoading(false);
      return;
    }

    setMemberCodeFetchLoading(true);
    memberCodeTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/associations/code/${encodeURIComponent(uppercaseVal.trim())}`);
        if (res.data?.data) {
          const assoc = res.data.data;
          setMemberFetchedAssoc(assoc);
          setMemberForm((prev) => ({ ...prev, association_id: assoc.id }));
        } else {
          setMemberFetchedAssoc(null);
        }
      } catch (err) {
        setMemberFetchedAssoc(null);
      } finally {
        setMemberCodeFetchLoading(false);
      }
    }, 350);
  };

  const handleDropdownAssocChange = (assocId) => {
    setMemberForm((prev) => ({ ...prev, association_id: assocId }));
    clearFieldError('association_id');
    const selected = associations.find((a) => String(a.id) === String(assocId));
    if (selected) {
      setMemberFetchedAssoc(selected);
      if (selected.code) {
        setMemberAssocCodeInput(selected.code);
      }
    } else {
      setMemberFetchedAssoc(null);
    }
  };

  // Password strength helper
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-gray-200' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-yellow-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-green-500' };
  };

  // Validation and Error Indication Helpers
  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const getFieldError = (fieldName) => fieldErrors[fieldName] || null;

  const getInputClass = (fieldName, focusBorder = 'focus:ring-emerald-500') => {
    const hasError = !!fieldErrors[fieldName];
    if (hasError) {
      return 'w-full py-2.5 px-3 bg-red-50/50 dark:bg-red-950/20 border-2 border-red-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 text-gray-900 dark:text-white transition shadow-xs';
    }
    return `w-full py-2.5 px-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 ${focusBorder} focus:outline-none text-gray-900 dark:text-white transition`;
  };

  const renderFieldError = (fieldName) => {
    const err = fieldErrors[fieldName];
    if (!err) return null;
    return (
      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 animate-fade-in">
        <HiExclamationCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
        <span>{err}</span>
      </p>
    );
  };

  const scrollToFirstError = (errors) => {
    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      setTimeout(() => {
        const el =
          document.querySelector(`[data-field="${firstKey}"]`) ||
          document.querySelector('.border-red-500');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const focusable = el.querySelector('input, select, textarea') || el;
          if (focusable && typeof focusable.focus === 'function') focusable.focus();
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 60);
    }
  };

  // 1. Validate Member Form
  const validateMemberForm = () => {
    const errs = {};
    if (!memberForm.association_id) {
      errs.association_id = 'Please select your layout association';
    }
    if (!memberProfilePhoto) {
      errs.profile_photo = 'Profile photo is mandatory';
    }
    if (!memberForm.name || !memberForm.name.trim()) {
      errs.name = 'Full name is mandatory';
    }
    if (!memberForm.phone || !memberForm.phone.trim()) {
      errs.phone = 'Mobile phone number is mandatory';
    } else if (!/^[0-9]{10}$/.test(memberForm.phone.trim())) {
      errs.phone = 'Please enter a valid 10-digit mobile phone number';
    }
    if (!memberForm.email || !memberForm.email.trim()) {
      errs.email = 'Email address is mandatory';
    } else if (!/\S+@\S+\.\S+/.test(memberForm.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (!memberForm.door_no || !memberForm.door_no.trim()) {
      errs.door_no = 'Door / Plot number is mandatory';
    }
    if (!memberForm.street || !memberForm.street.trim()) {
      errs.street = 'Street name is mandatory';
    }
    if (!memberEbProof) {
      errs.eb_bill_proof = 'Electricity (EB) Bill proof is mandatory';
    }
    if (!memberTaxProof) {
      errs.property_tax_receipt = 'Property Tax Receipt proof is mandatory';
    }
    if (!memberForm.password) {
      errs.password = 'Password is mandatory';
    } else if (memberForm.password.length < 6) {
      errs.password = 'Password must be at least 6 characters long';
    }
    if (!memberForm.confirm_password) {
      errs.confirm_password = 'Confirm password is mandatory';
    } else if (memberForm.password !== memberForm.confirm_password) {
      errs.confirm_password = 'Passwords do not match. Please re-enter';
    }
    if (!agreedToTerms) {
      errs.agreedToTerms = 'You must read and accept the Terms and Conditions to proceed';
    }
    return errs;
  };

  // 2. Validate Association + Admin Form
  const validateAssocAdminForm = () => {
    const errs = {};
    if (!assocAdminForm.association_name || !assocAdminForm.association_name.trim()) {
      errs.association_name = 'Association / Layout name is mandatory';
    }
    if (!assocAdminForm.association_city || !assocAdminForm.association_city.trim()) {
      errs.association_city = 'City / District is mandatory';
    }
    if (!assocAdminProfilePhoto) {
      errs.profile_photo = 'Main Association Admin profile photo is mandatory';
    }
    if (!assocAdminForm.name || !assocAdminForm.name.trim()) {
      errs.name = 'Main Association Admin full name is mandatory';
    }
    if (!assocAdminForm.phone || !assocAdminForm.phone.trim()) {
      errs.phone = 'Mobile phone number is mandatory';
    } else if (!/^[0-9]{10}$/.test(assocAdminForm.phone.trim())) {
      errs.phone = 'Please enter a valid 10-digit mobile phone number';
    }
    if (!assocAdminForm.email || !assocAdminForm.email.trim()) {
      errs.email = 'Email address is mandatory';
    } else if (!/\S+@\S+\.\S+/.test(assocAdminForm.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (!assocAdminForm.door_no || !assocAdminForm.door_no.trim()) {
      errs.door_no = 'Door / Office number is mandatory';
    }
    if (!assocAdminForm.street || !assocAdminForm.street.trim()) {
      errs.street = 'Street / Road name is mandatory';
    }
    if (!assocEbProof) {
      errs.eb_bill_proof = 'Electricity (EB) Bill / ID proof is mandatory';
    }
    if (!assocTaxProof) {
      errs.property_tax_receipt = 'Property Tax Receipt / Appointment Letter is mandatory';
    }
    if (!assocAdminForm.password) {
      errs.password = 'Password is mandatory';
    } else if (assocAdminForm.password.length < 6) {
      errs.password = 'Password must be at least 6 characters long';
    }
    if (!assocAdminForm.confirm_password) {
      errs.confirm_password = 'Confirm password is mandatory';
    } else if (assocAdminForm.password !== assocAdminForm.confirm_password) {
      errs.confirm_password = 'Passwords do not match. Please re-enter';
    }
    if (!agreedToTerms) {
      errs.agreedToTerms = 'You must read and accept the Terms and Conditions to proceed';
    }
    return errs;
  };

  // 1. Submit Member Registration
  const handleSubmitMember = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessData(null);

    const errs = validateMemberForm();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setErrorMessage('Please fill in all mandatory fields indicated with a red border below.');
      scrollToFirstError(errs);
      return;
    }

    try {
      setIsSubmitting(true);
      const data = new FormData();
      Object.entries(memberForm).forEach(([key, val]) => {
        if (key !== 'confirm_password' && val !== null && val !== undefined) {
          data.append(key, val);
        }
      });
      data.append('role', 'member');
      if (memberEbProof instanceof File) {
        data.append('eb_bill_proof', memberEbProof);
      }
      if (memberTaxProof instanceof File) {
        data.append('property_tax_receipt', memberTaxProof);
      }
      if (memberProfilePhoto instanceof File) {
        data.append('profile_photo', memberProfilePhoto);
      }

      await register(data);
      setSuccessData({
        title: 'Member Registration Submitted!',
        message:
          'Your resident member registration has been submitted successfully. The Main Association Admin will review your address details and approve your account shortly.',
        type: 'member',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Member registration failed. Please check the fields and try again.';
      setErrorMessage(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Association + Admin Combined Registration
  const handleSubmitAssocAdmin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessData(null);

    const errs = validateAssocAdminForm();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setErrorMessage('Please fill in all mandatory fields indicated with a red border below.');
      scrollToFirstError(errs);
      return;
    }

    try {
      setIsSubmitting(true);
      const data = new FormData();
      Object.entries(assocAdminForm).forEach(([key, val]) => {
        if (key !== 'confirm_password' && val !== null && val !== undefined) {
          data.append(key, val);
        }
      });

      if (assocLogo instanceof File) {
        data.append('logo', assocLogo);
      }
      if (assocEbProof instanceof File) {
        data.append('eb_bill_proof', assocEbProof);
      }
      if (assocTaxProof instanceof File) {
        data.append('property_tax_receipt', assocTaxProof);
      }
      if (assocAdminProfilePhoto instanceof File) {
        data.append('profile_photo', assocAdminProfilePhoto);
      }

      await registerAssociationAdmin(data);
      setSuccessData({
        title: 'Application Submitted for Super Admin Approval!',
        message: `Your registration request for new association "${assocAdminForm.association_name}" and Administrator account "${assocAdminForm.name}" has been submitted successfully! It is currently pending review in the Super Admin portal. Once the Super Administrator approves your application, you will be able to log in.`,
        type: 'assoc-admin',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Combined registration failed. Please check the fields and try again.';
      setErrorMessage(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const memberStrength = getPasswordStrength(memberForm.password);
  const assocAdminStrength = getPasswordStrength(assocAdminForm.password);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 antialiased">
      {/* Top Header */}
      <div className="relative w-full max-w-5xl mx-auto flex items-center justify-between py-2 gap-2 sm:gap-4">
        {/* Left: EGATES Logo (Opens EGATES logo modal centered) */}
        <button
          type="button"
          onClick={() => setBrandingModalType('egates')}
          className="flex items-center hover:opacity-95 transition transform hover:scale-105 focus:outline-none cursor-pointer flex-shrink-0"
          title="Click to view EGATES logo"
        >
          <img
            src="/egates-logo.png"
            alt="EGATES"
            className="h-9 sm:h-12 w-auto max-w-[130px] sm:max-w-[200px] object-contain rounded-2xl bg-white/95 p-1.5 shadow-md"
          />
        </button>

        {/* Top Centre: Powered by Jishnu Infotech Logo (Opens Jishnu Infotech logo modal centered) */}
        <div className="hidden sm:block absolute left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={() => setBrandingModalType('jishnu')}
            className="cursor-pointer focus:outline-none hover:opacity-95 transition transform hover:scale-105"
            title="Click to view Jishnu Infotech logo"
          >
            <PoweredByLogo size="lg" />
          </button>
        </div>

        {/* Right side: Mobile Jishnu logo + Back to Login button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="sm:hidden">
            <button
              type="button"
              onClick={() => setBrandingModalType('jishnu')}
              className="cursor-pointer focus:outline-none hover:opacity-95 transition transform hover:scale-105"
              title="Click to view Jishnu Infotech logo"
            >
              <PoweredByLogo size="sm" />
            </button>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-semibold border border-white/20 transition shadow-sm hover:border-white/30"
            title="Back to Login page"
          >
            <HiArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>

      {/* Main Registration Container */}
      <div className="w-full max-w-4xl mx-auto my-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-5 sm:p-10 transition-colors">
          {/* Dedicated Header for Active Registration Form */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-inner ${
              activeForm === 'assoc-admin'
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
            }`}>
              {activeForm === 'assoc-admin' ? (
                <HiBuildingOffice2 className="w-7 h-7" />
              ) : (
                <HiUserGroup className="w-7 h-7" />
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {activeForm === 'assoc-admin'
                ? 'Association Registration Form'
                : 'Member Registration Form'}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {activeForm === 'assoc-admin'
                ? 'Create a brand-new layout association and register its Main Association Admin'
                : 'Register as a resident homeowner or tenant for your layout association'}
            </p>
          </div>

          {/* Success Message Banner */}
          {successData ? (
            <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl font-bold">
                ✓
              </div>
              <h3 className="text-xl font-bold text-gray-900">{successData.title}</h3>
              <p className="text-sm text-gray-700 max-w-lg mx-auto leading-relaxed">
                {successData.message}
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-md transition"
                >
                  Proceed to Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => setSuccessData(null)}
                  className="w-full sm:w-auto px-5 py-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition"
                >
                  Submit Another Registration
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 mb-6 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
                  <HiExclamationCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ============================================================== */}
              {/* FORM 1: ASSOCIATION REGISTRATION FORM */}
              {/* ============================================================== */}
              {activeForm === 'assoc-admin' && (
                <form onSubmit={handleSubmitAssocAdmin} noValidate autoComplete="off" className="space-y-8">
                  <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-purple-900 flex items-center gap-2">
                        <span>🏛️</span> Association Registration Form
                      </h2>
                      <p className="text-xs text-purple-700 mt-0.5">
                        Create a brand-new layout association and register its Main Association Admin
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Association Info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-2 border-b pb-2">
                      <HiBuildingOffice2 className="w-4 h-4 text-purple-600" />
                      1. New Association Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div data-field="association_name">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Association / Layout Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={assocAdminForm.association_name}
                          onChange={(e) => {
                            setAssocAdminForm({
                              ...assocAdminForm,
                              association_name: e.target.value,
                            });
                            clearFieldError('association_name');
                          }}
                          placeholder="e.g. Greenfield Residents Welfare Association"
                          className={getInputClass('association_name', 'focus:ring-purple-500')}
                        />
                        {renderFieldError('association_name')}
                      </div>

                      <div data-field="association_city">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          City / District *
                        </label>
                        <input
                          type="text"
                          required
                          value={assocAdminForm.association_city}
                          onChange={(e) => {
                            setAssocAdminForm({
                              ...assocAdminForm,
                              association_city: e.target.value,
                            });
                            clearFieldError('association_city');
                          }}
                          placeholder="e.g. Chennai"
                          className={getInputClass('association_city', 'focus:ring-purple-500')}
                        />
                        {renderFieldError('association_city')}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Registered Layout Address / Office Location
                      </label>
                      <input
                        type="text"
                        value={assocAdminForm.association_address}
                        onChange={(e) =>
                          setAssocAdminForm({
                            ...assocAdminForm,
                            association_address: e.target.value,
                          })
                        }
                        placeholder="e.g. Community Hall, Plot 1, Greenfield Layout, Medavakkam"
                        className="w-full py-2.5 px-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <FileUpload
                        label="Association Official Logo (Optional)"
                        helperText="Upload file (5 MB)"
                        accept="image/png,image/jpeg,image/jpg"
                        value={assocLogo}
                        onChange={(file) => setAssocLogo(file)}
                      />
                    </div>
                  </div>

                  {/* Section 2: Main Association Admin Personal & Contact Details */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-2 border-b pb-2">
                      <HiShieldCheck className="w-4 h-4 text-purple-600" />
                      2. Main Association Admin Details
                    </h3>

                    {/* Profile Photo Upload */}
                    <div
                      data-field="profile_photo"
                      className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-center gap-4 ${
                        fieldErrors.profile_photo
                          ? 'bg-red-50/60 dark:bg-red-950/30 border-2 border-red-500 ring-2 ring-red-500/20'
                          : 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/40'
                      }`}
                    >
                      <div
                        onClick={() => assocAdminPhotoPreview && setViewPhotoModal({ url: assocAdminPhotoPreview, title: 'Main Admin Profile Photo' })}
                        className={`w-20 h-20 sm:w-24 sm:h-24 max-w-[96px] max-h-[96px] min-w-[80px] min-h-[80px] rounded-2xl overflow-hidden bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xl ring-2 ${
                          fieldErrors.profile_photo
                            ? 'ring-red-500'
                            : 'ring-purple-200 dark:ring-purple-800/70'
                        } flex-shrink-0 shadow-xs relative group ${
                          assocAdminPhotoPreview ? 'cursor-pointer hover:ring-purple-400' : ''
                        }`}
                        title={assocAdminPhotoPreview ? 'Click to view full photo' : ''}
                      >
                        {assocAdminPhotoPreview ? (
                          <>
                            <img
                              src={assocAdminPhotoPreview}
                              alt="Profile Preview"
                              className="w-full h-full object-cover object-center"
                            />
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <HiEye className="w-5 h-5 text-white drop-shadow-sm" />
                            </div>
                          </>
                        ) : (
                          <HiCamera className="w-8 h-8 text-purple-500" />
                        )}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-0.5">
                          Profile Photo * (Mandatory)
                        </label>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                          Upload portrait profile photo for your Main Administrator account (PNG, JPG, Max 5MB).
                        </p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => assocAdminPhotoInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs font-semibold rounded-xl transition shadow-xs"
                          >
                            <HiPhoto className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>Choose from Files</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openCameraModal('assoc-admin')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
                          >
                            <HiCamera className="w-4 h-4" />
                            <span>Click Photo</span>
                          </button>

                          {assocAdminPhotoPreview && (
                            <>
                              <button
                                type="button"
                                onClick={() => setViewPhotoModal({ url: assocAdminPhotoPreview, title: 'Main Admin Profile Photo' })}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs font-semibold rounded-xl transition shadow-xs"
                              >
                                <HiEye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssocAdminProfilePhoto(null);
                                  setAssocAdminPhotoPreview(null);
                                  if (assocAdminPhotoInputRef.current) assocAdminPhotoInputRef.current.value = '';
                                  if (assocAdminCameraInputRef.current) assocAdminCameraInputRef.current.value = '';
                                }}
                                className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold px-2 py-1"
                              >
                                Remove Photo
                              </button>
                            </>
                          )}

                          <input
                            ref={assocAdminPhotoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={(e) =>
                              handlePhotoSelect(
                                e.target.files?.[0],
                                setAssocAdminProfilePhoto,
                                setAssocAdminPhotoPreview
                              )
                            }
                            className="hidden"
                          />
                          <input
                            ref={assocAdminCameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={(e) =>
                              handlePhotoSelect(
                                e.target.files?.[0],
                                setAssocAdminProfilePhoto,
                                setAssocAdminPhotoPreview
                              )
                            }
                            className="hidden"
                          />
                        </div>
                        {renderFieldError('profile_photo')}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div data-field="name">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Main Association Admin Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={assocAdminForm.name}
                          onChange={(e) => {
                            setAssocAdminForm({
                              ...assocAdminForm,
                              name: e.target.value,
                            });
                            clearFieldError('name');
                          }}
                          placeholder="e.g. S. Muralidharan"
                          className={getInputClass('name', 'focus:ring-purple-500')}
                        />
                        {renderFieldError('name')}
                      </div>

                      <div data-field="phone">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Main Admin Mobile Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          pattern="[0-9]{10}"
                          value={assocAdminForm.phone}
                          onChange={(e) => {
                            setAssocAdminForm({
                              ...assocAdminForm,
                              phone: e.target.value,
                            });
                            clearFieldError('phone');
                          }}
                          placeholder="10-digit mobile"
                          className={getInputClass('phone', 'focus:ring-purple-500')}
                        />
                        {renderFieldError('phone')}
                      </div>

                      <div data-field="email">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Main Admin Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={assocAdminForm.email}
                          onChange={(e) => {
                            setAssocAdminForm({
                              ...assocAdminForm,
                              email: e.target.value,
                            });
                            clearFieldError('email');
                          }}
                          placeholder="admin@association.com"
                          className={getInputClass('email', 'focus:ring-purple-500')}
                        />
                        {renderFieldError('email')}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Main Admin Address */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-2 border-b pb-2">
                      <HiHome className="w-4 h-4 text-purple-600" />
                      3. Main Admin Address Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div data-field="door_no">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Door / Office No *
                        </label>
                        <input
                          type="text"
                          required
                          value={assocAdminForm.door_no}
                          onChange={(e) => {
                            setAssocAdminForm({
                              ...assocAdminForm,
                              door_no: e.target.value,
                            });
                            clearFieldError('door_no');
                          }}
                          placeholder="e.g. Plot 1 / Office"
                          className={getInputClass('door_no', 'focus:ring-purple-500')}
                        />
                        {renderFieldError('door_no')}
                      </div>

                      <div data-field="street">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Street / Road *
                        </label>
                        <input
                          type="text"
                          required
                          value={assocAdminForm.street}
                          onChange={(e) => {
                            setAssocAdminForm({
                              ...assocAdminForm,
                              street: e.target.value,
                            });
                            clearFieldError('street');
                          }}
                          placeholder="e.g. Main Avenue"
                          className={getInputClass('street', 'focus:ring-purple-500')}
                        />
                        {renderFieldError('street')}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Taluk
                        </label>
                        <input
                          type="text"
                          value={assocAdminForm.taluk}
                          onChange={(e) =>
                            setAssocAdminForm({
                              ...assocAdminForm,
                              taluk: e.target.value,
                            })
                          }
                          placeholder="e.g. Sholinganallur"
                          className="w-full py-2.5 px-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Admin Verification Documents */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-2 border-b pb-2">
                        <HiMapPin className="w-4 h-4 text-purple-600" />
                        4. Verification Proof Documents * (Mandatory)
                      </h3>
                      <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                        Both Electricity (EB) Bill / ID Proof and Property Tax Receipt / Appointment Letter are mandatory for verification.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div data-field="eb_bill_proof">
                        <FileUpload
                          label="Electricity (EB) Bill / ID Proof *"
                          helperText="Upload file (PDF, PNG, JPG - Max 5 MB) (Mandatory)"
                          value={assocEbProof}
                          error={getFieldError('eb_bill_proof')}
                          onChange={(file) => {
                            setAssocEbProof(file);
                            if (file) clearFieldError('eb_bill_proof');
                          }}
                        />
                      </div>

                      <div data-field="property_tax_receipt">
                        <FileUpload
                          label="Property Tax Receipt / Appointment Letter *"
                          helperText="Upload file (PDF, PNG, JPG - Max 5 MB) (Mandatory)"
                          value={assocTaxProof}
                          error={getFieldError('property_tax_receipt')}
                          onChange={(file) => {
                            setAssocTaxProof(file);
                            if (file) clearFieldError('property_tax_receipt');
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Password & Security */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-2 border-b pb-2">
                      <HiLockClosed className="w-4 h-4 text-purple-600" />
                      5. Main Association Admin Security Password
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div data-field="password">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          value={assocAdminForm.password}
                          onChange={(e) => {
                            setAssocAdminForm({
                              ...assocAdminForm,
                              password: e.target.value,
                            });
                            clearFieldError('password');
                          }}
                          placeholder="Min 6 characters"
                          className={getInputClass('password', 'focus:ring-purple-500')}
                        />
                        {renderFieldError('password')}
                        {assocAdminForm.password && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-gray-500">Strength:</span>
                              <span className="font-semibold text-gray-700">
                                {assocAdminStrength.label}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${assocAdminStrength.color} transition-all duration-300`}
                                style={{ width: `${assocAdminStrength.score}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div data-field="confirm_password">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          value={assocAdminForm.confirm_password}
                          onChange={(e) => {
                            setAssocAdminForm({
                              ...assocAdminForm,
                              confirm_password: e.target.value,
                            });
                            clearFieldError('confirm_password');
                          }}
                          placeholder="Re-type password"
                          className={getInputClass('confirm_password', 'focus:ring-purple-500')}
                        />
                        {renderFieldError('confirm_password')}
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions Agreement */}
                  <div
                    data-field="agreedToTerms"
                    className={`rounded-2xl p-4 transition ${
                      fieldErrors.agreedToTerms
                        ? 'bg-red-50/70 dark:bg-red-950/30 border-2 border-red-500 ring-2 ring-red-500/20'
                        : 'bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40'
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => {
                          setAgreedToTerms(e.target.checked);
                          if (e.target.checked) clearFieldError('agreedToTerms');
                        }}
                        className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setTermsModalOpen(true)}
                          className="font-bold text-purple-600 hover:text-purple-700 underline underline-offset-2"
                        >
                          EGATES Terms and Conditions
                        </button>{' '}
                        and acknowledge the Community Privacy and Verification Guidelines. *
                      </span>
                    </label>
                    {renderFieldError('agreedToTerms')}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span>
                        {isSubmitting
                          ? 'Registering Association & Main Admin...'
                          : 'Register Association & Main Association Admin'}
                      </span>
                      <HiArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* FORM 3: MEMBER REGISTRATION FORM (Resident Member) */}
              {/* ============================================================== */}
              {activeForm === 'member' && (
                <form onSubmit={handleSubmitMember} noValidate autoComplete="off" className="space-y-8">
                  <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-emerald-900 flex items-center gap-2">
                        <span>👥</span> Member Registration Form
                      </h2>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Register as a resident homeowner or tenant for your layout association
                      </p>
                    </div>
                  </div>

                  {/* 1. Layout Selection */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2 border-b pb-2">
                      <HiBuildingOffice2 className="w-4 h-4 text-emerald-600" />
                      1. Select Layout Association
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Code Input */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Association Registration Code
                          </label>
                          {memberCodeFetchLoading && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <span className="w-2.5 h-2.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                              Fetching layout...
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={memberAssocCodeInput}
                          onChange={(e) => handleMemberAssocCodeChange(e.target.value)}
                          placeholder="e.g. KCC"
                          className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold uppercase tracking-wider focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                          Enter your layout's registration code to automatically fetch the association.
                        </p>
                      </div>

                      {/* Dropdown Select */}
                      <div data-field="association_id">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Or Select Layout Association *
                        </label>
                        <select
                          name="association_id"
                          required
                          value={memberForm.association_id}
                          onChange={(e) => handleDropdownAssocChange(e.target.value)}
                          className={getInputClass('association_id', 'focus:ring-emerald-500')}
                        >
                          <option value="">-- Choose Your Association --</option>
                          {associations.map((assoc) => (
                            <option key={assoc.id} value={assoc.id}>
                              {assoc.name} {assoc.code ? `[Code: ${assoc.code}]` : ''} {assoc.city ? `(${assoc.city})` : ''}
                            </option>
                          ))}
                        </select>
                        {renderFieldError('association_id')}
                      </div>
                    </div>

                    {/* Auto-fetched Association Display */}
                    {memberFetchedAssoc && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                        <HiCheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold">
                            Layout: {memberFetchedAssoc.name} {memberFetchedAssoc.city ? `(${memberFetchedAssoc.city})` : ''}
                          </p>
                          {memberFetchedAssoc.code && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                              Registration Code: <span className="font-mono font-bold">{memberFetchedAssoc.code}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Personal Details */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2 border-b pb-2">
                      <HiUser className="w-4 h-4 text-emerald-600" />
                      2. Resident Personal Details
                    </h3>

                    {/* Profile Photo Upload */}
                    <div
                      data-field="profile_photo"
                      className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-center gap-4 ${
                        fieldErrors.profile_photo
                          ? 'bg-red-50/60 dark:bg-red-950/30 border-2 border-red-500 ring-2 ring-red-500/20'
                          : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40'
                      }`}
                    >
                      <div
                        onClick={() => memberPhotoPreview && setViewPhotoModal({ url: memberPhotoPreview, title: 'Resident Member Profile Photo' })}
                        className={`w-20 h-20 sm:w-24 sm:h-24 max-w-[96px] max-h-[96px] min-w-[80px] min-h-[80px] rounded-2xl overflow-hidden bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xl ring-2 ${
                          fieldErrors.profile_photo
                            ? 'ring-red-500'
                            : 'ring-emerald-200 dark:ring-emerald-800/70'
                        } flex-shrink-0 shadow-xs relative group ${
                          memberPhotoPreview ? 'cursor-pointer hover:ring-emerald-400' : ''
                        }`}
                        title={memberPhotoPreview ? 'Click to view full photo' : ''}
                      >
                        {memberPhotoPreview ? (
                          <>
                            <img
                              src={memberPhotoPreview}
                              alt="Profile Preview"
                              className="w-full h-full object-cover object-center"
                            />
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <HiEye className="w-5 h-5 text-white drop-shadow-sm" />
                            </div>
                          </>
                        ) : (
                          <HiCamera className="w-8 h-8 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-0.5">
                          Profile Photo * (Mandatory)
                        </label>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                          Upload portrait profile photo for your resident member account (PNG, JPG, Max 5MB).
                        </p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => memberPhotoInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 text-xs font-semibold rounded-xl transition shadow-xs"
                          >
                            <HiPhoto className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Choose from Files</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openCameraModal('member')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
                          >
                            <HiCamera className="w-4 h-4" />
                            <span>Click Photo</span>
                          </button>

                          {memberPhotoPreview && (
                            <>
                              <button
                                type="button"
                                onClick={() => setViewPhotoModal({ url: memberPhotoPreview, title: 'Resident Member Profile Photo' })}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold rounded-xl transition shadow-xs"
                              >
                                <HiEye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMemberProfilePhoto(null);
                                  setMemberPhotoPreview(null);
                                  if (memberPhotoInputRef.current) memberPhotoInputRef.current.value = '';
                                  if (memberCameraInputRef.current) memberCameraInputRef.current.value = '';
                                }}
                                className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold px-2 py-1"
                              >
                                Remove Photo
                              </button>
                            </>
                          )}

                          <input
                            ref={memberPhotoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={(e) =>
                              handlePhotoSelect(
                                e.target.files?.[0],
                                setMemberProfilePhoto,
                                setMemberPhotoPreview
                              )
                            }
                            className="hidden"
                          />
                          <input
                            ref={memberCameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={(e) =>
                              handlePhotoSelect(
                                e.target.files?.[0],
                                setMemberProfilePhoto,
                                setMemberPhotoPreview
                              )
                            }
                            className="hidden"
                          />
                        </div>
                        {renderFieldError('profile_photo')}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div data-field="name">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={memberForm.name}
                          onChange={(e) => {
                            setMemberForm({ ...memberForm, name: e.target.value });
                            clearFieldError('name');
                          }}
                          placeholder="e.g. S. Muralidharan"
                          className={getInputClass('name', 'focus:ring-emerald-500')}
                        />
                        {renderFieldError('name')}
                      </div>

                      <div data-field="phone">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Mobile Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          pattern="[0-9]{10}"
                          value={memberForm.phone}
                          onChange={(e) => {
                            setMemberForm({ ...memberForm, phone: e.target.value });
                            clearFieldError('phone');
                          }}
                          placeholder="10-digit mobile"
                          className={getInputClass('phone', 'focus:ring-emerald-500')}
                        />
                        {renderFieldError('phone')}
                      </div>

                      <div data-field="email">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={memberForm.email}
                          onChange={(e) => {
                            setMemberForm({ ...memberForm, email: e.target.value });
                            clearFieldError('email');
                          }}
                          placeholder="name@example.com"
                          className={getInputClass('email', 'focus:ring-emerald-500')}
                        />
                        {renderFieldError('email')}
                      </div>
                    </div>
                  </div>

                  {/* 3. Address in Layout */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2 border-b pb-2">
                      <HiHome className="w-4 h-4 text-emerald-600" />
                      3. Layout Residence Address
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div data-field="door_no">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Door / Plot No *
                        </label>
                        <input
                          type="text"
                          required
                          value={memberForm.door_no}
                          onChange={(e) => {
                            setMemberForm({ ...memberForm, door_no: e.target.value });
                            clearFieldError('door_no');
                          }}
                          placeholder="e.g. 14A or Plot 21"
                          className={getInputClass('door_no', 'focus:ring-emerald-500')}
                        />
                        {renderFieldError('door_no')}
                      </div>

                      <div data-field="street">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Street Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={memberForm.street}
                          onChange={(e) => {
                            setMemberForm({ ...memberForm, street: e.target.value });
                            clearFieldError('street');
                          }}
                          placeholder="e.g. 2nd Cross Street"
                          className={getInputClass('street', 'focus:ring-emerald-500')}
                        />
                        {renderFieldError('street')}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Layout / Colony Name
                        </label>
                        <input
                          type="text"
                          value={memberForm.layout_name}
                          onChange={(e) =>
                            setMemberForm({
                              ...memberForm,
                              layout_name: e.target.value,
                            })
                          }
                          placeholder="e.g. Green Valley"
                          className="w-full py-2.5 px-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Taluk
                        </label>
                        <input
                          type="text"
                          value={memberForm.taluk}
                          onChange={(e) =>
                            setMemberForm({ ...memberForm, taluk: e.target.value })
                          }
                          placeholder="e.g. Tambaram"
                          className="w-full py-2.5 px-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          District
                        </label>
                        <input
                          type="text"
                          value={memberForm.district}
                          onChange={(e) =>
                            setMemberForm({
                              ...memberForm,
                              district: e.target.value,
                            })
                          }
                          placeholder="e.g. Chengalpattu"
                          className="w-full py-2.5 px-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          value={memberForm.state}
                          onChange={(e) =>
                            setMemberForm({ ...memberForm, state: e.target.value })
                          }
                          className="w-full py-2.5 px-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Verification Proofs */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2 border-b pb-2">
                        <HiMapPin className="w-4 h-4 text-emerald-600" />
                        4. Address Verification Proof Documents * (Mandatory)
                      </h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                        Both Electricity Bill (EB) Proof and Property Tax Receipt Proof are mandatory for address verification.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div data-field="eb_bill_proof">
                        <FileUpload
                          label="Electricity Bill (EB) Proof *"
                          helperText="Upload file (PDF, PNG, JPG - Max 5 MB) (Mandatory)"
                          value={memberEbProof}
                          error={getFieldError('eb_bill_proof')}
                          onChange={(file) => {
                            setMemberEbProof(file);
                            if (file) clearFieldError('eb_bill_proof');
                          }}
                        />
                      </div>

                      <div data-field="property_tax_receipt">
                        <FileUpload
                          label="Property Tax Receipt Proof *"
                          helperText="Upload file (PDF, PNG, JPG - Max 5 MB) (Mandatory)"
                          value={memberTaxProof}
                          error={getFieldError('property_tax_receipt')}
                          onChange={(file) => {
                            setMemberTaxProof(file);
                            if (file) clearFieldError('property_tax_receipt');
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Password */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2 border-b pb-2">
                      <HiLockClosed className="w-4 h-4 text-emerald-600" />
                      5. Security Password
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div data-field="password">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          value={memberForm.password}
                          onChange={(e) => {
                            setMemberForm({
                              ...memberForm,
                              password: e.target.value,
                            });
                            clearFieldError('password');
                          }}
                          placeholder="Min 6 characters"
                          className={getInputClass('password', 'focus:ring-emerald-500')}
                        />
                        {renderFieldError('password')}
                        {memberForm.password && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-gray-500">Strength:</span>
                              <span className="font-semibold text-gray-700">
                                {memberStrength.label}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${memberStrength.color} transition-all duration-300`}
                                style={{ width: `${memberStrength.score}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div data-field="confirm_password">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          value={memberForm.confirm_password}
                          onChange={(e) => {
                            setMemberForm({
                              ...memberForm,
                              confirm_password: e.target.value,
                            });
                            clearFieldError('confirm_password');
                          }}
                          placeholder="Re-type password"
                          className={getInputClass('confirm_password', 'focus:ring-emerald-500')}
                        />
                        {renderFieldError('confirm_password')}
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions Agreement */}
                  <div
                    data-field="agreedToTerms"
                    className={`rounded-2xl p-4 transition ${
                      fieldErrors.agreedToTerms
                        ? 'bg-red-50/70 dark:bg-red-950/30 border-2 border-red-500 ring-2 ring-red-500/20'
                        : 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40'
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => {
                          setAgreedToTerms(e.target.checked);
                          if (e.target.checked) clearFieldError('agreedToTerms');
                        }}
                        className="mt-1 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setTermsModalOpen(true)}
                          className="font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                        >
                          EGATES Terms and Conditions
                        </button>{' '}
                        and acknowledge the Community Privacy and Verification Guidelines. *
                      </span>
                    </label>
                    {renderFieldError('agreedToTerms')}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span>
                        {isSubmitting
                          ? 'Submitting Member Registration...'
                          : 'Submit Member Registration'}
                      </span>
                      <HiArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Back to Login Link */}
              <div className="text-center pt-6 border-t border-gray-100 mt-6">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-gray-500 hover:text-primary-600 hover:underline"
                >
                  Already have an account? Sign In here
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-2 text-xs text-slate-500">
        <p>
          &copy; {new Date().getFullYear()} EGATES - Community & Layout Association Management. All
          rights reserved.
        </p>
      </footer>

      {/* TERMS AND CONDITIONS MODAL */}
      <Modal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        title="📜 EGATES Terms & Conditions"
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <p className="text-xs text-gray-500 text-center sm:text-left">
              By accepting, you agree to follow all EGATES community bylaws.
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgreedToTerms(true);
                  setTermsModalOpen(false);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md shadow-primary-600/30 transition flex items-center gap-1.5"
              >
                <HiCheckCircle className="w-4 h-4" />
                <span>I Agree & Accept</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-gray-700 text-xs sm:text-sm leading-relaxed">
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 flex items-start gap-3">
            <HiShieldCheck className="w-6 h-6 text-primary-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-primary-900 text-sm">
                EGATES Community Association Platform
              </h4>
              <p className="text-xs text-primary-700 mt-1">
                Please read these terms carefully before submitting your registration. EGATES is designed to provide secure, transparent, and seamless community living powered by Jishnu Infotech.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="border border-gray-100 rounded-2xl p-3.5 bg-gray-50/70">
              <h5 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-extrabold flex items-center justify-center text-[10px]">
                  1
                </span>
                Account Eligibility & Accurate Information
              </h5>
              <p className="mt-1 text-xs text-gray-600 leading-normal pl-7">
                You affirm that all details submitted (including full name, 10-digit mobile number, layout address, door/plot number, street, taluk, and district) are true, accurate, and represent your lawful property residency, ownership, or administrative mandate.
              </p>
            </div>

            <div className="border border-gray-100 rounded-2xl p-3.5 bg-gray-50/70">
              <h5 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-extrabold flex items-center justify-center text-[10px]">
                  2
                </span>
                Document Verification (EB Bill & Property Tax Receipts)
              </h5>
              <p className="mt-1 text-xs text-gray-600 leading-normal pl-7">
                Uploaded verification documents (Electricity Bill, Property Tax receipt, or government ID) are processed exclusively for layout membership approval and address verification by authorized Association Admins and Super Admins. Falsified or tampered proofs will lead to permanent account rejection.
              </p>
            </div>

            <div className="border border-gray-100 rounded-2xl p-3.5 bg-gray-50/70">
              <h5 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-extrabold flex items-center justify-center text-[10px]">
                  3
                </span>
                Community Safety & Resident Guidelines
              </h5>
              <p className="mt-1 text-xs text-gray-600 leading-normal pl-7">
                All registered members must maintain mutual dignity and cordiality in community notices, grievance submissions, visitor management logs, and discussion channels. Harassment, unauthorized promotional broadcasting, or defamatory conduct is strictly prohibited.
              </p>
            </div>

            <div className="border border-gray-100 rounded-2xl p-3.5 bg-gray-50/70">
              <h5 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-extrabold flex items-center justify-center text-[10px]">
                  4
                </span>
                Association Dues & Maintenance Payments
              </h5>
              <p className="mt-1 text-xs text-gray-600 leading-normal pl-7">
                Layout maintenance collections, security fees, festival contributions, or amenities charges recorded on EGATES are subject to individual association bylaws and financial auditing.
              </p>
            </div>

            <div className="border border-gray-100 rounded-2xl p-3.5 bg-gray-50/70">
              <h5 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-extrabold flex items-center justify-center text-[10px]">
                  5
                </span>
                Privacy, Security & Data Protection
              </h5>
              <p className="mt-1 text-xs text-gray-600 leading-normal pl-7">
                EGATES implements stringent encryption and role-based access control. Your personal contact details and private credentials will never be sold or shared with unauthorized commercial third parties. You are responsible for safeguarding your confidential password.
              </p>
            </div>

            <div className="border border-gray-100 rounded-2xl p-3.5 bg-gray-50/70">
              <h5 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-extrabold flex items-center justify-center text-[10px]">
                  6
                </span>
                Review, Approval & Termination Policy
              </h5>
              <p className="mt-1 text-xs text-gray-600 leading-normal pl-7">
                All registrations are subject to formal administrative verification. The Association Administrators and Super Admin retain the right to suspend or terminate accounts in case of breach of these community terms.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* CAMERA SNAPSHOT MODAL */}
      <Modal
        isOpen={cameraModalOpen}
        onClose={closeCameraModal}
        title="📸 Click Profile Photo"
        size="md"
      >
        <div className="space-y-4 text-center">
          {cameraError ? (
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 space-y-3">
              <HiCamera className="w-10 h-10 mx-auto text-amber-600" />
              <p className="text-xs font-semibold">{cameraError}</p>
              <button
                type="button"
                onClick={triggerNativeCamera}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Use Device Camera / File Picker
              </button>
            </div>
          ) : (
            <div>
              {/* Snapshot Preview Mode */}
              {capturedPreview && (
                <div className="space-y-3">
                  <div className="w-64 h-64 mx-auto rounded-3xl overflow-hidden ring-4 ring-emerald-500 shadow-md">
                    <img
                      src={capturedPreview}
                      alt="Captured portrait"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs font-semibold text-gray-700">
                    Photo captured! Do you want to use this portrait photo?
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                    >
                      <span>🔄</span>
                      <span>Retake Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCapturedPhoto}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md"
                    >
                      ✓ Use This Photo
                    </button>
                  </div>
                </div>
              )}

              {/* Live Webcam Stream (Kept mounted to preserve stream and avoid black frames) */}
              <div className={capturedPreview ? 'hidden' : 'space-y-3'}>
                <div className="relative w-64 h-64 mx-auto rounded-3xl overflow-hidden bg-black ring-4 ring-gray-200 shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  <div className="absolute inset-0 border-2 border-white/40 rounded-3xl pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border border-dashed border-white/60 rounded-full" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Center your face in the circular guide and click <strong>Capture Photo</strong>.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={triggerNativeCamera}
                    className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                  >
                    Use Device Camera App
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2"
                  >
                    <HiCamera className="w-4 h-4" />
                    <span>Capture Photo</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* VIEW / RECHECK FULL PHOTO MODAL */}
      <Modal
        isOpen={Boolean(viewPhotoModal)}
        onClose={() => setViewPhotoModal(null)}
        title={viewPhotoModal?.title || 'Profile Photo Preview'}
        size="md"
      >
        <div className="flex flex-col items-center justify-center space-y-4 p-2">
          <div className="max-w-xs sm:max-w-sm max-h-[60vh] rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-lg bg-gray-900 flex items-center justify-center">
            {viewPhotoModal?.url && (
              <img
                src={viewPhotoModal.url}
                alt={viewPhotoModal.title || 'Profile Preview'}
                className="w-full h-auto max-h-[55vh] object-contain"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewPhotoModal(null)}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* CENTER BRANDING MODAL: EGATES OR JISHNU INFOTECH (SEPARATE CENTER DISPLAY) */}
      <BrandingModal
        isOpen={Boolean(brandingModalType)}
        onClose={() => setBrandingModalType(null)}
        type={brandingModalType || 'egates'}
      />
    </div>
  );
}
