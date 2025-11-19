/**
 * Camera Capture Component
 * 
 * Professional camera interface для KYC documents
 * 
 * Features:
 * - Live camera preview
 * - Document guides overlay
 * - Camera switching (front/back)
 * - Photo capture with compression
 * - Quality validation
 * - Mobile + Desktop support
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  X,
  RefreshCw,
  Check,
  AlertTriangle,
  Loader2,
  SwitchCamera
} from 'lucide-react';
import { useCamera } from './hooks/useCamera';
import { prepareImageForUpload } from '@/lib/utils/imageProcessor';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  documentType?: string;
}

export function CameraCapture({ onCapture, onCancel, documentType }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const {
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
  } = useCamera({
    facingMode: 'environment', // Back camera by default
    width: 1920,
    height: 1080
  });

  /**
   * Initialize camera on mount
   */
  useEffect(() => {
    const init = async () => {
      if (isCameraSupported) {
        const granted = await requestPermissions();
        if (granted) {
          await startCamera();
        }
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [isCameraSupported]);

  /**
   * Attach stream to video element
   */
  useEffect(() => {
    if (stream && videoRef.current && !capturedImage) {
      console.log('🎬 Attaching stream to video element...');
      const video = videoRef.current;
      
      video.srcObject = stream;
      
      // Ensure video plays (important for iOS/mobile)
      video.onloadedmetadata = () => {
        console.log('📹 Video metadata loaded, attempting to play...');
        video.play()
          .then(() => {
            console.log('✅ Video playing successfully');
            console.log('Video dimensions:', {
              width: video.videoWidth,
              height: video.videoHeight
            });
          })
          .catch(err => {
            console.error('❌ Failed to play video:', err);
            setError('Failed to display camera feed. Please try again.');
          });
      };
    }
  }, [stream, capturedImage]);

  /**
   * Capture photo from video stream
   */
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setIsProcessing(true);

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.85
        );
      });

      // Create temporary file
      const tempFile = new File(
        [blob],
        `${documentType || 'document'}_${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      );

      // Process image (compress, validate, remove EXIF)
      console.log('📸 Processing captured image...');
      const { file: processedFile, quality } = await prepareImageForUpload(tempFile);

      // Show warnings if any
      if (quality.warnings.length > 0) {
        toast.warning(quality.warnings[0]);
      }

      // Show preview
      const previewUrl = URL.createObjectURL(processedFile);
      setCapturedImage(previewUrl);

      console.log('✅ Image captured and processed:', {
        original: `${(tempFile.size / 1024).toFixed(1)}KB`,
        processed: `${(processedFile.size / 1024).toFixed(1)}KB`,
        quality: quality.score
      });

      // Store file for confirmation
      (window as any).__capturedFile = processedFile;

    } catch (error: any) {
      console.error('❌ Capture failed:', error);
      toast.error(error.message || 'Failed to capture photo');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Confirm captured photo
   */
  const handleConfirm = () => {
    const file = (window as any).__capturedFile;
    if (file) {
      onCapture(file);
      delete (window as any).__capturedFile;
      stopCamera();
    }
  };

  /**
   * Retake photo
   */
  const handleRetake = () => {
    setCapturedImage(null);
    delete (window as any).__capturedFile;
    
    // Restart video stream
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  };

  /**
   * Switch between cameras
   */
  const handleSwitchCamera = async () => {
    if (devices.length <= 1) return;

    const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];

    await switchCamera(nextDevice.deviceId);
  };

  /**
   * Error state
   */
  if (!isCameraSupported) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Camera is not supported in this browser. Please use a modern browser or upload a file instead.
            </AlertDescription>
          </Alert>
          <Button onClick={onCancel} className="w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (error && !hasPermission) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={requestPermissions} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex flex-col"
      style={{
        height: '100dvh', // Dynamic viewport height (supports mobile address bar)
        maxHeight: '-webkit-fill-available', // Safari fallback
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div className="bg-black/80 backdrop-blur p-3 sm:p-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-white font-semibold text-base sm:text-lg">
            {capturedImage ? 'Review Photo' : 'Take Photo'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-400">
            {documentType ? `Capture ${documentType}` : 'Capture document'}
          </p>
        </div>
        <Button
          onClick={onCancel}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 h-9 w-9"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Camera Preview / Captured Image */}
      <div 
        className="flex-1 relative flex items-center justify-center bg-black overflow-hidden"
        style={{
          minHeight: 0, // Important for flex children
        }}
      >
        {isLoading ? (
          <div className="text-center text-white space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto" />
            <p>Starting camera...</p>
          </div>
        ) : capturedImage ? (
          // Show captured image preview
          <img
            src={capturedImage}
            alt="Captured"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <>
            {/* Video stream - Fixed for mobile iOS/Android */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              {...({ 
                'webkit-playsinline': 'true',
                'x-webkit-airplay': 'allow' 
              } as any)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(1)' // Prevent mirror on some devices
              }}
              className="absolute inset-0"
            />

            {/* Document guide overlay - Mobile optimized */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-4">
              <div className="relative w-full max-w-md aspect-[3/2]">
                {/* Corner guides */}
                <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-[3px] border-l-[3px] sm:border-t-4 sm:border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-[3px] border-r-[3px] sm:border-t-4 sm:border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-[3px] border-l-[3px] sm:border-b-4 sm:border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-[3px] border-r-[3px] sm:border-b-4 sm:border-r-4 border-white rounded-br-lg" />
                
                {/* Instruction */}
                <div className="absolute -bottom-10 sm:-bottom-12 left-0 right-0 text-center px-2">
                  <p className="text-white text-xs sm:text-sm bg-black/60 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 inline-block font-medium">
                    Align document within frame
                  </p>
                </div>
              </div>
            </div>

            {/* Debug info (remove in production) */}
            {!stream && !isLoading && (
              <div className="absolute top-20 left-4 right-4 bg-red-500/90 text-white p-3 rounded-lg text-sm z-20">
                <p className="font-semibold">Camera not streaming</p>
                <p className="text-xs mt-1">
                  {error || 'Please allow camera access and try again'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls - Mobile optimized */}
      <div 
        className="bg-black/80 backdrop-blur p-4 sm:p-6 space-y-3 sm:space-y-4 flex-shrink-0"
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', // Safe area for notch phones
        }}
      >
        {capturedImage ? (
          // Confirm/Retake controls
          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={handleRetake}
              variant="outline"
              className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
              disabled={isProcessing}
            >
              <RefreshCw className="h-4 w-4 mr-1.5 sm:mr-2" />
              Retake
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 h-11 sm:h-12 text-sm sm:text-base bg-green-600 hover:bg-green-700"
              disabled={isProcessing}
            >
              <Check className="h-4 w-4 mr-1.5 sm:mr-2" />
              Use Photo
            </Button>
          </div>
        ) : (
          // Capture controls
          <div className="flex items-center justify-center gap-4 sm:gap-6 py-2">
            {/* Switch camera (if multiple cameras) */}
            {devices.length > 1 && (
              <Button
                onClick={handleSwitchCamera}
                variant="ghost"
                size="icon"
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full text-white hover:bg-white/10"
                disabled={isLoading || isProcessing}
              >
                <SwitchCamera className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            )}

            {/* Capture button */}
            <Button
              onClick={handleCapture}
              size="icon"
              disabled={isLoading || isProcessing || !stream}
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white hover:bg-gray-200 disabled:bg-gray-600 shadow-lg"
            >
              {isProcessing ? (
                <Loader2 className="h-7 w-7 sm:h-9 sm:w-9 animate-spin text-black" />
              ) : (
                <Camera className="h-7 w-7 sm:h-9 sm:w-9 text-black" />
              )}
            </Button>

            {/* Spacer for symmetry */}
            {devices.length > 1 && <div className="w-12 sm:w-14" />}
          </div>
        )}

        {/* Error message */}
        {error && hasPermission && (
          <Alert variant="destructive" className="py-2 sm:py-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

