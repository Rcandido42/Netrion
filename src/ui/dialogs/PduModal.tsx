import React, { useState } from 'react';
import { X, Layers, FileText } from 'lucide-react';
import type { SimulationEvent } from '../../core/engine/NetworkSimulationEngine';
import './PduModal.css';

export interface PduModalProps {
  event: SimulationEvent | null;
  onClose: () => void;
}

export const PduModal: React.FC<PduModalProps> = ({ event, onClose }) => {
  const [activeTab, setActiveTab] = useState<'osi' | 'inbound'>('osi');

  if (!event) return null;

  const isArp = event.type.includes('ARP');
  const isIcmp = event.type.includes('ICMP');

  return (
    <div className="netrion-dialog-overlay" onClick={onClose}>
      <div className="netrion-pdu-window" onClick={(e) => e.stopPropagation()}>
        <div className="pdu-window-titlebar">
          <div className="pdu-title-left">
            <span className="pdu-badge">PDU INFORMATION</span>
            <span className="pdu-device-name">AT DEVICE: {event.deviceId}</span>
          </div>
          <button type="button" className="dialog-close-btn" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="pdu-window-nav">
          <button
            type="button"
            className={`pdu-nav-btn ${activeTab === 'osi' ? 'active' : ''}`}
            onClick={() => setActiveTab('osi')}
          >
            <Layers size={13} />
            <span>OSI Model</span>
          </button>
          <button
            type="button"
            className={`pdu-nav-btn ${activeTab === 'inbound' ? 'active' : ''}`}
            onClick={() => setActiveTab('inbound')}
          >
            <FileText size={13} />
            <span>Inbound PDU Details</span>
          </button>
        </div>

        <div className="pdu-window-body">
          {activeTab === 'osi' && (
            <div className="osi-view-container">
              <div className="osi-layers-stack">
                <div className={`osi-layer-row ${isIcmp ? 'active' : ''}`}>
                  <span className="layer-num">Layer 7</span>
                  <span className="layer-desc">Application</span>
                </div>
                <div className={`osi-layer-row ${isIcmp ? 'active' : ''}`}>
                  <span className="layer-num">Layer 4</span>
                  <span className="layer-desc">Transport (ICMP / Port)</span>
                </div>
                <div className={`osi-layer-row ${isArp || isIcmp ? 'active' : ''}`}>
                  <span className="layer-num">Layer 3</span>
                  <span className="layer-desc">Network (IPv4 / ARP Addressing)</span>
                </div>
                <div className="osi-layer-row active">
                  <span className="layer-num">Layer 2</span>
                  <span className="layer-desc">Data Link (Ethernet II Framing)</span>
                </div>
                <div className="osi-layer-row active">
                  <span className="layer-num">Layer 1</span>
                  <span className="layer-desc">Physical (Port / Cable Link)</span>
                </div>
              </div>

              <div className="osi-narrative-box">
                <div className="narrative-title">AT THIS DEVICE (PACKET TRACER ANALYSIS):</div>
                <ul className="narrative-list mono-numbers">
                  <li>1. The physical port receives the frame bitstream and verifies electrical link integrity.</li>
                  {isArp ? (
                    <>
                      <li>2. The frame format is Ethernet II with EtherType 0x0806 (ARP).</li>
                      <li>3. The device inspects the ARP operation ({event.type}).</li>
                      <li>4. The device updates its local ARP Cache with the sender IP and MAC mapping.</li>
                    </>
                  ) : (
                    <>
                      <li>2. The frame destination MAC matches the interface physical MAC address or broadcast.</li>
                      <li>3. The Ethernet frame encapsulates an IPv4 packet (Protocol: ICMP).</li>
                      <li>4. Destination IP lookup: Processed locally or forwarded via routing table.</li>
                      <li>5. The ICMP Echo process calculates round-trip time and verifies payload integrity.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'inbound' && (
            <div className="pdu-raw-details-view mono-numbers">
              <div className="pdu-header-block">
                <div className="pdu-block-title">ETHERNET II FRAME HEADER</div>
                <div className="pdu-field-line">PREAMBLE: 10101010...</div>
                <div className="pdu-field-line">DESTINATION MAC: {event.details?.dstMac || 'FF:FF:FF:FF:FF:FF'}</div>
                <div className="pdu-field-line">SOURCE MAC: {event.details?.srcMac || '00:60:2F:AA:BB:CC'}</div>
                <div className="pdu-field-line">TYPE: {isArp ? '0x0806 (ARP)' : '0x0800 (IPv4)'}</div>
              </div>

              <div className="pdu-header-block" style={{ marginTop: '12px' }}>
                <div className="pdu-block-title">PAYLOAD DETAILS</div>
                <div className="pdu-field-line">EVENT: {event.type}</div>
                <div className="pdu-field-line">DEVICE: {event.deviceId}</div>
                <div className="pdu-field-line">INFO: {event.description}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
