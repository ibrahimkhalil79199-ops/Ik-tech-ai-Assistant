import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  useColorScheme,
  ActivityIndicator,
  AppState,
  Keyboard,
  Linking,
  Share,
  Switch,
} from 'react-native';
import AsyncStorage from '@/lib/storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import {
  clearHistory,
  createConversation,
  deleteConversation,
  generateMessageId,
  loadHistory,
  saveConversation,
  streamChat,
  ChatConversation,
  ChatMessage,
} from '@/lib/chat';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  User,
} from 'firebase/auth';
import firebaseApp, { auth, db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  EmptyState,
  MarkupEditor,
  MessageBubble,
  TypingIndicator,
} from '@/lib/ik/components';
import {
  ACCENT_COLORS,
  ATTACHMENT_TYPES,
  Alert,
  AppDialogHost,
  CODE_FILE_EXTENSIONS,
  COPY_INTENT,
  COPY_STYLE_HINT,
  COUNTRIES,
  ClipboardModule,
  DownloadSource,
  FileSystemModule,
  HAUSA_STYLE_HINT,
  IMAGE_SAMPLES_CREATE,
  IMAGE_SAMPLES_EDIT,
  ImageManipulatorModule,
  IntentLauncherModule,
  LANGUAGES,
  LibraryFile,
  LibraryItem,
  MIME_EXTENSION,
  NOTIFICATION_CATEGORIES,
  NoticeBannerHost,
  NotificationsModule,
  PUSH_TOKEN_KEY,
  STORAGE_LIMIT_MB,
  SelectedImage,
  SharingModule,
  SvgModule,
  TEXT_FILE_EXTENSIONS,
  WEB_PUSH_VAPID_KEY,
  buildUiText,
  callWorker,
  compressImageDataUri,
  countryFlag,
  detectImageIntent,
  fileExtension,
  formatBytes,
  getNigeriaDateTimeAnswer,
  getServiceWorkerRegistration,
  getWebBasePath,
  looksHausa,
  persistPickedFile,
  readImageAsDataUrl,
  removePersistedFile,
  requestGeneratedImage,
  saveManyToDevice,
  saveToDevice,
  setNoticeOpenHandler,
  showNoticeBanner,
  showSystemNotification,
  stripMarkdownForSpeech,
  uriToDataUrl,
  voiceGroupLabel,
} from '@/lib/ik/core';
import {
  baseStyleDefinitions,
} from '@/lib/ik/styles';

function HomeScreenMain() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [authMode, setAuthMode] =
    useState<'login' | 'signup'>('login');

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [authError, setAuthError] =
    useState<string | null>(null);

const [profileVisible, setProfileVisible] = useState(false);
const [profileEditing, setProfileEditing] = useState(false);
const [settingsVisible, setSettingsVisible] = useState(false);
const [securityVisible, setSecurityVisible] = useState(false);
const systemColorScheme = useColorScheme();
const [appearanceMode, setAppearanceMode] = useState<'system' | 'light' | 'dark'>('system');
const [accentColor, setAccentColor] = useState('#3182ce');
const [notificationsEnabled, setNotificationsEnabled] = useState(true);
const [appLanguage, setAppLanguage] = useState<string>('English');
const [appCountry, setAppCountry] = useState('NG');
const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({ responses: true, library: true, projects: true, memory: true, tips: true, usage: true });
const [settingsLoaded, setSettingsLoaded] = useState(false);
const [voiceId, setVoiceId] = useState('');
const [voiceLanguage, setVoiceLanguage] = useState('');
const [voiceVisible, setVoiceVisible] = useState(false);
const [voicePickerVisible, setVoicePickerVisible] = useState(false);
const [voiceOpenSection, setVoiceOpenSection] = useState<'model' | 'voice' | 'language' | 'speed' | null>(null);
const [speechRate, setSpeechRate] = useState(0.8);
const [availableVoices, setAvailableVoices] = useState<{ identifier: string; name: string; language: string; quality?: string }[]>([]);
const isLightTheme = appearanceMode === 'light' || (appearanceMode === 'system' && systemColorScheme === 'light');
const pageBg = isLightTheme ? '#f4f7fb' : '#050b14';
const panelBg = isLightTheme ? '#ffffff' : '#0a1727';
const primaryText = isLightTheme ? '#142033' : '#f0f7ff';
const secondaryText = isLightTheme ? '#526176' : '#91a8c3';
const uiText = useMemo(() => buildUiText(appLanguage), [appLanguage]);

  // Rebuild shared styles when the user's global appearance/accent preference changes.
  const styles = useMemo(() => {
    const lightBackgrounds: Record<string, string> = {
      '#050b14': '#f4f7fb', '#061326': '#f4f7fb', '#07111f': '#eaf0f8',
      '#0a1727': '#ffffff', '#0b1422': '#ffffff', '#0d1b2d': '#dce7f4',
      '#101c2d': '#f0f4fa', '#102d4c': '#e3edf8', '#16345a': '#e5efff',
      '#174a7d': '#e7f0fb', '#205b92': '#dceafe', '#21151a': '#f8e9ec',
    };
    const lightBorders: Record<string, string> = {
      '#142337': '#d3deeb', '#19304a': '#d5deea', '#243650': '#d5deea',
      '#263a54': '#d5deea', '#3d7db9': '#a9c6e8', '#51272e': '#e5c5cb',
    };
    const mapStyle = (value: any, key = ''): any => {
      if (Array.isArray(value)) return value.map((item) => mapStyle(item));
      if (!value || typeof value !== 'object') {
        if (typeof value === 'string') {
          const color = value.toLowerCase();
          if (color === '@accent') return accentColor;
          if (color === '@accent15') return `${accentColor}26`;
          if (color === '@accent30') return `${accentColor}4d`;
          if (color === '@accent55') return `${accentColor}8c`;
          if (color === '@onaccent') return '#ffffff';
          const accentBackgrounds = ['#1259a5', '#3182ce', '#164a76', '#174c7a', '#1b5791', '#174a7d', '#205b92', '#0b2a4c'];
          if (key === 'backgroundColor' && accentBackgrounds.includes(color)) return accentColor;
          if (key === 'backgroundColor' && isLightTheme && lightBackgrounds[color]) return lightBackgrounds[color];
          if (key === 'borderColor' && isLightTheme && lightBorders[color]) return lightBorders[color];
          if (key === 'borderColor' && ['#28547e', '#245b91', '#4d8dce', '#3d7db9'].includes(color)) return accentColor;
          if (key === 'color' && isLightTheme) {
            if (['#ffffff', '#f0f7ff', '#f3f8ff', '#eaf3fd', '#e7f1ff', '#f5f9ff', '#f3f7fd', '#edf5ff', '#dcecff', '#d1e7ff', '#ddecff', '#e6f3ff', '#c5ddf7', '#b9d6f5', '#c1d9f2', '#bcd0e8', '#d8e8fa', '#f0f7ff'].includes(color)) return '#142033';
            if (['#aab7cc', '#9bbce0', '#91a8c3', '#c0dcf8', '#7187a1', '#8da5bd', '#a8c0d9'].includes(color)) return '#526176';
            if (['#78b7ff', '#9acaff', '#a9c9ef'].includes(color)) return accentColor;
          }
          if (key === 'backgroundColor' && !isLightTheme && ['#1259a5', '#3182ce'].includes(color)) return accentColor;
        }
        return value;
      }
      const result: Record<string, any> = {};
      Object.keys(value).forEach((childKey) => { result[childKey] = mapStyle(value[childKey], childKey); });
      return result;
    };
    return StyleSheet.create(mapStyle(baseStyleDefinitions));
  }, [isLightTheme, accentColor]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('ik-tech-ai:settings:v1');
        if (raw && active) {
          const saved = JSON.parse(raw);
          if (saved.appearanceMode === 'system' || saved.appearanceMode === 'light' || saved.appearanceMode === 'dark') setAppearanceMode(saved.appearanceMode);
          if (typeof saved.accentColor === 'string') setAccentColor(saved.accentColor);
          if (typeof saved.notificationsEnabled === 'boolean') setNotificationsEnabled(saved.notificationsEnabled);
          if (typeof saved.appLanguage === 'string' && LANGUAGES.some((item) => item.name === saved.appLanguage)) setAppLanguage(saved.appLanguage);
          if (typeof saved.appCountry === 'string' && saved.appCountry.length === 2) setAppCountry(saved.appCountry);
          if (saved.notifPrefs && typeof saved.notifPrefs === 'object') setNotifPrefs((current) => ({ ...current, ...saved.notifPrefs }));
          if (typeof saved.voiceId === 'string') setVoiceId(saved.voiceId);
          if (typeof saved.voiceLanguage === 'string') setVoiceLanguage(saved.voiceLanguage);
          if (typeof saved.speechRate === 'number' && saved.speechRate >= 0.4 && saved.speechRate <= 1.5) setSpeechRate(saved.speechRate);
        }
      } catch (error) {
        console.warn('[IK TECH AI] Could not load settings', error);
      } finally {
        if (active) setSettingsLoaded(true);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    AsyncStorage.setItem('ik-tech-ai:settings:v1', JSON.stringify({
      appearanceMode, accentColor, notificationsEnabled, appLanguage, appCountry, notifPrefs, voiceId, voiceLanguage, speechRate,
    })).catch((error) => console.warn('[IK TECH AI] Could not save settings', error));
  }, [settingsLoaded, appearanceMode, accentColor, notificationsEnabled, appLanguage, appCountry, notifPrefs, voiceId, voiceLanguage, speechRate]);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileFullName, setProfileFullName] = useState('');
  const [profileDob, setProfileDob] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);

    const { width } = useWindowDimensions();

    const isLargeScreen = width >= 700;

    const [history, setHistory] =
      useState<ChatConversation[]>([]);

    const [activeChatId, setActiveChatId] =
      useState<string | null>(null);

    const [messages, setMessages] =
      useState<ChatMessage[]>([]);

    const [draft, setDraft] = useState('');

    const [selectedImage, setSelectedImage] =
      useState<SelectedImage | null>(null);

    // PDF, Word, video or audio file waiting to be sent with the next message.
    const [selectedDocument, setSelectedDocument] =
      useState<{ uri: string; name: string; mimeType: string; text?: string } | null>(null);

    const [isStreaming, setIsStreaming] =
      useState(false);

    const [isListening, setIsListening] =
      useState(false);
  const [isInputVoiceMode, setIsInputVoiceMode] = useState(false);

    const [isSpeaking, setIsSpeaking] =
      useState(false);

    const [voiceModeVisible, setVoiceModeVisible] =
      useState(false);

    const [historyVisible, setHistoryVisible] =
      useState(false);
    const [imageSourceVisible, setImageSourceVisible] = useState(false);
    const [imageViewerUri, setImageViewerUri] = useState<string | null>(null);
    const [imageViewerItem, setImageViewerItem] = useState<LibraryItem | null>(null);
    const [imageViewerMenuOpen, setImageViewerMenuOpen] = useState(false);
    const [markupUri, setMarkupUri] = useState<string | null>(null);
    const [historySearchOpen, setHistorySearchOpen] = useState(false);
    const [historySearchText, setHistorySearchText] = useState('');
    const menuTouchStartX = useRef<number | null>(null);

    const [libraryVisible, setLibraryVisible] = useState(false);
    const [imageVisible, setImageVisible] = useState(false);
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageEditSource, setImageEditSource] = useState<SelectedImage | null>(null);
    const [imageEditBase64, setImageEditBase64] = useState<string | null>(null);
    const [imageBusy, setImageBusy] = useState(false);
    const [imageMode, setImageMode] = useState<'create' | 'edit'>('create');
    const [generatedImageUri, setGeneratedImageUri] = useState<string | null>(null);
    const [projectVisible, setProjectVisible] = useState(false);
    const [memoryVisible, setMemoryVisible] = useState(false);
    const [premiumVisible, setPremiumVisible] = useState(false);
    const [libraryProjects, setLibraryProjects] = useState<{ id: string; name: string; category: string; createdAt: number }[]>([]);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectCategory, setNewProjectCategory] = useState('Homework');
    const [projectSearchText, setProjectSearchText] = useState('');
    const [libraryTab, setLibraryTab] = useState('Suggested');
    const [libraryFavorites, setLibraryFavorites] = useState<{ id: string; text: string; createdAt: number; folderId?: string | null }[]>([]);
    const [libraryFolders, setLibraryFolders] = useState<{ id: string; name: string }[]>([]);
    const [libraryImages, setLibraryImages] = useState<{ id: string; uri: string; name: string; createdAt?: number; favorite?: boolean; folderId?: string | null }[]>([]);
    const [libraryImagesLoaded, setLibraryImagesLoaded] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [librarySaving, setLibrarySaving] = useState(false);
    const [memoryItems, setMemoryItems] = useState<
      { id: string; text: string }[]
    >([]);

    const [memoryInput, setMemoryInput] = useState('');

    const [editingMemoryId, setEditingMemoryId] = useState<
      string | null
    >(null);

    // ───────── Library (files, folders, search), Memory profile, message actions, notifications, storage ─────────
    const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
    const [libraryFilesLoaded, setLibraryFilesLoaded] = useState(false);
    const [libraryQuery, setLibraryQuery] = useState('');
    const [librarySort, setLibrarySort] = useState<'newest' | 'oldest' | 'name'>('newest');
    const [libraryMenuOpen, setLibraryMenuOpen] = useState(false);
    const [libraryAddOpen, setLibraryAddOpen] = useState(false);
    const [libraryOpenFolderId, setLibraryOpenFolderId] = useState<string | null>(null);
    const [libraryActiveItem, setLibraryActiveItem] = useState<LibraryItem | null>(null);
    const [libraryMoveOpen, setLibraryMoveOpen] = useState(false);
    const [libraryViewer, setLibraryViewer] = useState<{ item: LibraryItem; text: string } | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string; category: string; createdAt: number } | null>(null);
    const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
    const [memoryEnabled, setMemoryEnabled] = useState(true);
    const [memoryNickname, setMemoryNickname] = useState('');
    const [memoryOccupation, setMemoryOccupation] = useState('');
    const [memoryAbout, setMemoryAbout] = useState('');
    const [memorySavedProfile, setMemorySavedProfile] = useState({ nickname: '', occupation: '', about: '' });
    const [memorySummary, setMemorySummary] = useState<{ text: string; updatedAt: number } | null>(null);
    const [memorySummaryVisible, setMemorySummaryVisible] = useState(false);
    const [savedMemoriesVisible, setSavedMemoriesVisible] = useState(false);
    const [memorySummaryBusy, setMemorySummaryBusy] = useState(false);
    const [memoryAskText, setMemoryAskText] = useState('');
    const [memoryMenuOpen, setMemoryMenuOpen] = useState(false);
    const [messageFeedback, setMessageFeedback] = useState<Record<string, 'like' | 'dislike'>>({});
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [moreMenuMessage, setMoreMenuMessage] = useState<ChatMessage | null>(null);
    const [pendingRegenerate, setPendingRegenerate] = useState<{ text: string; image?: SelectedImage } | null>(null);
    const [notificationsVisible, setNotificationsVisible] = useState(false);
    const [notifPermission, setNotifPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
    const [storageVisible, setStorageVisible] = useState(false);
    const [storageDetail, setStorageDetail] = useState<string | null>(null);
    const [settingsOpenSection, setSettingsOpenSection] = useState<'appearance' | 'accent' | 'language' | 'country' | 'voice' | null>(null);
    const [countrySearch, setCountrySearch] = useState('');
    const speechLangRef = useRef('en-US');
    speechLangRef.current = LANGUAGES.find((item) => item.name === appLanguage)?.speech || 'en-US';
    const usageNotifiedRef = useRef(false);

    // One place that decides how the AI speaks: chosen voice, speed and language.
    const speakOptions = useCallback(() => {
      const chosen = voiceId ? availableVoices.find((item) => item.identifier === voiceId) : undefined;
      return {
        language: chosen?.language || (voiceLanguage ? (LANGUAGES.find((item) => item.name === voiceLanguage)?.speech || speechLangRef.current) : speechLangRef.current),
        ...(chosen ? { voice: chosen.identifier } : {}),
        rate: speechRate,
        pitch: 1.0,
      };
    }, [voiceId, voiceLanguage, speechRate, availableVoices]);

    const loadVoices = useCallback(() => {
      Speech.getAvailableVoicesAsync()
        .then((voices) => {
          const list = (voices || []).map((item: any) => ({ identifier: item.identifier, name: item.name || item.identifier, language: item.language || '', quality: item.quality }));
          if (list.length) setAvailableVoices(list);
        })
        .catch(() => {});
    }, []);

    // Browsers and some phones hand over their voice list late, so ask again a few times.
    useEffect(() => {
      loadVoices();
      const timers = [setTimeout(loadVoices, 800), setTimeout(loadVoices, 2500)];
      let synth: any = null;
      try {
        if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
          synth = (window as any).speechSynthesis;
          synth.onvoiceschanged = loadVoices;
        }
      } catch (_error) { /* ignore */ }
      return () => { timers.forEach(clearTimeout); if (synth) synth.onvoiceschanged = null; };
    }, [loadVoices]);

    useEffect(() => {
      if (voiceVisible || voicePickerVisible) loadVoices();
    }, [voiceVisible, voicePickerVisible, loadVoices]);

    // Real local notifications (expo-notifications). Does nothing if the category or the master switch is off.
    // Opens the place a notification is about (used when a notification or banner is tapped).
    const openFromNotification = (category: string) => {
      setSettingsVisible(false);
      setNotificationsVisible(false);
      setMemoryVisible(false);
      setLibraryVisible(false);
      if (category === 'library') { setLibraryTab('All'); setLibraryVisible(true); }
      else if (category === 'projects') { setLibraryTab('Folders'); setLibraryVisible(true); }
      else if (category === 'memory') { setMemoryVisible(true); }
      else if (category === 'usage') { setStorageVisible(true); }
    };
    setNoticeOpenHandler(openFromNotification);

    useEffect(() => {
      if (Platform.OS !== 'web') return undefined;
      const browser: any = globalThis as any;
      try {
        const target = new URLSearchParams(browser.location?.search || '').get('open');
        if (target) {
          setTimeout(() => openFromNotification(target), 900);
          browser.history?.replaceState?.(null, '', browser.location.pathname);
        }
      } catch (_error) { /* ignore */ }
      const onWorkerMessage = (event: any) => {
        if (event?.data?.type === 'open') openFromNotification(String(event.data.category || ''));
      };
      browser.navigator?.serviceWorker?.addEventListener?.('message', onWorkerMessage);
      return () => browser.navigator?.serviceWorker?.removeEventListener?.('message', onWorkerMessage);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Asks for permission (if allowed to), gets this phone's push address and gives it to the Worker.
    const enableWebPush = async (askPermission: boolean, confirmWithPush = false) => {
      try {
        const browser: any = globalThis as any;
        if (Platform.OS !== 'web' || !auth.currentUser || !browser.Notification) return;
        let permission: string = browser.Notification.permission;
        if (permission === 'default' && askPermission) permission = await browser.Notification.requestPermission();
        if (permission !== 'granted') return;
        const registration = await getServiceWorkerRegistration();
        if (!registration) return;
        const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
        if (!(await isSupported())) return;
        const token = await getToken(getMessaging(firebaseApp), { vapidKey: WEB_PUSH_VAPID_KEY, serviceWorkerRegistration: registration });
        if (!token) return;
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token).catch(() => {});
        await callWorker({ action: 'register_push', token });
        if (confirmWithPush) await callWorker({ action: 'push_me', token });
      } catch (error) {
        console.warn('[IK TECH AI] Push setup failed:', error);
      }
    };

    const disableWebPush = async () => {
      try {
        const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        if (token) await callWorker({ action: 'unregister_push', token });
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {});
      } catch (_error) { /* ignore */ }
    };

    // Quietly keep the push address fresh when permission was already given.
    useEffect(() => {
      if (Platform.OS !== 'web' || !user || !notificationsEnabled) return;
      const browser: any = globalThis as any;
      if (browser.Notification?.permission === 'granted') void enableWebPush(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid, notificationsEnabled]);

    // The first time someone sends a message, ask once for permission to show notifications.
    // Install IK TECH AI like a real app (web version)
    const [installEvent, setInstallEvent] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    useEffect(() => {
      if (Platform.OS !== 'web') return undefined;
      const browser: any = globalThis as any;
      try {
        const base = getWebBasePath();
        if (!browser.document.querySelector('link[rel="manifest"]')) {
          const link = browser.document.createElement('link');
          link.rel = 'manifest';
          link.href = `${base}manifest.webmanifest`;
          browser.document.head.appendChild(link);
        }
        if (!browser.document.querySelector('meta[name="theme-color"]')) {
          const meta = browser.document.createElement('meta');
          meta.name = 'theme-color';
          meta.content = '#081321';
          browser.document.head.appendChild(meta);
        }
        setIsStandalone(!!browser.matchMedia?.('(display-mode: standalone)')?.matches || browser.navigator?.standalone === true);
      } catch (_error) { /* ignore */ }
      void getServiceWorkerRegistration();
      const onPrompt = (event: any) => { event.preventDefault(); setInstallEvent(event); };
      const onInstalled = () => { setInstallEvent(null); setIsStandalone(true); };
      browser.addEventListener('beforeinstallprompt', onPrompt);
      browser.addEventListener('appinstalled', onInstalled);
      return () => {
        browser.removeEventListener('beforeinstallprompt', onPrompt);
        browser.removeEventListener('appinstalled', onInstalled);
      };
    }, []);

    const handleInstallApp = async () => {
      if (installEvent) {
        try { await installEvent.prompt(); await installEvent.userChoice; } catch (_error) { /* ignore */ }
        setInstallEvent(null);
        return;
      }
      const isIphone = /iphone|ipad|ipod/i.test(String((globalThis as any).navigator?.userAgent || ''));
      Alert.alert(
        'Install IK TECH AI',
        isIphone
          ? 'Tap the Share button in Safari, then tap "Add to Home Screen".'
          : 'Open the browser menu (⋮) and tap "Install app" or "Add to Home screen". If you do not see "Install app", use Chrome and reload this page once.',
      );
    };

    const askPushOnceRef = useRef(false);
    const askWebPushRef = useRef<() => void>(() => {});
    askWebPushRef.current = () => {
      if (Platform.OS !== 'web' || askPushOnceRef.current || !notificationsEnabled) return;
      const browser: any = globalThis as any;
      if (browser.Notification?.permission !== 'default') return;
      askPushOnceRef.current = true;
      void enableWebPush(true, true);
    };

    const notify = useCallback(async (category: string, title: string, body: string, options?: { onlyInBackground?: boolean }) => {
      try {
        if (!notificationsEnabled || notifPrefs[category] === false) return;
        const inForeground = AppState.currentState === 'active';
        if (options?.onlyInBackground && inForeground) return;
        // Web preview or no notifications package: show the in-app banner (and a browser notification if the tab is hidden).
        if (Platform.OS === 'web' || !NotificationsModule) {
          if (inForeground) showNoticeBanner(title, body, category);
          else if (Platform.OS === 'web') await showSystemNotification(title, body, category);
          return;
        }
        const permission = await NotificationsModule.getPermissionsAsync();
        if (!(permission.granted || permission.status === 'granted')) {
          if (inForeground) showNoticeBanner(title, body, category);
          return;
        }
        await NotificationsModule.scheduleNotificationAsync({ content: { title, body, data: { category } }, trigger: Platform.OS === 'android' ? ({ channelId: 'default' } as any) : null });
      } catch (error) {
        console.warn('[IK TECH AI] Notification error:', error);
      }
    }, [notificationsEnabled, notifPrefs]);

    useEffect(() => {
      if (Platform.OS === 'web') { setNotifPermission('granted'); return; }
      if (!NotificationsModule) return;
      (async () => {
        try {
          NotificationsModule.setNotificationHandler({
            handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
          });
          if (Platform.OS === 'android') {
            await NotificationsModule.setNotificationChannelAsync('default', { name: 'IK TECH AI', importance: NotificationsModule.AndroidImportance?.HIGH ?? 4 });
          }
          let permission = await NotificationsModule.getPermissionsAsync();
          if (!(permission.granted || permission.status === 'granted') && permission.status !== 'denied') {
            try { permission = await NotificationsModule.requestPermissionsAsync(); } catch (_requestError) { /* ignore */ }
          }
          setNotifPermission(permission.granted || permission.status === 'granted' ? 'granted' : permission.status === 'denied' ? 'denied' : 'unknown');
        } catch (error) {
          console.warn('[IK TECH AI] Notification setup error:', error);
        }
      })();
    }, []);

    // Daily tip at 9:00 (only when notifications + "Personalized tips" are on and permission was granted).
    useEffect(() => {
      if (!NotificationsModule || !settingsLoaded) return;
      (async () => {
        try {
          await NotificationsModule.cancelScheduledNotificationAsync('ik-tech-daily-tip').catch(() => {});
          if (notificationsEnabled && notifPrefs.tips !== false && notifPermission === 'granted') {
            await NotificationsModule.scheduleNotificationAsync({
              identifier: 'ik-tech-daily-tip',
              content: { title: 'IK TECH AI', body: 'Tip: ask me to explain any topic step by step, or save useful chats to your Library.' },
              trigger: { type: NotificationsModule.SchedulableTriggerInputTypes?.DAILY ?? 'daily', hour: 9, minute: 0, channelId: 'default' } as any,
            });
          }
        } catch (error) {
          console.warn('[IK TECH AI] Tip scheduling error:', error);
        }
      })();
    }, [settingsLoaded, notificationsEnabled, notifPrefs.tips, notifPermission]);

    // Web has no scheduled notifications, so show the daily tip once per day when the app is opened.
    useEffect(() => {
      if (Platform.OS !== 'web' || !settingsLoaded || !notificationsEnabled || notifPrefs.tips === false) return undefined;
      const today = new Date().toDateString();
      let timer: any;
      AsyncStorage.getItem('ik-tech-ai:lastTip').then((last) => {
        if (last === today) return;
        AsyncStorage.setItem('ik-tech-ai:lastTip', today).catch(() => {});
        timer = setTimeout(() => showNoticeBanner('IK TECH AI', 'Tip: ask me to explain any topic step by step, or save useful chats to your Library.'), 2500);
      }).catch(() => {});
      return () => { if (timer) clearTimeout(timer); };
    }, [settingsLoaded, notificationsEnabled, notifPrefs.tips]);

    useEffect(() => {
      AsyncStorage.getItem('ik-tech-ai:feedback:v1').then((raw) => {
        if (raw) { try { setMessageFeedback(JSON.parse(raw)); } catch (_error) { /* ignore */ } }
      }).catch(() => {});
    }, []);

    const [errorMessage, setErrorMessage] =
      useState<string | null>(null);

    const flatListRef =
      useRef<FlatList<ChatMessage>>(null);

    const inputRef = useRef<TextInput>(null);

    const recognitionRef = useRef<boolean>(false);
    const inputVoiceModeRef = useRef(false);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        },
      );

      return unsubscribe;
    }, []);
    useEffect(() => {
      const loadProfile = async () => {
        if (!user) {
          setProfileFullName('');
          setProfileDob('');
          setProfileImage(null);
          return;
        }

        try {
          setProfileLoading(true);

          const profileRef = doc(db, 'users', user.uid);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const data = profileSnap.data();

            setProfileFullName(
              typeof data.fullName === 'string'
                ? data.fullName
                : '',
            );

            setProfileDob(
              typeof data.dob === 'string'
                ? data.dob
                : '',
            );

            setProfileImage(
              typeof data.profileImage === 'string'
                ? data.profileImage
                : null,
            );
          }
        } catch (error) {
          console.error(
            '[IK TECH AI] Load profile error:',
            error,
          );
        } finally {
          setProfileLoading(false);
        }
      };

      loadProfile();
    }, [user]);

    // Load the user's Library and Memory from Firestore after sign-in.
    useEffect(() => {
      let cancelled = false;
      const loadSavedContent = async () => {
        if (!user) {
          setMemoryItems([]);
          setLibraryFavorites([]);
          setLibraryFolders([]);
          setLibraryImages([]);
          setMemorySummary(null);
          setMemoryEnabled(true);
          setMemoryNickname(''); setMemoryOccupation(''); setMemoryAbout('');
          setMemorySavedProfile({ nickname: '', occupation: '', about: '' });
          return;
        }
        try {
          const savedRef = doc(db, 'users', user.uid);
          let data: any = {};
          try {
            const savedSnap = await getDoc(savedRef);
            if (savedSnap.exists()) data = savedSnap.data();
          } catch (cloudError) {
            console.warn('[IK TECH AI] Could not reach Firebase, using this phone\'s copy:', cloudError);
          }
          for (const field of ['memoryItems', 'libraryFavorites', 'libraryFolders', 'libraryProjects', 'memoryProfile', 'memorySummary']) {
            try {
              const mirrorKey = `ik-tech-ai:saved:v1:${user.uid}:${field}`;
              const rawMirror = await AsyncStorage.getItem(mirrorKey);
              if (!rawMirror) continue;
              const mirror = JSON.parse(rawMirror);
              if (mirror?.dirty) {
                data[field] = mirror.value;
                setDoc(savedRef, { [field]: mirror.value, updatedAt: new Date().toISOString() }, { merge: true })
                  .then(() => AsyncStorage.setItem(mirrorKey, JSON.stringify({ value: mirror.value, dirty: false })))
                  .catch(() => {});
              }
            } catch (_mirrorError) { /* ignore */ }
          }
          if (cancelled) return;
          if (Array.isArray(data.memoryItems)) {
            setMemoryItems(data.memoryItems.filter((item: any) =>
              item && typeof item.id === 'string' && typeof item.text === 'string'
            ));
          } else {
            setMemoryItems([]);
          }
          if (Array.isArray(data.libraryFavorites)) {
            setLibraryFavorites(data.libraryFavorites.filter((item: any) =>
              item && typeof item.id === 'string' && typeof item.text === 'string'
            ));
          } else setLibraryFavorites([]);
          if (Array.isArray(data.libraryFolders)) {
            setLibraryFolders(data.libraryFolders.filter((item: any) =>
              item && typeof item.id === 'string' && typeof item.name === 'string'
            ));
          } else setLibraryFolders([]);
          if (Array.isArray(data.libraryProjects)) {
            setLibraryProjects(data.libraryProjects.filter((item: any) =>
              item && typeof item.id === 'string' && typeof item.name === 'string'
            ));
          } else setLibraryProjects([]);
          const profileData: any = data.memoryProfile;
          if (profileData && typeof profileData === 'object') {
            setMemoryEnabled(profileData.enabled !== false);
            const loadedProfile = { nickname: String(profileData.nickname || ''), occupation: String(profileData.occupation || ''), about: String(profileData.about || '') };
            setMemorySavedProfile(loadedProfile);
            setMemoryNickname(loadedProfile.nickname);
            setMemoryOccupation(loadedProfile.occupation);
            setMemoryAbout(loadedProfile.about);
          }
          if (data.memorySummary && typeof data.memorySummary.text === 'string') setMemorySummary({ text: data.memorySummary.text, updatedAt: Number(data.memorySummary.updatedAt) || Date.now() });
          else setMemorySummary(null);
        } catch (error) {
          console.error('[IK TECH AI] Load Library/Memory error:', error);
        }
      };
      loadSavedContent();
      return () => { cancelled = true; };
    }, [user]);

    // Images are stored locally as data URLs. This avoids Firestore's document-size
    // limit and keeps saved Library images available after the app is restarted.
    useEffect(() => {
      let cancelled = false;
      const loadLocalLibraryImages = async () => {
        setLibraryImagesLoaded(false);
        if (!user) {
          setLibraryImages([]);
          setLibraryImagesLoaded(true);
          return;
        }
        try {
          const raw = await AsyncStorage.getItem(`ik-tech-ai:library-images:v1:${user.uid}`);
          const parsed = raw ? JSON.parse(raw) : [];
          if (!cancelled) {
            setLibraryImages(Array.isArray(parsed) ? parsed.filter((item: any) =>
              item && typeof item.id === 'string' && typeof item.uri === 'string' && typeof item.name === 'string'
            ) : []);
          }
        } catch (error) {
          console.warn('[IK TECH AI] Could not load local Library images:', error);
          if (!cancelled) setLibraryImages([]);
        } finally {
          if (!cancelled) setLibraryImagesLoaded(true);
        }
      };
      loadLocalLibraryImages();
      return () => { cancelled = true; };
    }, [user]);

    useEffect(() => {
      if (!user || !libraryImagesLoaded) return;
      AsyncStorage.setItem(`ik-tech-ai:library-images:v1:${user.uid}`, JSON.stringify(libraryImages))
        .catch((error) => {
          console.error('[IK TECH AI] Could not save local Library images:', error);
          Alert.alert('Library storage', 'The image could not be saved on this device. Try a smaller image and try again.');
        });
    }, [user, libraryImages, libraryImagesLoaded]);

    // Library files are stored on this device (metadata + picker URI), per signed-in user.
    useEffect(() => {
      let cancelled = false;
      (async () => {
        setLibraryFilesLoaded(false);
        if (!user) {
          setLibraryFiles([]);
          setLibraryFilesLoaded(true);
          return;
        }
        try {
          const raw = await AsyncStorage.getItem(`ik-tech-ai:library-files:v1:${user.uid}`);
          const parsed = raw ? JSON.parse(raw) : [];
          if (!cancelled) {
            setLibraryFiles(Array.isArray(parsed) ? parsed.filter((item: any) =>
              item && typeof item.id === 'string' && typeof item.uri === 'string' && typeof item.name === 'string'
            ) : []);
          }
        } catch (error) {
          console.warn('[IK TECH AI] Could not load Library files:', error);
          if (!cancelled) setLibraryFiles([]);
        } finally {
          if (!cancelled) setLibraryFilesLoaded(true);
        }
      })();
      return () => { cancelled = true; };
    }, [user]);

    useEffect(() => {
      if (!user || !libraryFilesLoaded) return;
      AsyncStorage.setItem(`ik-tech-ai:library-files:v1:${user.uid}`, JSON.stringify(libraryFiles))
        .catch((error) => console.error('[IK TECH AI] Could not save Library files:', error));
    }, [user, libraryFiles, libraryFilesLoaded]);

    // Saves on this phone first (so deleting/adding always works instantly, even offline),
    // then syncs to Firebase. If Firebase is slow or fails, the change is kept and re-sent at next start.
    const persistSavedContent = useCallback(async (field: string, value: unknown) => {
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in to save Library and Memory items.');
        return false;
      }
      const mirrorKey = `ik-tech-ai:saved:v1:${user.uid}:${field}`;
      try { await AsyncStorage.setItem(mirrorKey, JSON.stringify({ value, dirty: true })); } catch (mirrorError) { console.warn('[IK TECH AI] Local save failed:', mirrorError); }
      try {
        await Promise.race([
          setDoc(doc(db, 'users', user.uid), { [field]: value, updatedAt: new Date().toISOString() }, { merge: true }),
          new Promise((_resolve, reject) => setTimeout(() => reject(new Error('cloud-timeout')), 8000)),
        ]);
        await AsyncStorage.setItem(mirrorKey, JSON.stringify({ value, dirty: false })).catch(() => {});
      } catch (error) {
        console.warn('[IK TECH AI] Cloud sync pending (will retry at next start):', error);
      }
      return true;
    }, [user]);

    const handleAuth = useCallback(async () => {
      const email = authEmail.trim();

      if (!email || !authPassword) {
        setAuthError(
          'Please enter your email and password.',
        );
        return;
      }

      try {
        setAuthError(null);

        if (authMode === 'signup') {
          await createUserWithEmailAndPassword(auth, email, authPassword);
        } else {
          await signInWithEmailAndPassword(
            auth,
            email,
            authPassword,
          );
        }
      } catch (error: any) {
        console.error(
          '[IK TECH AI] Authentication error:',
          error,
        );

        const code = error?.code;

        if (code === 'auth/invalid-email') {
          setAuthError(
            'Please enter a valid email address.',
          );
        } else if (
          code === 'auth/email-already-in-use'
        ) {
          setAuthError(
            'This email already has an account. Please Login.',
          );
        } else if (
          code === 'auth/weak-password'
        ) {
          setAuthError(
            'Password should be at least 6 characters.',
          );
        } else if (
          code === 'auth/invalid-credential' ||
          code === 'auth/wrong-password' ||
          code === 'auth/user-not-found'
        ) {
          setAuthError(
            'Email or password is incorrect.',
          );
        } else {
          setAuthError(
            error?.message ||
              'Authentication failed. Please try again.',
          );
        }
      }
    }, [
      authEmail,
      authPassword,
      authMode,
    ]);

    const handleLogout = useCallback(async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error(
          '[IK TECH AI] Logout error:',
          error,
        );

        setAuthError(
          'Could not log out. Please try again.',
        );
      }
    }, []);
    const handleChangePassword = useCallback(async () => {
      if (!newPassword || !confirmPassword) {
        setPasswordError('Please enter the new password and confirm it.');
        return;
      }

      if (newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordError('Passwords do not match.');
        return;
      }

      if (!auth.currentUser) {
        setPasswordError('You are not logged in.');
        return;
      }

      try {
        setPasswordError(null);

        await updatePassword(auth.currentUser, newPassword);

        setNewPassword('');
        setConfirmPassword('');

        Alert.alert(
          'Password Changed',
          'Your password has been changed successfully.',
        );
      } catch (error: any) {
        console.error('[IK TECH AI] Change password error:', error);

        setPasswordError(
          error?.message || 'Could not change your password.',
        );
      }
    }, [newPassword, confirmPassword]);

    const handleSaveProfile = useCallback(async () => {
      if (!auth.currentUser) {
        setAuthError('You are not logged in.');
        return;
      }

      if (!profileFullName.trim() || !profileDob.trim()) {
        setAuthError(
          'Please enter your full name and date of birth.',
        );
        return;
      }

      try {
        setAuthError(null);

        await setDoc(
          doc(db, 'users', auth.currentUser.uid),
          {
            fullName: profileFullName.trim(),
            dob: profileDob.trim(),
            profileImage: profileImage || null,
            email: auth.currentUser.email || '',
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );

        setProfileEditing(false);

        Alert.alert(
          'Profile Saved',
          'Your profile information has been saved successfully.',
        );
      } catch (error: any) {
        console.error(
          '[IK TECH AI] Save profile error:',
          error,
        );

        setAuthError(
          error?.message ||
            'Could not save your profile.',
        );
      }
    }, [
      profileFullName,
      profileDob,
      profileImage,
    ]);

    const stopVoiceEverything =
      useCallback(() => {
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch {}

        recognitionRef.current = false;

        setIsListening(false);

        Speech.stop().catch(() => {});

        setIsSpeaking(false);
      }, []);

    const refreshHistory =
      useCallback(async () => {
        try {
          const loaded =
            await loadHistory();

          setHistory(loaded);

          if (
            activeChatId &&
            !loaded.some(
              (item) =>
                item.id ===
                activeChatId,
            )
          ) {
            setActiveChatId(null);
            setMessages([]);
          }
        } catch (error) {
          console.error(
            '[IK TECH AI] Failed to load history:',
            error,
          );
        }
      }, []);

    useEffect(() => {
      refreshHistory();
    }, [refreshHistory]);

    const scrollToBottom =
      useCallback(() => {
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToEnd(
            {
              animated: true,
            },
          );
        });
      }, []);

    const handleNewChat =
      useCallback(() => {
        stopVoiceEverything();

        setActiveChatId(null);
        setMessages([]);
        setDraft('');
        setSelectedImage(null);
        setErrorMessage(null);
        setHistoryVisible(false);

        Haptics.selectionAsync().catch(
          () => {},
        );
      }, [stopVoiceEverything]);

    const handleSelectConversation =
      useCallback(
        (
          conversation: ChatConversation,
        ) => {
          stopVoiceEverything();

          setActiveChatId(
            conversation.id,
          );

          setMessages(
            conversation.messages || [],
          );

          setDraft('');
          setSelectedImage(null);
          setErrorMessage(null);
          setHistoryVisible(false);

          requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd(
              {
                animated: false,
              },
            );
          });
        },
        [stopVoiceEverything],
      );

    const handleDeleteConversation =
      useCallback(
        async (
          conversationId: string,
        ) => {
          try {
            await deleteConversation(
              conversationId,
            );

            if (
              activeChatId ===
              conversationId
            ) {
              setActiveChatId(null);
              setMessages([]);
            }

            await refreshHistory();
          } catch (error) {
            console.error(
              '[IK TECH AI] Failed to delete conversation:',
              error,
            );

            setErrorMessage(
              'Could not delete this conversation.',
            );
          }
        },
        [
          activeChatId,
          refreshHistory,
        ],
      );

    const handleClearAllHistory =
      useCallback(async () => {
        try {
          setErrorMessage(null);

          await clearHistory();

          setHistory([]);
          setActiveChatId(null);
          setMessages([]);
          setDraft('');
          setSelectedImage(null);
          setHistoryVisible(false);

          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
        } catch (error) {
          console.error(
            '[IK TECH AI] Clear all history error:',
            error,
          );

          setErrorMessage(
            'Could not delete all chat history. Please try again.',
          );
        }
      }, []);

                                        const handleRemoveSelectedImage =
                                          useCallback(() => {
                                            setSelectedImage(null);
                                          }, []);
    const handlePickProfileImage = useCallback(async () => {
      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            'Photo Permission',
            'Please allow photo library access to select a profile photo.',
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.5,
          selectionLimit: 1,
          base64: true,
        });

        if (result.canceled || !result.assets?.[0]) {
          return;
        }

        const asset = result.assets[0];

        if (!asset.base64) {
          Alert.alert(
            'Profile Photo',
            'Could not read this photo. Please choose another image.',
          );
          return;
        }

        const mimeType = asset.mimeType || 'image/jpeg';

        setProfileImage(
          `data:${mimeType};base64,${asset.base64}`,
        );
      } catch (error) {
        console.error(
          '[IK TECH AI] Profile image error:',
          error,
        );

        Alert.alert(
          'Profile Photo',
          'Could not select the profile photo. Please try another image.',
        );
      }
    }, []);
    const handleAttachImageAsset = useCallback(async (asset: { uri: string; mimeType?: string | null; base64?: string | null }) => {
      try {
              if (asset.base64) {
          const mime = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
          setSelectedImage({ uri: `data:${mime};base64,${asset.base64}`, mimeType: mime });
          setErrorMessage(null);
          return;
              }
        const imageResponse = await fetch(asset.uri);
        const imageBlob = await imageResponse.blob();
        const imageDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('Could not convert image to data URL.'));
          };
          reader.onerror = () => reject(new Error('Could not read image file.'));
          reader.readAsDataURL(imageBlob);
        });
        setSelectedImage({
          uri: imageDataUrl,
          mimeType: asset.mimeType || imageBlob.type || 'image/jpeg',
        });
        setErrorMessage(null);
      } catch (error) {
        console.error('[IK TECH AI] Image import error:', error);
        setErrorMessage('Could not read this image. Please choose another image.');
      }
    }, []);

    const handleChooseFromPhotos = useCallback(async () => {
      if (isStreaming) return;
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Photo Permission', 'Please allow photo library access to select an image.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          selectionLimit: 1,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        await handleAttachImageAsset(result.assets[0]);
      } catch (error) {
        console.error('[IK TECH AI] Photos picker error:', error);
        setErrorMessage('Could not open Photos. Please try again.');
      }
    }, [isStreaming, handleAttachImageAsset]);

    const handleTakePhoto = useCallback(async () => {
      if (isStreaming) return;
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera Permission', 'Please allow camera access to take a photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
                  quality: 0.5,
          base64: true,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        await handleAttachImageAsset(result.assets[0]);
      } catch (error) {
        console.error('[IK TECH AI] Camera error:', error);
        setErrorMessage('Could not open the camera. Please try again.');
      }
    }, [isStreaming, handleAttachImageAsset]);

    const handleChooseFromFiles = useCallback(async () => {
      if (isStreaming) return;
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
          multiple: false,
        });
        console.log('[IK TECH AI] File picker result:', result.canceled ? 'cancelled' : result.assets?.[0]?.name);
        if (result.canceled || !result.assets?.[0]?.uri) return;
        const asset = result.assets[0];
        const name = asset.name || 'selected file';
        const mimeType = (asset.mimeType || '').toLowerCase();
        const extension = name.split('.').pop()?.toLowerCase() || '';
        const isImage = mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(extension);
        if (isImage) {
          await handleAttachImageAsset({ uri: asset.uri, mimeType: asset.mimeType });
          return;
        }
        const isReadableText = mimeType.startsWith('text/') || TEXT_FILE_EXTENSIONS.includes(extension);
        if (isReadableText) {
          try {
            let content = '';
            if (Platform.OS === 'web') {
              const response = await fetch(asset.uri);
              if (!response.ok) throw new Error(`Could not read file (${response.status}).`);
              content = await response.text();
            } else {
              const FileSystem = await import('expo-file-system/legacy');
              content = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
            }
            if (!content.trim()) {
              Alert.alert('Empty file', 'This file does not contain readable text.');
              return;
            }
            setSelectedDocument({ uri: asset.uri, name, mimeType: 'text/plain', text: content.slice(0, 24000) });
            return;
          } catch (readError) {
            console.error('[IK TECH AI] Text file read error:', readError);
            Alert.alert('Could not read file', 'This text file could not be opened. Try another file.');
            return;
          }
        }
        const attachable = ATTACHMENT_TYPES[extension];
        if (attachable) {
          if (typeof asset.size === 'number' && asset.size > 10 * 1024 * 1024) {
            Alert.alert('File too large', 'Please choose a file smaller than 10 MB.');
            return;
          }
          setSelectedDocument({ uri: asset.uri, name, mimeType: attachable });
          return;
        }
        Alert.alert('File type not supported', 'You can attach images, PDF, Word (.docx), video, audio, and text or code files. This file type (.' + (extension || 'unknown') + ') is not supported.');
      } catch (error) {
        console.error('[IK TECH AI] Files picker error:', error);
        Alert.alert('Files', 'Could not open Files. Please try again.');
      }
    }, [isStreaming, handleAttachImageAsset]);

    const chooseImageForEditing = useCallback(async () => {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Photo permission', 'Please allow photo library access to choose an image.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          base64: true,
          quality: 0.75,
          selectionLimit: 1,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        if (!asset.base64) {
          Alert.alert('Image error', 'Could not read this image. Please choose another image.');
          return;
        }
        const mimeType = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
        setImageEditSource({ uri: asset.uri, mimeType });
        setImageEditBase64(asset.base64);
        setGeneratedImageUri(null);
      } catch (error) {
        console.error('[IK TECH AI] Image edit picker error:', error);
        Alert.alert('Image error', 'Could not choose this image. Please try again.');
      }
    }, []);

    const runImageGeneration = useCallback(async () => {
      const prompt = imagePrompt.trim();
      if (!prompt) {
        Alert.alert('Describe your image', 'Please write what image you want to create or how you want to edit your image.');
        return;
      }
      if (imageMode === 'edit' && !imageEditBase64) {
        Alert.alert('Choose an image', 'Please select an image before editing.');
        return;
      }
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Sign in required', 'Please sign in before creating images.');
        return;
      }
      setImageBusy(true);
      setGeneratedImageUri(null);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('https://autumn-field-496d.ibrahimkhalil79199.workers.dev/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'generate_image',
            prompt,
            image: imageMode === 'edit' && imageEditBase64
              ? `data:${imageEditSource?.mimeType || 'image/jpeg'};base64,${imageEditBase64}`
              : null,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || `Image service error (${response.status}).`);
        const returned = typeof payload?.image === 'string' ? payload.image : '';
        if (!returned) throw new Error('The image service returned no image. Please try again.');
        const dataUri = returned.startsWith('data:image/')
          ? returned
          : `data:${payload.mimeType || 'image/png'};base64,${returned}`;
        const smallUri = await compressImageDataUri(dataUri);
        setGeneratedImageUri(smallUri);
        if (user) {
          setLibraryImages((current) => [
            { id: `ai-image-${Date.now()}`, uri: smallUri, name: `IK TECH AI ${imageMode === 'edit' ? 'edited' : 'created'} image`, createdAt: Date.now() },
            ...current,
          ]);
          Alert.alert('Image ready', 'Your image has been saved to Library.');
        } else {
          Alert.alert('Image ready', 'Your image is ready. Sign in to save images to your Library.');
        }
      } catch (error) {
        console.error('[IK TECH AI] Image generation error:', error);
        Alert.alert('Could not create image', error instanceof Error ? error.message : 'Please try again later.');
      } finally {
        setImageBusy(false);
      }
    }, [imagePrompt, imageMode, imageEditBase64, imageEditSource, user]);

    const handlePickImage = useCallback(() => {
      if (!isStreaming) setImageSourceVisible(true);
    }, [isStreaming]);

    const handleSend =
      useCallback(
        async (
          forcedText?: string,
          fromVoice = false,
        ) => {
          if (isStreaming) {
            return;
          }

          const text = (
            forcedText ?? draft
          ).trim();

          if (!text && !selectedImage && !selectedDocument) {
            return;
          }

          askWebPushRef.current();

          setErrorMessage(null);

          const userMessage: ChatMessage = {
            id: generateMessageId(),
            role: 'user',
            content:
              text ||
              (selectedDocument ? (selectedDocument.mimeType.startsWith('audio') ? 'Please listen to the attached audio recording, write down exactly what is said (transcribe it), then give a short summary.' : 'Please read the attached file and tell me what is in it.') : 'Please analyze this image.'),
            image:
              selectedImage ?? undefined,
            attachment:
              selectedDocument ?? undefined,
          };
          // Keep a copy of each image the user sends in the Library on this device.
          if (selectedImage?.uri && user) {
            setLibraryImages((current) => current.some((item) => item.uri === selectedImage.uri)
              ? current
              : [{ id: `chat-image-${Date.now()}`, uri: selectedImage.uri, name: `Chat image ${new Date().toLocaleDateString()}`, createdAt: Date.now() }, ...current]);
          }

          let conversation =
            history.find(
              (item) =>
                item.id === activeChatId,
            );

          if (!conversation) {
            conversation =
              createConversation(
                text ||
                  'Image conversation',
              );

            setActiveChatId(
              conversation.id,
            );
          }

          const updatedMessages = [
            ...(conversation.messages ||
              []),
            userMessage,
          ];

          const conversationWithUser:
            ChatConversation = {
            ...conversation,
            title:
              conversation.messages
                .length === 0
                ? (
                    text ||
                    'Image conversation'
                  ).slice(0, 40)
                : conversation.title,
            messages: updatedMessages,
            updatedAt: Date.now(),
          };

          setHistory((current) => [
            conversationWithUser,
            ...current.filter(
              (item) =>
                item.id !==
                conversationWithUser.id,
            ),
          ]);

          setMessages(
            updatedMessages,
          );

          setDraft('');
          setSelectedImage(null);
          setSelectedDocument(null);
          setIsStreaming(true);

          Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle
              .Light,
          ).catch(() => {});

          requestAnimationFrame(() => {
            inputRef.current?.blur();
            scrollToBottom();
          });

          let assistantContent = '';
          let generatedImage: { uri: string; mimeType?: string } | undefined;

          try {
            await saveConversation(
              conversationWithUser,
            );

            const imageIntent = detectImageIntent(text, !!selectedImage);
            const localDateTimeAnswer = imageIntent ? null : getNigeriaDateTimeAnswer(text);
            const appendAssistantChunk = (chunk: string) => {
              assistantContent += chunk;
              setMessages((current) => {
                const withoutStreaming = current.filter(
                  (message) => message.id !== 'streaming-assistant',
                );
                return [
                  ...withoutStreaming,
                  {
                    id: 'streaming-assistant',
                    role: 'assistant',
                    content: assistantContent,
                  },
                ];
              });
              scrollToBottom();
            };
            if (imageIntent) {
              appendAssistantChunk(imageIntent === 'edit' ? 'Editing your image…' : 'Creating your image…');
              let sourceDataUrl: string | null = null;
              if (imageIntent === 'edit' && selectedImage) {
                sourceDataUrl = await compressImageDataUri(await readImageAsDataUrl(selectedImage.uri, selectedImage.mimeType));
              }
              const imagePrompt = text.replace(/^\/(image|imagine|draw)\s*/i, '').trim();
              const rawImage = await requestGeneratedImage(imagePrompt, sourceDataUrl);
              const smallImage = await compressImageDataUri(rawImage);
              generatedImage = { uri: smallImage, mimeType: smallImage.slice(5, smallImage.indexOf(';')) || 'image/jpeg' };
              assistantContent = appLanguage === 'Hausa'
                ? (imageIntent === 'edit' ? 'Ga hoton da aka gyara.' : 'Ga hotonka.')
                : (imageIntent === 'edit' ? 'Here is your edited image.' : 'Here is your image.');
              if (user) {
                setLibraryImages((current) => [
                  { id: `ai-image-${Date.now()}`, uri: smallImage, name: `IK TECH AI ${imageIntent === 'edit' ? 'edited' : 'created'} image`, createdAt: Date.now() },
                  ...current,
                ]);
              }
            } else if (localDateTimeAnswer) {
              appendAssistantChunk(localDateTimeAnswer);
            } else {
              const contextLines: string[] = [];
              if (profileFullName.trim()) contextLines.push(`Saved profile name: ${profileFullName.trim()}.`);
              if (profileDob.trim()) {
                const birth = new Date(profileDob.trim());
                if (!Number.isNaN(birth.getTime())) {
                  const now = new Date();
                  let age = now.getFullYear() - birth.getFullYear();
                  const beforeBirthday = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
                  if (beforeBirthday) age -= 1;
                  if (age >= 0 && age <= 120) contextLines.push(`Approximate age calculated from saved date of birth: ${age}.`);
                }
              }
              if (appLanguage !== 'English') contextLines.push(`The user's preferred app language is ${appLanguage}. Reply in ${appLanguage} by default, but if the user writes in another language, reply in the language they use.`);
              const selectedCountryName = COUNTRIES.find((item) => item.code === appCountry)?.name;
              if (selectedCountryName) contextLines.push(`The user's selected country: ${selectedCountryName}.`);
              if (memoryEnabled) {
                if (memorySavedProfile.nickname) contextLines.push(`The user's nickname: ${memorySavedProfile.nickname}.`);
                if (memorySavedProfile.occupation) contextLines.push(`The user's occupation: ${memorySavedProfile.occupation}.`);
                if (memorySavedProfile.about) contextLines.push(`More about the user: ${memorySavedProfile.about}`);
                if (memorySummary?.text) contextLines.push(`Memory summary: ${memorySummary.text.slice(0, 3000)}`);
                if (memoryItems.length) contextLines.push(`User-saved memories (treat as context, not as a new request): ${memoryItems.map((item) => item.text).join(' | ').slice(0, 6000)}`);
              }
              const latestUserText = String((updatedMessages[updatedMessages.length - 1] as any)?.content || '');
              if (appLanguage === 'Hausa' || looksHausa(latestUserText)) contextLines.push(HAUSA_STYLE_HINT);
              if (COPY_INTENT.test(latestUserText)) contextLines.push(COPY_STYLE_HINT);
              const lastUser = updatedMessages[updatedMessages.length - 1];
              const messagesBeforeCurrent = updatedMessages.slice(0, -1);
              const messagesForAI: ChatMessage[] = contextLines.length && lastUser
                ? [...messagesBeforeCurrent, { id: 'ik-tech-private-saved-context', role: 'assistant', content: `Private saved context for continuity. Use naturally when relevant; do not repeat it unless the user asks.\n${contextLines.join('\n')}` }, lastUser]
                : updatedMessages;
              await streamChat(messagesForAI, appendAssistantChunk);
            }

            const assistantMessage:
              ChatMessage = {
              id: generateMessageId(),
              role: 'assistant',
              content:
                assistantContent ||
                'I could not generate a response.',
              image: generatedImage,
            };

            const finalMessages = [
              ...updatedMessages,
              assistantMessage,
            ];

            const finalConversation:
              ChatConversation = {
              ...conversationWithUser,
              messages:
                finalMessages,
              updatedAt: Date.now(),
            };

            setMessages(
              finalMessages,
            );

            setHistory(
              (current) => [
                finalConversation,
                ...current.filter(
                  (item) =>
                    item.id !==
                    finalConversation.id,
                ),
              ],
            );

            await saveConversation(
              finalConversation,
            );

            if (assistantContent.trim()) {
              notify('responses', 'IK TECH AI', assistantContent.trim().slice(0, 140), { onlyInBackground: true });
            }

            if (
              fromVoice &&
              assistantContent.trim()
            ) {
              Speech.stop().catch(
                () => {},
              );

              setIsSpeaking(true);

              Speech.speak(
                assistantContent.trim(),
                {
                  ...speakOptions(),

                  onDone: () => {
                    setIsSpeaking(false);
                  },

                  onStopped: () => {
                    setIsSpeaking(false);
                  },

                  onError: () => {
                    setIsSpeaking(false);
                  },
                },
              );
            }
          } catch (error) {
            console.error(
              '[IK TECH AI] Send error:',
              error,
            );

            setMessages(
              updatedMessages,
            );

            setHistory(
              (current) => [
                conversationWithUser,
                ...current.filter(
                  (item) =>
                    item.id !==
                    conversationWithUser.id,
                ),
              ],
            );

            setErrorMessage(
              error instanceof Error
                ? (error.message.includes('5016') ? 'The AI model needs a one-time license agreement (error 5016). Send the prompt “agree” to the model once, then try again.' : error.message)
                : 'Something went wrong. Please try again.',
            );
          } finally {
            setIsStreaming(false);
          }
        },
        [
          activeChatId,
          draft,
          history,
          isStreaming,
          scrollToBottom,
          selectedImage,
          selectedDocument,
          user,
          memoryItems,
          memoryEnabled,
          memorySavedProfile,
          memorySummary,
          profileFullName,
          profileDob,
          appLanguage,
          appCountry,
          notify,
          speakOptions,
        ],
      );
    const handleOpenVoiceMode =
    useCallback(() => {
    if (isStreaming) return;

    setErrorMessage(null);
    setVoiceModeVisible(true);

    Speech.stop().catch(() => {});
    setIsSpeaking(false);
    }, [isStreaming]);

    const handleCloseVoiceMode =
    useCallback(() => {
    stopVoiceEverything();
    setVoiceModeVisible(false);
    }, [stopVoiceEverything]);

    useSpeechRecognitionEvent(
    'start',
    () => {
    recognitionRef.current =
    true;

    setIsListening(true);
    setErrorMessage(null);
    },
    );

    useSpeechRecognitionEvent(
    'end',
    () => {
    recognitionRef.current =
    false;

    setIsListening(false);
    },
    );

    useSpeechRecognitionEvent(
    'result',
    (event) => {
    const transcript =
    event?.results?.[0]?.transcript?.trim();

    if (
    transcript &&
    event?.isFinal !== false
    ) {
    recognitionRef.current = false;
    setIsListening(false);

    if (inputVoiceModeRef.current) {
    inputVoiceModeRef.current = false;
    setIsInputVoiceMode(false);
    setErrorMessage(null);

    setDraft((currentDraft) => {
    const existing = currentDraft.trim();

    return existing
    ? `${existing} ${transcript}`
    : transcript;
    });

    requestAnimationFrame(() => {
    inputRef.current?.focus();
    });

    Haptics.selectionAsync().catch(
    () => {},
    );

    return;
    }

    handleSend(
    transcript,
    true,
    );
    }
    },
    );

    useSpeechRecognitionEvent(
    'error',
    (event) => {
    console.error(
    '[IK TECH AI] Native voice recognition error:',
    event,
    );

    recognitionRef.current =
    false;

    setIsListening(false);

    if (
    event?.error ===
    'aborted'
    ) {
    return;
    }

    if (
    event?.error ===
    'not-allowed'
    ) {
    setErrorMessage(
    'Microphone permission was not granted. Please allow microphone access for IK TECH AI.',
    );

    return;
    }

    if (
    event?.error ===
    'no-speech'
    ) {
    setErrorMessage(
    'No speech was detected. Please try again.',
    );

    return;
    }

    setErrorMessage(
    event?.message ||
    'Could not understand your voice. Please try again.',
    );
    },
    );

    const handleToggleVoice =
    useCallback(async () => {
    if (isStreaming) return;

    if (isListening) {
    try {
    ExpoSpeechRecognitionModule.stop();
    } catch (error) {
    console.error(
    '[IK TECH AI] Could not stop voice:',
    error,
    );
    }

    return;
    }

    try {
    const permission =
    await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!permission.granted) {
    Alert.alert(
    'Microphone permission',
    'Please allow microphone access so IK TECH AI can hear your voice.',
    );

    return;
    }

    setErrorMessage(null);

    inputVoiceModeRef.current = false;

    recognitionRef.current =
    true;

    ExpoSpeechRecognitionModule.start(
    {
    lang: speechLangRef.current,
    interimResults: false,
    continuous: false,
    },
    );
    } catch (error) {
    console.error(
    '[IK TECH AI] Could not start native voice:',
    error,
    );

    recognitionRef.current = false;
    inputVoiceModeRef.current = false;

    setIsListening(false);
    setIsInputVoiceMode(false);

    setErrorMessage(
    error instanceof Error
    ? error.message
    : 'Could not start the microphone. Please try again.',
    );
    }
    }, [
    isListening,
    isStreaming,
    ]);

    useEffect(() => {
    return () => {
    try {
    ExpoSpeechRecognitionModule.stop();
    } catch {}

    recognitionRef.current =
    false;

    Speech.stop().catch(() => {});
    };
    }, []);

    const handleToggleInputVoice = useCallback(async () => {
    if (isStreaming) return;

    if (isListening && isInputVoiceMode) {
    try {
    ExpoSpeechRecognitionModule.stop();
    } catch {}

    setIsListening(false);
    setIsInputVoiceMode(false);
    return;
    }

    try {
    const permission =
    await ExpoSpeechRecognitionModule.requestPermissionsAsync();

    if (!permission.granted) {
    Alert.alert(
    'Microphone Permission',
    'Please allow microphone access to use voice typing.',
    );
    return;
    }

    setErrorMessage(null);

    inputVoiceModeRef.current = true;
    setIsInputVoiceMode(true);
    setIsListening(true);    

    ExpoSpeechRecognitionModule.start({
    lang: speechLangRef.current,
    interimResults: false,
    continuous: false,
    });
    } catch (error) {
    console.error(
    '[IK TECH AI] Input voice error:',
    error,
    );

    setIsListening(false);
    setIsInputVoiceMode(false);

    setErrorMessage(
    'Could not start voice typing. Please try again.',
    );
    }
    }, [
    isInputVoiceMode,
    isListening,
    isStreaming,
    ]);

    const inputHasContent =
      draft.trim().length > 0 ||
      !!selectedImage ||
      !!selectedDocument;

    const sortedHistory =
      useMemo(
        () =>
          [...history].sort(
            (a, b) =>
              b.updatedAt -
              a.updatedAt,
            ),
            [history],
            );

    const visibleHistory = useMemo(() => {
      const query = historySearchText.trim().toLowerCase();
      if (!query) return sortedHistory;
      return sortedHistory.filter((item) => {
        const title = (item.title || 'New Chat').toLowerCase();
        const lastMessage = item.messages?.[item.messages.length - 1]?.content || '';
        return title.includes(query) || lastMessage.toLowerCase().includes(query);
      });
    }, [sortedHistory, historySearchText]);

    // ═════════ Derived data + handlers: Library, Memory, Notifications, Storage, message actions ═════════
    const hairline = isLightTheme ? '#d5deea' : '#263a54';
    const rowBg = isLightTheme ? '#e9edf3' : '#112238';
    const pillBg = isLightTheme ? '#e3e8ef' : '#17293f';
    const circleButtonStyle = { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: panelBg, borderWidth: 1, borderColor: hairline } as const;
    const sheetStyle = { backgroundColor: panelBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, borderWidth: 1, borderColor: hairline } as const;
    const memoryAboutRef = useRef<TextInput>(null);

    const libraryItems = useMemo<LibraryItem[]>(() => {
      const items: LibraryItem[] = [];
      libraryImages.forEach((img) => items.push({ key: `image:${img.id}`, kind: 'image', id: img.id, name: img.name, createdAt: img.createdAt || 0, size: img.uri.length, uri: img.uri, mimeType: img.uri.startsWith('data:') ? img.uri.slice(5, img.uri.indexOf(';')) : 'image/jpeg', favorite: !!img.favorite, folderId: img.folderId ?? null }));
      libraryFiles.forEach((file) => items.push({ key: `file:${file.id}`, kind: 'file', id: file.id, name: file.name, createdAt: file.createdAt || 0, size: file.size || 0, uri: file.uri, mimeType: file.mimeType, favorite: !!file.favorite, folderId: file.folderId ?? null }));
      libraryFavorites.forEach((fav) => items.push({ key: `chat:${fav.id}`, kind: 'chat', id: fav.id, name: (fav.text.split('\n').find((line) => line.trim()) || 'Conversation').slice(0, 60), createdAt: fav.createdAt || 0, size: fav.text.length, text: fav.text, favorite: true, folderId: fav.folderId ?? null }));
      return items;
    }, [libraryImages, libraryFiles, libraryFavorites]);

    const visibleLibraryItems = useMemo(() => {
      const query = libraryQuery.trim().toLowerCase();
      let list = libraryItems;
      if (libraryOpenFolderId) list = list.filter((item) => item.folderId === libraryOpenFolderId);
      else if (libraryTab === 'Favorites') list = list.filter((item) => item.favorite);
      else if (libraryTab === 'Images') list = list.filter((item) => item.kind === 'image');
      if (query) list = list.filter((item) => `${item.name} ${item.text || ''}`.toLowerCase().includes(query));
      const sorted = [...list].sort((a, b) => (librarySort === 'name' ? a.name.localeCompare(b.name) : librarySort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt));
      return libraryTab === 'Suggested' && !libraryOpenFolderId && !query ? [...sorted].sort((a, b) => b.createdAt - a.createdAt).slice(0, 12) : sorted;
    }, [libraryItems, libraryTab, libraryOpenFolderId, libraryQuery, librarySort]);

    const visibleLibraryFolders = useMemo(() => {
      const query = libraryQuery.trim().toLowerCase();
      return query ? libraryFolders.filter((folder) => folder.name.toLowerCase().includes(query)) : libraryFolders;
    }, [libraryFolders, libraryQuery]);

    const formatLibraryDate = (timestamp: number) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const startOf = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
      const diff = Math.round((startOf(new Date()) - startOf(date)) / 86400000);
      if (diff === 0) return uiText.today;
      if (diff === 1) return uiText.yesterday;
      return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    };

  const renderLibraryThumb = (item: LibraryItem) => {
    if (item.kind === 'image' && item.uri) return <Image source={{ uri: item.uri }} style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: pillBg }} />;
    const isVideo = (item.mimeType || '').startsWith('video/');
    const icon = item.kind === 'chat' ? 'chatbubble-ellipses-outline' : isVideo ? 'videocam-outline' : CODE_FILE_EXTENSIONS.includes(fileExtension(item.name)) ? 'code-slash-outline' : 'document-text-outline';
    return (
      <View style={{ width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: panelBg, borderWidth: 1, borderColor: hairline }}>
        <Ionicons name={icon as any} size={22} color={isVideo ? '#a855f7' : accentColor} />
      </View>
    );
  };

  const sheetRow = (icon: string, label: string, onPress: () => void, danger = false, active = false) => (
    <Pressable key={label} onPress={onPress} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
      <Ionicons name={icon as any} size={22} color={danger ? '#ef4444' : accentColor} style={{ marginRight: 14 }} />
      <Text style={{ color: danger ? '#ef4444' : primaryText, fontSize: 16, fontWeight: active ? '800' : '500', flex: 1 }}>{label}</Text>
      {active ? <Ionicons name="checkmark" size={20} color={accentColor} /> : null}
    </Pressable>
  );

  // ── Library actions ──
  const requireSignIn = () => {
    if (user) return true;
    Alert.alert('Sign in required', 'Please sign in to use your Library.');
    return false;
  };

  // Alerts opened while a bottom sheet is still closing get lost on some phones, so wait for the sheet to close first.
  const afterModalClose = (action: () => void) => { setTimeout(action, 450); };

  const addFilesToLibrary = async () => {
    setLibraryAddOpen(false);
    if (!requireSignIn()) return;
    await new Promise((resolve) => setTimeout(resolve, 450));
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: '*/*' });
      if (result.canceled || !result.assets?.length) return;
      setLibrarySaving(true);
      const added: LibraryFile[] = [];
      for (let index = 0; index < result.assets.length; index += 1) {
        const asset = result.assets[index];
        const name = asset.name || `File ${index + 1}`;
        const storedUri = await persistPickedFile(asset.uri, name);
        added.push({ id: `file-${Date.now()}-${index}`, name, uri: storedUri, mimeType: asset.mimeType || undefined, size: asset.size || 0, createdAt: Date.now(), folderId: libraryOpenFolderId });
      }
      setLibraryFiles((current) => [...added, ...current]);
      notify('library', 'Saved to Library', added.length === 1 ? added[0].name : `${added.length} files added`);
    } catch (error) {
      console.error('[IK TECH AI] Add files error:', error);
      Alert.alert('Could not add files', 'Please try again.');
    } finally {
      setLibrarySaving(false);
    }
  };

  const addPhotosToLibrary = async () => {
    setLibraryAddOpen(false);
    if (!requireSignIn()) return;
    await new Promise((resolve) => setTimeout(resolve, 450));
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo Permission', 'Please allow photo library access to add photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 10, quality: 0.7 });
      if (result.canceled || !result.assets?.length) return;
      setLibrarySaving(true);
      const added: { id: string; uri: string; name: string; createdAt: number; folderId: string | null }[] = [];
      for (let index = 0; index < result.assets.length; index += 1) {
        const asset = result.assets[index];
        const dataUrl = await uriToDataUrl(asset.uri);
        added.push({ id: `img-${Date.now()}-${index}`, uri: dataUrl, name: asset.fileName || `Image ${new Date().toLocaleDateString()} ${index + 1}`, createdAt: Date.now(), folderId: libraryOpenFolderId });
      }
      setLibraryImages((current) => [...added, ...current]);
      notify('library', 'Saved to Library', `${added.length} photo${added.length === 1 ? '' : 's'} added`);
    } catch (error) {
      console.error('[IK TECH AI] Add photos error:', error);
      Alert.alert('Could not add photos', 'Your device could not store these images. Try fewer or smaller images.');
    } finally {
      setLibrarySaving(false);
    }
  };

  const saveChatImagesToLibrary = () => {
    setLibraryAddOpen(false);
    if (!requireSignIn()) return;
    const candidates: { uri: string; name: string }[] = [];
    if (selectedImage?.uri) candidates.push({ uri: selectedImage.uri, name: `Attached image ${new Date().toLocaleDateString()}` });
    messages.forEach((message, index) => {
      if (message.image?.uri) candidates.push({ uri: message.image.uri, name: `${message.role === 'user' ? 'Chat image' : 'AI image'} ${index + 1}` });
    });
    const existing = new Set(libraryImages.map((item) => item.uri));
    const unique = candidates.filter((item) => item.uri && !existing.has(item.uri));
    if (!unique.length) { Alert.alert('No new images', 'There are no new attached images to save from this chat.'); return; }
    setLibraryImages((current) => [...unique.map((item, index) => ({ id: `${Date.now()}-${index}`, uri: item.uri, name: item.name, createdAt: Date.now(), folderId: libraryOpenFolderId })), ...current]);
    notify('library', 'Saved to Library', `${unique.length} image${unique.length === 1 ? '' : 's'} added`);
  };

  const saveTextToFavorites = async (text: string) => {
    const clean = text.trim();
    if (!clean) { Alert.alert('Nothing to save', 'Open a conversation with messages first.'); return; }
    const next = [{ id: Date.now().toString(), text: clean, createdAt: Date.now(), folderId: libraryOpenFolderId }, ...libraryFavorites];
    if (await persistSavedContent('libraryFavorites', next)) {
      setLibraryFavorites(next);
      notify('library', 'Saved to Favorites', clean.slice(0, 80));
      Alert.alert('Saved', 'Added to Library → Favorites.');
    }
  };

  const saveConversationToFavorites = async () => {
    setLibraryAddOpen(false);
    await saveTextToFavorites(messages.map((m: any) => `${m.role === 'user' ? 'You' : 'IK TECH AI'}: ${m.content || m.text || ''}`).filter(Boolean).join('\n\n'));
  };

  const createLibraryFolder = async () => {
    const name = newFolderName.trim();
    if (!name) { Alert.alert('Folder name', 'Enter a name for the folder first.'); return; }
    if (libraryFolders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) { Alert.alert('Already exists', 'A folder with that name already exists.'); return; }
    const next = [{ id: Date.now().toString(), name }, ...libraryFolders];
    if (await persistSavedContent('libraryFolders', next)) {
      setLibraryFolders(next);
      setNewFolderName('');
      setNewFolderModalOpen(false);
      setLibraryTab('Folders');
    }
  };



  const removeLibraryItem = async (item: LibraryItem) => {
    if (item.kind === 'image') setLibraryImages((current) => current.filter((entry) => entry.id !== item.id));
    else if (item.kind === 'file') {
      setLibraryFiles((current) => current.filter((entry) => entry.id !== item.id));
      removePersistedFile(item.uri);
    } else {
      const next = libraryFavorites.filter((entry) => entry.id !== item.id);
      if (await persistSavedContent('libraryFavorites', next)) setLibraryFavorites(next);
    }
  };


  const deleteLibraryItem = (item: LibraryItem) => {
    setLibraryActiveItem(null);
    setLibraryViewer(null);
    setImageViewerMenuOpen(false);
    setImageViewerUri(null);
    setImageViewerItem(null);
    afterModalClose(() => {
      Alert.alert(
        'Delete?',
        `Remove “${item.name}” from your Library?`,
        [
          { text: uiText.cancel, style: 'cancel' },
          { text: uiText.delete, style: 'destructive', onPress: () => { void removeLibraryItem(item); } },
        ],
      );
    });
  };

  const deleteLibraryFolder = (folder: { id: string; name: string }) => {
    Alert.alert(
      'Delete folder?',
      `Delete "${folder.name}"? Items inside will remain in your Library.`,
      [
        { text: uiText.cancel, style: 'cancel' },
        {
          text: uiText.delete,
          style: 'destructive',
          onPress: async () => {
            const previousFolders = libraryFolders;
            const nextFolders = libraryFolders.filter(
              (item) => item.id !== folder.id
            );

            // Remove the folder from the screen immediately.
            setLibraryFolders(nextFolders);

            if (libraryOpenFolderId === folder.id) {
              setLibraryOpenFolderId(null);
            }

            try {
              const saved = await persistSavedContent(
                'libraryFolders',
                nextFolders
              );

              if (!saved) {
                // Restore the folders if Firebase saving fails.
                setLibraryFolders(previousFolders);
                Alert.alert(
                  'Delete failed',
                  'Could not save the change. Check your internet connection and try again.'
                );
                return;
              }

              setLibraryImages((current) =>
                current.map((item) =>
                  item.folderId === folder.id
                    ? { ...item, folderId: null }
                    : item
                )
              );

              setLibraryFiles((current) =>
                current.map((item) =>
                  item.folderId === folder.id
                    ? { ...item, folderId: null }
                    : item
                )
              );

              const nextFavorites = libraryFavorites.map((item) =>
                item.folderId === folder.id
                  ? { ...item, folderId: null }
                  : item
              );

              if (nextFavorites.some(
                (item, index) => item !== libraryFavorites[index]
              )) {
                if (
                  await persistSavedContent(
                    'libraryFavorites',
                    nextFavorites
                  )
                ) {
                  setLibraryFavorites(nextFavorites);
                }
              }
            } catch (error) {
              console.error(
                '[IK TECH AI] Delete folder error:',
                error
              );
              Alert.alert(
                'Delete failed',
                'Please try again.'
              );
            }
          },
        },
      ]
    );
  };


  const toggleItemFavorite = async (item: LibraryItem) => {
    setLibraryActiveItem(null);
    if (item.kind === 'image') setLibraryImages((current) => current.map((entry) => (entry.id === item.id ? { ...entry, favorite: !entry.favorite } : entry)));
    else if (item.kind === 'file') setLibraryFiles((current) => current.map((entry) => (entry.id === item.id ? { ...entry, favorite: !entry.favorite } : entry)));
    else await removeLibraryItem(item);
  };

  const moveLibraryItem = async (item: LibraryItem, folderId: string | null) => {
    setLibraryMoveOpen(false);
    setLibraryActiveItem(null);
    if (item.kind === 'image') setLibraryImages((current) => current.map((entry) => (entry.id === item.id ? { ...entry, folderId } : entry)));
    else if (item.kind === 'file') setLibraryFiles((current) => current.map((entry) => (entry.id === item.id ? { ...entry, folderId } : entry)));
    else {
      const next = libraryFavorites.map((entry) => (entry.id === item.id ? { ...entry, folderId } : entry));
      if (await persistSavedContent('libraryFavorites', next)) setLibraryFavorites(next);
    }
  };

  const useLibraryItemInChat = async (item: LibraryItem) => {
    setLibraryActiveItem(null);
    if (item.kind === 'chat') { Alert.alert(item.name, (item.text || '').slice(0, 1500)); return; }
    if (item.kind === 'image' && item.uri) {
      setSelectedImage({ uri: item.uri, mimeType: item.mimeType || 'image/jpeg' });
      setLibraryVisible(false);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (item.kind === 'file' && item.uri) {
      if (!TEXT_FILE_EXTENSIONS.includes(fileExtension(item.name))) {
        Alert.alert('Cannot read this file yet', 'IK TECH AI can read text and code files (txt, md, json, csv, js, ts, py, html…). Images can be attached to chat.');
        return;
      }
      try {
        const content = (await (await fetch(item.uri)).text()).slice(0, 12000);
        setDraft(`Here is my file “${item.name}”:\n\n\`\`\`\n${content}\n\`\`\`\n\n`);
        setLibraryVisible(false);
        requestAnimationFrame(() => inputRef.current?.focus());
      } catch (error) {
        Alert.alert('Could not open file', 'The file is no longer available on this device. Please add it again.');
      }
    }
  };

  const sourceFromItem = (item: LibraryItem): DownloadSource => (item.kind === 'chat'
    ? { name: `${item.name.replace(/[.\s]+$/, '')}.txt`, text: item.text || '', mimeType: 'text/plain' }
    : { name: item.name, uri: item.uri, mimeType: item.mimeType });

  const handleCopyText = async (text: string) => {
    try {
      if (ClipboardModule?.setStringAsync) await ClipboardModule.setStringAsync(text);
      else await Share.share({ message: text });
      Haptics.selectionAsync().catch(() => {});
    } catch (_error) { /* ignore */ }
  };

  const downloadLibraryItem = async (item: LibraryItem) => {
    setLibraryActiveItem(null);
    try {
      setLibrarySaving(true);
      const result = await saveToDevice(sourceFromItem(item));
      if (result === 'saved') Alert.alert('Downloaded', 'Saved to your chosen folder.');
    } catch (error) {
      console.error('[IK TECH AI] Download error:', error);
      Alert.alert('Could not download', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLibrarySaving(false);
    }
  };

  const downloadMany = async (items: LibraryItem[], folderName?: string) => {
    setLibraryMenuOpen(false);
    if (!items.length) { Alert.alert('Nothing to download', 'There are no items in this list yet.'); return; }
    try {
      setLibrarySaving(true);
      const count = await saveManyToDevice(items.map(sourceFromItem), folderName);
      if (count > 0 && Platform.OS === 'android') Alert.alert('Downloaded', `${count} item${count === 1 ? '' : 's'} saved to your chosen folder.`);
    } catch (error) {
      console.error('[IK TECH AI] Download all error:', error);
      Alert.alert('Could not download', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLibrarySaving(false);
    }
  };

  const downloadFolder = (folder: { id: string; name: string }) => downloadMany(libraryItems.filter((item) => item.folderId === folder.id), folder.name);

  // Tapping an item opens it straight away (no “Open” button needed).
  const openLibraryItem = async (item: LibraryItem) => {
    if (item.kind === 'image' && item.uri) { setImageViewerItem(item); setImageViewerUri(item.uri); return; }
    if (item.kind === 'chat') { setLibraryViewer({ item, text: item.text || '' }); return; }
    if (!item.uri) return;
    if (TEXT_FILE_EXTENSIONS.includes(fileExtension(item.name))) {
      try {
        const text = (await (await fetch(item.uri)).text()).slice(0, 200000);
        setLibraryViewer({ item, text });
      } catch (_error) {
        Alert.alert('Could not open file', 'The file is no longer available on this phone. Please add it again.');
      }
      return;
    }
    try {
      if (Platform.OS === 'android' && IntentLauncherModule && FileSystemModule?.getContentUriAsync) {
        const contentUri = await FileSystemModule.getContentUriAsync(item.uri);
        await IntentLauncherModule.startActivityAsync('android.intent.action.VIEW', { data: contentUri, flags: 1, type: item.mimeType || '*/*' });
        return;
      }
      if (SharingModule && (await SharingModule.isAvailableAsync())) {
        await SharingModule.shareAsync(item.uri, { mimeType: item.mimeType, dialogTitle: item.name });
        return;
      }
      if (Platform.OS === 'ios') { await Share.share({ url: item.uri }); return; }
      Alert.alert('Cannot open this file type here', 'Tap ⋮ and choose Download to save it, then open it with another app.\n\nTo open files directly, install: npx expo install expo-intent-launcher expo-sharing');
    } catch (_error) {
      Alert.alert('Could not open file', 'No app on this phone can open this file type, or the file is no longer available. Try Download.');
    }
  };

  // ── Full-screen image viewer (top bar: close, ⋮, download, Share · bottom tools: Edit, Markup, Resize, Remove) ──
  const closeImageViewer = () => { setImageViewerMenuOpen(false); setImageViewerUri(null); setImageViewerItem(null); };
  const imageMimeOf = (uri: string) => (uri.startsWith('data:') ? uri.slice(5, uri.indexOf(';')) : 'image/jpeg');

  const downloadViewerImage = async () => {
    if (!imageViewerUri) return;
    try {
      const result = await saveToDevice({ name: imageViewerItem?.name || `IK-TECH-AI-${Date.now()}`, uri: imageViewerUri, mimeType: imageMimeOf(imageViewerUri) });
      if (result === 'saved') Alert.alert('Downloaded', 'Saved to your chosen folder.');
    } catch (error) {
      Alert.alert('Could not download', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const shareViewerImage = async () => {
    if (!imageViewerUri) return;
    try {
      if (Platform.OS === 'web') {
        const browser: any = globalThis as any;
        const blob = await (await browser.fetch(imageViewerUri)).blob();
        const ext = MIME_EXTENSION[blob.type] || 'jpg';
        const cleanName = (imageViewerItem?.name || 'IK-TECH-AI').replace(/[^\w\- ]+/g, '').trim() || 'IK-TECH-AI';
        const fileName = `${cleanName}.${ext}`;
        const file = new browser.File([blob], fileName, { type: blob.type || 'image/jpeg' });
        if (browser.navigator?.canShare && browser.navigator.canShare({ files: [file] })) {
          await browser.navigator.share({ files: [file], title: 'IK TECH AI' });
          return;
        }
        // This browser has no share sheet for files, so save the picture instead.
        const objectUrl = browser.URL.createObjectURL(blob);
        const link = browser.document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        link.click();
        setTimeout(() => browser.URL.revokeObjectURL(objectUrl), 2000);
        return;
      }
      let shareUri = imageViewerUri;
      if (imageViewerUri.startsWith('data:') && FileSystemModule?.cacheDirectory) {
        const ext = MIME_EXTENSION[imageMimeOf(imageViewerUri)] || 'jpg';
        shareUri = `${FileSystemModule.cacheDirectory}share-${Date.now()}.${ext}`;
        await FileSystemModule.writeAsStringAsync(shareUri, imageViewerUri.slice(imageViewerUri.indexOf(',') + 1), { encoding: 'base64' });
      }
      if (SharingModule && (await SharingModule.isAvailableAsync()) && !shareUri.startsWith('data:')) {
        await SharingModule.shareAsync(shareUri, { mimeType: imageMimeOf(imageViewerUri) });
      } else if (Platform.OS === 'ios' && !shareUri.startsWith('data:')) {
        await Share.share({ url: shareUri });
      } else {
        Alert.alert('Sharing needs a package', 'Run this, then rebuild the app:\nnpx expo install expo-sharing expo-file-system');
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError') return; // the person closed the share sheet
      Alert.alert('Could not share', 'Please try again.');
    }
  };

  const favoriteViewerImage = () => {
    setImageViewerMenuOpen(false);
    if (!imageViewerUri || !requireSignIn()) return;
    if (imageViewerItem) {
      const target = imageViewerItem;
      setLibraryImages((current) => current.map((entry) => (entry.id === target.id ? { ...entry, favorite: !entry.favorite } : entry)));
      setImageViewerItem({ ...target, favorite: !target.favorite });
      return;
   import React, { useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  Share,
} from 'react-native';
import AsyncStorage from '@/lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { doc } from 'firebase/firestore';

export const SUGGESTIONS = [
  'Explain something to me',
  'Help me learn programming',
  'Translate this for me',
  'Help me solve a problem',
];

export type SelectedImage = {
  uri: string;
  mimeType?: string;
};

// ───────────────── Optional native modules (the app still runs if they are not installed) ─────────────────
export let ClipboardModule: any = null;
try { ClipboardModule = require('expo-clipboard'); } catch (_error) { ClipboardModule = null; }
export type DialogButton = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
export type DialogState = { title: string; message?: string; buttons: DialogButton[]; cancelable: boolean };
export let dialogListener: ((dialog: DialogState | null) => void) | null = null;

// Same call style as React Native's Alert.alert, but drawn by the app itself so it always shows.
export const Alert = {
  alert: (title: string, message?: string, buttons?: DialogButton[], options?: { cancelable?: boolean }) => {
    if (dialogListener) {
      dialogListener({ title, message, buttons: buttons && buttons.length ? buttons : [{ text: 'OK' }], cancelable: options?.cancelable !== false });
      return;
    }
    NativeAlert.alert(title, message, buttons as any, options as any);
  },
};

export function AppDialogHost() {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  useEffect(() => {
    dialogListener = setDialog;
    return () => { if (dialogListener === setDialog) dialogListener = null; };
  }, []);
  const close = (button?: DialogButton) => {
    setDialog(null);
    if (button?.onPress) setTimeout(() => button.onPress && button.onPress(), 60);
  };
  if (!dialog) return null;
  const stacked = dialog.buttons.length > 2;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (dialog.cancelable) close(dialog.buttons.find((button) => button.style === 'cancel')); }}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', padding: 26 }}>
        <View style={{ width: '100%', maxWidth: 360, borderRadius: 22, backgroundColor: '#13202f', borderWidth: 1, borderColor: '#223650', padding: 20 }}>
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800', marginBottom: dialog.message ? 8 : 16 }}>{dialog.title}</Text>
          {dialog.message ? (
            <ScrollView style={{ maxHeight: 260, marginBottom: 16 }}>
              <Text style={{ color: '#c4d3e6', fontSize: 15, lineHeight: 22 }}>{dialog.message}</Text>
            </ScrollView>
          ) : null}
          <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 10 }}>
            {dialog.buttons.map((button, index) => {
              const destructive = button.style === 'destructive';
              const cancel = button.style === 'cancel';
              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  onPress={() => close(button)}
                  style={{ flex: stacked ? undefined : 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: destructive ? 'rgba(255,90,90,0.18)' : cancel ? '#223650' : '#2563a8' }}
                >
                  <Text style={{ color: destructive ? '#ff7b7b' : '#ffffff', fontSize: 15, fontWeight: '800' }}>{button.text || 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Makes a generated picture much smaller (JPEG, max 1024 px) so the Library does not run out of storage.
export const compressImageDataUri = async (dataUri: string): Promise<string> => {
  try {
    const browser: any = globalThis as any;
    if (Platform.OS === 'web' && browser.document) {
      return await new Promise<string>((resolve) => {
        const img = new browser.Image();
        img.onload = () => {
          const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
          const canvas = browser.document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const context = canvas.getContext('2d');
          if (!context) { resolve(dataUri); return; }
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => resolve(dataUri);
        img.src = dataUri;
      });
    }
    if (ImageManipulatorModule?.manipulateAsync) {
      const result = await ImageManipulatorModule.manipulateAsync(dataUri, [{ resize: { width: 1024 } }], { compress: 0.8, format: 'jpeg', base64: true });
      if (result?.base64) return `data:image/jpeg;base64,${result.base64}`;
    }
  } catch (_error) { /* keep the original picture */ }
  return dataUri;
};

// ── Images through chat: the app understands "create ..." and "edit ..." messages ──
export const IMAGE_NOUNS = 'image|images|picture|pictures|photo|photos|illustration|logo|poster|drawing|painting|wallpaper|portrait|artwork|art|icon|banner|flyer|cartoon|avatar|sketch|thumbnail|sticker';
export const NOT_IMAGE_WORDS = /\b(code|script|function|program|app|application|website|webpage|html|css|python|javascript|java|sql|essay|story|poem|poetry|list|plan|email|letter|table|report|summary|document|doc|file|spreadsheet|song|lyrics|message|post|caption|name|names|title|idea|ideas|question|questions|quiz|schedule|resume|cv|speech|joke|jokes|recipe|sentence|paragraph|translation|account|folder|project|chart|graph|diagram|chat|password|username|nickname|number|numbers|key|random|text|prompt|outline|presentation|slide|slides|note|notes)\b/i;
export const POLITE_START = '(please\\s+|pls\\s+|kindly\\s+|can you\\s+|could you\\s+|i want you to\\s+|i want\\s+|i need\\s+)?';

export const detectImageIntent = (text: string, hasImage: boolean): 'create' | 'edit' | null => {
  const lower = text.trim().toLowerCase();
  if (lower.length < 6) return null;
  if (/^\/(image|imagine|draw)\b/.test(lower)) return hasImage ? 'edit' : 'create';
  if (hasImage) {
    const editVerb = /\b(edit|change|replace|remove|erase|delete|add|make it|make the|make this|turn it|turn this|convert|enhance|brighten|brightness|darken|blur|sharpen|retouch|colorize|colourise|restore|cartoon|background|filter|crop|gyara|canza|cire|goge|ƙara|kara|haskaka)\b/;
    const analysisWord = /\b(what|who|which|where|why|how|describe|explain|read|extract|text|translate|ocr|transcribe|copy|identify|tell me|menene|wane|wace|bayyana|fassara|rubutu|rubutun|karanta|fitomin|fito min)\b/;
    return editVerb.test(lower) && !analysisWord.test(lower) ? 'edit' : null;
  }
  if (/(ƙirƙiri|kirkiri|kirkira|zana|yi min|yi mini|kera|fito min da|fitomin da)\b.*\b(hoto|hotuna|hoton|zane|tambari|logo)/.test(lower)) return 'create';
  if (new RegExp('^' + POLITE_START + '(create|generate|draw|paint|imagine|design|make|produce|sketch|render)\\b').test(lower) && !NOT_IMAGE_WORDS.test(lower)) {
    const needsNoun = new RegExp('^' + POLITE_START + '(make|design|produce|render)\\b').test(lower);
    if (needsNoun && !new RegExp('\\b(' + IMAGE_NOUNS + ')\\b').test(lower)) return null;
    return 'create';
  }
  return null;
};

export const readImageAsDataUrl = async (uri: string, mimeType?: string): Promise<string> => {
  if (uri.startsWith('data:')) return uri;
  if (Platform.OS === 'web') {
    const browser: any = globalThis as any;
    const blob = await (await browser.fetch(uri)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new browser.FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read the image.'));
      reader.readAsDataURL(blob);
    });
  }
  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return `data:${mimeType || 'image/jpeg'};base64,${base64}`;
};

// Asks the Worker to create (or edit, when a picture is given) an image. Returns a data: picture.
export const requestGeneratedImage = async (prompt: string, sourceDataUrl: string | null): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please sign in before creating images.');
  const token = await currentUser.getIdToken();
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'generate_image', prompt, image: sourceDataUrl }),
  });
  let payload: any = null;
  try { payload = await response.json(); } catch (_error) { /* not JSON */ }
  if (!response.ok) throw new Error(payload?.error || `Image service error (${response.status}).`);
  const returned = typeof payload?.image === 'string' ? payload.image : '';
  if (!returned) throw new Error('The image service returned no image. Please try again.');
  return returned.startsWith('data:image/') ? returned : `data:${payload.mimeType || 'image/png'};base64,${returned}`;
};

export const IMAGE_SAMPLES_CREATE = [
  { emoji: '🐒', title: 'Animals', prompt: 'Create a monkey sitting on a tree in the jungle', color: '#2e7d32' },
  { emoji: '🏙️', title: 'Cities', prompt: 'Create a futuristic city at night with neon lights', color: '#5b3ea8' },
  { emoji: '🎨', title: 'Logos', prompt: 'Create a modern logo for a tech company called IK TECH', color: '#1565c0' },
  { emoji: '👤', title: 'Portraits', prompt: 'Create a portrait of a smiling man in traditional Nigerian attire', color: '#8d4b1f' },
  { emoji: '🍲', title: 'Food', prompt: 'Create a delicious plate of jollof rice with grilled chicken', color: '#c2410c' },
  { emoji: '🏞️', title: 'Landscapes', prompt: 'Create a beautiful sunrise over green mountains and a lake', color: '#0f766e' },
  { emoji: '🎉', title: 'Posters', prompt: 'Create a colorful birthday party poster', color: '#be185d' },
  { emoji: '😺', title: 'Cartoons', prompt: 'Create a cute cartoon cat wearing sunglasses', color: '#a16207' },
];
export const IMAGE_SAMPLES_EDIT = [
  { emoji: '🌅', title: 'Change background', prompt: 'Change the background of this photo to a beautiful beach', color: '#0369a1' },
  { emoji: '☀️', title: 'Brighten photo', prompt: 'Brighten this photo and make the colors more vivid', color: '#b45309' },
  { emoji: '🎭', title: 'Cartoon style', prompt: 'Turn this photo into a cartoon', color: '#7e22ce' },
  { emoji: '🧹', title: 'Remove object', prompt: 'Remove the object in the background of this photo', color: '#475569' },
];

export const VOICE_GROUP_NAMES: Record<string, string> = {
  'en-GB': 'British English', 'en-US': 'American English', 'en-NG': 'Nigerian English', 'en-AU': 'Australian English', 'en-IN': 'Indian English', 'en-ZA': 'South African English',
  'ha-NG': 'Hausa', 'fr-FR': 'French', 'ar-SA': 'Arabic', 'es-ES': 'Spanish', 'pt-BR': 'Portuguese (Brazil)', 'de-DE': 'German',
};
export const voiceGroupLabel = (code: string) => {
  const normalized = (code || '').replace('_', '-');
  if (VOICE_GROUP_NAMES[normalized]) return VOICE_GROUP_NAMES[normalized];
  try {
    const names = new (Intl as any).DisplayNames(['en'], { type: 'language' });
    return names.of(normalized) || normalized || 'Other';
  } catch (_error) {
    return normalized || 'Other';
  }
};

export type NoticeState = { title: string; body: string; id: number; category?: string };
export let bannerListener: ((notice: NoticeState | null) => void) | null = null;
export let bannerCounter = 0;
export let noticeOpenHandler: ((category: string) => void) | null = null;
// In-app notification banner: shown while IK TECH AI is open. Tapping it opens the place it is about.
export const showNoticeBanner = (title: string, body: string, category?: string) => {
  bannerCounter += 1;
  if (bannerListener) bannerListener({ title, body, id: bannerCounter, category });
};

// ── Web push (notifications that pop up on the phone) ──
export const WORKER_URL = 'https://autumn-field-496d.ibrahimkhalil79199.workers.dev/';
export const WEB_PUSH_VAPID_KEY = 'BLYQWOsvM-Gj-TKuefAoXf48sjVFZtm75N2MBwHQujzY-NgOS3AqTg_1gUmmFvCMOp2mqtE0oHRozpj-aCfQa0U';
export const PUSH_TOKEN_KEY = 'ik-tech-ai:push-token:v1';

// The app may live at "/ik-tech-ai/" (Replit) or at the root "/" (Cloudflare Pages).
export const getWebBasePath = () => {
  try {
    const path: string = (globalThis as any).location?.pathname || '/';
    return path === '/ik-tech-ai' || path.startsWith('/ik-tech-ai/') ? '/ik-tech-ai/' : '/';
  } catch (_error) {
    return '/';
  }
};

export let serviceWorkerPromise: Promise<any> | null = null;
export const getServiceWorkerRegistration = async (): Promise<any> => {
  const browser: any = globalThis as any;
  if (Platform.OS !== 'web' || !browser.navigator?.serviceWorker) return null;
  if (!serviceWorkerPromise) {
    const base = getWebBasePath();
    serviceWorkerPromise = browser.navigator.serviceWorker
      .register(`${base}firebase-messaging-sw.js`, { scope: base })
      .then(() => browser.navigator.serviceWorker.ready)
      .catch((error: unknown) => {
        console.warn('[IK TECH AI] Service worker could not start:', error);
        return null;
      });
  }
  return serviceWorkerPromise;
};

// Shows a real phone notification through the service worker (works when the page is in the background).
export const showSystemNotification = async (title: string, body: string, category: string): Promise<boolean> => {
  try {
    const browser: any = globalThis as any;
    if (!browser.Notification || browser.Notification.permission !== 'granted') return false;
    const registration = await getServiceWorkerRegistration();
    if (!registration) return false;
    await registration.showNotification(title, {
      body,
      tag: category,
      data: { category, url: `${registration.scope}?open=${encodeURIComponent(category)}` },
    });
    return true;
  } catch (_error) {
    return false;
  }
};

export const callWorker = async (payload: Record<string, unknown>) => {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) return null;
  return fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(payload),
  });
};

export function NoticeBannerHost() {
  const [notice, setNotice] = useState<NoticeState | null>(null);
  useEffect(() => {
    bannerListener = setNotice;
    return () => { if (bannerListener === setNotice) bannerListener = null; };
  }, []);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice((current) => (current && current.id === notice.id ? null : current)), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  if (!notice) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: Platform.OS === 'web' ? 14 : 48, left: 14, right: 14, zIndex: 9999, elevation: 30, alignItems: 'center' }}>
      <Pressable onPress={() => { const target = notice.category; setNotice(null); if (target && noticeOpenHandler) noticeOpenHandler(target); }} style={{ width: '100%', maxWidth: 520, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: '#13202f', borderWidth: 1, borderColor: '#2b4668' }} accessibilityLabel="Dismiss notification">
        <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563a8', marginRight: 12 }}>
          <Ionicons name="notifications" size={20} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }} numberOfLines={1}>{notice.title}</Text>
          <Text style={{ color: '#c4d3e6', fontSize: 14, marginTop: 2 }} numberOfLines={2}>{notice.body}</Text>
        </View>
        <Ionicons name="close" size={18} color="#8da4c0" />
      </Pressable>
    </View>
  );
}

export let ImageManipulatorModule: any = null;
try { ImageManipulatorModule = require('expo-image-manipulator'); } catch (_error) { ImageManipulatorModule = null; }
export let SvgModule: any = null;
try { SvgModule = require('react-native-svg'); } catch (_error) { SvgModule = null; }
export let ViewShotModule: any = null;
try { ViewShotModule = require('react-native-view-shot'); } catch (_error) { ViewShotModule = null; }
export let NotificationsModule: any = null;
try { NotificationsModule = require('expo-notifications'); } catch (_error) { NotificationsModule = null; }

// ───────────────── Downloads / opening files (optional packages, graceful fallbacks) ─────────────────
export let FileSystemModule: any = null;
try { FileSystemModule = require('expo-file-system/legacy'); } catch (_error) { FileSystemModule = null; }
if (!FileSystemModule) { try { FileSystemModule = require('expo-file-system'); } catch (_error) { FileSystemModule = null; } }
export let SharingModule: any = null;
try { SharingModule = require('expo-sharing'); } catch (_error) { SharingModule = null; }
export let IntentLauncherModule: any = null;
try { IntentLauncherModule = require('expo-intent-launcher'); } catch (_error) { IntentLauncherModule = null; }

export const DOWNLOAD_DIR_KEY = 'ik-tech-ai:download-dir:v1';
export const EXTENSION_MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', html: 'text/html', json: 'application/json', mp4: 'video/mp4', mp3: 'audio/mpeg', zip: 'application/zip', xml: 'text/xml' };
export const MIME_EXTENSION: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'application/pdf': 'pdf', 'text/plain': 'txt', 'video/mp4': 'mp4', 'audio/mpeg': 'mp3' };

export type DownloadSource = { name: string; mimeType?: string; text?: string; uri?: string };

export const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|\n\r]+/g, '_').trim().slice(0, 80) || 'file';

export const describeDownload = (source: DownloadSource) => {
  let fileName = safeFileName(source.name);
  let ext = fileExtension(fileName);
  const mime = (source.mimeType || '').toLowerCase();
  if (!ext && MIME_EXTENSION[mime]) { ext = MIME_EXTENSION[mime]; fileName = `${fileName}.${ext}`; }
  const known = ext && EXTENSION_MIME[ext];
  return {
    fileName,
    safName: known ? fileName.slice(0, -(ext.length + 1)) : fileName,
    safMime: known ? EXTENSION_MIME[ext] : 'application/octet-stream',
  };
};

// Android asks once where downloads should be saved, then remembers the folder.
export async function getDownloadDirectory(): Promise<string> {
  const SAF = FileSystemModule?.StorageAccessFramework;
  if (!SAF) return '';
  const stored = await AsyncStorage.getItem(DOWNLOAD_DIR_KEY);
  if (stored) return stored;
  await new Promise<void>((resolve) => {
    Alert.alert('Choose a download folder', 'Pick the folder where downloads will be saved (for example Documents or a new folder). You only need to do this once.', [{ text: 'Continue', onPress: () => resolve() }], { cancelable: false });
  });
  const permission = await SAF.requestDirectoryPermissionsAsync();
  if (!permission.granted) return '';
  await AsyncStorage.setItem(DOWNLOAD_DIR_KEY, permission.directoryUri);
  return permission.directoryUri;
}

export async function saveToDevice(source: DownloadSource, options?: { dirUri?: string }): Promise<'saved' | 'shared' | 'cancelled'> {
  const info = describeDownload(source);
  const isText = source.text !== undefined;

  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') throw new Error('Downloads are not available here.');
    const href = isText ? URL.createObjectURL(new Blob([source.text || ''], { type: 'text/plain;charset=utf-8' })) : (source.uri || '');
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = info.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return 'saved';
  }

  const FS = FileSystemModule;
  if (!FS) {
    if (isText) { await Share.share({ message: source.text || '', title: info.fileName }); return 'shared'; }
    throw new Error('Saving files needs the expo-file-system package.');
  }

  let base64 = '';
  if (!isText) {
    if (!source.uri) throw new Error('This item has no file to save.');
    try {
      base64 = source.uri.startsWith('data:') ? source.uri.slice(source.uri.indexOf(',') + 1) : await FS.readAsStringAsync(source.uri, { encoding: 'base64' });
    } catch (_error) {
      throw new Error('The file is no longer available on this phone. Please add it again.');
    }
  }
  const content = isText ? (source.text || '') : base64;
  const encoding = isText ? 'utf8' : 'base64';

  const SAF = FS.StorageAccessFramework;
  if (Platform.OS === 'android' && SAF) {
    let dirUri = options?.dirUri || '';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!dirUri) {
        dirUri = await getDownloadDirectory();
        if (!dirUri) return 'cancelled';
      }
      try {
        const targetUri = await SAF.createFileAsync(dirUri, info.safName, info.safMime);
        await FS.writeAsStringAsync(targetUri, content, { encoding });
        return 'saved';
      } catch (error) {
        if (attempt === 1) throw error;
        dirUri = '';
        await AsyncStorage.removeItem(DOWNLOAD_DIR_KEY).catch(() => {});
      }
    }
    return 'cancelled';
  }

  // iPhone (and other platforms): write a temporary file and open the share sheet → “Save to Files”.
  const tempUri = `${FS.cacheDirectory}${info.fileName}`;
  await FS.writeAsStringAsync(tempUri, content, { encoding });
  if (SharingModule && (await SharingModule.isAvailableAsync())) {
    await SharingModule.shareAsync(tempUri, { mimeType: source.mimeType, dialogTitle: info.fileName });
    return 'shared';
  }
  await Share.share({ url: tempUri, title: info.fileName });
  return 'shared';
}

export async function saveManyToDevice(sources: DownloadSource[], folderName?: string): Promise<number> {
  const SAF = FileSystemModule?.StorageAccessFramework;
  let count = 0;
  if (Platform.OS === 'android' && SAF) {
    const rootDir = await getDownloadDirectory();
    if (!rootDir) return 0;
    let targetDir = rootDir;
    if (folderName) {
      try { targetDir = await SAF.makeDirectoryAsync(rootDir, safeFileName(folderName)); } catch (_error) { targetDir = rootDir; }
    }
    for (const source of sources) {
      try { if ((await saveToDevice(source, { dirUri: targetDir })) !== 'cancelled') count += 1; } catch (_error) { /* skip this item */ }
    }
    return count;
  }
  for (const source of sources) {
    try {
      const result = await saveToDevice(source);
      if (result === 'cancelled') break;
      count += 1;
    } catch (_error) { /* skip this item */ }
  }
  return count;
}

// Keep a permanent copy of files added to the Library (the picker's cache can be cleared by the phone).
export async function persistPickedFile(uri: string, name: string): Promise<string> {
  const FS = FileSystemModule;
  if (!FS?.documentDirectory) return uri;
  try {
    const dir = `${FS.documentDirectory}ik-library/`;
    await FS.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    const target = `${dir}${Date.now()}-${Math.floor(Math.random() * 1000)}-${safeFileName(name)}`;
    await FS.copyAsync({ from: uri, to: target });
    return target;
  } catch (_error) {
    return uri;
  }
}

export function removePersistedFile(uri?: string) {
  const FS = FileSystemModule;
  if (!FS?.documentDirectory || !uri || !uri.startsWith(FS.documentDirectory)) return;
  FS.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

// Storage allowance shown in Settings → Storage (change this number to suit your app).
export const STORAGE_LIMIT_MB = 500;

export type LibraryFile = { id: string; name: string; uri: string; mimeType?: string; size?: number; createdAt: number; favorite?: boolean; folderId?: string | null };
export type LibraryItem = { key: string; kind: 'image' | 'file' | 'chat'; id: string; name: string; createdAt: number; size: number; uri?: string; mimeType?: string; text?: string; favorite: boolean; folderId: string | null };

export const ACCENT_COLORS = [
  { name: 'Blue', value: '#3182ce' }, { name: 'Purple', value: '#805ad5' }, { name: 'Teal', value: '#0d9488' },
  { name: 'Green', value: '#16a34a' }, { name: 'Orange', value: '#ea580c' }, { name: 'Pink', value: '#db2777' },
  { name: 'Red', value: '#dc2626' }, { name: 'Indigo', value: '#4f46e5' }, { name: 'Cyan', value: '#0891b2' },
  { name: 'Amber', value: '#d97706' },
];

export const LANGUAGES: { name: string; native: string; speech: string }[] = [
  { name: 'English', native: 'English', speech: 'en-US' }, { name: 'Hausa', native: 'Hausa', speech: 'ha-NG' },
  { name: 'Arabic', native: 'العربية', speech: 'ar-SA' }, { name: 'French', native: 'Français', speech: 'fr-FR' },
  { name: 'Spanish', native: 'Español', speech: 'es-ES' }, { name: 'Portuguese', native: 'Português', speech: 'pt-BR' },
  { name: 'German', native: 'Deutsch', speech: 'de-DE' }, { name: 'Italian', native: 'Italiano', speech: 'it-IT' },
  { name: 'Dutch', native: 'Nederlands', speech: 'nl-NL' }, { name: 'Russian', native: 'Русский', speech: 'ru-RU' },
  { name: 'Chinese (Simplified)', native: '简体中文', speech: 'zh-CN' }, { name: 'Chinese (Traditional)', native: '繁體中文', speech: 'zh-TW' },
  { name: 'Japanese', native: '日本語', speech: 'ja-JP' }, { name: 'Korean', native: '한국어', speech: 'ko-KR' },
  { name: 'Hindi', native: 'हिन्दी', speech: 'hi-IN' }, { name: 'Bengali', native: 'বাংলা', speech: 'bn-BD' },
  { name: 'Urdu', native: 'اردو', speech: 'ur-PK' }, { name: 'Turkish', native: 'Türkçe', speech: 'tr-TR' },
  { name: 'Indonesian', native: 'Bahasa Indonesia', speech: 'id-ID' }, { name: 'Malay', native: 'Bahasa Melayu', speech: 'ms-MY' },
  { name: 'Swahili', native: 'Kiswahili', speech: 'sw-KE' }, { name: 'Yoruba', native: 'Yorùbá', speech: 'yo-NG' },
  { name: 'Igbo', native: 'Igbo', speech: 'ig-NG' }, { name: 'Amharic', native: 'አማርኛ', speech: 'am-ET' },
  { name: 'Zulu', native: 'isiZulu', speech: 'zu-ZA' }, { name: 'Somali', native: 'Soomaali', speech: 'so-SO' },
  { name: 'Persian', native: 'فارسی', speech: 'fa-IR' }, { name: 'Hebrew', native: 'עברית', speech: 'he-IL' },
  { name: 'Vietnamese', native: 'Tiếng Việt', speech: 'vi-VN' }, { name: 'Thai', native: 'ไทย', speech: 'th-TH' },
  { name: 'Filipino', native: 'Filipino', speech: 'fil-PH' }, { name: 'Polish', native: 'Polski', speech: 'pl-PL' },
  { name: 'Ukrainian', native: 'Українська', speech: 'uk-UA' }, { name: 'Romanian', native: 'Română', speech: 'ro-RO' },
  { name: 'Greek', native: 'Ελληνικά', speech: 'el-GR' }, { name: 'Czech', native: 'Čeština', speech: 'cs-CZ' },
  { name: 'Swedish', native: 'Svenska', speech: 'sv-SE' }, { name: 'Norwegian', native: 'Norsk', speech: 'nb-NO' },
  { name: 'Danish', native: 'Dansk', speech: 'da-DK' }, { name: 'Finnish', native: 'Suomi', speech: 'fi-FI' },
  { name: 'Hungarian', native: 'Magyar', speech: 'hu-HU' }, { name: 'Tamil', native: 'தமிழ்', speech: 'ta-IN' },
  { name: 'Telugu', native: 'తెలుగు', speech: 'te-IN' }, { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', speech: 'pa-IN' },
];

export const COUNTRIES: { code: string; name: string }[] = ('AF:Afghanistan|AL:Albania|DZ:Algeria|AD:Andorra|AO:Angola|AG:Antigua and Barbuda|AR:Argentina|AM:Armenia|AU:Australia|AT:Austria|AZ:Azerbaijan|BS:Bahamas|BH:Bahrain|BD:Bangladesh|BB:Barbados|BY:Belarus|BE:Belgium|BZ:Belize|BJ:Benin|BT:Bhutan|BO:Bolivia|BA:Bosnia and Herzegovina|BW:Botswana|BR:Brazil|BN:Brunei|BG:Bulgaria|BF:Burkina Faso|BI:Burundi|CV:Cabo Verde|KH:Cambodia|CM:Cameroon|CA:Canada|CF:Central African Republic|TD:Chad|CL:Chile|CN:China|CO:Colombia|KM:Comoros|CG:Congo|CD:DR Congo|CR:Costa Rica|CI:Côte d’Ivoire|HR:Croatia|CU:Cuba|CY:Cyprus|CZ:Czechia|DK:Denmark|DJ:Djibouti|DM:Dominica|DO:Dominican Republic|EC:Ecuador|EG:Egypt|SV:El Salvador|GQ:Equatorial Guinea|ER:Eritrea|EE:Estonia|SZ:Eswatini|ET:Ethiopia|FJ:Fiji|FI:Finland|FR:France|GA:Gabon|GM:Gambia|GE:Georgia|DE:Germany|GH:Ghana|GR:Greece|GD:Grenada|GT:Guatemala|GN:Guinea|GW:Guinea-Bissau|GY:Guyana|HT:Haiti|HN:Honduras|HK:Hong Kong|HU:Hungary|IS:Iceland|IN:India|ID:Indonesia|IR:Iran|IQ:Iraq|IE:Ireland|IL:Israel|IT:Italy|JM:Jamaica|JP:Japan|JO:Jordan|KZ:Kazakhstan|KE:Kenya|KI:Kiribati|XK:Kosovo|KW:Kuwait|KG:Kyrgyzstan|LA:Laos|LV:Latvia|LB:Lebanon|LS:Lesotho|LR:Liberia|LY:Libya|LI:Liechtenstein|LT:Lithuania|LU:Luxembourg|MO:Macao|MG:Madagascar|MW:Malawi|MY:Malaysia|MV:Maldives|ML:Mali|MT:Malta|MH:Marshall Islands|MR:Mauritania|MU:Mauritius|MX:Mexico|FM:Micronesia|MD:Moldova|MC:Monaco|MN:Mongolia|ME:Montenegro|MA:Morocco|MZ:Mozambique|MM:Myanmar|NA:Namibia|NR:Nauru|NP:Nepal|NL:Netherlands|NZ:New Zealand|NI:Nicaragua|NE:Niger|NG:Nigeria|KP:North Korea|MK:North Macedonia|NO:Norway|OM:Oman|PK:Pakistan|PW:Palau|PS:Palestine|PA:Panama|PG:Papua New Guinea|PY:Paraguay|PE:Peru|PH:Philippines|PL:Poland|PT:Portugal|PR:Puerto Rico|QA:Qatar|RO:Romania|RU:Russia|RW:Rwanda|KN:Saint Kitts and Nevis|LC:Saint Lucia|VC:Saint Vincent and the Grenadines|WS:Samoa|SM:San Marino|ST:São Tomé and Príncipe|SA:Saudi Arabia|SN:Senegal|RS:Serbia|SC:Seychelles|SL:Sierra Leone|SG:Singapore|SK:Slovakia|SI:Slovenia|SB:Solomon Islands|SO:Somalia|ZA:South Africa|KR:South Korea|SS:South Sudan|ES:Spain|LK:Sri Lanka|SD:Sudan|SR:Suriname|SE:Sweden|CH:Switzerland|SY:Syria|TW:Taiwan|TJ:Tajikistan|TZ:Tanzania|TH:Thailand|TL:Timor-Leste|TG:Togo|TO:Tonga|TT:Trinidad and Tobago|TN:Tunisia|TR:Türkiye|TM:Turkmenistan|TV:Tuvalu|UG:Uganda|UA:Ukraine|AE:United Arab Emirates|GB:United Kingdom|US:United States|UY:Uruguay|UZ:Uzbekistan|VU:Vanuatu|VA:Vatican City|VE:Venezuela|VN:Vietnam|YE:Yemen|ZM:Zambia|ZW:Zimbabwe')
  .split('|').map((entry) => ({ code: entry.slice(0, 2), name: entry.slice(3) }));

export const countryFlag = (code: string) => (code && code.length === 2
  ? String.fromCodePoint(...code.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0)))
  : '🌍');

export const NOTIFICATION_CATEGORIES = [
  { key: 'responses', label: 'Responses', hint: 'When IK TECH AI finishes a reply while the app is in the background' },
  { key: 'library', label: 'Library', hint: 'When something is saved to your Library' },
  { key: 'projects', label: 'Projects', hint: 'When a project is created' },
  { key: 'memory', label: 'Memory', hint: 'When your memory is updated' },
  { key: 'tips', label: 'Personalized tips', hint: 'A daily tip at 9:00 AM' },
  { key: 'usage', label: 'Usage', hint: 'When app storage is almost full' },
];

export const formatBytes = (bytes: number) => {
  if (!bytes || bytes < 1) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export async function uriToDataUrl(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read file.')));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(blob);
  });
}

export const TEXT_FILE_EXTENSIONS = ['txt', 'md', 'json', 'csv', 'js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'xml', 'yml', 'yaml', 'log', 'java', 'c', 'cpp', 'kt', 'swift', 'sql', 'sh', 'ini', 'env'];
export const CODE_FILE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'xml', 'java', 'c', 'cpp', 'kt', 'swift', 'sql', 'sh', 'json', 'yml', 'yaml'];
export const fileExtension = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');

// ───────────────── UI translations ─────────────────
export const UI_EN = {
  menuSubtitle: 'Your conversations', searchChats: 'Search chats', searchConversations: 'Search conversations...', image: 'Image', library: 'Library', project: 'Project', memory: 'Memory', conversations: 'Conversations', noMatching: 'No matching conversations', noConversations: 'No conversations yet', clearAll: 'Clear All', profile: 'Profile', settings: 'Settings', security: 'Security', email: 'Email', dateOfBirth: 'Date of Birth', editProfile: 'Edit Profile', saveProfile: 'Save Profile', messagePlaceholder: 'Message IK TECH AI...', addImage: 'Add an image', takePhoto: 'Take Photo', choosePhotos: 'Choose from Photos', browseFiles: 'Browse Files', cancel: 'Cancel', suggestions: SUGGESTIONS,
  appearance: 'Appearance', systemDefault: 'System (default)', light: 'Light', dark: 'Dark', accent: 'Accent color', notifications: 'Notifications', language: 'Language', country: 'Country', storage: 'Storage', changePassword: 'Change Password', signOut: 'Sign Out', settingsNote: 'Your preferences are saved on this phone.', searchCountry: 'Search country', noResults: 'No results',
  libSuggested: 'Suggested', libFavorites: 'Favorites', libFolders: 'Folders', libImages: 'Images', libAll: 'All', search: 'Search', today: 'Today', yesterday: 'Yesterday',
  addYourFiles: 'Add your files', addYourFilesDesc: 'Ask questions, get summaries, and more with your files.', newFolder: 'New folder', folderName: 'Folder name', create: 'Create', delete: 'Delete',
  enableMemory: 'Enable memory', memorySummary: 'Memory summary', on: 'On', off: 'Off', copy: 'Copy', share: 'Share', more: 'More', regenerate: 'Regenerate response',
};
export type UiStrings = typeof UI_EN;

export const TRANSLATED_KEYS = ['image', 'library', 'project', 'memory', 'settings', 'security', 'conversations', 'clearAll', 'searchChats', 'cancel', 'appearance', 'systemDefault', 'light', 'dark', 'accent', 'notifications', 'language', 'country', 'storage', 'signOut', 'libSuggested', 'libFavorites', 'libFolders', 'libImages', 'libAll', 'search', 'today', 'yesterday', 'enableMemory', 'memorySummary', 'on', 'off', 'copy', 'share', 'more', 'regenerate'];
export const makeTranslation = (values: string[]): Partial<UiStrings> => {
  const result: Record<string, string> = {};
  TRANSLATED_KEYS.forEach((key, index) => { result[key] = values[index]; });
  return result as Partial<UiStrings>;
};

export const UI_TRANSLATIONS: Record<string, Partial<UiStrings>> = {
  Hausa: {
    menuSubtitle: 'Hirarrakinka', searchChats: 'Nemi hirarraki', searchConversations: 'Nemi hirarraki...', image: 'Hoto', library: 'Laburare', project: 'Ayyuka', memory: 'Abubuwan tunawa', conversations: 'Hirarraki', noMatching: 'Ba a sami hirarrakin da suka dace ba', noConversations: 'Babu hira tukuna', clearAll: 'Goge duka', profile: 'Bayanan martaba', settings: 'Saituna', security: 'Tsaro', email: 'Imel', dateOfBirth: 'Ranar haihuwa', editProfile: 'Gyara bayanan martaba', saveProfile: 'Ajiye bayanai', messagePlaceholder: 'Saƙo zuwa IK TECH AI...', addImage: 'Ƙara hoto', takePhoto: 'Ɗauki hoto', choosePhotos: 'Zaɓi daga hotuna', browseFiles: 'Bincika fayiloli', cancel: 'Soke', suggestions: ['Yi mini bayani game da wani abu', 'Taimaka mini koyon programming', 'Fassara wannan mini', 'Taimaka mini warware matsala'],
    appearance: 'Yanayin bayyanar', systemDefault: 'Na wayar (default)', light: 'Haske', dark: 'Duhu', accent: 'Launin app', notifications: 'Sanarwa', language: 'Harshe', country: 'Ƙasa', storage: 'Ma’aji', signOut: 'Fita daga asusu', changePassword: 'Canza kalmar sirri', searchCountry: 'Nemi ƙasa', libSuggested: 'Shawarwari', libFavorites: 'Waɗanda aka fi so', libFolders: 'Manyan fayiloli', libImages: 'Hotuna', libAll: 'Duka', search: 'Bincika', today: 'Yau', yesterday: 'Jiya', enableMemory: 'Kunna ma’ajiyar tunawa', memorySummary: 'Taƙaitaccen abin tunawa', on: 'A kunne', off: 'A kashe', copy: 'Kwafa', share: 'Raba', more: 'Ƙari', regenerate: 'Sake samar da amsa',
  },
  Arabic: {
    menuSubtitle: 'محادثاتك', searchChats: 'البحث في المحادثات', searchConversations: 'ابحث في المحادثات...', image: 'الصور', library: 'المكتبة', project: 'المشاريع', memory: 'الذاكرة', conversations: 'المحادثات', noMatching: 'لا توجد محادثات مطابقة', noConversations: 'لا توجد محادثات بعد', clearAll: 'مسح الكل', profile: 'الملف الشخصي', settings: 'الإعدادات', security: 'الأمان', email: 'البريد الإلكتروني', dateOfBirth: 'تاريخ الميلاد', editProfile: 'تعديل الملف الشخصي', saveProfile: 'حفظ الملف الشخصي', messagePlaceholder: 'أرسل رسالة إلى IK TECH AI...', addImage: 'إضافة صورة', takePhoto: 'التقاط صورة', choosePhotos: 'اختر من الصور', browseFiles: 'تصفح الملفات', cancel: 'إلغاء', suggestions: ['اشرح لي شيئًا', 'ساعدني على تعلم البرمجة', 'ترجم هذا لي', 'ساعدني في حل مشكلة'],
    appearance: 'المظهر', systemDefault: 'النظام (افتراضي)', light: 'فاتح', dark: 'داكن', accent: 'لون التمييز', notifications: 'الإشعارات', language: 'اللغة', country: 'الدولة', storage: 'التخزين', signOut: 'تسجيل الخروج', changePassword: 'تغيير كلمة المرور', searchCountry: 'ابحث عن دولة', libSuggested: 'مقترح', libFavorites: 'المفضلة', libFolders: 'المجلدات', libImages: 'الصور', libAll: 'الكل', search: 'بحث', today: 'اليوم', yesterday: 'أمس', enableMemory: 'تفعيل الذاكرة', memorySummary: 'ملخص الذاكرة', on: 'مفعّل', off: 'معطّل', copy: 'نسخ', share: 'مشاركة', more: 'المزيد', regenerate: 'إعادة توليد الرد',
  },
  French: makeTranslation(['Images', 'Bibliothèque', 'Projets', 'Mémoire', 'Paramètres', 'Sécurité', 'Conversations', 'Tout effacer', 'Rechercher des discussions', 'Annuler', 'Apparence', 'Système (par défaut)', 'Clair', 'Sombre', 'Couleur d’accent', 'Notifications', 'Langue', 'Pays', 'Stockage', 'Se déconnecter', 'Suggérés', 'Favoris', 'Dossiers', 'Images', 'Tout', 'Rechercher', 'Aujourd’hui', 'Hier', 'Activer la mémoire', 'Résumé de la mémoire', 'Activé', 'Désactivé', 'Copier', 'Partager', 'Plus', 'Régénérer la réponse']),
  Spanish: makeTranslation(['Imágenes', 'Biblioteca', 'Proyectos', 'Memoria', 'Ajustes', 'Seguridad', 'Conversaciones', 'Borrar todo', 'Buscar chats', 'Cancelar', 'Apariencia', 'Sistema (predeterminado)', 'Claro', 'Oscuro', 'Color de énfasis', 'Notificaciones', 'Idioma', 'País', 'Almacenamiento', 'Cerrar sesión', 'Sugeridos', 'Favoritos', 'Carpetas', 'Imágenes', 'Todo', 'Buscar', 'Hoy', 'Ayer', 'Activar memoria', 'Resumen de memoria', 'Activado', 'Desactivado', 'Copiar', 'Compartir', 'Más', 'Regenerar respuesta']),
  Portuguese: makeTranslation(['Imagens', 'Biblioteca', 'Projetos', 'Memória', 'Configurações', 'Segurança', 'Conversas', 'Limpar tudo', 'Pesquisar conversas', 'Cancelar', 'Aparência', 'Sistema (padrão)', 'Claro', 'Escuro', 'Cor de destaque', 'Notificações', 'Idioma', 'País', 'Armazenamento', 'Sair', 'Sugeridos', 'Favoritos', 'Pastas', 'Imagens', 'Tudo', 'Pesquisar', 'Hoje', 'Ontem', 'Ativar memória', 'Resumo da memória', 'Ativado', 'Desativado', 'Copiar', 'Compartilhar', 'Mais', 'Gerar resposta novamente']),
  German: makeTranslation(['Bilder', 'Bibliothek', 'Projekte', 'Gedächtnis', 'Einstellungen', 'Sicherheit', 'Unterhaltungen', 'Alle löschen', 'Chats durchsuchen', 'Abbrechen', 'Erscheinungsbild', 'System (Standard)', 'Hell', 'Dunkel', 'Akzentfarbe', 'Benachrichtigungen', 'Sprache', 'Land', 'Speicher', 'Abmelden', 'Vorgeschlagen', 'Favoriten', 'Ordner', 'Bilder', 'Alle', 'Suchen', 'Heute', 'Gestern', 'Gedächtnis aktivieren', 'Gedächtnis-Zusammenfassung', 'An', 'Aus', 'Kopieren', 'Teilen', 'Mehr', 'Antwort neu generieren']),
  'Chinese (Simplified)': makeTranslation(['图片', '资料库', '项目', '记忆', '设置', '安全', '对话', '全部清除', '搜索聊天', '取消', '外观', '跟随系统（默认）', '浅色', '深色', '强调色', '通知', '语言', '国家/地区', '存储', '退出登录', '推荐', '收藏', '文件夹', '图片', '全部', '搜索', '今天', '昨天', '启用记忆', '记忆摘要', '开', '关', '复制', '分享', '更多', '重新生成回复']),
  Hindi: makeTranslation(['चित्र', 'लाइब्रेरी', 'प्रोजेक्ट', 'मेमोरी', 'सेटिंग्स', 'सुरक्षा', 'बातचीत', 'सब साफ़ करें', 'चैट खोजें', 'रद्द करें', 'दिखावट', 'सिस्टम (डिफ़ॉल्ट)', 'लाइट', 'डार्क', 'एक्सेंट रंग', 'सूचनाएँ', 'भाषा', 'देश', 'स्टोरेज', 'साइन आउट', 'सुझाए गए', 'पसंदीदा', 'फ़ोल्डर', 'चित्र', 'सभी', 'खोजें', 'आज', 'कल', 'मेमोरी चालू करें', 'मेमोरी सारांश', 'चालू', 'बंद', 'कॉपी करें', 'साझा करें', 'और', 'उत्तर फिर से बनाएँ']),
  Swahili: makeTranslation(['Picha', 'Maktaba', 'Miradi', 'Kumbukumbu', 'Mipangilio', 'Usalama', 'Mazungumzo', 'Futa yote', 'Tafuta mazungumzo', 'Ghairi', 'Mwonekano', 'Mfumo (chaguo-msingi)', 'Mwanga', 'Giza', 'Rangi kuu', 'Arifa', 'Lugha', 'Nchi', 'Hifadhi', 'Toka', 'Zilizopendekezwa', 'Vipendwa', 'Folda', 'Picha', 'Zote', 'Tafuta', 'Leo', 'Jana', 'Washa kumbukumbu', 'Muhtasari wa kumbukumbu', 'Imewashwa', 'Imezimwa', 'Nakili', 'Shiriki', 'Zaidi', 'Tengeneza jibu upya']),
  Turkish: makeTranslation(['Görseller', 'Kitaplık', 'Projeler', 'Hafıza', 'Ayarlar', 'Güvenlik', 'Sohbetler', 'Tümünü temizle', 'Sohbetlerde ara', 'İptal', 'Görünüm', 'Sistem (varsayılan)', 'Açık', 'Koyu', 'Vurgu rengi', 'Bildirimler', 'Dil', 'Ülke', 'Depolama', 'Çıkış yap', 'Önerilen', 'Favoriler', 'Klasörler', 'Görseller', 'Tümü', 'Ara', 'Bugün', 'Dün', 'Hafızayı etkinleştir', 'Hafıza özeti', 'Açık', 'Kapalı', 'Kopyala', 'Paylaş', 'Daha fazla', 'Yanıtı yeniden oluştur']),
  Russian: makeTranslation(['Изображения', 'Библиотека', 'Проекты', 'Память', 'Настройки', 'Безопасность', 'Беседы', 'Очистить всё', 'Поиск чатов', 'Отмена', 'Оформление', 'Система (по умолчанию)', 'Светлая', 'Тёмная', 'Цвет акцента', 'Уведомления', 'Язык', 'Страна', 'Хранилище', 'Выйти', 'Рекомендуемые', 'Избранное', 'Папки', 'Изображения', 'Все', 'Поиск', 'Сегодня', 'Вчера', 'Включить память', 'Сводка памяти', 'Вкл.', 'Выкл.', 'Копировать', 'Поделиться', 'Ещё', 'Повторить ответ']),
  Indonesian: makeTranslation(['Gambar', 'Pustaka', 'Proyek', 'Memori', 'Pengaturan', 'Keamanan', 'Percakapan', 'Hapus semua', 'Cari obrolan', 'Batal', 'Tampilan', 'Sistem (default)', 'Terang', 'Gelap', 'Warna aksen', 'Notifikasi', 'Bahasa', 'Negara', 'Penyimpanan', 'Keluar', 'Disarankan', 'Favorit', 'Folder', 'Gambar', 'Semua', 'Cari', 'Hari ini', 'Kemarin', 'Aktifkan memori', 'Ringkasan memori', 'Aktif', 'Nonaktif', 'Salin', 'Bagikan', 'Lainnya', 'Buat ulang jawaban']),
};
export const buildUiText = (language: string): UiStrings => ({ ...UI_EN, ...(UI_TRANSLATIONS[language] || {}) } as UiStrings);

export const stripMarkdownForSpeech = (text: string) => text.replace(/```[\s\S]*?```/g, ' ').replace(/[`*_#>~]/g, '');

export function getNigeriaDateTimeAnswer(question: string): string | null {
  const q = question.toLowerCase().replace(/[’']/g, "'").replace(/[?!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/\b(islamic|islam|hijri|hijra|musulinci|musulunci|musulmi|ramadan)\b/.test(q)) return null;
  const asksDate = /\b(today is what|what is the date today|what's the date today|what is today's date|what date is it|today date|what day is today|which day is today)\b/.test(q);
  const asksTime = /\b(which time now|what time is it|what time now|what is the time|time now|current time|tell me the time)\b/.test(q);
  if (!asksDate && !asksTime) return null;
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(now);
  if (asksDate && asksTime) return `In Nigeria, today is ${date}, and the current time is ${time} (WAT).`;
  if (asksTime) return `The current time in Nigeria is ${time} (WAT).`;
  return `Today in Nigeria is ${date}.`;
}


export const ATTACHMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp', mpeg: 'video/mpeg', mpg: 'video/mpeg', avi: 'video/avi',
  mp3: 'audio/mp3', m4a: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', aac: 'audio/aac',
};

export const COPY_INTENT = /\b(copy|copying|kwafa|kwafi|kwafe|kwafin)\b/i;
export const COPY_STYLE_HINT = 'The user wants to COPY part of your answer. Write one short normal sentence first (optional), then put ONLY the exact text to be copied inside a fenced block that starts with ```copy on its own line and ends with ``` on its own line. Nothing else may go inside that block: no title, no explanation, no quotes, no markdown symbols. Put any extra explanation after the block.';
export const looksHausa = (text: string) => /\b(ina|yaya|sannu|kai|wannan|wancan|domin|don|nake|zan|zaka|zaki|yanzu|menene|me ya|ban|ko|amma|kuma|fassara|bani|taimaka|inaso|ina so|abu|abin|gaya|fadamin|faɗa|nan|yau|jiya)\b/i.test(text);
export const HAUSA_STYLE_HINT = 'The user is writing Hausa. Reply in natural, correct standard Hausa (Hausar Najeriya) like an educated native speaker: proper grammar, use the hooked letters ɓ ɗ ƙ ƴ, short clear sentences, and never translate word-for-word from English. Keep technical words such as app, code, error, file in English. Greet back properly if the user greets (Sannu, Barka da safiya/rana/yamma, Ina kwana).';

export const setNoticeOpenHandler = (handler: ((category: string) => void) | null) => { noticeOpenHandler = handler; };
import React, { useState } from 'react';
import {
  Pressable,
  Text,
  View,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ClipboardModule,
} from '@/lib/ik/core';
import {
  baseStyles,
} from '@/lib/ik/styles';

export function renderInlineMarkdown(
  text: string,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];

  const regex =
    /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|~[^~]+~|\*[^*]+\*|_[^_]+_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`plain-${key++}`}>
          {text.slice(lastIndex, match.index)}
        </Text>,
      );
    }

    const token = match[0];

    if (
      token.startsWith('**') &&
      token.endsWith('**')
    ) {
      parts.push(
        <Text
          key={`bold-${key++}`}
          style={baseStyles.markdownBold}
        >
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (
      token.startsWith('__') &&
      token.endsWith('__')
    ) {
      parts.push(
        <Text
          key={`bold-${key++}`}
          style={baseStyles.markdownBold}
        >
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (
      token.startsWith('~~') &&
      token.endsWith('~~')
    ) {
      parts.push(
        <Text
          key={`strike-${key++}`}
          style={baseStyles.markdownStrike}
        >
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (
      token.startsWith('~') &&
      token.endsWith('~')
    ) {
      parts.push(
        <Text
          key={`strike-${key++}`}
          style={baseStyles.markdownStrike}
        >
          {token.slice(1, -1)}
        </Text>,
      );
    } else if (
      token.startsWith('`') &&
      token.endsWith('`')
    ) {
      parts.push(
        <Text
          key={`code-${key++}`}
          style={baseStyles.markdownCode}
        >
          {token.slice(1, -1)}
        </Text>,
      );
    } else if (
      token.startsWith('*') &&
      token.endsWith('*')
    ) {
      parts.push(
        <Text
          key={`italic-${key++}`}
          style={baseStyles.markdownItalic}
        >
          {token.slice(1, -1)}
        </Text>,
      );
    } else if (
      token.startsWith('_') &&
      token.endsWith('_')
    ) {
      parts.push(
        <Text
          key={`italic-${key++}`}
          style={baseStyles.markdownItalic}
        >
          {token.slice(1, -1)}
        </Text>,
      );
    } else {
      parts.push(
        <Text key={`text-${key++}`}>
          {token}
        </Text>,
      );
    }

    lastIndex =
      match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`plain-${key++}`}>
        {text.slice(lastIndex)}
      </Text>,
    );
  }

  return parts;
}

// A box that holds ONLY the text the user asked to copy, with its own Copy button.
export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      if (ClipboardModule?.setStringAsync) await ClipboardModule.setStringAsync(text);
      else await Share.share({ message: text });
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_error) { /* ignore */ }
  };
  return (
    <View style={{ width: '100%', marginVertical: 8, borderRadius: 12, backgroundColor: '#07111d', borderWidth: 1, borderColor: '#1c3854', overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0d2238' }}>
        <Text style={{ color: '#91a8c3', fontSize: 12, fontWeight: '700' }}>Text to copy</Text>
        <Pressable onPress={handleCopy} hitSlop={8} accessibilityLabel="Copy this text" style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14, backgroundColor: copied ? '#1f7a4d' : '#2563a8' }}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800', marginLeft: 5 }}>{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      </View>
      <Text selectable style={{ color: '#e6f1ff', fontSize: 15, lineHeight: 22, padding: 12 }}>{text}</Text>
    </View>
  );
}

export function renderMarkdown(
  text: string,
): React.ReactNode {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeKey = 0;
  let codeLang = '';

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (
      trimmed.startsWith('```')
    ) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
        codeLang = trimmed.slice(3).trim().toLowerCase();
      } else {
        result.push(
          codeLang === 'copy' ? (
            <CopyBlock key={`copy-block-${codeKey++}`} text={codeLines.join('\n').trim()} />
          ) : (
          <View
            key={`code-block-${codeKey++}`}
            style={baseStyles.codeBlock}
          >
            <Text style={baseStyles.codeBlockText}>
              {codeLines.join('\n')}
            </Text>
          </View>
          ),
        );

        inCodeBlock = false;
        codeLines = [];
      }

      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (!trimmed) {
      result.push(
        <View
          key={`space-${index}`}
          style={baseStyles.markdownSpacer}
        />,
      );

      return;
    }

    const headingMatch =
      trimmed.match(
        /^(#{1,3})\s+(.*)$/,
      );

    if (headingMatch) {
      const level =
        headingMatch[1].length;
      const headingText =
        headingMatch[2];

      result.push(
        <Text
          key={`heading-${index}`}
          style={
            level === 1
              ? baseStyles.markdownH1
              : level === 2
                ? baseStyles.markdownH2
                : baseStyles.markdownH3
          }
        >
          {renderInlineMarkdown(
            headingText,
          )}
        </Text>,
      );

      return;
    }

    const bulletMatch =
      trimmed.match(
        /^[-*+]\s+(.*)$/,
      );

    if (bulletMatch) {
      result.push(
        <View
          key={`bullet-${index}`}
          style={baseStyles.markdownListRow}
        >
          <Text style={baseStyles.markdownBullet}>
            •
          </Text>

          <Text
            style={[
              baseStyles.markdownText,
              baseStyles.markdownListText,
            ]}
          >
            {renderInlineMarkdown(
              bulletMatch[1],
            )}
          </Text>
        </View>,
      );

      return;
    }

    const numberedMatch =
      trimmed.match(
        /^(\d+)[.)]\s+(.*)$/,
      );

    if (numberedMatch) {
      result.push(
        <View
          key={`number-${index}`}
          style={baseStyles.markdownListRow}
        >
          <Text style={baseStyles.markdownNumber}>
            {numberedMatch[1]}.
          </Text>

          <Text
            style={[
              baseStyles.markdownText,
              baseStyles.markdownListText,
            ]}
          >
            {renderInlineMarkdown(
              numberedMatch[2],
            )}
          </Text>
        </View>,
      );

      return;
    }

    const quoteMatch =
      trimmed.match(
        /^>\s?(.*)$/,
      );

    if (quoteMatch) {
      result.push(
        <View
          key={`quote-${index}`}
          style={baseStyles.markdownQuote}
        >
          <Text style={baseStyles.markdownText}>
            {renderInlineMarkdown(
              quoteMatch[1],
            )}
          </Text>
        </View>,
      );

      return;
    }

    result.push(
      <Text
        key={`line-${index}`}
        style={baseStyles.markdownText}
      >
        {renderInlineMarkdown(line)}
      </Text>,
    );
  });

  if (inCodeBlock && codeLines.length) {
    result.push(
      codeLang === 'copy' ? (
        <CopyBlock key={`copy-block-open-${codeKey++}`} text={codeLines.join('\n').trim()} />
      ) : (
      <View
        key={`code-block-open-${codeKey++}`}
        style={baseStyles.codeBlock}
      >
        <Text style={baseStyles.codeBlockText}>
          {codeLines.join('\n')}
        </Text>
      </View>
      ),
    );
  }

  return <>{result}</>;
}
import React, { useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Share,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '@/lib/chat';
import {
  Alert,
  SUGGESTIONS,
  SvgModule,
  ViewShotModule,
} from '@/lib/ik/core';
import {
  renderMarkdown,
} from '@/lib/ik/markdown';
import {
  baseStyles,
} from '@/lib/ik/styles';

// ───────────────── Image markup (draw on an image) ─────────────────
export function MarkupEditor({ uri, onCancel, onDone }: { uri: string; onCancel: () => void; onDone: (dataUrl: string) => void }) {
  const [paths, setPaths] = useState<{ d: string; color: string }[]>([]);
  const [color, setColor] = useState('#ef4444');
  const [busy, setBusy] = useState(false);
  const currentRef = useRef('');
  const colorRef = useRef('#ef4444');
  const shotRef = useRef<any>(null);
  const svgRef = useRef<any>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const useSvgCapture = !ViewShotModule?.captureRef;
  colorRef.current = color;
  const Svg = SvgModule?.default || SvgModule?.Svg;
  const Path = SvgModule?.Path;
  const SvgImage = SvgModule?.Image;

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      currentRef.current = `M${event.nativeEvent.locationX.toFixed(1)} ${event.nativeEvent.locationY.toFixed(1)}`;
      setPaths((current) => [...current, { d: currentRef.current, color: colorRef.current }]);
    },
    onPanResponderMove: (event) => {
      currentRef.current += ` L${event.nativeEvent.locationX.toFixed(1)} ${event.nativeEvent.locationY.toFixed(1)}`;
      const d = currentRef.current;
      setPaths((current) => (current.length ? [...current.slice(0, -1), { d, color: colorRef.current }] : current));
    },
  }), []);

  const finish = async () => {
    if (!paths.length) { onCancel(); return; }
    try {
      setBusy(true);
      if (useSvgCapture) {
        if (!svgRef.current?.toDataURL) throw new Error('no-capture');
        svgRef.current.toDataURL((base64: string) => { setBusy(false); onDone(`data:image/png;base64,${base64}`); }, { width: box.width, height: box.height });
        return;
      }
      const base64 = await ViewShotModule.captureRef(shotRef, { format: 'jpg', quality: 0.92, result: 'base64' });
      onDone(`data:image/jpeg;base64,${base64}`);
    } catch (_error) {
      Alert.alert('Could not save markup', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'web' ? 18 : 44 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 10 }}>
        <Pressable onPress={onCancel} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a2a2c' }} accessibilityLabel="Cancel markup">
          <Ionicons name="close" size={24} color="#ffffff" />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
          {['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ffffff'].map((value) => (
            <Pressable key={value} onPress={() => setColor(value)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: value, borderWidth: color === value ? 3 : 1, borderColor: color === value ? '#9acaff' : '#555555' }} />
          ))}
        </View>
        <Pressable onPress={() => setPaths((current) => current.slice(0, -1))} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a2a2c', marginRight: 8 }} accessibilityLabel="Undo">
          <Ionicons name="arrow-undo-outline" size={22} color="#ffffff" />
        </Pressable>
        <Pressable onPress={finish} disabled={busy} style={{ height: 44, borderRadius: 22, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: '#ffffff' }} accessibilityLabel="Done">
          {busy ? <ActivityIndicator color="#000000" /> : <Text style={{ color: '#000000', fontWeight: '800', fontSize: 15 }}>Done</Text>}
        </Pressable>
      </View>
      <View ref={shotRef} collapsable={false} onLayout={(event) => setBox({ width: Math.round(event.nativeEvent.layout.width), height: Math.round(event.nativeEvent.layout.height) })} style={{ flex: 1, backgroundColor: '#000000' }} {...responder.panHandlers}>
        {!useSvgCapture ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" /> : null}
        {Svg && Path ? (
          <Svg ref={svgRef} width={box.width || '100%'} height={box.height || '100%'} style={StyleSheet.absoluteFill} pointerEvents="none">
            {useSvgCapture && SvgImage && box.width ? <SvgImage x={0} y={0} width={box.width} height={box.height} href={{ uri }} preserveAspectRatio="xMidYMid meet" /> : null}
            {paths.map((item, index) => (
              <Path key={index} d={item.d} stroke={item.color} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

export function MessageBubble({
  message,
  onOpenImage,
  accentColor,
  iconColor,
  showActions,
  feedback,
  speaking,
  onCopy,
  onFeedback,
  onSpeak,
  onShare,
  onMore,
}: {
  message: ChatMessage;
  onOpenImage: (uri: string) => void;
  accentColor?: string;
  iconColor?: string;
  showActions?: boolean;
  feedback?: 'like' | 'dislike';
  speaking?: boolean;
  onCopy?: (message: ChatMessage) => Promise<void> | void;
  onFeedback?: (message: ChatMessage, type: 'like' | 'dislike') => void;
  onSpeak?: (message: ChatMessage) => void;
  onShare?: (message: ChatMessage) => void;
  onMore?: (message: ChatMessage) => void;
}) {
  const isUser =
    message.role === 'user';
  const [copied, setCopied] = useState(false);
  const mutedIcon = iconColor || '#91a8c3';
  const activeIcon = accentColor || '#3182ce';

  return (
    <View>
      <View
        style={[
          baseStyles.messageRow,
          isUser
            ? baseStyles.userMessageRow
            : baseStyles.assistantMessageRow,
        ]}
      >
        <View
          style={[
            baseStyles.messageBubble,
            isUser
              ? baseStyles.userBubble
              : baseStyles.assistantBubble,
            isUser && accentColor ? { backgroundColor: accentColor } : null,
          ]}
        >
          {message.attachment ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%', marginBottom: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.22)' }}>
              <Ionicons name={message.attachment.mimeType.startsWith('video') ? 'videocam-outline' : message.attachment.mimeType.startsWith('audio') ? 'musical-notes-outline' : 'document-text-outline'} size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{message.attachment.name}</Text>
            </View>
          ) : null}
          {message.image ? (
            <Pressable
              onPress={() => onOpenImage(message.image!.uri)}
              accessibilityRole="button"
              accessibilityLabel="Open image full screen"
              style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
            >
              <Image
                source={{ uri: message.image.uri }}
                style={baseStyles.messageImage as React.ComponentProps<typeof Image>['style']}
                resizeMode="contain"
              />
            </Pressable>
          ) : null}

          <View style={baseStyles.messageContent}>
            {renderMarkdown(
              message.content,
            )}
          </View>
        </View>
      </View>

      {!isUser && showActions ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 6, marginTop: -2, marginBottom: 14 }}>
          <Pressable
            hitSlop={6}
            accessibilityLabel="Copy"
            style={{ padding: 9 }}
            onPress={async () => {
              await onCopy?.(message);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color={copied ? activeIcon : mutedIcon} />
          </Pressable>
          <Pressable hitSlop={6} accessibilityLabel="Good response" style={{ padding: 9 }} onPress={() => onFeedback?.(message, 'like')}>
            <Ionicons name={feedback === 'like' ? 'thumbs-up' : 'thumbs-up-outline'} size={20} color={feedback === 'like' ? activeIcon : mutedIcon} />
          </Pressable>
          <Pressable hitSlop={6} accessibilityLabel="Bad response" style={{ padding: 9 }} onPress={() => onFeedback?.(message, 'dislike')}>
            <Ionicons name={feedback === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'} size={20} color={feedback === 'dislike' ? activeIcon : mutedIcon} />
          </Pressable>
          <Pressable hitSlop={6} accessibilityLabel="Read aloud" style={{ padding: 9 }} onPress={() => onSpeak?.(message)}>
            <Ionicons name={speaking ? 'stop-circle-outline' : 'volume-medium-outline'} size={20} color={speaking ? activeIcon : mutedIcon} />
          </Pressable>
          <Pressable hitSlop={6} accessibilityLabel="Share" style={{ padding: 9 }} onPress={() => onShare?.(message)}>
            <Ionicons name="share-social-outline" size={20} color={mutedIcon} />
          </Pressable>
          <Pressable hitSlop={6} accessibilityLabel="More" style={{ padding: 9 }} onPress={() => onMore?.(message)}>
            <Ionicons name="ellipsis-vertical" size={20} color={mutedIcon} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function TypingIndicator() {
  return (
    <View
      style={[
        baseStyles.messageRow,
        baseStyles.assistantMessageRow,
      ]}
    >
      <View
        style={[
          baseStyles.messageBubble,
          baseStyles.assistantBubble,
          baseStyles.typingBubble,
        ]}
      >
        <View style={baseStyles.typingDots}>
          <View style={baseStyles.typingDot} />
          <View style={baseStyles.typingDot} />
          <View style={baseStyles.typingDot} />
        </View>
      </View>
    </View>
  );
}

export function EmptyState({
  onSuggestion,
  suggestions = SUGGESTIONS,
}: {
  onSuggestion: (suggestion: string) => void;
  suggestions?: string[];
}) {
  return (
    <View style={baseStyles.emptyState}>
      <View style={baseStyles.logoCircle}>
        <Text style={baseStyles.logoText}>
          IK
        </Text>
      </View>

      <Text style={baseStyles.emptyTitle}>
        IK TECH AI
      </Text>

      <Text style={baseStyles.emptySubtitle}>
        Your AI assistant
      </Text>

      <View style={baseStyles.suggestions}>
        {suggestions.map(
          (suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() =>
                onSuggestion(
                  suggestion,
                )
              }
              style={({ pressed }) => [
                baseStyles.suggestionButton,
                pressed &&
                  baseStyles.pressed,
              ]}
            >
              <Text
                style={
                  baseStyles.suggestionText
                }
              >
                {suggestion}
              </Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}
import { Platform, StyleSheet } from 'react-native';

export const baseStyleDefinitions = {
  authScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#050b14',
  },

  authTitle: {
    color: '#f3f8ff',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 4,
  },

  authSubtitle: {
    color: '#7187a1',
    fontSize: 14,
    marginTop: 7,
    marginBottom: 25,
    textAlign: 'center',
  },

  authInput: {
    width: '100%',
    maxWidth: 430,
    minHeight: 52,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 15,
    backgroundColor: '#0a1727',
    borderWidth: 1,
    borderColor: '#19304a',
    color: '#f2f7fc',
    fontSize: 15,
  },

  authError: {
    width: '100%',
    maxWidth: 430,
    marginBottom: 12,
    color: '#ffb9c0',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },

  authButton: {
    width: '100%',
    maxWidth: 430,
    minHeight: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#174c7a',
    marginTop: 4,
    marginBottom: 18,
  },

  authButtonText: {
    color: '#f0f7ff',
    fontSize: 15,
    fontWeight: '800',
  },

  authSwitchText: {
    color: '#79aee0',
    fontSize: 13,
    textAlign: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    backgroundColor: '#050b14',
  },

  background: {
    flex: 1,
    width: '100%',
    backgroundColor: '#050b14',
    overflow: 'hidden',
  },

  backgroundGlowOne: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#0b2c4f',
    opacity: 0.25,
    top: -120,
    left: -100,
  },

  backgroundGlowTwo: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#102c5a',
    opacity: 0.18,
    bottom: -160,
    right: -120,
  },

  keyboardContainer: {
    flex: 1,
    width: '100%',
  },

  mainContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },

  largeMainContainer: {
    width: '100%',
    alignSelf: 'stretch',
  },

  header: {
    width: '100%',
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#142337',
    backgroundColor: '#07111f',
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1b2d',
    borderWidth: 1,
    borderColor: '#19304a',
  },

  headerButtonText: {
    color: '#dcecff',
    fontSize: 22,
    fontWeight: '700',
  },

  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  profileHeaderButtonText: {
    fontSize: 22,
  },


  headerTitle: {
    color: '#f5f9ff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  headerSubtitle: {
    marginTop: 2,
    color: '#6f8aa8',
    fontSize: 10,
    fontWeight: '600',
  },

  chatWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },

  largeChatWrapper: {
    width: '100%',
    alignSelf: 'stretch',
  },

  chatContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 20,
    width: '100%',
  },

  emptyChatContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },

  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102d4c',
    borderWidth: 1,
    borderColor: '#28547e',
    marginBottom: 16,
  },

  logoText: {
    color: '#ddecff',
    fontSize: 25,
    fontWeight: '900',
  },

  emptyTitle: {
    color: '#f3f7fd',
    fontSize: 24,
    fontWeight: '900',
  },

  emptySubtitle: {
    color: '#7187a1',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 24,
  },

  suggestions: {
    width: '100%',
    gap: 10,
  },

  suggestionButton: {
    width: '100%',
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 15,
    justifyContent: 'center',
    backgroundColor: '#0b1727',
    borderWidth: 1,
    borderColor: '#19304a',
  },

  suggestionText: {
    color: '#bcd0e8',
    fontSize: 14,
  },

  messageRow: {
    width: '100%',
    marginBottom: 12,
    flexDirection: 'row',
  },

  userMessageRow: {
    justifyContent: 'flex-end',
  },

  assistantMessageRow: {
    justifyContent: 'flex-start',
  },

  messageBubble: {
    maxWidth: '88%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  userBubble: {
    backgroundColor: '#174c7a',
    borderBottomRightRadius: 5,
  },

  assistantBubble: {
    backgroundColor: '#0c1828',
    borderWidth: 1,
    borderColor: '#1a3048',
    borderBottomLeftRadius: 5,
  },

  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  messageContent: {
    flexShrink: 1,
  },

  messageText: {
    color: '#f4f8fd',
    fontSize: 14.5,
    lineHeight: 21,
  },

  markdownText: {
    color: '#f4f8fd',
    fontSize: 14.5,
    lineHeight: 21,
  },

  markdownBold: {
    fontWeight: '800',
  },

  markdownItalic: {
    fontStyle: 'italic',
  },

  markdownStrike: {
    textDecorationLine: 'line-through',
  },

  markdownCode: {
    fontFamily:
    Platform.OS === 'ios'
    ? 'Menlo'
    : 'monospace',
    backgroundColor: '#16263b',
    color: '#d7e8ff',
  },

  markdownH1: {
    color: '#ffffff',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
    marginBottom: 5,
  },

  markdownH2: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    marginBottom: 4,
  },

  markdownH3: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    marginBottom: 3,
  },

  markdownSpacer: {
    height: 7,
  },

  markdownListRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  markdownBullet: {
    color: '#70a9e8',
    fontSize: 16,
    width: 18,
    lineHeight: 21,
  },

  markdownNumber: {
    color: '#70a9e8',
    fontSize: 14.5,
    width: 24,
    lineHeight: 21,
  },

  markdownListText: {
    flex: 1,
  },

  markdownQuote: {
    borderLeftWidth: 3,
    borderLeftColor: '#3973ad',
    paddingLeft: 9,
    marginVertical: 2,
  },

  codeBlock: {
    width: '100%',
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#07111d',
    borderWidth: 1,
    borderColor: '#1c3854',
  },

  codeBlockText: {
    color: '#d7e8ff',
    fontSize: 12.5,
    lineHeight: 19,
    fontFamily:
    Platform.OS === 'ios'
    ? 'Menlo'
    : 'monospace',
  },

  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 13,
    marginBottom: 8,
    backgroundColor: '#07111d',
  },

  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#7ca9d8',
  },

  errorBox: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28151a',
    borderWidth: 1,
    borderColor: '#5d2730',
  },

  errorText: {
    flex: 1,
    color: '#ffb9c0',
    fontSize: 12.5,
    lineHeight: 18,
  },

  errorClose: {
    color: '#ffccd1',
    fontSize: 22,
    marginLeft: 8,
  },

  selectedImageContainer: {
    width: '100%',
    paddingHorizontal: 12,
    paddingBottom: 8,
    position: 'relative',
  },

  selectedImage: {
    width: 82,
    height: 82,
    borderRadius: 12,
    backgroundColor: '#0d1928',
  },

  removeImageButton: {
    position: 'absolute',
    left: 76,
    top: -7,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17283b',
    borderWidth: 1,
    borderColor: '#36516c',
  },

  removeImageText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 20,
  },

  inputArea: {
    width: '100%',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#050b14',
  },

  inputInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 54,
    padding: 6,
    borderRadius: 19,
    backgroundColor: '#0a1727',
    borderWidth: 1,
    borderColor: '#19304a',
  },

  largeInputInner: {
    width: '100%',
    alignSelf: 'stretch',
  },

  attachButton: {
    width: 40,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  attachText: {
    color: '#91b5d8',
    fontSize: 27,
    fontWeight: '300',
  },

  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 130,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    color: '#f2f7fc',
    fontSize: 15,
    lineHeight: 21,
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '@accent',
  },

  sendButtonActive: {
    backgroundColor: '@accent',
  },

  sendButtonText: {
    color: '#e6f3ff',
    fontSize: 20,
  },

  inputMicButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102036',
  },

  inputMicButtonActive: {
    backgroundColor: '@accent',
  },

  inputMicText: {
    color: '#e6f3ff',
    fontSize: 20,
  },

  pressed: {
    opacity: 0.65,
  },

  disabled: {
    opacity: 0.45,
  },

  voiceModal: {
    flex: 1,
    width: '100%',
    backgroundColor: '#030913',
    overflow: 'hidden',
  },

  voiceBackgroundGlow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '@accent',
    opacity: 0.3,
    alignSelf: 'center',
    top: '28%',
  },

  voiceHeader: {
    height: 64,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  voiceCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1a2a',
    borderWidth: 1,
    borderColor: '#1c334b',
  },

  voiceCloseText: {
    color: '#dbeaff',
    fontSize: 28,
    lineHeight: 30,
  },

  voiceHeaderTitle: {
    color: '#f4f8ff',
    fontSize: 17,
    fontWeight: '800',
  },

  voiceHeaderSpacer: {
    width: 42,
  },

  voiceCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  voiceOrb: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '@accent30',
    borderWidth: 2,
    borderColor: '@accent',
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 15,
  },

  voiceOrbListening: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderColor: '@accent',
    backgroundColor: '@accent55',
  },

  voiceOrbSpeaking: {
    borderColor: '@accent',
    backgroundColor: '@accent55',
  },

  voiceOrbText: {
    color: '#eaf5ff',
    fontSize: 42,
    fontWeight: '900',
  },

  voiceTitle: {
    color: '#f5f9ff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 32,
  },

  voiceSubtitle: {
    color: '#7188a2',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  stopSpeakingButton: {
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: '#14263a',
    borderWidth: 1,
    borderColor: '#284761',
  },

  stopSpeakingText: {
    color: '#c9def2',
    fontSize: 13,
    fontWeight: '700',
  },

  voiceBottom: {
    alignItems: 'center',
    paddingBottom: 35,
  },

  voiceMicButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '@accent',
    borderWidth: 1,
    borderColor: '@accent',
  },

  voiceMicButtonActive: {
    backgroundColor: '#5a2830',
    borderColor: '#9d4a57',
  },

  voiceMicText: {
    fontSize: 28,
    color: '#ffffff',
  },

  voiceHint: {
    color: '#667d97',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },

  historyOverlay: {
    flex: 1,
    width: '100%',
    backgroundColor: '#061326',
    flexDirection: 'column',
  },

  historySafeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#061326',
  },

  historyPanel: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    backgroundColor: '#061326',
    borderRightWidth: 0,
    borderRightColor: '#174b80',
    elevation: 12,
  },

  largeHistoryPanel: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#1a3047',
    borderRightWidth: 1,
    borderRightColor: '#1a3047',
  },

  historyHeader: {
    minHeight: 78,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#4d8dce',
  },

  historyTitle: {
    color: '#f3f8ff',
    fontSize: 20,
    fontWeight: '800',
  },

  historySubtitle: {
    color: '#d1e7ff',
    fontSize: 12,
    marginTop: 3,
  },

  historyCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b5791',
  },

  historyCloseText: {
    color: '#d8e8fa',
    fontSize: 27,
    lineHeight: 30,
  },

  newChatHistoryButton: {
    margin: 14,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#164a76',
  },

  newChatHistoryText: {
    color: '#f0f7ff',
    fontSize: 14,
    fontWeight: '800',
  },

  historyList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  historyItem: {
    width: '100%',
    minHeight: 68,
    marginBottom: 8,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#174a7d',
    borderWidth: 1,
    borderColor: '#3d7db9',
  },

  historyItemActive: {
    borderColor: '#8cc5ff',
    backgroundColor: '#205b92',
  },

  historyItemMain: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  historyItemTitle: {
    color: '#eaf3fd',
    fontSize: 14,
    fontWeight: '700',
  },

  historyItemPreview: {
    color: '#c0dcf8',
    fontSize: 11.5,
    marginTop: 5,
  },

  deleteHistoryButton: {
    width: 44,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteHistoryText: {
    fontSize: 16,
    opacity: 0.75,
  },

  noHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },

  noHistoryIcon: {
    fontSize: 36,
    marginBottom: 12,
  },

  noHistoryText: {
    color: '#687f99',
    fontSize: 14,
  },

  clearHistoryButton: {
    margin: 14,
    minHeight: 45,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#21151a',
    borderWidth: 1,
    borderColor: '#51272e',
  },

  clearHistoryText: {
    color: '#e9aeb5',
    fontSize: 13,
    fontWeight: '700',
  },

  largeWidthBox: {
    width: '100%',
    alignSelf: 'stretch',
  },
  profileScreen: {
    flex: 1,
    backgroundColor: '#050b14',
  },

  profileTopBar: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#142337',
    backgroundColor: '#07111f',
  },

  profileBackButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1b2d',
  },

  profileBackText: {
    color: '#dcecff',
    fontSize: 24,
  },

  profileTopTitle: {
    color: '#f5f9ff',
    fontSize: 18,
    fontWeight: '800',
  },

  profileTopSpacer: {
    width: 42,
  },

  profileContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
  },

  profileLargeImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102d4c',
    borderWidth: 2,
    borderColor: '#28547e',
    position: 'relative',
  },

  profileLargeImageActual: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },

  profileInitialsLarge: {
    color: '#ddecff',
    fontSize: 32,
    fontWeight: '900',
  },

  profileEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#174c7a',
    borderWidth: 2,
    borderColor: '#050b14',
  },

  profileEditBadgeText: {
    fontSize: 15,
  },

  profileName: {
    color: '#f5f9ff',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 20,
  },

  profileInfoBox: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#0a1727',
    borderWidth: 1,
    borderColor: '#19304a',
  },

  profileInfoLabel: {
    color: '#7187a1',
    fontSize: 11,
    marginBottom: 5,
  },

  profileInfoValue: {
    color: '#edf5ff',
    fontSize: 14,
    fontWeight: '600',
  },

  profileActionButton: {
    width: '100%',
    maxWidth: 430,
    minHeight: 50,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#174c7a',
  },

  profileActionText: {
    color: '#f0f7ff',
    fontSize: 14,
    fontWeight: '800',
  },

  profileMenuButton: {
    width: '100%',
    maxWidth: 430,
    minHeight: 52,
    marginTop: 8,
    paddingHorizontal: 15,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a1727',
    borderWidth: 1,
    borderColor: '#19304a',
  },

  profileMenuIcon: {
    fontSize: 20,
    width: 34,
  },

  profileMenuText: {
    flex: 1,
    color: '#eaf3fd',
    fontSize: 14,
    fontWeight: '700',
  },

  profileMenuArrow: {
    color: '#7892ad',
    fontSize: 20,
  },

  securitySectionTitle: {
    width: '100%',
    maxWidth: 430,
    color: '#f3f8ff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 18,
  },

  profileSetupImageButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102d4c',
    borderWidth: 1,
    borderColor: '#28547e',
    marginBottom: 8,
    overflow: 'hidden',
  },

  profileSetupImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },

  profileSetupImageText: {
    color: '#a9c7e5',
    fontSize: 30,
  },

  profilePhotoHint: {
    color: '#7187a1',
    fontSize: 12,
    marginBottom: 18,
  },

  profileHeaderImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  profileHeaderInitials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#174c7a',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },

  historyActionRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },

  historySearchMenuButton: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#0a2543',
    borderWidth: 1,
    borderColor: '#1c4b78',
    gap: 10,
  },

  historyActionButton: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b5791',
    borderWidth: 1,
    borderColor: '#6eb4ff',
  },

  historyActionIcon: {
    color: '#ffffff',
    fontSize: 20,
    marginBottom: 2,
  },

  historyActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },

  historySearchWrap: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 2,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#0c2d50',
    borderWidth: 1,
    borderColor: '#8cc5ff',
  },

  historySearchInput: {
    flex: 1,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },

  historySearchClose: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  historySearchCloseText: {
    color: '#ffffff',
    fontSize: 24,
  },

  historyQuickLinks: {
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 10,
    flexDirection: 'column',
    gap: 8,
  },

  historyQuickLink: {
    width: '100%',
    minHeight: 46,
    paddingHorizontal: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '@accent',
    borderWidth: 1,
    borderColor: '@accent',
  },

  historyQuickIcon: {
    fontSize: 18,
    marginRight: 9,
  },

  historyQuickText: {
    color: '@onaccent',
    fontSize: 13,
    fontWeight: '700',
  },

  conversationsLabel: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    color: '#8da5bd',
    fontSize: 13,
    fontWeight: '800',
  },

  historyBottomBar: {
    width: '100%',
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#172a40',
    backgroundColor: '#061326',
  },

  clearHistorySmallButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b2a4c',
    borderWidth: 1,
    borderColor: '#214e7a',
  },

  clearHistorySmallText: {
    color: '#c5ddf7',
    fontSize: 12,
    fontWeight: '700',
  },

  bottomNewChatButton: {
    width: 46,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#164a76',
  },

  bottomNewChatText: {
    color: '#f0f7ff',
    fontSize: 18,
  },

  historyProfileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#102d4c',
    overflow: 'hidden',
  },

  historyProfileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  historyProfileInitials: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  historyDivider: {
    height: 2,
    backgroundColor: '#173d63',
    width: '100%',
    marginVertical: 8,
  },
} as const;

export const baseStyles = StyleSheet.create(baseStyleDefinitions);
