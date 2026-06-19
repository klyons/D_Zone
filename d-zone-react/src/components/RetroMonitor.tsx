import React from 'react';
import './RetroMonitor.css';

interface RetroMonitorProps {
  children: React.ReactNode;
}

export const RetroMonitor: React.FC<RetroMonitorProps> = ({ children }) => {
  return (
    <div className="crt-container">
      <div className="crt-bezel">
        <div className="crt-screen-wrapper">
          <div className="crt-screen">
            {children}
            <div className="crt-scanlines"></div>
            <div className="crt-flicker"></div>
            <div className="crt-vignette"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
