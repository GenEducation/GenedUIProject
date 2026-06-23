import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PickerSheet, PickerField } from "../PickerSheet";
import { colors, fonts, radius } from "../../theme/tokens";
import type { IngestionUploadForm } from "../../types/partner";

const SUBJECTS = ["English", "Mathematics", "Science", "Hindi"];
const GRADES   = Array.from({ length: 12 }, (_, i) => String(i + 1));

interface Props {
  onClose: () => void;
  onSubmit: (form: IngestionUploadForm, fileUri: string, fileName: string) => Promise<void>;
}

interface PickedFile {
  uri:  string;
  name: string;
  size?: number;
}

export function IngestionSheet({ onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();

  const [file, setFile]     = useState<PickedFile | null>(null);
  const [subject,  setSubject]  = useState("");
  const [grade,    setGrade]    = useState("");
  const [title,    setTitle]    = useState("");
  const [agent,    setAgent]    = useState("");
  const [board,    setBoard]    = useState("CBSE");

  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [gradePickerOpen,   setGradePickerOpen]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // PDF preview state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages,  setTotalPages]  = useState(0);
  const [pdfError,    setPdfError]    = useState(false);
  const pdfRef = useRef<{ setPage: (page: number) => void } | null>(null);

  // Lazy-require react-native-pdf to avoid TurboModule init crash at startup
  const Pdf = React.useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("react-native-pdf").default as React.ComponentType<Record<string, unknown>>;
    } catch {
      return null;
    }
  }, []);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setFile({ uri: asset.uri, name: asset.name, size: asset.size });
      // Reset preview state for new file
      setCurrentPage(1);
      setTotalPages(0);
      setPdfError(false);
      // Pre-fill title from filename if empty
      if (!title) {
        setTitle(asset.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "));
      }
    } catch {
      Alert.alert("Error", "Could not pick the file. Please try again.");
    }
  };

  const goToPrevPage = useCallback(() => {
    if (currentPage <= 1) return;
    const next = currentPage - 1;
    setCurrentPage(next);
    pdfRef.current?.setPage(next);
  }, [currentPage]);

  const goToNextPage = useCallback(() => {
    if (totalPages === 0 || currentPage >= totalPages) return;
    const next = currentPage + 1;
    setCurrentPage(next);
    pdfRef.current?.setPage(next);
  }, [currentPage, totalPages]);

  const canSubmit = !!file && !!subject && !!grade && !!title.trim() && !!agent.trim();

  const handleSubmit = async () => {
    if (!file || !canSubmit) return;
    setSubmitting(true);
    setUploadError(null);
    try {
      await onSubmit(
        {
          subject:        subject.toLowerCase(),
          document_title: title.trim(),
          agent_name:     agent.trim(),
          grade:          grade,
          board:          board.trim() || "CBSE",
          document_type:  "chapter",
        },
        file.uri,
        file.name
      );
      onClose();
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Upload Curriculum</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* File Picker */}
          <Pressable style={[styles.filePicker, file && styles.filePickerFilled]} onPress={pickFile}>
            {file ? (
              <View style={styles.fileInfo}>
                <Text style={styles.fileIcon}>📄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName} numberOfLines={2}>{file.name}</Text>
                  {file.size ? <Text style={styles.fileSize}>{formatSize(file.size)}</Text> : null}
                </View>
                <Text style={styles.changeFile}>Change</Text>
              </View>
            ) : (
              <View style={styles.fileEmpty}>
                <Text style={styles.fileEmptyIcon}>📎</Text>
                <Text style={styles.fileEmptyTitle}>Select PDF</Text>
                <Text style={styles.fileEmptyHint}>Tap to pick a curriculum PDF</Text>
              </View>
            )}
          </Pressable>

          {/* PDF Preview — shown after file is picked */}
          {file && Pdf && !pdfError ? (
            <View style={styles.previewCard}>
              {/* Preview header */}
              <View style={styles.previewHeader}>
                <Text style={styles.previewLabel}>Preview</Text>
                {totalPages > 0 && (
                  <Text style={styles.previewPageCount}>
                    Page {currentPage} of {totalPages}
                  </Text>
                )}
              </View>

              {/* PDF render area */}
              <View style={styles.pdfWrap}>
                <Pdf
                  ref={(ref: { setPage: (page: number) => void } | null) => { pdfRef.current = ref; }}
                  source={{ uri: file.uri, cache: false }}
                  page={currentPage}
                  enablePaging
                  horizontal
                  fitPolicy={0}
                  trustAllCerts={Platform.OS === "android"}
                  style={styles.pdfView}
                  onLoadComplete={(numPages: number) => {
                    setTotalPages(numPages);
                    setCurrentPage(1);
                  }}
                  onPageChanged={(page: number) => {
                    setCurrentPage(page);
                  }}
                  onError={() => {
                    setPdfError(true);
                  }}
                />
              </View>

              {/* Page navigation */}
              {totalPages > 1 && (
                <View style={styles.navRow}>
                  <Pressable
                    style={[styles.navBtn, currentPage <= 1 && styles.navBtnDisabled]}
                    onPress={goToPrevPage}
                    disabled={currentPage <= 1}
                  >
                    <Text style={[styles.navBtnText, currentPage <= 1 && styles.navBtnTextDisabled]}>
                      ‹ Prev
                    </Text>
                  </Pressable>

                  <View style={styles.pageIndicator}>
                    <Text style={styles.pageIndicatorText}>
                      {currentPage} / {totalPages}
                    </Text>
                  </View>

                  <Pressable
                    style={[styles.navBtn, currentPage >= totalPages && styles.navBtnDisabled]}
                    onPress={goToNextPage}
                    disabled={currentPage >= totalPages}
                  >
                    <Text style={[styles.navBtnText, currentPage >= totalPages && styles.navBtnTextDisabled]}>
                      Next ›
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : file && pdfError ? (
            <View style={styles.previewErrorCard}>
              <Text style={styles.previewErrorIcon}>⚠️</Text>
              <Text style={styles.previewErrorText}>
                Could not render preview. The file will still upload correctly.
              </Text>
            </View>
          ) : null}

          {/* Form fields */}
          <View style={styles.fields}>
            {/* Subject */}
            <PickerField
              label="Subject"
              value={subject}
              placeholder="Select subject…"
              onPress={() => setSubjectPickerOpen(true)}
            />

            {/* Grade */}
            <PickerField
              label="Grade"
              value={grade ? `Grade ${grade}` : ""}
              placeholder="Select grade…"
              onPress={() => setGradePickerOpen(true)}
            />

            {/* Document Title */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Document Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. NCERT Science Class 10"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Agent Name */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Agent Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Science Bot"
                placeholderTextColor={colors.textMuted}
                value={agent}
                onChangeText={setAgent}
              />
            </View>

            {/* Board */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Board</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CBSE"
                placeholderTextColor={colors.textMuted}
                value={board}
                onChangeText={setBoard}
              />
            </View>
          </View>

          {uploadError ? (
            <Text style={styles.errorText}>{uploadError}</Text>
          ) : null}

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Upload Curriculum</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>

      {/* Subject picker */}
      <PickerSheet
        visible={subjectPickerOpen}
        title="Select Subject"
        options={SUBJECTS}
        selected={subject}
        onSelect={setSubject}
        onClose={() => setSubjectPickerOpen(false)}
      />

      {/* Grade picker */}
      <PickerSheet
        visible={gradePickerOpen}
        title="Select Grade"
        options={GRADES.map((g) => `Grade ${g}`)}
        selected={grade ? `Grade ${grade}` : ""}
        onSelect={(val) => setGrade(val.replace("Grade ", ""))}
        onClose={() => setGradePickerOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000055",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "92%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title:     { fontFamily: fonts.nunito, fontSize: 18, color: colors.text },
  closeBtn:  { padding: 8 },
  closeText: { fontSize: 16, color: colors.textMuted },

  body: { padding: 20, gap: 16 },

  // File picker
  filePicker: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: "center",
  },
  filePickerFilled: {
    borderStyle: "solid",
    borderColor: colors.edGreen + "60",
    backgroundColor: colors.edGreen + "06",
  },
  fileEmpty: { alignItems: "center", gap: 6 },
  fileEmptyIcon:  { fontSize: 28 },
  fileEmptyTitle: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  fileEmptyHint:  { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  fileIcon:    { fontSize: 24 },
  fileName:    { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text, flex: 1 },
  fileSize:    { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  changeFile:  { fontFamily: fonts.dmBold, fontSize: 12, color: colors.edGreen },

  // PDF preview card
  previewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.pageBg,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  previewLabel: {
    fontFamily: fonts.dmBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  previewPageCount: {
    fontFamily: fonts.dmMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  pdfWrap: {
    height: 320,
    backgroundColor: "#f0f0f0",
  },
  pdfView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.edGreen,
    backgroundColor: colors.edGreen + "10",
  },
  navBtnDisabled: {
    borderColor: colors.border,
    backgroundColor: "transparent",
  },
  navBtnText: {
    fontFamily: fonts.dmBold,
    fontSize: 13,
    color: colors.edGreen,
  },
  navBtnTextDisabled: {
    color: colors.textMuted,
  },
  pageIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  pageIndicatorText: {
    fontFamily: fonts.dmBold,
    fontSize: 12,
    color: colors.textMid,
  },

  // Preview error fallback
  previewErrorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.pageBg,
  },
  previewErrorIcon: { fontSize: 18 },
  previewErrorText: {
    flex: 1,
    fontFamily: fonts.dmMedium,
    fontSize: 12,
    color: colors.textMuted,
  },

  // Form
  fields: { gap: 14 },
  field:  { gap: 6 },
  fieldLabel: {
    fontFamily: fonts.dmBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.dmMedium,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.pageBg,
  },

  errorText: {
    fontFamily: fonts.dmMedium,
    fontSize: 13,
    color: colors.coral,
    textAlign: "center",
  },

  submitBtn: {
    backgroundColor: colors.edGreen,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontFamily: fonts.dmBold, fontSize: 15, color: "#fff" },
});
