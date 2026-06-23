import React, { useEffect, useRef, useState } from "react";
import {
  Modal, View, Text, Pressable, StyleSheet, ActivityIndicator,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Asset } from "expo-asset";
import { useTutorial, tutorialStore } from "@/store/useTutorialStore";
import { colors, fonts } from "@/theme/tokens";

export function TutorialTourModal() {
  const { isActive } = useTutorial();
  const insets = useSafeAreaInsets();
  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    (async () => {
      try {
        const asset = Asset.fromModule(
          require("../../assets/tutorial-walkthrough.html")
        );
        await asset.downloadAsync();
        if (!cancelled) setHtmlUri(asset.localUri ?? asset.uri);
      } catch {
        // fall back — modal will just show a blank screen
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isActive]);

  function handleMessage(e: WebViewMessageEvent) {
    const msg = e.nativeEvent.data;
    if (msg === "tutorial:close" || msg === "tutorial:skip") {
      tutorialStore.endTutorial();
    }
  }

  if (!isActive) return null;

  return (
    <Modal
      visible={isActive}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => tutorialStore.endTutorial()}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingTop: insets.top > 0 ? insets.top : 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✨ Quick Tour</Text>
            </View>
            <Pressable
              onPress={() => tutorialStore.endTutorial()}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {loading ? (
              <View style={styles.loader}>
                <ActivityIndicator color={colors.genPurple} size="large" />
                <Text style={styles.loaderText}>Loading tour…</Text>
              </View>
            ) : htmlUri ? (
              <WebView
                ref={webViewRef}
                source={{ uri: htmlUri }}
                style={styles.webview}
                onMessage={handleMessage}
                javaScriptEnabled
                allowFileAccess
                originWhitelist={["*"]}
                scrollEnabled={false}
                bounces={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.loader}>
                <Text style={styles.loaderText}>Couldn't load tour.</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Pressable onPress={() => tutorialStore.endTutorial()}>
              <Text style={styles.skipText}>Skip tour</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.navy,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  badge: {
    backgroundColor: "rgba(91,77,199,0.25)",
    borderWidth: 1,
    borderColor: "rgba(91,77,199,0.5)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    color: "#c4baff",
    fontSize: 13,
    fontFamily: fonts.dmBold,
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontFamily: fonts.dmBold,
  },
  body: {
    flex: 1,
    backgroundColor: "#0f0f1a",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0f0f1a",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: fonts.dm,
    fontSize: 13,
  },
  footer: {
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.navy,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  skipText: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: fonts.dmBold,
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
