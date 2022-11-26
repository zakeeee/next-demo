import Head from "next/head";
import { useEffect, useRef, useState } from "react";

export default function Demo1() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const channel = (channelRef.current = new BroadcastChannel("test"));
    channel.addEventListener("message", (e) => {
      setMessages((pre) => [...pre, `From Others: ${e.data}`]);
    });
    return () => {
      channel.close();
    };
  }, []);

  const sendMessage = () => {
    const channel = channelRef.current;
    if (!channel) {
      return;
    }
    channel.postMessage(inputValue);
    setInputValue("");
    setMessages((pre) => [...pre, `From Me: ${inputValue}`]);
  };

  return (
    <div>
      <Head>
        <title>Demo1</title>
      </Head>

      <main>
        <div>
          <input
            type="text"
            value={inputValue}
            onInput={(e) => {
              setInputValue((e.target as HTMLInputElement).value);
            }}
          />
          <button onClick={sendMessage}>发送</button>
        </div>
        <div
          style={{
            height: "500px",
            marginTop: "30px",
            border: "2px solid black",
            overflowY: "auto",
          }}
        >
          {messages.map((message, idx) => (
            <div
              key={idx}
              style={{
                padding: "12px",
                margin: "8px",
                background: "rgba(32, 255, 164, 0.5)",
                wordBreak: "break-all",
              }}
            >
              {message}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
