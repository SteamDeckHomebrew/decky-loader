import { Focusable } from "decky-frontend-lib";
import { VFC, useEffect, useState } from "react";
import { ScrollableWindowRelative } from "./ScrollableWindow";

interface LogFileProps {
  plugin: string;
  name: string;
  closeModal?: () => void;
}

const LogViewModal: VFC<LogFileProps> = ({ name, plugin, closeModal }) => {
  const [logText, setLogText] = useState("Loading text....");
  useEffect(() => {
    window.DeckyPluginLoader.callServerMethod("get_plugin_log_text", {
      plugin_name: plugin,
      log_name: name,
    }).then((text) => {
      setLogText(text.result || "Error loading text");
    });
  }, []);

  return (
    <Focusable
      style={{
        padding: "0 15px",
        display: "flex",
        position: "absolute",
        top: "var(--basicui-header-height)",
        bottom: "var(--gamepadui-current-footer-height)",
        left: 0,
        right: 0,
      }}
      onSecondaryActionDescription={"Upload Log"}
      onSecondaryButton={() => console.log("Uploading...")}
    >
      <ScrollableWindowRelative alwaysFocus={true} onCancel={closeModal}>
        <div style={{ whiteSpace: "pre-wrap", padding: "12px 0" }}>
          {logText}
        </div>
      </ScrollableWindowRelative>
    </Focusable>
  );
};

export default LogViewModal;
