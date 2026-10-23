import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useSOS = () => {
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState('Medical Emergency');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelCountdown, setCancelCountdown] = useState(5);
  const [isSending, setIsSending] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);
  const [lastAlert, setLastAlert] = useState(null);

  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation lookup notice:', error.message);
          resolve({ latitude: null, longitude: null });
        },
        {
          enableHighAccuracy: true,
          timeout: 2500,
          maximumAge: 60000,
        }
      );
    });
  };

  const dispatchSOS = useCallback(async (emergencyType, customNotes = '') => {
    setIsSending(true);
    try {
      const coords = await getCoordinates();
      const payload = {
        emergency_type: emergencyType || 'Medical Emergency',
        notes: customNotes || '',
        latitude: coords.latitude,
        longitude: coords.longitude,
      };

      const response = await api.post('/sos/trigger', payload);
      const alertData = response.data?.data || response.data;
      setLastAlert(alertData);
      setIsTriggered(true);
      setShowCancel(false);
      setShowTypeSelector(false);

      toast.error(`EMERGENCY SOS (${emergencyType}) TRANSMITTED!`, {
        duration: 7000,
        style: {
          background: '#dc2626',
          color: '#ffffff',
          fontWeight: 'bold',
        },
      });
      return alertData;
    } catch (error) {
      console.error('Failed to trigger SOS:', error);
      toast.error(
        error.response?.data?.message ||
          'Failed to send SOS alert. Please call emergency services directly!'
      );
      throw error;
    } finally {
      setIsSending(false);
    }
  }, []);

  const triggerSOS = useCallback((emergencyType, customNotes = '') => {
    return dispatchSOS(emergencyType, customNotes);
  }, [dispatchSOS]);

  const cancelSOS = useCallback(() => {
    setShowCancel(false);
    setShowTypeSelector(false);
    toast('Emergency SOS dialog closed', { icon: '🛑' });
  }, []);

  const resetSOS = useCallback(() => {
    setShowCancel(false);
    setShowTypeSelector(false);
    setIsTriggered(false);
    setIsSending(false);
  }, []);

  return {
    showTypeSelector,
    setShowTypeSelector,
    selectedType,
    setSelectedType,
    showCancel,
    cancelCountdown,
    isSending,
    isTriggered,
    lastAlert,
    dispatchSOS,
    triggerSOS,
    cancelSOS,
    resetSOS,
    getCoordinates,
  };
};

export default useSOS;
