// Point-and-name: live camera preview; "What is this?" grabs one frame, downsizes it, and asks the backend
// (Claude vision, constrained to the approved word list) what it is.
import { useEffect, useRef, useState } from "react";
import { identify, type Word } from "./api";

export function CameraNamer({ onFound, busy }: { onFound: (w: Word) => void; busy: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "looking" | "error">("starting");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) video.current.srcObject = s;
        setStatus("ready");
      })
      .catch((e) => {
        setStatus("error");
        setMsg(
          window.isSecureContext
            ? `Camera unavailable: ${e.message}`
            : "Camera needs https or localhost. Run `npm run dev:https` for phones.",
        );
      });
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  async function look() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    setStatus("looking");
    setMsg("");
    try {
      const r = await identify(c.toDataURL("image/jpeg", 0.8));
      if (r.word) onFound(r.word);
      else setMsg("Hmm, Bao isn't sure. Try holding one object up close, with a plain background.");
    } catch (e) {
      setMsg(`Couldn't check the photo: ${(e as Error).message}`);
    }
    setStatus("ready");
  }

  return (
    <section className="camera">
      <video ref={video} autoPlay playsInline muted />
      <button className="big" onClick={look} disabled={status !== "ready" || busy}>
        {status === "looking" ? "Looking…" : "📷 What is this?"}
      </button>
      {msg && <p className="muted">{msg}</p>}
      <p className="fineprint">
        Photos are sent once to identify the object and aren't saved. Bao only names things from the approved word list.
      </p>
    </section>
  );
}
