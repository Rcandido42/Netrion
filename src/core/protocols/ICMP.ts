/**
 * Internet Control Message Protocol (ICMP) - RFC 792.
 * Used for Ping (Echo Request / Echo Reply) and Network Error Reporting.
 */

export type ICMPType = 'ECHO_REQUEST' | 'ECHO_REPLY' | 'DESTINATION_UNREACHABLE' | 'TIME_EXCEEDED';

export interface ICMPPacket {
  type: ICMPType;
  code: number;
  sequenceNumber: number;
  id: number;
  payload?: string;
}

export function createEchoRequest(seq = 1, id = 1): ICMPPacket {
  return {
    type: 'ECHO_REQUEST',
    code: 0,
    sequenceNumber: seq,
    id,
    payload: 'Netrion Echo Data',
  };
}

export function createEchoReply(req: ICMPPacket): ICMPPacket {
  return {
    type: 'ECHO_REPLY',
    code: 0,
    sequenceNumber: req.sequenceNumber,
    id: req.id,
    payload: req.payload,
  };
}
