/**
 * StudentAvatar — the student's chosen profile picture (from usePrefsStore).
 *
 * Single source of truth for mapping an AvatarId to its artwork, so the Me hero,
 * the Home header and the avatar picker all stay in sync.
 */
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { usePrefs } from "@/store/usePrefsStore";
import type { AvatarId } from "@/store/usePrefsStore";
import { StudentAvatarIllustration } from "./StudentAvatarIllustration";

const GIRL_GRADUATE = require("../../assets/avatars/girl-graduate.png");
export const AVATAR_ACCENT = "#F0AD4E";

/** Renders the artwork for a given avatar id, unstyled and unsized. */
export function StudentAvatarArt({ avatarId }: { avatarId: AvatarId }) {
  return avatarId === "graduate-girl" ? (
    <Image source={GIRL_GRADUATE} style={styles.img} resizeMode="cover" />
  ) : (
    <StudentAvatarIllustration bg={AVATAR_ACCENT} />
  );
}

/** The current student's avatar in a white-rimmed circle. */
export function StudentAvatar({ size = 52 }: { size?: number }) {
  const { avatarId } = usePrefs();
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <StudentAvatarArt avatarId={avatarId} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  img: { width: "100%", height: "100%" },
});
