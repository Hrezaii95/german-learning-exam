"use client";
import { LButton, LDiv, LH1, LH2, LHeader, LInput, LLabel, LOption, LP, LSection, LSelect } from "@/components/i18n/LocalizedElements";


import { useEffect, useState } from "react";
import {
  StatusMessage,
  useAnnouncement,
} from "@/components/a11y/StatusMessage";
import { BackupPanel } from "./BackupPanel";
import { useLearnerState } from "./LearnerStateProvider";
import { audioSpeedOptions } from "@/components/audio/AudioSpeedControl";

export function SettingsView() {
  const { snapshot, controller } = useLearnerState();
  const state = snapshot.hydration?.state;
  const [timezone, setTimezone] = useState(state?.settings.timezone ?? "UTC");
  const [speed, setSpeed] = useState(state?.settings.preferredAudioSpeed ?? 1);
  const [message, setMessage] = useAnnouncement();

  useEffect(() => {
    if (!state) return;
    setTimezone(state.settings.timezone);
    setSpeed(state.settings.preferredAudioSpeed);
  }, [state?.settings.preferredAudioSpeed, state?.settings.timezone]);

  if (snapshot.status === "loading") return <LP role="status">Loading local settings…</LP>;
  if (!state || !controller) return <LP className="placeholder-banner" role="alert">{snapshot.statusMessage}</LP>;

  return (
    <LDiv className="stack">
      <LHeader className="page-header"><LP className="dense">Local-first</LP><LH1>Settings &amp; data</LH1><LP className="lede">Your learning data stays in this browser unless you export it.</LP></LHeader>
      <LSection className="panel" aria-labelledby="preferences-heading">
        <LH2 id="preferences-heading">Preferences</LH2>
        <LDiv className="hub-filter-grid">
          <LLabel className="hub-field">IANA timezone<LInput className="hub-input" value={timezone} onChange={(e) => setTimezone(e.target.value)} /></LLabel>
          <LLabel className="hub-field">Audio speed<LSelect className="hub-input" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{audioSpeedOptions(speed).map(value => <LOption key={value} value={value}>{value}×</LOption>)}</LSelect></LLabel>
        </LDiv>
        <LButton className="btn btn-primary" type="button" onClick={() => void controller.updateSettings({ timezone, preferredAudioSpeed: speed }).then(() => setMessage("Settings saved."), () => setMessage("Settings were rejected; check the timezone."))}>Save preferences</LButton>
      </LSection>
      <BackupPanel/>
      <StatusMessage announcement={message} className="detail-feedback" />
    </LDiv>
  );
}
