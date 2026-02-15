import "./fire.css";

export const FireEffect = ({ side }: { side: "left" | "right" }) => (
  <div className={`absolute bottom-0 ${side === "left" ? "left-0" : "right-0"} pointer-events-none z-[5]`}>
    <div className="fire-container">
      <div className="flame flame-1" />
      <div className="flame flame-2" />
      <div className="flame flame-3" />
      <div className="flame flame-4" />
      <div className="flame-glow" />
    </div>
  </div>
);
