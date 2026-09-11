export type NodeStatus = 'up' | 'down' | 'partial' | 'unknown';

export interface NodeDetails {
  nodeId: string;
  oamIp: string;
  nodeType: string;
  hwType: string;
  swVersion: string;
  parentEmsName: string;
  parentEmsIp: string;
  longitude: string;
  latitude: string;
  lastHeartbeat: string;
  plmn: string;
}

export interface NeItem {
  id: string;           // e.g. I-AS-SRPO-ENB-A002
  label: string;        // display name
  status: NodeStatus;
  circle: string;
  details: NodeDetails;
}

export interface CircleGroup {
  name: string;
  totalCount: number;
  expanded: boolean;
  nes: NeItem[];
}

export type ParamType = 'number' | 'select';

export interface ParamDef {
  key: string;
  label: string;
  type: ParamType;
  options?: string[];
  default: string | number;
}

export interface CommandDef {
  id: string;
  label: string;
  category: 'Config' | 'Control';
  parameters: ParamDef[];
}

export type ExecResult = 'Completed' | 'Running' | 'Failed';

export interface ExecutionRow {
  id: string;
  neName: string;
  neId: string;
  commandName: string;
  requestTime: string;
  respondTime: string;
  result: ExecResult;
  rawResponse?: string;
}

export interface BatchItem {
  id: string;
  neLabel: string;
  commandName: string;
  paramsSummary: string;
}
