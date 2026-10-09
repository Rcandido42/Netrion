import React, { useState } from 'react';
import {
  Trash2,
  Sliders,
  Table,
  Route,
  Activity,
  Cable,
} from 'lucide-react';
import type { SerializedDevice, SerializedConnection } from '../../storage/ProjectSchema';
import './InspectorPanel.css';

export interface InspectorPanelProps {
  selectedDevice: SerializedDevice | null;
  selectedConnection: SerializedConnection | null;
  devices: SerializedDevice[];
  onUpdateDevice: (updated: SerializedDevice) => void;
  onDeleteDevice: (deviceId: string) => void;
  onUpdateConnection: (updated: SerializedConnection) => void;
  onDeleteConnection: (connectionId: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedDevice,
  selectedConnection,
  devices,
  onUpdateDevice,
  onDeleteDevice,
  onUpdateConnection,
  onDeleteConnection,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'arp' | 'routes' | 'mac'>('config');

  // Handle device property updates
  const handleDeviceNameChange = (name: string) => {
    if (!selectedDevice) return;
    onUpdateDevice({ ...selectedDevice, name });
  };

  const handleInterfaceUpdate = (
    ifaceId: string,
    field: 'ip' | 'netmask' | 'gateway' | 'mac' | 'status',
    value: string
  ) => {
    if (!selectedDevice) return;
    const updatedInterfaces = selectedDevice.interfaces.map((iface) => {
      if (iface.id !== ifaceId) return iface;
      return {
        ...iface,
        [field]: field === 'status' ? (value as 'up' | 'down') : (value.trim() || null),
      };
    });
    onUpdateDevice({ ...selectedDevice, interfaces: updatedInterfaces });
  };

  if (selectedConnection) {
    const srcDev = devices.find((d) => d.id === selectedConnection.sourceDeviceId);
    const tgtDev = devices.find((d) => d.id === selectedConnection.targetDeviceId);
    const srcIf = srcDev?.interfaces.find((i) => i.id === selectedConnection.sourceInterfaceId);
    const tgtIf = tgtDev?.interfaces.find((i) => i.id === selectedConnection.targetInterfaceId);

    return (
      <aside className="netrion-inspector">
        <div className="inspector-header">
          <div className="inspector-title">
            <Cable size={14} />
            <span>LINK PROPERTIES</span>
          </div>
          <button
            type="button"
            className="btn-danger-icon"
            onClick={() => onDeleteConnection(selectedConnection.id)}
            title="Delete Cable Connection (Del)"
          >
            <Trash2 size={13} />
          </button>
        </div>

        <div className="inspector-body">
          <div className="property-group">
            <label className="property-label">SOURCE ENDPOINT</label>
            <div className="endpoint-box mono-numbers">
              <strong>{srcDev?.name || 'Unknown'}</strong> : {srcIf?.name || 'port'}
            </div>
          </div>

          <div className="property-group">
            <label className="property-label">TARGET ENDPOINT</label>
            <div className="endpoint-box mono-numbers">
              <strong>{tgtDev?.name || 'Unknown'}</strong> : {tgtIf?.name || 'port'}
            </div>
          </div>

          <div className="property-group">
            <label className="property-label">LINK STATE</label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-btn ${selectedConnection.status === 'up' ? 'active-up' : ''}`}
                onClick={() => onUpdateConnection({ ...selectedConnection, status: 'up' })}
              >
                UP (Active)
              </button>
              <button
                type="button"
                className={`toggle-btn ${selectedConnection.status === 'down' ? 'active-down' : ''}`}
                onClick={() => onUpdateConnection({ ...selectedConnection, status: 'down' })}
              >
                DOWN (Cut)
              </button>
            </div>
          </div>

          <div className="property-group">
            <label className="property-label">LATENCY (MS)</label>
            <input
              type="number"
              className="inspector-input mono-numbers"
              value={selectedConnection.latencyMs}
              min={0}
              max={500}
              onChange={(e) =>
                onUpdateConnection({ ...selectedConnection, latencyMs: Number(e.target.value) || 0 })
              }
            />
          </div>
        </div>
      </aside>
    );
  }

  if (!selectedDevice) {
    return (
      <aside className="netrion-inspector empty">
        <div className="inspector-header">
          <div className="inspector-title">
            <Sliders size={14} />
            <span>TOPOLOGY INSPECTOR</span>
          </div>
        </div>
        <div className="inspector-empty-state">
          <span className="empty-text">Select a node or connection on the canvas to inspect and configure.</span>
          <div className="quick-help-list">
            <div className="help-item">
              <strong>Workstations (PC / Laptop / Server / Printer):</strong> Configure IP, netmask, default gateway, CMD and diagnostics.
            </div>
            <div className="help-item">
              <strong>Switches & APs (L2 / L3 / AP):</strong> Manage CAM MAC learning tables and high-density ports.
            </div>
            <div className="help-item">
              <strong>Routing & Security (Router / Firewall / Cloud):</strong> Forward inter-subnet traffic and gateway routing.
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const hasArpTable = selectedDevice.type !== 'switch' && selectedDevice.type !== 'access-point';
  const hasRouteTable =
    selectedDevice.type === 'router' ||
    selectedDevice.type === 'switch-l3' ||
    selectedDevice.type === 'firewall' ||
    selectedDevice.type === 'cloud' ||
    selectedDevice.type === 'pc' ||
    selectedDevice.type === 'laptop' ||
    selectedDevice.type === 'server';
  const hasMacTable =
    selectedDevice.type === 'switch' ||
    selectedDevice.type === 'switch-l3' ||
    selectedDevice.type === 'access-point';

  return (
    <aside className="netrion-inspector">
      {/* Device Header */}
      <div className="inspector-header">
        <div className="inspector-title">
          <Sliders size={14} />
          <span>{selectedDevice.type.toUpperCase()} PROPERTIES</span>
        </div>
        <button
          type="button"
          className="btn-danger-icon"
          onClick={() => onDeleteDevice(selectedDevice.id)}
          title="Delete Device (Del)"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="inspector-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Sliders size={12} />
          Config
        </button>

        {hasArpTable && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'arp' ? 'active' : ''}`}
            onClick={() => setActiveTab('arp')}
          >
            <Table size={12} />
            ARP
          </button>
        )}

        {hasRouteTable && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => setActiveTab('routes')}
          >
            <Route size={12} />
            Routes
          </button>
        )}

        {hasMacTable && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'mac' ? 'active' : ''}`}
            onClick={() => setActiveTab('mac')}
          >
            <Activity size={12} />
            CAM Table
          </button>
        )}
      </div>

      <div className="inspector-body">
        {activeTab === 'config' && (
          <>
            <div className="property-group">
              <label className="property-label">DEVICE HOSTNAME</label>
              <input
                type="text"
                className="inspector-input mono-numbers"
                value={selectedDevice.name}
                onChange={(e) => handleDeviceNameChange(e.target.value)}
              />
            </div>

            <div className="property-section-title">NETWORK INTERFACES</div>

            {selectedDevice.interfaces.map((iface) => (
              <div key={iface.id} className="interface-card">
                <div className="interface-header">
                  <span className="interface-name mono-numbers">{iface.name}</span>
                  <span className={`status-tag ${iface.status}`}>
                    {iface.status.toUpperCase()}
                  </span>
                </div>

                <div className="property-group">
                  <label className="property-label">MAC ADDRESS</label>
                  <input
                    type="text"
                    className="inspector-input mono-numbers"
                    value={iface.mac}
                    onChange={(e) => handleInterfaceUpdate(iface.id, 'mac', e.target.value)}
                  />
                </div>

                {selectedDevice.type !== 'switch' && (
                  <>
                    <div className="property-group">
                      <label className="property-label">IP ADDRESS</label>
                      <input
                        type="text"
                        placeholder="e.g. 192.168.1.10"
                        className="inspector-input mono-numbers"
                        value={iface.ip || ''}
                        onChange={(e) => handleInterfaceUpdate(iface.id, 'ip', e.target.value)}
                      />
                    </div>

                    <div className="property-group">
                      <label className="property-label">SUBNET MASK</label>
                      <input
                        type="text"
                        placeholder="255.255.255.0"
                        className="inspector-input mono-numbers"
                        value={iface.netmask || ''}
                        onChange={(e) => handleInterfaceUpdate(iface.id, 'netmask', e.target.value)}
                      />
                    </div>

                    <div className="property-group">
                      <label className="property-label">DEFAULT GATEWAY</label>
                      <input
                        type="text"
                        placeholder="e.g. 192.168.1.1"
                        className="inspector-input mono-numbers"
                        value={iface.gateway || ''}
                        onChange={(e) => handleInterfaceUpdate(iface.id, 'gateway', e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </>
        )}

        {activeTab === 'arp' && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>MAC Address</th>
                </tr>
              </thead>
              <tbody>
                {selectedDevice.arpTable && selectedDevice.arpTable.length > 0 ? (
                  selectedDevice.arpTable.map((entry, idx) => (
                    <tr key={idx}>
                      <td className="mono-numbers">{entry.ip}</td>
                      <td className="mono-numbers">{entry.mac}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="table-empty">
                      ARP Cache is empty. Send a ping to discover neighbors.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'routes' && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Netmask</th>
                  <th>Next Hop</th>
                </tr>
              </thead>
              <tbody>
                {selectedDevice.routingTable && selectedDevice.routingTable.length > 0 ? (
                  selectedDevice.routingTable.map((r, idx) => (
                    <tr key={idx}>
                      <td className="mono-numbers">{r.destination}</td>
                      <td className="mono-numbers">{r.netmask}</td>
                      <td className="mono-numbers">{r.nextHop || 'Direct'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="table-empty">
                      No static routes. Local interfaces routes applied.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'mac' && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>MAC Address</th>
                  <th>Port</th>
                </tr>
              </thead>
              <tbody>
                {selectedDevice.macTable && selectedDevice.macTable.length > 0 ? (
                  selectedDevice.macTable.map((entry, idx) => (
                    <tr key={idx}>
                      <td className="mono-numbers">{entry.mac}</td>
                      <td className="mono-numbers">{entry.portId}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="table-empty">
                      CAM Table empty. Switch learns MACs dynamically as frames pass.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </aside>
  );
};
