import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";
import { FigureView } from "./FigureView";
import { colors, fonts } from "../../theme/tokens";

interface VisualBlockProps {
  svg?: string;
  image?: string;
  meta?: any;
}

export function VisualBlock({ svg, image, meta }: VisualBlockProps) {
  const isShowFigure = meta?.source === "show_figure" && meta?.figure_id;

  return (
    <View style={styles.container}>
      {isShowFigure ? (
        <FigureView uuid={meta.figure_id} />
      ) : image ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}` }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      ) : svg ? (
        <View style={styles.svgContainer}>
          <SvgXml xml={svg} width="100%" height="100%" />
        </View>
      ) : null}

      {meta?.shape && (
        <Text style={styles.shapeLabel}>
          {meta.shape.replace(/_/g, " ")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#5B4DC7",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  svgContainer: {
    width: "100%",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  shapeLabel: {
    marginTop: 8,
    fontFamily: fonts.dmBold,
    fontSize: 10,
    color: "#94A3B8",
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
  },
});
