import { Focusable } from "decky-frontend-lib";
import { VFC, useState } from "react";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";
import LogList from "./LogList";

interface LoggedPluginProps {
  plugin: string;
}

const focusableStyle = {
  background: "rgba(255,255,255,.15)",
  borderRadius: "var(--round-radius-size)",
  padding: "10px 24px",
  marginBottom: "0.5rem",
};

const LoggedPlugin: VFC<LoggedPluginProps> = ({ plugin }) => {
  const [isOpen, setOpen] = useState<boolean>(false);

  return (
    <div style={focusableStyle}>
      <Focusable onOKButton={() => setOpen(!isOpen)}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ flexGrow: 1, textAlign: "left" }}>{plugin}</div>
          <div style={{ textAlign: "right" }}>
            {isOpen ? <FaArrowUp /> : <FaArrowDown />}
          </div>
        </div>
      </Focusable>
      {isOpen && <LogList plugin={plugin} />}
    </div>
  );
};

export default LoggedPlugin;