import React, { useRef, useState } from "react";
import {
  View, Text, Image, Pressable, StyleSheet, Animated,
  useWindowDimensions, type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts } from "@/theme/tokens";

type Role = "student" | "parent";

type Slide = {
  role: Role;
  heading: string;
  body: string;
  image: ImageSourcePropType;
  bg: string;
  cardBg: string;
};

const SLIDES: Slide[] = [
  {
    role: "student",
    heading: "For kids",
    body: "Turn screen time into progress with an AI tutor that makes every subject click.",
    image: require("../../../assets/illustrations/role-student.png"),
    bg: "#4C51E0",
    cardBg: "#FFF7EF",
  },
  {
    role: "parent",
    heading: "For parents",
    body: "Follow your child's learning journey and support their growth every step of the way.",
    image: require("../../../assets/illustrations/role-parent.png"),
    bg: "#3E5AC9",
    cardBg: "#FFF9F0",
  },
];

export function RoleCarousel({
  onSelect,
  onSwitchToSignIn,
}: {
  onSelect: (r: Role) => void;
  onSwitchToSignIn: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();

  const CARD_W = Math.round(screenW * 0.78);
  const SIDE_PAD = Math.round((screenW - CARD_W) / 2);

  const scrollX = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(0);

  // Background color morphs across the slides as the user swipes.
  const bgColor = scrollX.interpolate({
    inputRange: SLIDES.map((_, i) => i * CARD_W),
    outputRange: SLIDES.map((s) => s.bg),
  });

  return (
    <Animated.View style={[styles.root, { backgroundColor: bgColor, paddingTop: insets.top }]}>
      {/* Depth overlay — subtle top-highlight + bottom-shade to make the artwork pop */}
      <LinearGradient
        colors={["rgba(255,255,255,0.10)", "rgba(0,0,0,0)", "rgba(0,0,0,0.14)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Carousel */}
      <View style={styles.carouselWrap}>
        <Animated.ScrollView
          horizontal
          style={styles.scroll}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W}
          decelerationRate="fast"
          snapToAlignment="start"
          contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            setActive(Math.round(e.nativeEvent.contentOffset.x / CARD_W));
          }}
        >
          {SLIDES.map((slide, i) => {
            const inputRange = [(i - 1) * CARD_W, i * CARD_W, (i + 1) * CARD_W];
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.9, 1, 0.9],
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.55, 1, 0.55],
              extrapolate: "clamp",
            });
            return (
              <View key={slide.role} style={{ width: CARD_W, height: "100%", justifyContent: "center", alignItems: "center" }}>
                <Animated.View
                  style={[
                    styles.card,
                    {
                      width: CARD_W - 28,
                      backgroundColor: slide.cardBg,
                      opacity,
                      transform: [{ scale }],
                    },
                  ]}
                >
                  <Image source={slide.image} style={styles.cardImg} resizeMode="cover" />
                </Animated.View>
                <Animated.View style={{ opacity, alignItems: "center" }}>
                  <Text style={styles.heading}>{slide.heading}</Text>
                  <Text style={styles.body}>{slide.body}</Text>
                </Animated.View>
              </View>
            );
          })}
        </Animated.ScrollView>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * CARD_W, i * CARD_W, (i + 1) * CARD_W];
          const dotW = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: "clamp",
          });
          const dotO = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: "clamp",
          });
          return <Animated.View key={i} style={[styles.dot, { width: dotW, opacity: dotO }]} />;
        })}
      </View>

      {/* Sign up */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <Pressable
          style={({ pressed }) => [styles.signBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
          onPress={() => onSelect(SLIDES[active].role)}
        >
          <Text style={styles.signBtnText}>Sign up as a {active === 0 ? "student" : "parent"}</Text>
        </Pressable>

        <Text style={styles.loginRow}>
          Already have an account?{" "}
          <Text style={styles.loginLink} onPress={onSwitchToSignIn}>
            Log in
          </Text>
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  carouselWrap: { flex: 1 },
  scroll: { flex: 1 },
  card: {
    aspectRatio: 1.02,
    borderRadius: 34,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  cardImg: { width: "100%", height: "100%" },

  heading: {
    fontFamily: fonts.playfair, fontSize: 30, color: "#fff",
    marginTop: 26, textAlign: "center",
  },
  body: {
    fontFamily: fonts.dm, fontSize: 14.5, lineHeight: 21, color: "#ffffffe6",
    marginTop: 10, textAlign: "center", maxWidth: 300, paddingHorizontal: 12,
  },

  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, marginBottom: 8 },
  dot: { height: 8, borderRadius: 999, backgroundColor: "#fff" },

  footer: { paddingHorizontal: 24, paddingTop: 14 },
  signBtn: {
    height: 56, borderRadius: 16, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  signBtnText: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.navy },

  loginRow: { textAlign: "center", fontFamily: fonts.dm, fontSize: 13, color: "#ffffffcc", marginTop: 18 },
  loginLink: { color: "#fff", fontFamily: fonts.dmBold, textDecorationLine: "underline" },
});
