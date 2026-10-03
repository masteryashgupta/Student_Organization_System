import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { fetchEvents, fetchCheckInFeed, checkInTicket } from './eventsApi';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

// Web Audio API feedback synthesizer
function playFeedbackTone(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'success') {
      // High pleasant two-tone chime (587Hz -> 880Hz)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.1);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);
    } else if (type === 'warning') {
      // Amber warning tone (440Hz -> 350Hz)
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(349.23, now + 0.25);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'error') {
      // Low buzz error tone (220Hz saw wave)
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.15);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {
    // Ignore audio context errors if browser blocks autoplay
  }
}

// Haptic feedback helper
function triggerHaptic(type) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    if (type === 'success') {
      navigator.vibrate([70, 40, 70]);
    } else if (type === 'warning') {
      navigator.vibrate([150, 70, 150]);
    } else if (type === 'error') {
      navigator.vibrate([300]);
    }
  }
}

export default function EventCheckInPage() {
  const { id: urlEventId } = useParams();
  const navigate = useNavigate();
  const { user, isOfficer, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [selectedEventId, setSelectedEventId] = useState(urlEventId || '');
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualToken, setManualToken] = useState('');
  const [scanResult, setScanResult] = useState(null); // { type: 'success'|'warning'|'error', title, message, ticket, timestamp }
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoResumeTimer, setAutoResumeTimer] = useState(null);

  const qrReaderRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Sync route param with state
  useEffect(() => {
    if (urlEventId) {
      setSelectedEventId(urlEventId);
    }
  }, [urlEventId]);

  // Fetch events list for selector
  const { data: events = [], isLoading: isEventsLoading } = useQuery({
    queryKey: ['events', 'checkin-list'],
    queryFn: () => fetchEvents(),
    enabled: isOfficer,
  });

  // Auto-select first event if none selected
  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id.toString());
    }
  }, [events, selectedEventId]);

  // Live Attendance Feed Query (updates live every 2.5s)
  const {
    data: checkinFeed,
    isLoading: isFeedLoading,
    isFetching: isFeedFetching,
    refetch: refetchFeed,
  } = useQuery({
    queryKey: ['checkin-feed', selectedEventId],
    queryFn: () => fetchCheckInFeed(selectedEventId),
    enabled: isOfficer && Boolean(selectedEventId),
    refetchInterval: 2500, // Live real-time attendance counter
    refetchIntervalInBackground: false,
  });

  // Stop camera helper
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping QR code scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScannerActive(false);
  }, []);

  // Check-In Mutation
  const checkInMutation = useMutation({
    mutationFn: (token) => checkInTicket(token),
    onSuccess: (data) => {
      if (soundEnabled) playFeedbackTone('success');
      triggerHaptic('success');

      setScanResult({
        type: 'success',
        title: 'Check-In Confirmed! ✅',
        message: data.message || `Welcome, ${data.ticket?.holder_name || 'Attendee'}!`,
        ticket: data.ticket,
        timestamp: new Date().toLocaleTimeString(),
      });

      // Refresh live feed and stats immediately
      queryClient.invalidateQueries({ queryKey: ['checkin-feed', selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ['event-availability', selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ['event-stats', selectedEventId] });
    },
    onError: (err) => {
      const errorData = err.response?.data;
      const detail = errorData?.detail || err.message || 'Ticket validation failed';

      if (detail.toLowerCase().includes('already been checked in') || detail.toLowerCase().includes('double check-in')) {
        // Double check-in warning
        if (soundEnabled) playFeedbackTone('warning');
        triggerHaptic('warning');

        setScanResult({
          type: 'warning',
          title: 'Already Checked In! ⚠️',
          message: detail,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        // Invalid or cancelled ticket error
        if (soundEnabled) playFeedbackTone('error');
        triggerHaptic('error');

        setScanResult({
          type: 'error',
          title: 'Invalid Ticket! ❌',
          message: detail,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Handle scanned raw string
  const handleDecodedToken = useCallback(
    (decodedText) => {
      if (isProcessing) return;

      // Extract UUID token from raw text or URL
      let cleanToken = decodedText.trim();
      // If QR encodes a URL like http://.../tickets/<uuid>/... or ?token=<uuid>
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
      const match = cleanToken.match(uuidRegex);
      if (match) {
        cleanToken = match[0];
      }

      setIsProcessing(true);
      // Pause scanner UI visually
      checkInMutation.mutate(cleanToken);
    },
    [isProcessing, checkInMutation]
  );

  // Start Scanner
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanResult(null);

    // Check secure context for camera access
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraError({
        name: 'InsecureContext',
        message: 'Camera access on mobile requires HTTPS or localhost. Please access via HTTPS or use manual token entry.',
      });
      return;
    }

    try {
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const qrRegionId = 'qr-camera-stream';
      const qrCode = new Html5Qrcode(qrRegionId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = qrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await qrCode.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          handleDecodedToken(decodedText);
        },
        () => {
          // ignore frame decode noise
        }
      );

      setIsScannerActive(true);
    } catch (err) {
      console.error('Html5Qrcode start error:', err);
      let friendlyMsg = 'Failed to access camera.';
      if (err?.name === 'NotAllowedError' || err?.toString().includes('NotAllowedError')) {
        friendlyMsg = 'Camera permission was denied. Please grant camera access in your browser site settings.';
      } else if (err?.name === 'NotFoundError' || err?.toString().includes('NotFoundError')) {
        friendlyMsg = 'No camera found on this device.';
      } else if (err?.name === 'NotReadableError' || err?.toString().includes('NotReadableError')) {
        friendlyMsg = 'Camera is currently in use by another application or tab.';
      } else if (err?.message) {
        friendlyMsg = err.message;
      }

      setCameraError({
        name: err?.name || 'CameraError',
        message: friendlyMsg,
      });
      setIsScannerActive(false);
    }
  }, [facingMode, handleDecodedToken, stopCamera]);

  // Toggle Camera Facing Mode (Front / Back)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isScannerActive) {
      stopCamera().then(() => {
        setTimeout(() => startCamera(), 150);
      });
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.warn);
      }
      if (autoResumeTimer) {
        clearTimeout(autoResumeTimer);
      }
    };
  }, [autoResumeTimer]);

  // Manual Check-In Submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim() || isProcessing) return;

    let token = manualToken.trim();
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
    const match = token.match(uuidRegex);
    if (match) token = match[0];

    setIsProcessing(true);
    checkInMutation.mutate(token);
    setManualToken('');
  };

  // Dismiss scan result and resume
  const handleNextScan = () => {
    setScanResult(null);
    setIsProcessing(false);
  };

  // Guard: Not an Officer
  if (!isAuthenticated || !isOfficer) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-ink">Officer Check-In Gate Required</h1>
          <p className="text-ink-muted text-sm leading-relaxed">
            The live QR ticket scanner and check-in console is strictly reserved for club officers (Club Leaders & Admins).
          </p>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          {!isAuthenticated ? (
            <Link to="/login">
              <Button variant="primary">Log In as Officer</Button>
            </Link>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-rose-600 font-medium">
                Current account role: <Badge variant="warning">{user?.role || 'Guest'}</Badge>
              </p>
              <Link to="/events">
                <Button variant="outline">Back to Events</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedEvent = events.find((e) => e.id.toString() === selectedEventId.toString());

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header & Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-1.5">
            <span className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/50 border border-brand-200/60 dark:border-brand-800/50">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <span>Officer Gate Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink dark:text-slate-100 tracking-tight">
            Live Ticket Check-In Scanner
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-slate-400 mt-1">
            Scan attendee QR codes via device camera or enter tokens manually for instant verification.
          </p>
        </div>

        {/* Event Picker Dropdown & Quick Actions */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <label className="text-xs text-ink-muted dark:text-slate-400 font-bold whitespace-nowrap">
              Active Event:
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                navigate(`/events/${e.target.value}/checkin`);
              }}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-border dark:border-slate-800 text-ink dark:text-slate-100 text-xs rounded-2xl px-3 py-2.5 focus:outline-none focus:border-brand-500 dark:focus:border-brand-400 font-medium max-w-xs shadow-sm"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.status})
                </option>
              ))}
            </select>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-2xl border transition-colors ${
              soundEnabled
                ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400'
                : 'bg-white/80 dark:bg-slate-900/80 border-border dark:border-slate-800 text-slate-400'
            }`}
            title={soundEnabled ? 'Audio feedback enabled' : 'Audio feedback muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Live Attendance Counter Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Checked In */}
        <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                Checked In
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {checkinFeed?.checked_in_count ?? 0}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">attendees</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Total Tickets Sold */}
        <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                Total Sold
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-brand-600 dark:text-brand-400">
                  {checkinFeed?.total_sold ?? 0}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">tickets</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-brand-50/80 dark:bg-brand-950/50 border border-brand-200/80 dark:border-brand-800/50 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Attendance Turnout % */}
        <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                Turnout Rate
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-[#017E84] dark:text-teal-400">
                  {checkinFeed?.attendance_pct ?? 0}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">of ticket holders</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50/80 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/50 flex items-center justify-center text-[#017E84] dark:text-teal-400">
              <Zap className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Live Polling Indicator */}
        <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                Live Status
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs text-ink dark:text-slate-100 font-bold">Syncing live</span>
              </div>
            </div>
            <button
              onClick={() => refetchFeed()}
              className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800 border border-border dark:border-slate-700 text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-slate-100 transition-colors"
              title="Force refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isFeedFetching ? 'animate-spin text-brand-600 dark:text-brand-400' : ''}`} />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Main Scanner Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Camera Scanner & Manual Token Input (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass overflow-hidden">
            {/* Scanner Controls Bar */}
            <div className="px-6 py-4 border-b border-border dark:border-slate-800/80 flex items-center justify-between bg-white/40 dark:bg-slate-800/40 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
                  <Camera className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-ink dark:text-slate-100 uppercase tracking-wider">
                  Device Camera Scanner
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isScannerActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFacingMode}
                    className="text-xs h-8 px-2.5 rounded-full"
                    title="Switch Front/Back Camera"
                  >
                    <Smartphone className="w-3.5 h-3.5 mr-1" />
                    {facingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}
                  </Button>
                )}
                {isScannerActive ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={stopCamera}
                    className="text-xs h-8 px-3 rounded-full"
                  >
                    <CameraOff className="w-3.5 h-3.5 mr-1" />
                    Stop Camera
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={startCamera}
                    className="text-xs h-8 px-3 rounded-full shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1" />
                    Start Camera
                  </Button>
                )}
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* QR Video Viewfinder Container */}
              <div className="relative w-full aspect-square max-w-md mx-auto bg-slate-100/70 dark:bg-slate-900/70 backdrop-blur-md rounded-3xl overflow-hidden border-2 border-dashed border-border dark:border-slate-700 flex flex-col items-center justify-center shadow-inner">
                {/* HTML5 QR Container */}
                <div
                  id="qr-camera-stream"
                  ref={qrReaderRef}
                  className={`w-full h-full overflow-hidden flex items-center justify-center ${
                    isScannerActive ? 'block' : 'hidden'
                  }`}
                />

                {/* Inactive Camera State */}
                {!isScannerActive && !cameraError && (
                  <div className="text-center p-8 space-y-4 max-w-xs">
                    <div className="w-16 h-16 rounded-3xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200/80 dark:border-brand-800/50 flex items-center justify-center mx-auto text-brand-600 dark:text-brand-400 shadow-sm">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-ink dark:text-slate-100 text-base">Camera Idle</h4>
                      <p className="text-xs text-ink-muted dark:text-slate-400 mt-1 leading-relaxed">
                        Tap "Start Camera" above to activate device camera and scan tickets at the door.
                      </p>
                    </div>
                    <Button variant="primary" onClick={startCamera} className="w-full rounded-full shadow-md">
                      <Camera className="w-4 h-4 mr-2" />
                      Activate Camera Scanner
                    </Button>
                  </div>
                )}

                {/* Camera Permission / Device Error Screen */}
                {cameraError && (
                  <div className="p-6 text-center space-y-3 bg-rose-50/90 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-3xl m-4 max-w-sm">
                    <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
                    <h4 className="font-bold text-rose-800 dark:text-rose-300 text-sm">Camera Access Blocked</h4>
                    <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
                      {cameraError.message}
                    </p>
                    <div className="pt-2 flex flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={startCamera} className="rounded-full">
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Retry Camera
                      </Button>
                      <p className="text-[11px] text-ink-muted dark:text-slate-400">
                        Or enter the ticket token manually below.
                      </p>
                    </div>
                  </div>
                )}

                {/* Scanner Target Guide Overlay */}
                {isScannerActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-brand-500/70 dark:border-brand-400/70 rounded-2xl relative shadow-2xl">
                      {/* Corner Target Accents */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />
                      {/* Animated Scanning Laser Line */}
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10b981] animate-pulse top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                )}
              </div>

              {/* REAL-TIME SCAN RESULT MODAL / OVERLAY */}
              {scanResult && (
                <div
                  className={`p-6 rounded-3xl border transition-all duration-300 shadow-glass animate-fade-in ${
                    scanResult.type === 'success'
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
                      : scanResult.type === 'warning'
                      ? 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-100'
                      : 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/80 text-rose-950 dark:text-rose-100'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-border dark:border-slate-800 shadow-sm shrink-0">
                      {scanResult.type === 'success' && (
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {scanResult.type === 'warning' && (
                        <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                      )}
                      {scanResult.type === 'error' && (
                        <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-lg text-ink dark:text-slate-100">{scanResult.title}</h3>
                        <span className="text-[11px] text-ink-muted dark:text-slate-400 font-mono">{scanResult.timestamp}</span>
                      </div>
                      <p className="text-sm font-medium text-ink-muted dark:text-slate-300 leading-snug">
                        {scanResult.message}
                      </p>

                      {/* Attendee Details Card if valid ticket */}
                      {scanResult.ticket && (
                        <div className="mt-3 p-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-border dark:border-slate-800 shadow-sm text-xs space-y-2">
                          <div className="flex justify-between">
                            <span className="text-ink-muted dark:text-slate-400">Attendee:</span>
                            <span className="font-bold text-ink dark:text-slate-100">
                              {scanResult.ticket.holder_name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted dark:text-slate-400">Email:</span>
                            <span className="text-ink dark:text-slate-200">
                              {scanResult.ticket.holder_email}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted dark:text-slate-400">Ticket Type:</span>
                            <Badge variant={scanResult.ticket.type === 'member' ? 'success' : 'neutral'} size="sm">
                              {scanResult.ticket.type?.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted dark:text-slate-400">Price Paid:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              ${parseFloat(scanResult.ticket.price_paid || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted dark:text-slate-400">Token ID:</span>
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                              {scanResult.ticket.token}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="pt-3 flex gap-2">
                        <Button
                          variant={scanResult.type === 'success' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={handleNextScan}
                          className="w-full text-xs rounded-full shadow-sm"
                        >
                          Scan Next Attendee
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Ticket Token Fallback Form */}
              <div className="pt-4 border-t border-border dark:border-slate-800">
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink dark:text-slate-300">
                      Manual Token Entry (Fallback)
                    </label>
                    <span className="text-[11px] text-ink-muted dark:text-slate-400">Type or paste UUID</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. b5f4c281-9c8e-4a6f-a89b-..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="flex-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-border dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-mono text-ink dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 dark:focus:border-brand-400"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={!manualToken.trim() || isProcessing}
                      className="rounded-full"
                    >
                      {isProcessing ? 'Verifying...' : 'Check In'}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Attendance Feed & Checked-in List (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass overflow-hidden">
            <div className="px-6 py-4 border-b border-border dark:border-slate-800/80 flex items-center justify-between bg-white/40 dark:bg-slate-800/40 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Users className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-ink dark:text-slate-100">Recent Check-In Stream</h3>
              </div>
              <Badge variant="success" size="sm">
                {checkinFeed?.checked_in_count || 0} Admitted
              </Badge>
            </div>

            <CardContent className="p-0">
              {isFeedLoading ? (
                <div className="p-8 text-center text-xs text-ink-muted dark:text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-600 dark:text-brand-400" />
                  Loading live check-in feed...
                </div>
              ) : checkinFeed?.recent_checkins?.length === 0 ? (
                <div className="p-8 text-center text-ink-muted dark:text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-ink dark:text-slate-200">No check-ins recorded yet</p>
                  <p className="text-[11px] text-ink-muted dark:text-slate-400">
                    Scanned attendees will appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                  {checkinFeed?.recent_checkins?.map((item, idx) => (
                    <div
                      key={item.token || idx}
                      className="p-4 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 text-xs shadow-sm">
                          {item.holder_name ? item.holder_name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <span className="font-bold text-ink dark:text-slate-100 block">
                            {item.holder_name || 'Anonymous Attendee'}
                          </span>
                          <span className="text-[11px] text-ink-muted dark:text-slate-400">
                            {item.holder_email || 'No email provided'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <Badge
                          variant={item.type === 'member' ? 'success' : 'neutral'}
                          size="sm"
                          className="mb-1"
                        >
                          {item.type}
                        </Badge>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                          {item.checked_in_at
                            ? new Date(item.checked_in_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : 'Just now'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Gate Guide / Mobile Local Network Info */}
          <div className="p-5 rounded-3xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-border dark:border-slate-800 text-xs space-y-2 text-ink-muted dark:text-slate-400 shadow-glass">
            <h4 className="font-bold text-ink dark:text-slate-100 flex items-center gap-2">
              <span className="p-1 rounded-md bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
                <Smartphone className="w-3.5 h-3.5" />
              </span>
              Officer Field Check-In Notes
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
              <li>
                <strong>Camera Scanning on Phone</strong>: Point rear camera at the attendee's digital ticket or paper QR pass.
              </li>
              <li>
                <strong>Double Check-In Defense</strong>: Database row locking prevents duplicate entry across multiple gates simultaneously.
              </li>
              <li>
                <strong>Instant Counter</strong>: The attendance counter synchronizes live with the backend ledger.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
