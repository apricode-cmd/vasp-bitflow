/**
 * useCamera Hook
 * 
 * Manage camera access, permissions, and stream
 * 
 * Features:
 * - Request camera permissions
 * - Get available cameras
 * - Switch between cameras (front/back)
 * - Handle errors gracefully
 * - Cleanup on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface CameraDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface UseCameraOptions {
  facingMode?: 'user' | 'environment'; // user = front, environment = back
  aspectRatio?: number;
  width?: number;
  height?: number;
}

interface UseCameraReturn {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  devices: CameraDevice[];
  currentDeviceId: string | null;
  hasPermission: boolean;
  isCameraSupported: boolean;
  
  // Methods
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  const streamRef = useRef<MediaStream | null>(null);
  
  // Check if camera is supported
  const isCameraSupported = typeof navigator !== 'undefined' && 
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia !== 'undefined';

  /**
   * Request camera permissions
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isCameraSupported) {
      setError('Camera is not supported in this browser');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Request permissions (minimal constraints)
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true
      });

      // Stop temporary stream
      tempStream.getTracks().forEach(track => track.stop());

      setHasPermission(true);
      return true;

    } catch (err: any) {
      console.error('Permission denied:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is already in use by another application.');
      } else {
        setError('Failed to access camera. Please try again.');
      }

      setHasPermission(false);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [isCameraSupported]);

  /**
   * Get available camera devices
   */
  const getDevices = useCallback(async () => {
    if (!isCameraSupported) return;

    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const cameras = deviceList
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
          kind: device.kind
        }));

      setDevices(cameras);
      
      // Set default device if not set
      if (!currentDeviceId && cameras.length > 0) {
        // Prefer back camera on mobile
        const backCamera = cameras.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear')
        );
        setCurrentDeviceId(backCamera?.deviceId || cameras[0].deviceId);
      }

    } catch (err) {
      console.error('Failed to enumerate devices:', err);
    }
  }, [isCameraSupported, currentDeviceId]);

  /**
   * Start camera stream
   */
  const startCamera = useCallback(async () => {
    if (!isCameraSupported) {
      setError('Camera is not supported in this browser');
      return;
    }

    if (streamRef.current) {
      console.log('Camera already started');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Detect mobile
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // Build constraints - ULTRA MINIMAL for mobile to avoid issues
      let constraints: MediaStreamConstraints;

      if (isMobile) {
        // Mobile: absolute minimal constraints (just get ANY camera)
        console.log('📱 Mobile detected - using minimal constraints');
        constraints = {
          audio: false,
          video: true  // Simplest possible - let browser decide everything
        };
      } else {
        // Desktop: use full constraints
        constraints = {
          audio: false,
          video: {
            facingMode: options.facingMode || 'environment',
            width: options.width ? { ideal: options.width } : { ideal: 1920 },
            height: options.height ? { ideal: options.height } : { ideal: 1080 },
            aspectRatio: options.aspectRatio || { ideal: 16/9 }
          }
        };
        
        // Use specific device if selected
        if (currentDeviceId) {
          constraints.video = {
            ...constraints.video,
            deviceId: { exact: currentDeviceId }
          };
        }
      }

      console.log('📷 Starting camera with constraints:', constraints);

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setHasPermission(true);

      console.log('✅ Camera started successfully');
      console.log('📊 Video track settings:', mediaStream.getVideoTracks()[0]?.getSettings());

      // Get devices after permission granted
      await getDevices();

    } catch (err: any) {
      console.error('❌ Failed to start camera:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        constraint: err.constraint
      });
      
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use.');
      } else if (err.name === 'OverconstrainedError') {
        console.log('⚠️ Overconstrained, trying fallback...');
        // Retry with minimal constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: options.facingMode || 'environment'
            }
          });
          console.log('✅ Fallback camera started');
          streamRef.current = fallbackStream;
          setStream(fallbackStream);
          setError(null);
        } catch (fallbackErr: any) {
          console.error('❌ Fallback also failed:', fallbackErr);
          setError('Failed to start camera with any settings.');
        }
      } else {
        setError(`Failed to access camera: ${err.message || 'Unknown error'}`);
      }

    } finally {
      setIsLoading(false);
    }
  }, [isCameraSupported, currentDeviceId, options, getDevices]);

  /**
   * Stop camera stream
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      console.log('🛑 Stopping camera');
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  /**
   * Switch to different camera
   */
  const switchCamera = useCallback(async (deviceId: string) => {
    console.log('🔄 Switching camera to:', deviceId);
    
    // Stop current stream
    stopCamera();
    
    // Set new device
    setCurrentDeviceId(deviceId);
    
    // Start with new device
    // Note: startCamera will use the new currentDeviceId
    // We need to wait for state update, so we'll start in useEffect
  }, [stopCamera]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        console.log('🧹 Cleaning up camera stream');
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Auto-start camera when deviceId changes (for switching)
   */
  useEffect(() => {
    if (currentDeviceId && !stream) {
      // Small delay to ensure state is updated
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentDeviceId]); // Intentionally not including startCamera/stream to avoid loops

  return {
    stream,
    error,
    isLoading,
    devices,
    currentDeviceId,
    hasPermission,
    isCameraSupported,
    
    startCamera,
    stopCamera,
    switchCamera,
    requestPermissions
  };
}

