import Head from "next/head";
import { useEffect, useRef, useState } from "react";

export default function Canvas() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) {
        return;
      }
      const x = Math.floor(Math.random() * 650);
      const y = Math.floor(Math.random() * 400);
      ctx.fillStyle = "red";
      ctx.font = '30px "Microsoft Yahei"';
      ctx.fillText("你干嘛~哎哟", x, y);
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const onClick = async () => {
    if (playing) {
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      setPlaying(false);
    } else {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        return;
      }
      const mediaStream = (mediaStreamRef.current = canvas.captureStream(30));
      video.srcObject = mediaStream;
      video.addEventListener("loadedmetadata", function () {
        this.play().then(() => {
          setPlaying(true);
        });
      });
    }
  };

  return (
    <div>
      <Head>
        <title>Canvas</title>
      </Head>

      <main>
        <div>
          <button onClick={onClick}>{playing ? "停止" : "开始"}</button>
        </div>
        <div>视频</div>
        <video
          ref={videoRef}
          style={{
            border: "2px solid black",
          }}
          width={720}
          height={480}
        />
        <div>画板</div>
        <canvas
          ref={canvasRef}
          style={{
            width: "720px",
            height: "480px",
            border: "2px solid black",
          }}
          width={720}
          height={480}
        ></canvas>
      </main>
    </div>
  );
}
