"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { LessonActivity } from "@/features/student/learner/types";
import { browserOralDeps, canCaptureAudio, INITIAL_ORAL, OralAnswerSession, type OralState } from "../check/oralAnswer";
import { useSessionLanguage, useUiText } from "../i18n";
import { fetchActivityAudio } from "../reading/passageAudio";
import { useSegmentAudio } from "../reading/useSegmentAudio";
import type { ActivityAttempt } from "../types";
import { useLessonStore } from "../useLessonStore";

const titles = { write: "Writing", speak: "Speaking", read_aloud: "Read aloud", listen: "Listening" };

export function ActivityCard({ nodeId, activity }: { nodeId: string; activity: LessonActivity }) {
  const instanceId = useLessonStore((state) => state.instanceId);
  const submit = useLessonStore((state) => state.submitActivity);
  const afterActivity = useLessonStore((state) => state.afterActivity);
  const oralContext = useLessonStore((state) => state.oralContext);
  const setVoiceMode = useLessonStore((state) => state.setVoiceMode);
  const language = useSessionLanguage();
  const t = useUiText();
  const promptId = useId();
  const answerId = useId();
  const [text, setText] = useState("");
  const [practising, setPractising] = useState(false);
  const [sending, setSending] = useState(false);
  const [heardPassage, setHeardPassage] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [voice, setVoice] = useState<OralState>(INITIAL_ORAL);
  const request = useRef<{ id: string; text: string } | null>(null);
  const oral = useRef<OralAnswerSession | null>(null);
  const reported = useRef<string | null>(null);
  const audioDeps = useMemo(() => ({
    fetchAudio: (instance: string, item: string) => fetchActivityAudio(instance, nodeId, item, language),
    createAudio: () => new Audio(),
    objectUrl: (blob: Blob) => URL.createObjectURL(blob),
    revokeUrl: (url: string) => URL.revokeObjectURL(url),
  }), [nodeId, language]);
  const onPassageEnded = useCallback(() => setHeardPassage(true), []);
  const audio = useSegmentAudio(instanceId, activity.item_id, 1, audioDeps, onPassageEnded);
  useEffect(() => {
    const session = new OralAnswerSession(browserOralDeps, setVoice);
    oral.current = session;
    return () => {
      session.cancel();
      oral.current = null;
    };
  }, []);

  function showAttempt(result: ActivityAttempt) {
    if (result.attempted) {
      setPractising(false);
      setText("");
      setNotice("Answer saved.");
    } else {
      setNotice(
        result.not_attempted_reason === "no_speech" ? "I couldn't hear you. Please try again."
          : result.not_attempted_reason === "off_task" ? "Try answering the activity in your own words."
          : "Give a little more detail and try again.",
      );
    }
  }

  useEffect(() => {
    const result = voice.activityResult;
    if (!result || reported.current === result.id) return;
    reported.current = result.id;
    void afterActivity(nodeId, result.id, result.heard).then(() => showAttempt(result), () => {
      reported.current = null;
      setNotice("Your answer was saved. Try loading the feedback again.");
    });
  }, [afterActivity, nodeId, voice.activityResult]);

  const sendText = async () => {
    if (!text.trim() || sending) return;
    if (request.current?.text !== text) request.current = { id: crypto.randomUUID(), text };
    setNotice(null);
    setSending(true);
    try {
      const result = await submit(nodeId, activity.item_id, text, request.current.id);
      if (result) {
        request.current = null;
        showAttempt(result);
      }
    } catch {
      setNotice("The answer could not be confirmed. Try again.");
    } finally {
      setSending(false);
    }
  };

  const startSpeaking = () => {
    const context = oralContext();
    if (!context) return;
    setNotice(null);
    audio.stop();
    setVoiceMode(false);
    oral.current?.start({
      instanceId: context.instanceId, itemId: activity.item_id, sessionId: context.sessionId,
      expectedRevision: context.revision, language, activity: { nodeId, requestId: crypto.randomUUID() },
    });
  };

  const busy = ["starting", "recording", "sending"].includes(voice.phase);
  const listening = activity.mode === "listen";
  const showInput = !activity.attempted || practising;
  const canAnswer = !listening || heardPassage;
  return (
    <section className="lesson-sketch mb-3 p-4 text-[var(--ls-ink)]" aria-labelledby={promptId}>
      <div className="text-xs font-semibold text-[var(--ls-ink-mid)]">{titles[activity.mode]}</div>
      <h2 id={promptId} className="lesson-hand mt-1 text-xl font-bold">{activity.prompt}</h2>
      {showInput && (
        <div className="mt-3 space-y-3">
          {activity.mode === "read_aloud" && activity.passage && (
            <blockquote className="whitespace-pre-wrap border-l-2 pl-3">{activity.passage}</blockquote>
          )}
          {listening && (
            <>
              <Button size="sm" type="button" disabled={audio.phase === "loading" || busy} onClick={() => {
                if (audio.phase === "playing") audio.pause();
                else {
                  setVoiceMode(false);
                  audio.play();
                }
              }}>
                {audio.phase === "playing" ? "Pause passage" : "Play passage"}
              </Button>
              {audio.problem && <p role="alert">The passage could not be played. Try again.</p>}
            </>
          )}
          {canAnswer && (activity.mode === "write" || listening) && (
            <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void sendText(); }}>
              <label className="block" htmlFor={answerId}>{t("yourAnswer")}</label>
              <textarea id={answerId} rows={3} maxLength={4000} value={text} disabled={sending || busy}
                onChange={(event) => setText(event.target.value)}
                className="w-full rounded border border-[var(--ls-ink-mid)] bg-transparent p-2" />
              <Button size="sm" type="submit" disabled={sending || busy || !text.trim()}>Send answer</Button>
            </form>
          )}
          {canAnswer && activity.mode !== "write" && (
            <div className="flex flex-wrap items-center gap-2">
              {voice.phase === "recording" ? (
                <Button size="sm" type="button" onClick={() => oral.current?.finish()}>{t("spokenDone")}</Button>
              ) : (
                <Button size="sm" type="button" disabled={busy || sending || !canCaptureAudio() || audio.phase === "playing"}
                  onClick={startSpeaking}>{listening ? "Answer aloud" : t("spokenStart")}</Button>
              )}
              {busy && <Button size="sm" type="button" onClick={() => oral.current?.cancel()}>Cancel</Button>}
              <span role="status">
                {voice.phase === "starting" ? t("spokenStarting") : voice.phase === "recording" ? t("spokenRecording")
                  : voice.phase === "sending" ? "Sending answer…" : null}
              </span>
              {voice.phase === "failed" && <p role="alert">The spoken answer could not be sent. Try again.</p>}
              {!canCaptureAudio() && !listening && <p role="status">{t("spokenNoMic")}</p>}
              {voice.activityResult && reported.current === null && (
                <Button size="sm" type="button" onClick={() => {
                  const result = voice.activityResult;
                  if (result) void afterActivity(nodeId, result.id, result.heard).then(() => showAttempt(result), () => {});
                }}>Load feedback</Button>
              )}
            </div>
          )}
        </div>
      )}
      {!showInput && (
        <Button className="mt-3" size="sm" type="button" onClick={() => {
          setNotice(null);
          setHeardPassage(false);
          setPractising(true);
        }}>
          Practice again
        </Button>
      )}
      {notice && <p role="status" className="mt-2">{notice}</p>}
    </section>
  );
}

export function CompletedActivities() {
  const completed = useLessonStore((state) => state.instance?.completed_nodes);
  const nodes = completed?.filter((node) => node.activities?.length);
  if (!nodes?.length) return null;
  return (
    <details className="lesson-sketch my-3 p-4">
      <summary className="cursor-pointer font-semibold">Practise completed activities</summary>
      {nodes.map((node) => (
        <div key={node.instance_node_id} className="mt-3">
          <h2 className="mb-2 text-sm font-semibold">{node.title}</h2>
          {node.activities?.map((activity) => (
            <ActivityCard key={activity.item_id} nodeId={node.instance_node_id} activity={activity} />
          ))}
        </div>
      ))}
    </details>
  );
}
