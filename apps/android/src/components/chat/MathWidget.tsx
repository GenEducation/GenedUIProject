import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { colors, fonts } from "../../theme/tokens";

interface MathWidgetProps {
  expression: string;
  meta?: any;
  minimal?: boolean;
}

export function MathWidget({ expression, meta, minimal = false }: MathWidgetProps) {
  if (meta?.error) {
    return (
      <View style={[styles.errorContainer, minimal && styles.minimalMargin]}>
        <Text style={styles.errorLabel}>Interactive graph unavailable</Text>
        <Text style={styles.errorExpression}>{expression}</Text>
        {meta.message ? <Text style={styles.errorMessage}>{meta.message}</Text> : null}
      </View>
    );
  }

  const desmosHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <script src="https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
      <style>
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #FFFFFF; }
        #calculator { width: 100%; height: 100%; }
        .dcg-search-container { display: none !important; } /* hide search box */
      </style>
    </head>
    <body>
      <div id="calculator"></div>
      <script>
        var elt = document.getElementById('calculator');
        var calculator = Desmos.GraphingCalculator(elt, {
          expressions: false,
          settingsMenu: false,
          zoomButtons: false
        });
        calculator.setExpression({ id: 'graph1', latex: ${JSON.stringify(expression)} });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.card, minimal && styles.minimalMargin]}>
      <View style={styles.webviewContainer}>
        <WebView
          originWhitelist={["*"]}
          source={{ html: desmosHtml }}
          style={styles.webview}
          androidHardwareAccelerationDisabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={true}
        />
      </View>
      {!minimal && (
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Interactive Graph</Text>
          <Text style={styles.footerExpression}>{expression}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#1A3A2A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  minimalMargin: {
    marginVertical: 0,
  },
  webviewContainer: {
    width: "100%",
    height: 240,
  },
  webview: {
    width: "100%",
    height: "100%",
    backgroundColor: "#FFFFFF",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLabel: {
    fontFamily: fonts.dmBold,
    fontSize: 9,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  footerExpression: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "bold",
  },
  errorContainer: {
    marginVertical: 8,
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 20,
  },
  errorLabel: {
    fontFamily: fonts.dmBold,
    fontSize: 9,
    color: "#EF4444",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  errorExpression: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: "#EF4444",
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 11,
    fontStyle: "italic",
    color: "#B91C1C",
  },
});
