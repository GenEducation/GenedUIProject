import React, { useState, useEffect } from "react";
import { View, Image, ActivityIndicator, StyleSheet, Text } from "react-native";
import { getToken, getProfile } from "../../services/storage";
import { colors } from "../../theme/tokens";

interface FigureViewProps {
  uuid: string;
}

export function FigureView({ uuid }: FigureViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [source, setSource] = useState<{ uri: string; headers: Record<string, string> } | null>(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "";

  useEffect(() => {
    let active = true;

    async function loadAuthSource() {
      try {
        const token = await getToken();
        const profile = await getProfile();

        if (!active) return;

        if (!token) {
          setError(true);
          setLoading(false);
          return;
        }

        setSource({
          uri: `${API_URL}/rag/retrieve/figure/${uuid}`,
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": profile?.user_id || "",
          },
        });
      } catch (err) {
        console.error("Failed to load auth for figure:", err);
        setError(true);
        setLoading(false);
      }
    }

    loadAuthSource();
    return () => {
      active = false;
    };
  }, [uuid, API_URL]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading figure</Text>
      </View>
    );
  }

  if (!source) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.genPurple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={source}
        style={styles.image}
        resizeMode="contain"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.overlayLoading}>
          <ActivityIndicator color={colors.genPurple} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 240,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginVertical: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    width: "100%",
    height: 240,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8,
  },
  overlayLoading: {
    position: "absolute",
    alignSelf: "center",
  },
  errorContainer: {
    width: "100%",
    height: 100,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#EF4444",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
