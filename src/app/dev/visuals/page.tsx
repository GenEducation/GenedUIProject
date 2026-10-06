"use client";

/**
 * Dev-only harness for tutor visuals inside a message. Mounts the real
 * ChatMessageBubble with real ChatElements (no auth/backend) so the frameless
 * layout, the left alignment and the size caps can be checked against actual
 * rendered pixels rather than guessed at. 404s in production.
 *
 * ChatMessageBubble → MessageElements is the same path the voice screen uses,
 * so verifying here verifies both surfaces.
 */
import { ChatMessageBubble } from "@/features/student/components/ChatMessageBubble";
import { VoiceTranscript } from "@/features/student/components/VoiceTranscript";
import type { ChatMessage } from "@/features/student/store/useStudentStore";

// A tray of sweets, in the shape the tutor actually sends: a wide sketch that
// used to be the worst case for letterboxing.
const TRAY_SKETCH = `
function setup() {
  createCanvas(600, 300);
  noLoop();
}
function draw() {
  background(240);
  fill(196, 145, 92);
  stroke(140, 100, 60);
  strokeWeight(3);
  rect(60, 90, 480, 120, 12);
  noStroke();
  for (let i = 0; i < 3; i++) {
    for (let r = 0; r < 2; r++) {
      fill(245, 205, 20);
      circle(120 + i * 90, 125 + r * 50, 56);
    }
  }
  for (let i = 0; i < 2; i++) {
    fill(252, 248, 227);
    circle(400 + i * 80, 150, 46);
  }
}
`;

// A list of plain points, exactly as the tutor sends it for an array/grouping
// visual. Every comma inside a pair must survive the split.
const POINTS_PAYLOAD =
  "(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(2,1),(2,2),(2,3),(2,4),(4,1),(4,2),(4,3),(4,4),(4,5),(4,6),(5,1),(5,2),(5,3),(5,4),(7,1),(7,2),(7,3),(7,4),(7,5),(7,6),(8,1),(8,2),(8,3),(8,4)";

const message = (over: Partial<ChatMessage>): ChatMessage => ({
  id: "dev-1",
  sender: "ai",
  text: "",
  timestamp: "12:57 PM",
  ...over,
});

export default function DevVisualsHarness() {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div style={{ background: "#F7F8FC", minHeight: "100vh", padding: "32px 0" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }} data-testid="dev-chat-column">
        <ChatMessageBubble
          message={message({
            id: "u-1",
            sender: "user",
            text: "how many laddoos are on the tray?",
          })}
        />

        <ChatMessageBubble
          message={message({
            id: "ai-1",
            text: "Of course! Let me sketch that tray for you so you can see exactly how Muniamma arranged them.",
            elements: [
              {
                id: "el-0",
                type: "text",
                content:
                  "Of course! Let me sketch that tray for you so you can see exactly how Muniamma arranged them.",
              },
              {
                id: "el-1",
                type: "visual",
                content: "p5sketch",
                meta: { engine: "p5sketch", label: "Muniamma's tray", code: TRAY_SKETCH },
              },
              {
                id: "el-2",
                type: "text",
                content: "How many laddoos do you count in just **one** tray?",
              },
            ],
          })}
        />

        <ChatMessageBubble
          message={message({
            id: "ai-2",
            text: "Here are all three trays laid out.",
            elements: [
              { id: "el-3", type: "text", content: "Here are all three trays laid out." },
              { id: "el-4", type: "widget", content: POINTS_PAYLOAD },
            ],
          })}
        />
      </div>

      {/* Voice mode renders the same elements through the same MessageElements
          dispatcher, so the visual work must land here identically. */}
      <div style={{ maxWidth: 900, margin: "48px auto 0", height: 520 }} data-testid="dev-voice-column">
        <VoiceTranscript
          agentName="Tutor"
          messages={[
            message({ id: "v-1", sender: "user", text: "how many laddoos are on the tray?" }),
            message({
              id: "v-2",
              text: "Let me sketch that tray for you.",
              elements: [
                { id: "v-el-0", type: "text", content: "Let me sketch that tray for you." },
                {
                  id: "v-el-1",
                  type: "visual",
                  content: "p5sketch",
                  meta: { engine: "p5sketch", label: "Muniamma's tray", code: TRAY_SKETCH },
                },
              ],
            }),
          ]}
        />
      </div>
    </div>
  );
}
