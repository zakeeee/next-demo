import Head from "next/head";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import styles from "../../styles/webrtc-demo/Demo1.module.css";

type User = {
  id: string;
};

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

export default function Demo1() {
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [userList, setUserList] = useState<User[]>([]);

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
        socketRef.current?.emit("new-ice-candidate", {
          to: userId,
          candidate: e.candidate,
        });
      };

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit("call-user", {
        to: userId,
        offer,
      });
    },
    [createPeerConnection]
  );

  useEffect(() => {
    const socket = (socketRef.current = io("http://localhost:8888"));

    const disposeFuncs: (() => void)[] = [];

    const onConnect = () => {
      console.log("====== connected");
    };
    socket.on("connect", onConnect);
    disposeFuncs.push(() => {
      socket.off("connect", onConnect);
    });

    const onDisconnect = () => {
      console.log("====== disconnected");
    };
    socket.on("disconnect", onDisconnect);
    disposeFuncs.push(() => {
      socket.off("disconnect", onDisconnect);
    });

    const onUserList = (data: { users: User[] }) => {
      setUserList(data.users);
    };
    socket.on("user-list", onUserList);
    disposeFuncs.push(() => {
      socket.off("user-list", onUserList);
    });

    const onAddUser = (data: { user: User }) => {
      const newUser = data.user;
      setUserList((pre) => {
        if (pre.find((user) => user.id === newUser.id)) {
          return pre;
        }
        return [...pre, newUser];
      });
    };
    socket.on("add-user", onAddUser);
    disposeFuncs.push(() => {
      socket.off("add-user", onAddUser);
    });

    const onRemoveUser = (data: { userId: string }) => {
      setUserList((pre) => pre.filter((user) => user.id !== data.userId));
    };
    socket.on("remove-user", onRemoveUser);
    disposeFuncs.push(() => {
      socket.off("remove-user", onRemoveUser);
    });

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
        socket.emit("new-ice-candidate", {
          to: data.from,
          candidate: e.candidate,
        });
      };

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit("answer-user", {
        to: data.from,
        answer,
      });
    };
    socket.on("new-call", onNewCall);
    disposeFuncs.push(() => {
      socket.off("new-call", onNewCall);
    });

    const onNewAnswer = async (data: NewAnswerData) => {
      await pcRef.current?.setRemoteDescription(data.answer);
    };
    socket.on("new-answer", onNewAnswer);
    disposeFuncs.push(() => {
      socket.off("new-answer", onNewAnswer);
    });

    const onNewIceCandidate = async (data: NewIceCandidateData) => {
      await pcRef.current?.addIceCandidate(data.candidate || undefined);
    };
    socket.on("new-ice-candidate", onNewIceCandidate);
    disposeFuncs.push(() => {
      socket.off("new-ice-candidate", onNewIceCandidate);
    });

    return () => {
      disposeFuncs.forEach((func) => {
        func();
      });
      socket.close();
    };
  }, [createPeerConnection]);

  return (
    <div>
      <Head>
        <title>Demo1</title>
      </Head>

      <main>
        <div className={styles["room"]}>
          <div className={styles["user-list"]}>
            {userList.map((user) => (
              <div
                className={styles["user-list-item"]}
                key={user.id}
                onClick={() => handleCallUser(user.id)}
              >
                {user.id}
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
