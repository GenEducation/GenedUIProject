import React, { useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import Svg, { Circle, Rect, Polygon, Path } from "react-native-svg";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";

export default function Hotspot({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const imageUrl: string = render.image_url ?? "";
  const imgW: number = render.image_width ?? 320;
  const imgH: number = render.image_height ?? 240;
  const regions: Array<{ id: string; shape: string; coords: number[] }> = render.regions ?? [];
  const maxSel: number = meta?.interaction?.max_selections ?? 1;

  const [selected, setSelected] = useState<string[]>([]);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "hotspot", sessionId);

  const toggle = (id: string) => {
    if (submitted || readOnly) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < maxSel ? [...prev, id] : prev
    );
  };

  const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
  const resolvedUrl = imageUrl.startsWith("http") ? imageUrl : `${API_URL}${imageUrl}`;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={[styles.container, { width: imgW, height: imgH }]}>
        {imageUrl ? (
          <Image source={{ uri: resolvedUrl }} style={{ width: imgW, height: imgH }} resizeMode="contain" />
        ) : null}
        <Svg
          style={StyleSheet.absoluteFill}
          width={imgW} height={imgH}
          viewBox={render.viewbox ?? `0 0 ${imgW} ${imgH}`}
        >
          {regions.map((reg) => {
            const isSel = selected.includes(reg.id);
            const fill = isSel ? COLORS.brand + "66" : "transparent";
            const stroke = isSel ? COLORS.brand : "#ffffff66";
            const props = { fill, stroke, strokeWidth: 2, onPress: () => toggle(reg.id) };
            if (reg.shape === "circle") {
              return <Circle key={reg.id} cx={reg.coords[0]} cy={reg.coords[1]} r={reg.coords[2]} {...props} />;
            }
            if (reg.shape === "rect") {
              return <Rect key={reg.id} x={reg.coords[0]} y={reg.coords[1]} width={reg.coords[2]} height={reg.coords[3]} {...props} />;
            }
            if (reg.shape === "polygon") {
              const pts = reg.coords.map((v, i) => i % 2 === 0 ? v : v).reduce((acc: string, v, i) => i % 2 === 0 ? `${acc} ${v},` : `${acc}${v}`, "").trim();
              return <Polygon key={reg.id} points={pts} {...props} />;
            }
            return null;
          })}
        </Svg>
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={selected.length > 0} submitting={submitting}
        onSubmit={() => submit({ selected })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", overflow: "hidden", borderRadius: 12 },
});
