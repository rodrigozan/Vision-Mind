import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05070a",
          borderRadius: 64,
        }}
      >
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #38e1ff, #05070a 70%)",
            boxShadow: "0 0 90px 20px rgba(56,225,255,0.45)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
