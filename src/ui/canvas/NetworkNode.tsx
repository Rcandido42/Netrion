import React from 'react';
import { Monitor, Network, Share2, Server } from 'lucide-react';
import type { SerializedDevice } from '../../storage/ProjectSchema';
import './NetworkNode.css';

export interface NetworkNodeProps {
  device: SerializedDevice;
  isSelected: boolean;
  isConnectingSource: boolean;
  onSelect: (e: React.MouseEvent, deviceId: string) => void;
  onDoubleClick?: (e: React.MouseEvent, deviceId: string) => void;
  onMouseDown: (e: React.MouseEvent, deviceId: string) => void;
  onPortClick?: (e: React.MouseEvent, deviceId: string, interfaceId: string) => void;
}

export const NetworkNode: React.FC<NetworkNodeProps> = ({
  device,
  isSelected,
  isConnectingSource,
  onSelect,
  onDoubleClick,
  onMouseDown,
  onPortClick,
}) => {
  const getIcon = () => {
    switch (device.type) {
      case 'pc':
        return <Monitor size={15} />;
      case 'switch':
        return <Network size={15} />;
      case 'router':
        return <Share2 size={15} />;
      case 'server':
        return <Server size={15} />;
    }
  };

  const getSubtext = () => {
    if (device.type === 'switch') {
      const activeCount = device.interfaces.filter((i) => i.connectedToConnectionId).length;
      return `${activeCount}/${device.interfaces.length} Ports Connected`;
    }
    const primaryIp = device.interfaces[0]?.ip;
    return primaryIp ? primaryIp : 'IP Unassigned';
  };

  return (
    <div
      className={`netrion-node ${isSelected ? 'selected' : ''} ${isConnectingSource ? 'connecting-source' : ''}`}
      style={{
        transform: `translate(${device.x}px, ${device.y}px)`,
      }}
      onClick={(e) => onSelect(e, device.id)}
      onDoubleClick={(e) => onDoubleClick?.(e, device.id)}
      onMouseDown={(e) => onMouseDown(e, device.id)}
    >
      <div className="node-header">
        <div className="node-icon-wrapper" data-type={device.type}>
          {getIcon()}
        </div>
        <span className="node-title">{device.name}</span>
        <span className="node-status-dot" title="Device Active" />
      </div>

      <div className="node-body">
        <span className="node-subtext mono-numbers">{getSubtext()}</span>
      </div>

      {/* Interface Ports for cable connections */}
      <div className="node-ports-bar">
        {device.interfaces.map((iface) => {
          const isConnected = Boolean(iface.connectedToConnectionId);
          return (
            <button
              key={iface.id}
              type="button"
              className={`node-port-pill ${isConnected ? 'connected' : 'disconnected'}`}
              title={`${iface.name} - ${iface.mac} (${isConnected ? 'Connected' : 'Free'})`}
              onClick={(e) => {
                e.stopPropagation();
                onPortClick?.(e, device.id, iface.id);
              }}
            >
              <span className="port-dot" />
              <span className="port-name">{iface.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
