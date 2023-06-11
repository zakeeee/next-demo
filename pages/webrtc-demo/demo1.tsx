import Head from "next/head";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "../../styles/webrtc-demo/Demo1.module.css";

type NewCallData = {
  from: string;
  offer: RTCSessionDescriptionInit;
};

type NewAnswerData = {
  from: string;
  answer: RTCSessionDescriptionInit;
};

type NewIceCandidateData = {
  from: string;
  candidate: RTCIceCandidate | null;
};

function serialize(data: { type: string; payload: any }): string {
  return JSON.stringify(data);
}

function deserialize(data: any): { type: string; payload: any } {
  return JSON.parse(data.toString());
}

export default function Demo1() {
  const socketRef = useRef<WebSocket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [userIdList, setUserIdList] = useState<string[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection();

    pc.ontrack = (e: RTCTrackEvent) => {
      const remoteVideo = remoteVideoRef.current;
      if (remoteVideo && e.streams.length) {
        const remoteStream = e.streams[0];
        remoteVideo.srcObject = remoteStream;
      }
    };

    return pc;
  }, []);

  const handleCallUser = useCallback(
    async (userId: string) => {
      if (pcRef.current) {
        console.error("peer connection already exist");
        return;
      }

      const localStream = await navigator.mediaDevices.getDisplayMedia();
      const localVideo = localVideoRef.current;
      if (localVideo) {
        localVideo.srcObject = localStream;
      }

      const pc = (pcRef.current = createPeerConnection());
      pc.onicecandidate = (e) => {
        socketRef.current?.send(
          serialize({
            type: "new-ice-candidate",
            payload: {
              to: userId,
              candidate: e.candidate,
            },
          })
        );
      };

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.send(
        serialize({
          type: "call-user",
          payload: {
            to: userId,
            offer,
          },
        })
      );
    },
    [createPeerConnection]
  );

  const connectToServer = useCallback(() => {
    const socket = (socketRef.current = new WebSocket("ws://localhost:8888"));

    const disposeFuncs: (() => void)[] = [];

    const onOpen = () => {
      console.log("====== open");
    };
    socket.addEventListener("open", onOpen);
    disposeFuncs.push(() => {
      socket.removeEventListener("open", onOpen);
    });

    const onClose = () => {
      console.log("====== close");
    };
    socket.addEventListener("close", onClose);
    disposeFuncs.push(() => {
      socket.removeEventListener("close", onClose);
    });

    const onUserList = (data: { userIds: string[] }) => {
      setUserIdList(data.userIds);
    };

    const onAddUser = (data: { userId: string }) => {
      const newUserId = data.userId;
      setUserIdList((pre) => {
        if (pre.find((userId) => userId === newUserId)) {
          return pre;
        }
        return [...pre, newUserId];
      });
    };

    const onRemoveUser = (data: { userId: string }) => {
      setUserIdList((pre) => pre.filter((userId) => userId !== data.userId));
    };

    const onNewCall = async (data: NewCallData) => {
      if (pcRef.current) {
        console.error("peer connection already exist");
        return;
      }

      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      const localVideo = localVideoRef.current;
      if (localVideo) {
        localVideo.srcObject = localStream;
      }

      const pc = (pcRef.current = createPeerConnection());
      pc.onicecandidate = (e) => {
        socket.send(
          serialize({
            type: "new-ice-candidate",
            payload: {
              to: data.from,
              candidate: e.candidate,
            },
          })
        );
      };

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.send(
        serialize({
          type: "answer-user",
          payload: {
            to: data.from,
            answer,
          },
        })
      );
    };

    const onNewAnswer = async (data: NewAnswerData) => {
      await pcRef.current?.setRemoteDescription(data.answer);
    };

    const onNewIceCandidate = async (data: NewIceCandidateData) => {
      await pcRef.current?.addIceCandidate(data.candidate || undefined);
    };

    const onMessage = (e: MessageEvent) => {
      const { type, payload } = deserialize(e.data);
      switch (type) {
        case "user-list": {
          onUserList(payload);
          break;
        }
        case "add-user": {
          onAddUser(payload);
          break;
        }
        case "remove-user": {
          onRemoveUser(payload);
          break;
        }
        case "new-call": {
          onNewCall(payload);
          break;
        }
        case "new-answer": {
          onNewAnswer(payload);
          break;
        }
        case "new-ice-candidate": {
          onNewIceCandidate(payload);
          break;
        }
      }
    };

    socket.addEventListener("message", onMessage);
    disposeFuncs.push(() => {
      socket.removeEventListener("message", onMessage);
    });

    return () => {
      disposeFuncs.forEach((func) => {
        func();
      });
      socket.close();
    };
  }, [createPeerConnection]);

  useEffect(() => {
    return connectToServer();
  }, [connectToServer]);

  return (
    <div>
      <Head>
        <title>Demo1</title>
      </Head>

      <main>
        <div className={styles["room"]}>
          <div className={styles["user-list"]}>
            {userIdList.map((userId) => (
              <div
                className={styles["user-list-item"]}
                key={userId}
                onClick={() => handleCallUser(userId)}
              >
                {userId}
              </div>
            ))}
          </div>
          <div className={styles["video-wrapper"]}>
            <video
              className={styles["local-video"]}
              width={240}
              height={180}
              onLoadedMetadata={(e) => {
                console.log("====== local video will play");
                (e.target as HTMLVideoElement).play();
              }}
              ref={localVideoRef}
            ></video>
            <video
              className={styles["remote-video"]}
              width={1024}
              height={768}
              onLoadedMetadata={(e) => {
                console.log("====== remote video will play");
                (e.target as HTMLVideoElement).play();
              }}
              ref={remoteVideoRef}
            ></video>
          </div>
        </div>
      </main>
    </div>
  );
}
