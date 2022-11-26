import Head from "next/head";
import { FormEventHandler, useRef, useState } from "react";

function wavelengthToRGB(wavelength: number, gamma = 0.8): string {
  let r: number, g: number, b: number;
  let attenuation: number;
  if (wavelength >= 380 && wavelength <= 440) {
    attenuation = 0.3 + (0.7 * (wavelength - 380)) / (440 - 380);
    r = ((-(wavelength - 440) / (440 - 380)) * attenuation) ** gamma;
    g = 0.0;
    b = (1.0 * attenuation) ** gamma;
  } else if (wavelength >= 440 && wavelength <= 490) {
    r = 0.0;
    g = ((wavelength - 440) / (490 - 440)) ** gamma;
    b = 1.0;
  } else if (wavelength >= 490 && wavelength <= 510) {
    r = 0.0;
    g = 1.0;
    b = (-(wavelength - 510) / (510 - 490)) ** gamma;
  } else if (wavelength >= 510 && wavelength <= 580) {
    r = ((wavelength - 510) / (580 - 510)) ** gamma;
    g = 1.0;
    b = 0.0;
  } else if (wavelength >= 580 && wavelength <= 645) {
    r = 1.0;
    g = (-(wavelength - 645) / (645 - 580)) ** gamma;
    b = 0.0;
  } else if (wavelength >= 645 && wavelength <= 750) {
    attenuation = 0.3 + (0.7 * (750 - wavelength)) / (750 - 645);
    r = (1.0 * attenuation) ** gamma;
    g = 0.0;
    b = 0.0;
  } else {
    r = 0.0;
    g = 0.0;
    b = 0.0;
  }
  r = Math.floor(r * 255);
  g = Math.floor(g * 255);
  b = Math.floor(b * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Demo1() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [hasAudioContext, setHasAudioContext] = useState(false);
  const [playing, setPlaying] = useState(false);

  const gainNodeRef = useRef<GainNode | null>(null);
  const [gain, setGain] = useState(1);

  const panNodeRef = useRef<StereoPannerNode | null>(null);
  const [pan, setPan] = useState(0);

  const analyserNode = useRef<AnalyserNode | null>(null);

  const animationFrameId = useRef<number | null>(null);

  const createContext = () => {
    if (audioContextRef.current) {
      return;
    }

    const audio = (audioRef.current = new Audio());
    audio.src = "/1.mp3";
    audio.addEventListener("ended", () => {
      setPlaying(false);
    });

    const audioContext = (audioContextRef.current = new AudioContext());
    setHasAudioContext(true);

    const track = audioContext.createMediaElementSource(audio);
    const gainNode = (gainNodeRef.current = audioContext.createGain());
    const panNode = (panNodeRef.current = audioContext.createStereoPanner());
    const analyser = (analyserNode.current = audioContext.createAnalyser());
    track
      .connect(gainNode)
      .connect(panNode)
      .connect(analyser)
      .connect(audioContext.destination);
  };

  const onTogglePlay = () => {
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }

    if (!playing) {
      audioRef.current?.play().then(() => {
        setPlaying(true);

        const analyser = analyserNode.current;
        if (!analyser) {
          return;
        }

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const buffer = new Uint8Array(bufferLength);
        const ctx = canvasRef.current!.getContext("2d")!;
        const draw = () => {
          animationFrameId.current = window.requestAnimationFrame(draw);

          analyser.getByteFrequencyData(buffer);

          ctx.fillStyle = "rgb(0, 0, 0)";
          ctx.fillRect(0, 0, 512, 200);

          const barWidth = (512 / bufferLength) * 1;
          let barHeight;
          let x = 0;
          const k = (750 - 380) / (bufferLength - 48);
          for (let i = 0; i < bufferLength; i++) {
            barHeight = buffer[i];

            ctx.fillStyle = wavelengthToRGB(750 - i * k);
            ctx.fillRect(x, 200 - barHeight / 2, barWidth, barHeight / 2);

            x += barWidth + 1;
          }
        };
        draw();
      });
    } else {
      if (animationFrameId.current) {
        window.cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
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
          <button onClick={createContext} disabled={hasAudioContext}>
            创建 Context
          </button>
        </div>
        <div>
          <button onClick={onTogglePlay} disabled={!hasAudioContext}>
            {playing ? "暂停" : "播放"}
          </button>
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
        <div>
          <canvas ref={canvasRef} width={512} height={200}></canvas>
        </div>
      </main>
    </div>
  );
}
