import React from 'react';
import type { EthernetFrame } from '../../core/protocols/Ethernet';
import type { ARPPacket } from '../../core/protocols/ARP';
import type { IPv4Packet } from '../../core/protocols/IPv4';
import './PacketInspectorPanel.css';

export interface PacketInspectorPanelProps {
  lastFrame: EthernetFrame | null;
}

export const PacketInspectorPanel: React.FC<PacketInspectorPanelProps> = ({ lastFrame }) => {
  if (!lastFrame) {
    return (
      <div className="netrion-packet-inspector empty">
        <div className="inspector-placeholder-msg">
          No packet selected. Initiate a ping or simulate traffic to inspect frame headers in real time.
        </div>
      </div>
    );
  }

  const isArp = lastFrame.etherType === 'ARP';
  const isIpv4 = lastFrame.etherType === 'IPv4';
  const arpPayload = isArp ? (lastFrame.payload as ARPPacket) : null;
  const ipPayload = isIpv4 ? (lastFrame.payload as IPv4Packet) : null;

  return (
    <div className="netrion-packet-inspector">
      <div className="packet-layers-container">
        {/* Layer 2: Ethernet II */}
        <div className="layer-block l2">
          <div className="layer-header">
            <span className="layer-name">ETHERNET II (DATA LINK LAYER)</span>
            <span className="layer-meta mono-numbers">
              {lastFrame.etherType === 'ARP' ? '0x0806 (ARP)' : '0x0800 (IPv4)'}
            </span>
          </div>
          <div className="layer-fields mono-numbers">
            <div className="field-row">
              <span className="field-key">Destination MAC:</span>
              <span className="field-val">{lastFrame.dstMac}</span>
            </div>
            <div className="field-row">
              <span className="field-key">Source MAC:</span>
              <span className="field-val">{lastFrame.srcMac}</span>
            </div>
          </div>
        </div>

        {/* Layer 3: ARP or IPv4 */}
        {isArp && arpPayload && (
          <div className="layer-block l3-arp">
            <div className="layer-header">
              <span className="layer-name">ADDRESS RESOLUTION PROTOCOL (ARP)</span>
              <span className="layer-meta mono-numbers">{arpPayload.operation}</span>
            </div>
            <div className="layer-fields mono-numbers">
              <div className="field-row">
                <span className="field-key">Operation:</span>
                <span className="field-val">{arpPayload.operation}</span>
              </div>
              <div className="field-row">
                <span className="field-key">Sender IP / MAC:</span>
                <span className="field-val">
                  {arpPayload.senderIp} ({arpPayload.senderMac})
                </span>
              </div>
              <div className="field-row">
                <span className="field-key">Target IP / MAC:</span>
                <span className="field-val">
                  {arpPayload.targetIp} ({arpPayload.targetMac})
                </span>
              </div>
            </div>
          </div>
        )}

        {isIpv4 && ipPayload && (
          <div className="layer-block l3-ip">
            <div className="layer-header">
              <span className="layer-name">INTERNET PROTOCOL VERSION 4 (IPv4)</span>
              <span className="layer-meta mono-numbers">TTL: {ipPayload.ttl}</span>
            </div>
            <div className="layer-fields mono-numbers">
              <div className="field-row">
                <span className="field-key">Source IP:</span>
                <span className="field-val">{ipPayload.srcIp}</span>
              </div>
              <div className="field-row">
                <span className="field-key">Destination IP:</span>
                <span className="field-val">{ipPayload.dstIp}</span>
              </div>
              <div className="field-row">
                <span className="field-key">Protocol:</span>
                <span className="field-val">{ipPayload.protocol} (1)</span>
              </div>
            </div>
          </div>
        )}

        {/* Layer 4: ICMP (if IPv4) */}
        {isIpv4 && ipPayload && ipPayload.payload && (
          <div className="layer-block l4">
            <div className="layer-header">
              <span className="layer-name">INTERNET CONTROL MESSAGE PROTOCOL (ICMP)</span>
              <span className="layer-meta mono-numbers">{ipPayload.payload.type}</span>
            </div>
            <div className="layer-fields mono-numbers">
              <div className="field-row">
                <span className="field-key">Type:</span>
                <span className="field-val">{ipPayload.payload.type}</span>
              </div>
              <div className="field-row">
                <span className="field-key">Sequence Number:</span>
                <span className="field-val">{ipPayload.payload.sequenceNumber}</span>
              </div>
              <div className="field-row">
                <span className="field-key">Payload:</span>
                <span className="field-val">{ipPayload.payload.payload || '32 bytes'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
