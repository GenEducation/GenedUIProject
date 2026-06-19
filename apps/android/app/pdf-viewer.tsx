/**
 * PDF Viewer — full-screen native PDF with AI teaching pointer overlay.
 *
 * Opened from the chat screen's document chip. State (URL, pointer) comes
 * from usePdfStore (singleton shared with useChat SSE handler).
 *
 * Layout:
 *   PdfHeader (back, title, page counter)
 *   <Pdf /> (react-native-pdf — native PDFKit / PdfRenderer)
 *   BboxPointerOverlay  (Animated.View, pointer-events:none, bbox/point kinds)
 *   TextPointerBanner   (slide-up card for text/figure/label kinds)
 *   ChatFAB             (floating "Chat" button → router.back())
 */
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, MessageCircle, X } from "lucide-react-native";
import { usePdfUrl, usePdfPointer, pdfStore } from "@/store/usePdfStore";
// react-native-pdf is lazy-required inside the component to avoid crashing the
// entire module graph at startup (New Architecture TurboModule init failure).
type PdfType = typeof import("react-native-pdf").default;
import { colors, fonts } from "@/theme/tokens";

const { width: SCREEN_W } = Dimensions.get("window");

// ── Sub-components ────────────────────────────────────────────────────────────

function PdfHeader({
  title,
  currentPage,
  totalPages,
  onBack,
}: {
  title: string;
  currentPage: number;
  totalPages: number;
  onBack: () => void;
}) {
  return (
    <View style={hdr.row}>
      <Pressable onPress={onBack} style={hdr.back} hitSlop={8}>
        <ArrowLeft size={20} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={hdr.title} numberOfLines={1}>{title}</Text>
        {totalPages > 0 ? (
          <Text style={hdr.sub}>Page {currentPage} of {totalPages}</Text>
        ) : null}
      </View>
    </View>
  );
}

const hdr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.pageBg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  sub: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted, marginTop: 1 },
});

/** Animated pulsing overlay for bbox / point pointer kinds. */
function BboxPointerOverlay({
  pointer,
  pageHeight,
  currentPage,
}: {
  pointer: { page?: number; target: { kind: string; bbox?: number[]; x?: number; y?: number } } | null;
  pageHeight: number;
  currentPage: number;
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!pointer) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pointer]);

  if (!pointer || !pageHeight || !pointer.target) return null;

  const { target, page = 1 } = pointer;
  const { kind, bbox, x, y } = target as any;
  if (!kind) return null;

  // Only handle bbox/point — text/figure handled by TextPointerBanner
  if (kind !== "bbox" && kind !== "point") return null;

  // Approximate position: assumes pages are laid out vertically
  const pageOffset = (page - 1) * pageHeight;
  const viewportOffset = (currentPage - 1) * pageHeight;

  let top = 0, left = 0, width = 0, height = 0;
  if (kind === "bbox" && bbox && bbox.length === 4) {
    const [x0, y0, x1, y1] = bbox;
    left   = x0 * SCREEN_W;
    width  = (x1 - x0) * SCREEN_W;
    top    = pageOffset + y0 * pageHeight - viewportOffset;
    height = (y1 - y0) * pageHeight;
  } else if (kind === "point" && x != null && y != null) {
    const SIZE = 40;
    left   = x * SCREEN_W - SIZE / 2;
    width  = SIZE;
    top    = pageOffset + y * pageHeight - SIZE / 2 - viewportOffset;
    height = SIZE;
  }

  if (width <= 0 || height <= 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bboxOverlay,
        { top, left, width, height, opacity: pulse },
      ]}
    />
  );
}

/** Slide-up card for text / figure / labelled pointer kinds. */
function TextPointerBanner({
  pointer,
}: {
  pointer: { target: { kind: string; text?: string }; label?: string } | null;
}) {
  const slideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: pointer ? 0 : 60,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [pointer]);

  if (!pointer) return null;
  const { target, label } = pointer as any;
  const { kind, text } = target;
  if (kind !== "text" && kind !== "figure" && !label) return null;

  const displayText = label ?? text ?? "Check this section";

  return (
    <Animated.View style={[styles.textBanner, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.textBannerLabel}>📍 AI is pointing to:</Text>
      <Text style={styles.textBannerContent} numberOfLines={3}>"{displayText}"</Text>
      <Pressable onPress={() => pdfStore.clearPointer()} style={styles.textBannerDismiss} hitSlop={8}>
        <X size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PdfViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { documentTitle, pdfUrl, isLoading, error } = usePdfUrl();
  const { activePointer } = usePdfPointer();

  // Lazy-load react-native-pdf only when this screen actually mounts.
  // This prevents a New Architecture TurboModule init failure from crashing
  // the whole JS module graph at app startup (Expo Router eagerly imports routes).
  const PdfComponent = React.useMemo((): PdfType | null => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("react-native-pdf").default as PdfType;
    } catch {
      return null;
    }
  }, []);

  const pdfRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(0.77); // A4 default

  // Acknowledge pointer when screen mounts so chat banner clears
  useEffect(() => {
    pdfStore.acknowledgePointer();
  }, []);

  // Navigate to pointer's page when pointer changes
  useEffect(() => {
    const page = activePointer?.page;
    if (page && page > 0 && pdfRef.current) {
      pdfRef.current.setPage(page);
    }
  }, [activePointer?.page]);

  const pageHeightPx = SCREEN_W / aspectRatio;

  const handleLoadComplete = useCallback(
    (numPages: number, _path: string, size?: { width: number; height: number }) => {
      setTotalPages(numPages);
      if (size && size.height > 0) {
        setAspectRatio(size.width / size.height);
      }
    },
    []
  );

  if (!pdfUrl && !isLoading) {
    return (
      <View style={[styles.centerWrap, { paddingTop: insets.top }]}>
        <PdfHeader title={documentTitle ?? "Document"} currentPage={0} totalPages={0} onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? "No PDF loaded. Select a chapter in chat."}</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Back to Chat</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <PdfHeader
        title={documentTitle ?? "Document"}
        currentPage={currentPage}
        totalPages={totalPages}
        onBack={() => router.back()}
      />

      <View style={styles.pdfWrap}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.genPurple} />
            <Text style={styles.loadingText}>Loading PDF…</Text>
          </View>
        ) : pdfUrl ? (
          <>
            {PdfComponent ? (
              <PdfComponent
                ref={pdfRef}
                source={{ uri: pdfUrl, cache: false }}
                onLoadComplete={handleLoadComplete}
                onPageChanged={(page: number) => setCurrentPage(page)}
                onError={(e: any) => console.warn("[PDF]", e)}
                style={styles.pdf}
                trustAllCerts={Platform.OS === "android"}
                enablePaging={false}
                horizontal={false}
              />
            ) : (
              <View style={styles.center}>
                <Text style={styles.errorText}>PDF viewer is not available on this device.</Text>
              </View>
            )}
            {/* Bbox overlay for pointer kind=bbox/point */}
            <BboxPointerOverlay
              pointer={activePointer as any}
              pageHeight={pageHeightPx}
              currentPage={currentPage}
            />
          </>
        ) : null}
      </View>

      {/* Text/figure pointer banner */}
      <TextPointerBanner pointer={activePointer as any} />

      {/* Floating Chat FAB */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.back()}
      >
        <MessageCircle size={20} color="#fff" />
        <Text style={styles.fabText}>Chat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  centerWrap: { flex: 1, backgroundColor: "#fff" },
  pdfWrap: { flex: 1, position: "relative", overflow: "hidden" },
  pdf: {
    flex: 1,
    width: SCREEN_W,
    backgroundColor: "#f5f5f5",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  loadingText: { fontFamily: fonts.dm, fontSize: 14, color: colors.textMuted, marginTop: 8 },
  errorText: { fontFamily: fonts.dm, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  backBtn: {
    backgroundColor: colors.genPurple,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: { fontFamily: fonts.dmBold, fontSize: 13, color: "#fff" },
  bboxOverlay: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: colors.genPurple,
    borderRadius: 6,
    backgroundColor: colors.genPurple + "20",
  },
  textBanner: {
    position: "absolute",
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.genPurple + "40",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  textBannerLabel: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  textBannerContent: { fontFamily: fonts.dmMedium, fontSize: 14, color: colors.text, lineHeight: 20 },
  textBannerDismiss: { position: "absolute", top: 12, right: 12 },
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.genPurple,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: colors.genPurple,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { fontFamily: fonts.dmBold, fontSize: 13, color: "#fff" },
});
