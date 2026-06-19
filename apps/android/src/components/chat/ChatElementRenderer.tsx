import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, TextInput } from "react-native";
import { WebView } from "react-native-webview";
import Markdown from "react-native-markdown-display";
import { ChatElement } from "../../types/api";
import { VisualCard } from "./VisualCard";
import { VisualBlock } from "./VisualBlock";
import { MathWidget } from "./MathWidget";
import { FigureView } from "./FigureView";
import { InteractiveBlock } from "./interactive/InteractiveBlock";
import { KaraokeView } from "./english/KaraokeView";
import { studentService } from "../../services/studentService";
import { audioStore, useAudioSnapshot } from "../../store/useAudioStore";
import { colors, fonts } from "../../theme/tokens";

interface ChatElementRendererProps {
  elements: ChatElement[];
  sessionId?: string;
  isReadOnly?: boolean;
}

export function ChatElementRenderer({ elements, sessionId, isReadOnly = false }: ChatElementRendererProps) {
  return (
    <View style={styles.elementsContainer}>
      {elements.map((el, index) => {
        if (el.type === "text") {
          // Strip inline $math$ — no LaTeX renderer on Android; bare expression is more readable
          const mdContent = el.content.replace(/\$([^$\n]+?)\$/g, "$1");
          return (
            <Markdown key={el.id ?? `txt-${index}`} style={mdStyles}>
              {mdContent}
            </Markdown>
          );
        }

        if (el.type === "visual") {
          if (el.content === "error") {
            return (
              <View key={el.id} style={styles.unavailableBlock}>
                <Text style={styles.unavailableText}>
                  📐 Visual unavailable — {el.meta?.label || "Visual"}
                </Text>
              </View>
            );
          }

          if (el.meta?.engine === "p5sketch") {
            const p5Html = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body { background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; }
                  #canvas-container { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; }
                  canvas { display: block; }
                </style>
                <script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>
              </head>
              <body>
                <div id="canvas-container"></div>
                <script>
                  const _origCreateCanvas = window.createCanvas;
                  window.createCanvas = function(w, h, renderer) {
                    const canvas = _origCreateCanvas(w, h, renderer);
                    canvas.parent('canvas-container');
                    setTimeout(updateScale, 10);
                    return canvas;
                  };

                  function updateScale() {
                    const container = document.getElementById('canvas-container');
                    const canvas = document.querySelector('canvas');
                    if (!container || !canvas) return;
                    const w = canvas.width;
                    const h = canvas.height;
                    if (w === 0 || h === 0) return;
                    const scaleX = window.innerWidth / w;
                    const scaleY = window.innerHeight / h;
                    const scale = Math.min(scaleX, scaleY) * 0.95;
                    container.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
                  }

                  window.addEventListener('resize', updateScale);
                  setInterval(updateScale, 250);

                  ${el.meta.code || ""}
                </script>
              </body>
              </html>
            `;

            return (
              <VisualCard key={el.id} engine="p5sketch" label={el.meta.label || ""}>
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: p5Html }}
                  style={styles.webview}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              </VisualCard>
            );
          }

          if (el.meta?.engine === "geogebra") {
            const commands = el.meta.commands || [];
            const options = el.meta.options || {};
            const ggbHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <style>
                  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #FFFFFF; }
                  #ggb-container { width: 100%; height: 100%; }
                </style>
                <script src="https://www.geogebra.org/apps/deployggb.js"></script>
              </head>
              <body>
                <div id="ggb-container"></div>
                <script>
                  const commands = ${JSON.stringify(commands)};
                  const options = ${JSON.stringify(options)};
                  
                  const params = {
                    appName: "classic",
                    width: window.innerWidth,
                    height: window.innerHeight,
                    showToolBar: false,
                    showMenuBar: false,
                    showAlgebraInput: false,
                    enableRightClick: false,
                    showResetIcon: false,
                    preventFocus: true,
                    ...options,
                    appletOnLoad: function(api) {
                      api.setPerspective("G");
                      api.setAxesVisible(options.showAxes === true, options.showAxes === true);
                      api.setGridVisible(options.showGrid === true);
                      if (commands && commands.length > 0) {
                        commands.forEach(function(cmd) {
                          try { api.evalCommand(cmd); } catch (e) {}
                        });
                        setTimeout(function() { api.zoomAll(); }, 150);
                      }
                    }
                  };
                  const applet = new window.GGBApplet(params, true);
                  applet.inject("ggb-container");
                </script>
              </body>
              </html>
            `;

            return (
              <VisualCard key={el.id} engine="geogebra" label={el.meta.label || ""}>
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: ggbHtml }}
                  style={styles.webview}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              </VisualCard>
            );
          }

          if (el.meta?.engine === "desmos") {
            return (
              <VisualCard key={el.id} engine="desmos" label={el.meta.label || "Graph"}>
                <MathWidget expression={el.meta.options?.expression || el.meta.code || ""} meta={el.meta.options} minimal={true} />
              </VisualCard>
            );
          }

          if (el.meta?.engine === "show_figure" || el.meta?.engine === "image") {
            const imgSource = el.meta.image?.startsWith("data:")
              ? el.meta.image
              : (el.meta.image && !el.meta.figure_id ? `data:image/jpeg;base64,${el.meta.image}` : null);

            return (
              <VisualCard key={el.id} engine="show_figure" label={el.meta.label || "Textbook Figure"}>
                <View style={styles.centerAlign}>
                  {el.meta.figure_id ? (
                    <FigureView uuid={el.meta.figure_id} />
                  ) : imgSource ? (
                    <Image source={{ uri: imgSource }} style={styles.inlineImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.errorTextContainer}>
                      <Text style={styles.errorText}>📐 Figure ID: unknown</Text>
                    </View>
                  )}
                </View>
              </VisualCard>
            );
          }
        }

        if (el.type === "svg") {
          return <VisualBlock key={el.id} svg={el.content} meta={el.meta} />;
        }

        if (el.type === "image") {
          return <VisualBlock key={el.id} image={el.content} meta={el.meta} />;
        }

        if (el.type === "widget") {
          return <MathWidget key={el.id} expression={el.content} meta={el.meta} />;
        }

        if (el.type === "interactive") {
          return (
            <InteractiveBlock
              key={el.id}
              directiveId={el.meta?.directive_id || el.id}
              meta={el.meta}
              sessionId={sessionId}
              disabled={isReadOnly}
              readOnly={isReadOnly}
            />
          );
        }

        if (el.type === "comprehension_widget") {
          if (el.meta?.widget_type === "difficult_word") {
            return (
              <DifficultWordWidget
                key={el.id}
                word={el.meta?.word || el.content}
                syllables={el.meta?.syllables}
                phonetic={el.meta?.phonetic}
                slowAvailable={el.meta?.slow_available}
              />
            );
          }

          if (el.meta?.widget_type === "mcq") {
            return (
              <MCQWidget
                key={el.id}
                directiveId={el.meta?.directive_id || el.id}
                question={el.meta?.question || el.content}
                choices={el.meta?.choices || []}
                sessionId={sessionId}
                disabled={isReadOnly}
              />
            );
          }

          if (
            el.meta?.widget_type === "fill_blank" ||
            el.meta?.widget_type === "free_response" ||
            el.meta?.widget_type === "retell"
          ) {
            return (
              <TextAnswerWidget
                key={el.id}
                widgetType={el.meta.widget_type}
                directiveId={el.meta?.directive_id || el.id}
                question={el.meta?.question || el.content}
                sessionId={sessionId}
                disabled={isReadOnly}
              />
            );
          }
        }

        // english_skill_view — audio-driven reading / karaoke / read-aloud blocks
        if (el.type === "english_skill_view") {
          return (
            <KaraokeView
              key={el.id}
              text={el.content}
              directiveId={el.meta?.directive_id || el.id}
              mode={el.meta?.mode}
              readOnly={isReadOnly}
            />
          );
        }

        return null;
      })}
    </View>
  );
}

// ── Difficult Word Pronunciation Widget ────────────────────────────────────────

function DifficultWordWidget({ word, syllables, phonetic, slowAvailable }: { word: string; syllables?: string[]; phonetic?: string; slowAvailable?: boolean }) {
  const snap = useAudioSnapshot();
  const isSpeaking = snap.activeDirectiveId === `word-${word}` && snap.playbackState === "playing";
  return (
    <View style={styles.dwContainer}>
      <View style={styles.dwHeader}>
        <TouchableOpacity
          style={styles.dwWordTap}
          activeOpacity={0.7}
          onPress={() => audioStore.playWord(word, false)}
        >
          <Text style={styles.dwSpeaker}>{isSpeaking ? "🔊" : "🔈"}</Text>
          <Text style={styles.dwWord}>{word}</Text>
        </TouchableOpacity>
        {phonetic ? <Text style={styles.dwPhonetic}>/{phonetic}/</Text> : null}
      </View>
      {syllables && syllables.length > 0 ? (
        <View style={styles.syllableRow}>
          {syllables.map((s, idx) => (
            <View key={idx} style={styles.syllableChip}>
              <Text style={styles.syllableText}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {slowAvailable ? (
        <TouchableOpacity style={styles.dwSlowBtn} activeOpacity={0.7} onPress={() => audioStore.playWord(word, true)}>
          <Text style={styles.dwSlowText}>🐢 Hear it slowly</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Native MCQ Comprehension Widget ────────────────────────────────────────────

interface MCQWidgetProps {
  directiveId: string;
  question: string;
  choices: Array<{ id: string; label: string }>;
  sessionId?: string;
  disabled?: boolean;
}

function MCQWidget({ directiveId, question, choices, sessionId, disabled }: MCQWidgetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ is_correct: boolean; correct_answer?: string } | null>(null);

  const handleSelect = async (choiceId: string) => {
    if (submitting || result || disabled || !sessionId) return;
    setSelectedId(choiceId);
    setSubmitting(true);
    try {
      const res = await studentService.submitComprehensionAnswer(sessionId, directiveId, "mcq", choiceId);
      setResult({
        is_correct: res.is_correct,
        correct_answer: res.correct_answer,
      });
    } catch (e) {
      console.error("Failed to submit MCQ answer natively:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.mcqCard}>
      <Text style={styles.mcqQuestion}>{question}</Text>
      <View style={styles.mcqChoices}>
        {choices.map((c) => {
          const isSelected = selectedId === c.id;
          const isCorrectChoice = result && (c.id === selectedId && result.is_correct);
          const isWrongChoice = result && (c.id === selectedId && !result.is_correct);

          const btnStyle: any[] = [styles.choiceBtn];
          const textStyle: any[] = [styles.choiceText];

          if (isSelected) {
            btnStyle.push(styles.choiceSelected);
            textStyle.push(styles.choiceTextSelected);
          }
          if (isCorrectChoice) {
            btnStyle.push(styles.choiceCorrect);
          }
          if (isWrongChoice) {
            btnStyle.push(styles.choiceWrong);
          }

          return (
            <TouchableOpacity
              key={c.id}
              style={btnStyle}
              onPress={() => handleSelect(c.id)}
              disabled={!!result || submitting || disabled}
              activeOpacity={0.7}
            >
              <View style={styles.choiceInner}>
                <Text style={textStyle}>{c.label}</Text>
                {isCorrectChoice && <Text style={styles.choiceIcon}>✓</Text>}
                {isWrongChoice && <Text style={styles.choiceIcon}>✗</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {submitting && (
        <ActivityIndicator size="small" color={colors.genPurple} style={styles.mcqLoader} />
      )}
    </View>
  );
}

// ── Text-answer Comprehension Widget (fill_blank / free_response / retell) ──────

interface TextAnswerWidgetProps {
  widgetType: "fill_blank" | "free_response" | "retell";
  directiveId: string;
  question: string;
  sessionId?: string;
  disabled?: boolean;
}

function TextAnswerWidget({ widgetType, directiveId, question, sessionId, disabled }: TextAnswerWidgetProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ is_correct?: boolean } | null>(null);

  const multiline = widgetType !== "fill_blank";
  const placeholder =
    widgetType === "fill_blank"
      ? "Your answer…"
      : widgetType === "retell"
      ? "Retell it in your own words…"
      : "Write your response…";

  const handleSubmit = async () => {
    if (!value.trim() || submitting || result || disabled || !sessionId) return;
    setSubmitting(true);
    try {
      const res = await studentService.submitComprehensionAnswer(
        sessionId,
        directiveId,
        widgetType,
        value.trim()
      );
      setResult({ is_correct: res?.is_correct });
    } catch (e) {
      console.error("Failed to submit comprehension answer natively:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // free_response / retell have no strict correctness — just acknowledge.
  const feedback =
    result == null
      ? null
      : widgetType === "fill_blank"
      ? result.is_correct
        ? "✓ Correct!"
        : "Good try — keep practicing."
      : "✓ Submitted. Nice work!";
  const feedbackColor =
    widgetType === "fill_blank" && result && !result.is_correct ? colors.coral : "#00B894";

  return (
    <View style={styles.taCard}>
      {question ? <Text style={styles.taQuestion}>{question}</Text> : null}
      <View style={styles.taRow}>
        <TextInput
          style={[styles.taInput, multiline && styles.taInputMulti]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={setValue}
          editable={!result && !submitting && !disabled}
          multiline={multiline}
          returnKeyType={multiline ? "default" : "send"}
          onSubmitEditing={multiline ? undefined : handleSubmit}
        />
        <TouchableOpacity
          style={[styles.taSend, (!value.trim() || !!result || submitting) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!value.trim() || !!result || submitting || disabled}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.taSendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
      {feedback ? <Text style={[styles.taFeedback, { color: feedbackColor }]}>{feedback}</Text> : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  elementsContainer: {
    width: "100%",
  },
  taCard: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#00B89420",
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    gap: 10,
  },
  taQuestion: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text, lineHeight: 20 },
  taRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  taInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.dm,
    fontSize: 13,
    color: colors.text,
  },
  taInputMulti: { minHeight: 64, maxHeight: 140, textAlignVertical: "top" },
  taSend: {
    backgroundColor: colors.genPurple,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  taSendText: { fontFamily: fonts.dmBold, fontSize: 13, color: "#fff" },
  taFeedback: { fontFamily: fonts.dmBold, fontSize: 12 },
  webview: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  centerAlign: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  unavailableBlock: {
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "center",
    marginVertical: 8,
  },
  unavailableText: {
    fontFamily: fonts.dmBold,
    fontSize: 11,
    color: "#F57F17",
  },
  errorTextContainer: {
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  errorText: {
    fontFamily: fonts.dmBold,
    fontSize: 11,
    color: "#F57F17",
  },
  // Difficult Word Syllables
  dwContainer: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 16,
  },
  dwHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dwWordTap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dwSpeaker: {
    fontSize: 14,
  },
  dwWord: {
    fontFamily: fonts.dmBold,
    fontSize: 14,
    color: "#1E40AF",
  },
  dwSlowBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dwSlowText: {
    fontFamily: fonts.dmMedium,
    fontSize: 11,
    color: "#2563EB",
  },
  dwPhonetic: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: "#2563EB",
  },
  syllableRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  syllableChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  syllableText: {
    fontFamily: fonts.dmMedium,
    fontSize: 12,
    color: "#475569",
  },
  // MCQ Native Widget
  mcqCard: {
    marginVertical: 10,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mcqQuestion: {
    fontFamily: fonts.dmBold,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  mcqChoices: {
    gap: 8,
  },
  choiceBtn: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FAFBFF",
  },
  choiceInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  choiceText: {
    fontFamily: fonts.dmMedium,
    fontSize: 13,
    color: colors.textMid,
  },
  choiceSelected: {
    backgroundColor: "#F3E8FF",
    borderColor: colors.genPurple,
  },
  choiceTextSelected: {
    color: colors.genPurple,
    fontWeight: "bold",
  },
  choiceCorrect: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  choiceWrong: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },
  choiceIcon: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#475569",
  },
  mcqLoader: {
    marginTop: 10,
  },
});

/** Markdown styles matching MessageBubble */
const mdStyles = {
  body: {
    fontFamily: fonts.dm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
    fontFamily: fonts.dm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  heading1: {
    fontFamily: fonts.dmBold,
    fontSize: 17,
    color: "#1a3a2a",
    marginTop: 10,
    marginBottom: 4,
  },
  heading2: {
    fontFamily: fonts.dmBold,
    fontSize: 15,
    color: "#1a3a2a",
    marginTop: 8,
    marginBottom: 3,
  },
  heading3: {
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: "#1a3a2a",
    marginTop: 6,
    marginBottom: 2,
  },
  strong: {
    fontFamily: fonts.dmBold,
    color: colors.text,
  },
  em: {
    fontStyle: "italic" as const,
    color: colors.textMid,
  },
  bullet_list: { marginBottom: 6 },
  ordered_list: { marginBottom: 6 },
  list_item: {
    fontFamily: fonts.dm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    marginBottom: 2,
  },
  code_inline: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: "#334155",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  fence: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
  },
  code_block: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.edGreen,
    paddingLeft: 10,
    marginLeft: 0,
    marginVertical: 6,
    backgroundColor: "#F0FBF6",
    borderRadius: 4,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 8,
  },
};
