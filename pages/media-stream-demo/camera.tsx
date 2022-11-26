import Head from "next/head";
import { useRef, useState } from "react";

export default function Camera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [playing, setPlaying] = useState(false);

  const onClick = async () => {
    if (playing) {
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      setPlaying(false);
    } else {
      const video = videoRef.current;
      if (!video) {
        return;
      }
      const mediaStream = (mediaStreamRef.current =
        await navigator.mediaDevices.getUserMedia({
          video: true,
        }));
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
        <title>Camera</title>
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
      </main>
    </div>
  );
}
