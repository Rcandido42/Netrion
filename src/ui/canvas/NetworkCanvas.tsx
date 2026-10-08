import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { SerializedDevice, SerializedConnection } from '../../storage/ProjectSchema';
import type { InFlightFrame } from '../../core/engine/NetworkSimulationEngine';
import type { EthernetFrame } from '../../core/protocols/Ethernet';
import { NetworkNode } from './NetworkNode';
import './NetworkCanvas.css';

export interface NetworkCanvasProps {
  devices: SerializedDevice[];
  connections: SerializedConnection[];
  inFlightFrames: InFlightFrame[];
  selectedDeviceId: string | null;
  selectedConnectionId: string | null;
  pduSourceDeviceId?: string | null;
  activeTool: 'select' | 'cable' | 'add-pdu' | 'add-pc' | 'add-switch' | 'add-router' | 'add-server';
  zoom: number;
  connectingSource: { deviceId: string; interfaceId: string } | null;
  onSelectDevice: (deviceId: string | null) => void;
  onOpenDeviceModal: (deviceId: string) => void;
  onSelectConnection: (connectionId: string | null) => void;
  onSelectFrame?: (frame: EthernetFrame) => void;
  onMoveDevice: (deviceId: string, x: number, y: number) => void;
  onAddDevice: (type: 'pc' | 'switch' | 'router' | 'server', x: number, y: number) => void;
  onPortClick: (deviceId: string, interfaceId: string) => void;
  onZoomChange?: (newZoom: number) => void;
}

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  devices,
  connections,
  inFlightFrames,
  selectedDeviceId,
  selectedConnectionId,
  pduSourceDeviceId,
  activeTool,
  zoom,
  connectingSource,
  onSelectDevice,
  onOpenDeviceModal,
  onSelectConnection,
  onSelectFrame,
  onMoveDevice,
  onAddDevice,
  onPortClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging device state
  const draggingDeviceRef = useRef<{
    deviceId: string;
    startX: number;
    startY: number;
    initialDevX: number;
    initialDevY: number;
  } | null>(null);

  // Convert mouse screen coordinates to canvas space
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top - pan.y) / zoom;
      return { x: Math.round(x), y: Math.round(y) };
    },
    [pan, zoom]
  );

  // Handle canvas background mouse down (Pan or Add Device)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle click or space key: pan canvas
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button === 0) {
      if (activeTool.startsWith('add-')) {
        const type = activeTool.replace('add-', '') as 'pc' | 'switch' | 'router' | 'server';
        const coords = screenToCanvas(e.clientX, e.clientY);
        onAddDevice(type, coords.x - 74, coords.y - 35); // Center device on click
        return;
      }

      // If clicked empty canvas, clear selections
      onSelectDevice(null);
      onSelectConnection(null);
    }
  };

  // Node mouse down: start dragging
  const handleNodeMouseDown = (e: React.MouseEvent, deviceId: string) => {
    if (e.button !== 0) return; // Only left click drags
    e.stopPropagation();

    const dev = devices.find((d) => d.id === deviceId);
    if (!dev) return;

    onSelectDevice(deviceId);

    draggingDeviceRef.current = {
      deviceId,
      startX: e.clientX,
      startY: e.clientY,
      initialDevX: dev.x,
      initialDevY: dev.y,
    };
  };

  // Global mouse move & up listeners for drag & pan
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
        return;
      }

      if (draggingDeviceRef.current) {
        const deltaX = (e.clientX - draggingDeviceRef.current.startX) / zoom;
        const deltaY = (e.clientY - draggingDeviceRef.current.startY) / zoom;
        const newX = Math.round(draggingDeviceRef.current.initialDevX + deltaX);
        const newY = Math.round(draggingDeviceRef.current.initialDevY + deltaY);

        onMoveDevice(draggingDeviceRef.current.deviceId, newX, newY);
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      draggingDeviceRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, onMoveDevice, zoom]);

  // Compute cable line coordinates for each connection
  const getConnectionCoordinates = (conn: SerializedConnection) => {
    const sourceDev = devices.find((d) => d.id === conn.sourceDeviceId);
    const targetDev = devices.find((d) => d.id === conn.targetDeviceId);
    if (!sourceDev || !targetDev) return null;

    // Node center coordinates
    const sx = sourceDev.x + 74;
    const sy = sourceDev.y + 40;
    const tx = targetDev.x + 74;
    const ty = targetDev.y + 40;

    return { sx, sy, tx, ty };
  };

  return (
    <div
      className={`netrion-canvas-viewport ${isPanning ? 'panning' : ''} ${activeTool.startsWith('add-') ? 'crosshair' : ''}`}
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
    >
      <div
        className="canvas-transform-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* SVG Cable Connections Layer */}
        <svg className="connections-svg-layer" width="10000" height="10000">
          {connections.map((conn) => {
            const coords = getConnectionCoordinates(conn);
            if (!coords) return null;
            const isSelected = selectedConnectionId === conn.id;

            return (
              <g
                key={conn.id}
                className={`cable-group ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectConnection(conn.id);
                }}
              >
                {/* Glow/Hover Hitbox Area */}
                <line
                  x1={coords.sx}
                  y1={coords.sy}
                  x2={coords.tx}
                  y2={coords.ty}
                  className="cable-hitbox"
                />
                {/* Visual Physical Cable */}
                <line
                  x1={coords.sx}
                  y1={coords.sy}
                  x2={coords.tx}
                  y2={coords.ty}
                  className={`cable-line ${conn.status === 'up' ? 'status-up' : 'status-down'}`}
                />

                {/* Packet Tracer Style Link Lights (Triangles/Circles) */}
                <circle
                  cx={coords.sx + (coords.tx - coords.sx) * 0.14}
                  cy={coords.sy + (coords.ty - coords.sy) * 0.14}
                  r="4"
                  fill={conn.status === 'up' ? 'var(--color-link-up)' : 'var(--color-link-down)'}
                  stroke="#090d12"
                  strokeWidth="1.5"
                />
                <circle
                  cx={coords.sx + (coords.tx - coords.sx) * 0.86}
                  cy={coords.sy + (coords.ty - coords.sy) * 0.86}
                  r="4"
                  fill={conn.status === 'up' ? 'var(--color-link-up)' : 'var(--color-link-down)'}
                  stroke="#090d12"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
          {/* In-Flight Packet Particles Layer */}
          {inFlightFrames.map((flight) => {
            const srcDev = devices.find((d) => d.id === flight.fromDeviceId);
            const tgtDev = devices.find((d) => d.id === flight.toDeviceId);
            if (!srcDev || !tgtDev) return null;

            const sx = srcDev.x + 74;
            const sy = srcDev.y + 40;
            const tx = tgtDev.x + 74;
            const ty = tgtDev.y + 40;

            const px = sx + (tx - sx) * flight.progress;
            const py = sy + (ty - sy) * flight.progress;

            const isArp = flight.frame.etherType === 'ARP';
            const color = isArp ? '#bc8cff' : '#58a6ff';

            return (
              <g
                key={flight.id}
                className="packet-particle-group"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFrame?.(flight.frame);
                }}
              >
                <circle
                  cx={px}
                  cy={py}
                  r="9"
                  fill={color}
                  stroke="#090d12"
                  strokeWidth="2"
                  filter="drop-shadow(0 0 4px rgba(0,0,0,0.8))"
                />
                <text
                  x={px}
                  y={py + 3}
                  fill="#090d12"
                  fontSize="7"
                  fontFamily="var(--font-mono)"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {isArp ? 'ARP' : 'IP'}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Nodes Layer */}
        {devices.map((device) => (
          <NetworkNode
            key={device.id}
            device={device}
            isSelected={selectedDeviceId === device.id || pduSourceDeviceId === device.id}
            isConnectingSource={connectingSource?.deviceId === device.id || pduSourceDeviceId === device.id}
            onSelect={(_e, id) => onSelectDevice(id)}
            onDoubleClick={(_e, id) => onOpenDeviceModal(id)}
            onMouseDown={handleNodeMouseDown}
            onPortClick={(_e, devId, ifId) => onPortClick(devId, ifId)}
          />
        ))}
      </div>

      {/* Floating Canvas Quick Info */}
      <div className="canvas-overlay-hints">
        {connectingSource ? (
          <span className="hint-pill warning">
            CABLE TOOL ACTIVE: Click destination device port to link
          </span>
        ) : activeTool.startsWith('add-') ? (
          <span className="hint-pill">
            Click on canvas to place {activeTool.replace('add-', '').toUpperCase()}
          </span>
        ) : (
          <span className="hint-subtle mono-numbers">
            {devices.length} Nodes • Alt+Drag to Pan
          </span>
        )}
      </div>
    </div>
  );
};
