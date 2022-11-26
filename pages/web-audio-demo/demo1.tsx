import Head from "next/head";
import { FormEventHandler, useEffect, useRef, useState } from "react";

export default function Demo1() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);

  const gainNodeRef = useRef<GainNode | null>(null);
  const [gain, setGain] = useState(1);

  const panNodeRef = useRef<StereoPannerNode | null>(null);
  const [pan, setPan] = useState(0);

  useEffect(() => {
    const audio = (audioRef.current = new Audio());
    audio.src = "/1.mp3";
    audio.addEventListener("ended", () => {
      setPlaying(false);
    });

    const audioContext = (audioContextRef.current = new AudioContext());
    const track = audioContext.createMediaElementSource(audio);

    const gainNode = (gainNodeRef.current = audioContext.createGain());
    const panNode = (panNodeRef.current = audioContext.createStereoPanner());
    track.connect(gainNode).connect(panNode).connect(audioContext.destination);

    return () => {
      track.disconnect();
      audioContext.close();
    };
  }, []);

  const onClick = () => {
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }

    if (!playing) {
      audioRef.current?.play().then(() => {
        setPlaying(true);
      });
    } else {
      audioRef.current?.pause();
      setPlaying(false);
    }
  };

  const onChangeGain: FormEventHandler<HTMLInputElement> = (e) => {
    const value = +(e.target as HTMLInputElement).value;
    setGain(value);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = value;
    }
  };

  const onChangePan: FormEventHandler<HTMLInputElement> = (e) => {
    const value = +(e.target as HTMLInputElement).value;
    setPan(value);
    if (panNodeRef.current) {
      panNodeRef.current.pan.value = value;
    }
  };

  return (
    <div>
      <Head>
        <title>Demo1</title>
      </Head>

      <main>
        <div>
          <button onClick={onClick}>{playing ? "暂停" : "播放"}</button>
        </div>
        <div>
          <span>增益：</span>
          <input
            type="range"
            id="volume"
            min="0"
            max="2"
            value={gain}
            step="0.01"
            onInput={onChangeGain}
          />
        </div>
        <div>
          <span>立体声偏移：</span>
          <input
            type="range"
            id="volume"
            min="-1"
            max="1"
            value={pan}
            step="0.01"
            onInput={onChangePan}
          />
        </div>
      </main>
    </div>
  );
}
