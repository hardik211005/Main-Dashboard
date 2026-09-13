import { Injectable, computed, signal } from '@angular/core';
import {
  BatchItem,
  CircleGroup,
  CommandDef,
  ExecutionRow,
  NeItem,
  NodeStatus
} from './ucem.models';

function ne(id: string, circle: string, status: NodeStatus, overrides: Partial<NeItem['details']> = {}): NeItem {
  return {
    id,
    label: id,
    status,
    circle,
    details: {
      nodeId: overrides.nodeId ?? String(1100000 + Math.floor(Math.random() * 9000)),
      oamIp: overrides.oamIp ?? '2405:200:5107:0643::1504',
      nodeType: overrides.nodeType ?? 'ODSC',
      hwType: overrides.hwType ?? 'SKU-1',
      swVersion: overrides.swVersion ?? 'v4.2.1',
      parentEmsName: overrides.parentEmsName ?? 'Vikas Puri',
      parentEmsIp: overrides.parentEmsIp ?? '2405:200:5107:0643::1509',
      longitude: overrides.longitude ?? '21.202466',
      latitude: overrides.latitude ?? '81.824043',
      lastHeartbeat: overrides.lastHeartbeat ?? '12:39:00 AM',
      plmn: overrides.plmn ?? '405-857'
    }
  };
}

const MOCK_CIRCLES: CircleGroup[] = [
  {
    name: 'Maharashtra',
    totalCount: 673,
    expanded: true,
    nes: [
      ne('I-AS-SRPO-ENB-A001', 'Maharashtra', 'up'),
      ne('I-AS-SRPO-ENB-A002', 'Maharashtra', 'down'),
      ne('I-AS-SRPO-ENB-A003', 'Maharashtra', 'up'),
      ne('I-AS-SRPO-ENB-A004', 'Maharashtra', 'partial', { nodeId: '1114140', parentEmsName: 'Vikas Puri' }),
      ne('I-AS-SRPO-ENB-A005', 'Maharashtra', 'unknown'),
      ne('I-AS-SRPO-ENB-A006', 'Maharashtra', 'up'),
      ne('I-AS-SRPO-ENB-A007', 'Maharashtra', 'up'),
      ne('I-AS-SRPO-ENB-A008', 'Maharashtra', 'up'),
      ne('I-AS-SRPO-ENB-A009', 'Maharashtra', 'up'),
      ne('I-AS-SRPO-ENB-A010', 'Maharashtra', 'up'),
      ne('I-AS-SRPO-ENB-A011', 'Maharashtra', 'up'),
      ne('I-AS-SRPO-ENB-A012', 'Maharashtra', 'up')
    ]
  },
  {
    name: 'Mumbai',
    totalCount: 673,
    expanded: false,
    nes: [
      ne('I-MU-MUMB-ENB-A012', 'Mumbai', 'up')
    ]
  },
  {
    name: 'Delhi NCR',
    totalCount: 512,
    expanded: false,
    nes: [
      ne('I-DL-VKSP-ENB-A001', 'Delhi NCR', 'up'),
      ne('I-DL-VKSP-ENB-A002', 'Delhi NCR', 'up')
    ]
  }
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i));
const DAYS = ['Everyday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const COMMANDS: CommandDef[] = [
  {
    id: 'CHG-ANR-SCHED',
    label: 'CHG-ANR-SCHED',
    category: 'Config',
    parameters: [
      { key: 'Cell_Num', label: 'Cell_Num', type: 'number', default: 0 },
      { key: 'ANR_State', label: 'ANR_State', type: 'select', options: ['Active', 'Inactive'], default: 'Active' },
      { key: 'Day', label: 'Day', type: 'select', options: DAYS, default: 'Everyday' },
      { key: 'Hour', label: 'Hour', type: 'select', options: HOURS, default: '12' }
    ]
  },
  {
    id: 'ADD-CELL',
    label: 'ADD-CELL',
    category: 'Config',
    parameters: [
      { key: 'Cell_Num', label: 'Cell_Num', type: 'number', default: 0 },
      { key: 'PCI', label: 'PCI', type: 'number', default: 1 }
    ]
  },
  {
    id: 'MOD-PARAM',
    label: 'MOD-PARAM',
    category: 'Config',
    parameters: [
      { key: 'Param_Name', label: 'Param_Name', type: 'select', options: ['TxPower', 'Bandwidth', 'Frequency'], default: 'TxPower' },
      { key: 'Value', label: 'Value', type: 'number', default: 0 }
    ]
  },
  {
    id: 'RESET-NODE',
    label: 'RESET-NODE',
    category: 'Control',
    parameters: [
      { key: 'Reset_Type', label: 'Reset_Type', type: 'select', options: ['Soft', 'Hard'], default: 'Soft' }
    ]
  },
  {
    id: 'LOCK-CELL',
    label: 'LOCK-CELL',
    category: 'Control',
    parameters: [
      { key: 'Cell_Num', label: 'Cell_Num', type: 'number', default: 0 }
    ]
  }
];

const MOCK_ROWS: ExecutionRow[] = [
  {
    id: 'r1', neName: 'eNB_1278_eFemto', neId: 'eNB_1278', commandName: 'CHG-ANR-SCHED',
    requestTime: '09/02/2026 ; 12:32', respondTime: '09/02/2026 ; 12:32', result: 'Completed',
    rawResponse:
      '[ eNB_1278_eFemto ] CHG-ANR-SCHED_STATE-"Inactive",Day="Sunday", Hour="0", Minute="0", Duration="24";\n' +
      'eNB_1562_eFemto   wed 09/02/2026 ; 12:32\n' +
      'M2878 CHANGE SON ANR FUNCTION SCHEDULES : COMPLD\n' +
      '-----------------------------------------------------------\n' +
      'ANR_STATE            DAY               Hour   Minute  Duration\n' +
      '-----------------------------------------------------------\n' +
      'Inactive => Inactive  Sunday => Sunday   0 => 0   1 => 0   24 => 24\n' +
      '-----------------------------------------------------------\n' +
      'Count = 1\n;'
  },
  { id: 'r2', neName: 'eNB_1278_eFemto', neId: 'eNB_1278', commandName: 'CHG-ANR-SCHED', requestTime: '09/02/2026 ; 12:32', respondTime: '09/02/2026 ; 12:32', result: 'Running',
    rawResponse:
      '[ eNB_1278_eFemto ] CHG-ANR-SCHED_STATE-"Active",Day="Everyday", Hour="12", Minute="0", Duration="24";\n' +
      'eNB_1278_eFemto   wed 09/02/2026 ; 12:32\n' +
      'M2878 CHANGE SON ANR FUNCTION SCHEDULES : EXECUTING\n' +
      '-----------------------------------------------------------\n' +
      'ANR_STATE            DAY               Hour   Minute  Duration\n' +
      '-----------------------------------------------------------\n' +
      'Active => Active      Everyday          12 => 12  0 => 0   24 => 24\n' +
      '-----------------------------------------------------------\n' +
      'Status: command in progress, awaiting NE acknowledgement...\n;'
  },
  { id: 'r3', neName: 'eNB_1278_eFemto', neId: 'eNB_1278', commandName: 'CHG-ANR-SCHED', requestTime: '09/02/2026 ; 12:32', respondTime: '09/02/2026 ; 12:32', result: 'Failed',
    rawResponse:
      '[ eNB_1278_eFemto ] CHG-ANR-SCHED_STATE-"Active",Day="Monday", Hour="9", Minute="0", Duration="12";\n' +
      'eNB_1278_eFemto   wed 09/02/2026 ; 12:32\n' +
      'M2878 CHANGE SON ANR FUNCTION SCHEDULES : FAILD\n' +
      '-----------------------------------------------------------\n' +
      'Reason: NE did not respond within timeout window (30s)\n' +
      'Error Code: TIMEOUT_NO_ACK\n' +
      '-----------------------------------------------------------\n' +
      'Count = 0\n;'
  },
  { id: 'r4', neName: 'eNB_1278_eFemto', neId: 'eNB_1278', commandName: 'CHG-ANR-SCHED', requestTime: '09/02/2026 ; 12:32', respondTime: '09/02/2026 ; 12:32', result: 'Completed',
    rawResponse:
      '[ eNB_1278_eFemto ] CHG-ANR-SCHED_STATE-"Active",Day="Everyday", Hour="6", Minute="0", Duration="18";\n' +
      'eNB_1278_eFemto   wed 09/02/2026 ; 12:32\n' +
      'M2878 CHANGE SON ANR FUNCTION SCHEDULES : COMPLD\n' +
      '-----------------------------------------------------------\n' +
      'ANR_STATE            DAY               Hour   Minute  Duration\n' +
      '-----------------------------------------------------------\n' +
      'Active => Active      Everyday          6 => 6   0 => 0   18 => 18\n' +
      '-----------------------------------------------------------\n' +
      'Count = 1\n;'
  },
  { id: 'r5', neName: 'eNB_1278_eFemto', neId: 'eNB_1278', commandName: 'CHG-ANR-SCHED', requestTime: '09/02/2026 ; 12:32', respondTime: '09/02/2026 ; 12:32', result: 'Completed',
    rawResponse:
      '[ eNB_1278_eFemto ] CHG-ANR-SCHED_STATE-"Active",Day="Tuesday", Hour="10", Minute="30", Duration="8";\n' +
      'eNB_1278_eFemto   wed 09/02/2026 ; 12:32\n' +
      'M2878 CHANGE SON ANR FUNCTION SCHEDULES : COMPLD\n' +
      '-----------------------------------------------------------\n' +
      'ANR_STATE            DAY               Hour   Minute  Duration\n' +
      '-----------------------------------------------------------\n' +
      'Active => Active      Tuesday => Tuesday 10 => 10 30 => 30  8 => 8\n' +
      '-----------------------------------------------------------\n' +
      'Count = 1\n;'
  },
  { id: 'r6', neName: 'eNB_1278_eFemto', neId: 'eNB_1278', commandName: 'CHG-ANR-SCHED', requestTime: '09/02/2026 ; 12:32', respondTime: '09/02/2026 ; 12:32', result: 'Completed',
    rawResponse:
      '[ eNB_1278_eFemto ] CHG-ANR-SCHED_STATE-"Active",Day="Wednesday", Hour="14", Minute="0", Duration="4";\n' +
      'eNB_1278_eFemto   wed 09/02/2026 ; 12:32\n' +
      'M2878 CHANGE SON ANR FUNCTION SCHEDULES : COMPLD\n' +
      '-----------------------------------------------------------\n' +
      'ANR_STATE            DAY               Hour   Minute  Duration\n' +
      '-----------------------------------------------------------\n' +
      'Active => Active      Wednesday => Wednesday 14 => 14 0 => 0   4 => 4\n' +
      '-----------------------------------------------------------\n' +
      'Count = 1\n;'
  },
  { id: 'r7', neName: 'eNB_1278_eFemto', neId: 'eNB_1278', commandName: 'CHG-ANR-SCHED', requestTime: '09/02/2026 ; 12:32', respondTime: '09/02/2026 ; 12:32', result: 'Completed',
    rawResponse:
      '[ eNB_1278_eFemto ] CHG-ANR-SCHED_STATE-"Active",Day="Everyday", Hour="0", Minute="0", Duration="24";\n' +
      'eNB_1278_eFemto   wed 09/02/2026 ; 12:32\n' +
      'M2878 CHANGE SON ANR FUNCTION SCHEDULES : COMPLD\n' +
      '-----------------------------------------------------------\n' +
      'ANR_STATE            DAY               Hour   Minute  Duration\n' +
      '-----------------------------------------------------------\n' +
      'Active => Active      Everyday          0 => 0   0 => 0   24 => 24\n' +
      '-----------------------------------------------------------\n' +
      'Count = 1\n;'
  }
];

export const PARENT_EMS_OPTIONS = [
  'EMS-Mumbai-01', 'EMS-Vikaspuri-02', 'EMS-Vikaspuri-03', 'EMS-Vikaspuri-04',
  'EMS-Vikaspuri-05', 'EMS-Vikaspuri-06', 'EMS-Vikaspuri-07', 'EMS-Vikaspuri-08'
];

@Injectable({ providedIn: 'root' })
export class UcemService {
  readonly circles = signal<CircleGroup[]>(MOCK_CIRCLES);
  readonly selectedNeId = signal<string | null>(null);
  readonly favourites = signal<Set<string>>(new Set());
  readonly showFavouritesOnly = signal(false);
  readonly searchTerm = signal('');

  readonly category = signal<string | null>(null);
  readonly commandId = signal<string | null>(null);
  readonly paramValues = signal<Record<string, string | number>>({});

  readonly rows = signal<ExecutionRow[]>(MOCK_ROWS);
  readonly expandedRowId = signal<string | null>('r1');
  readonly page = signal(2);
  readonly pageSize = signal(7);
  readonly totalPages = signal(10);

  readonly batch = signal<BatchItem[]>([]);

  readonly filterDialogOpen = signal(false);
  readonly selectedParentEms = signal<Set<string>>(new Set(PARENT_EMS_OPTIONS));

  readonly nodeInfoNeId = signal<string | null>(null);

  readonly refreshing = signal(false);
  readonly isResponseFullscreen = signal(false);
  readonly responseMenuOpen = signal(false);

  readonly allNes = computed(() => this.circles().flatMap(c => c.nes));

  readonly filteredCircles = computed<CircleGroup[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const favOnly = this.showFavouritesOnly();
    const favs = this.favourites();

    return this.circles().map(group => {
      let nes = group.nes;
      if (term) nes = nes.filter(n => n.label.toLowerCase().includes(term));
      if (favOnly) nes = nes.filter(n => favs.has(n.id));
      return { ...group, nes };
    }).filter(g => !this.showFavouritesOnly() || g.nes.length > 0);
  });

  readonly selectedNe = computed<NeItem | null>(() => {
    const id = this.selectedNeId();
    if (!id) return null;
    return this.allNes().find(n => n.id === id) ?? null;
  });

  readonly categories: ('Config' | 'Control')[] = ['Config', 'Control'];

  readonly commandsForCategory = computed<CommandDef[]>(() => {
    const cat = this.category();
    return cat ? COMMANDS.filter(c => c.category === cat) : [];
  });

  readonly selectedCommand = computed<CommandDef | null>(() => {
    const id = this.commandId();
    return id ? (COMMANDS.find(c => c.id === id) ?? null) : null;
  });

  readonly nodeInfoNe = computed<NeItem | null>(() => {
    const id = this.nodeInfoNeId();
    return id ? (this.allNes().find(n => n.id === id) ?? null) : null;
  });

  toggleCircle(name: string): void {
    this.circles.update(list => list.map(g => g.name === name ? { ...g, expanded: !g.expanded } : g));
  }

  selectNe(id: string): void {
    this.selectedNeId.set(id);
  }

  toggleFavourite(id: string, event?: Event): void {
    event?.stopPropagation();
    this.favourites.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  setCategory(cat: string): void {
    this.category.set(cat);
    this.commandId.set(null);
    this.paramValues.set({});
  }

  setCommand(id: string): void {
    this.commandId.set(id);
    const cmd = COMMANDS.find(c => c.id === id);
    if (cmd) {
      const defaults: Record<string, string | number> = {};
      cmd.parameters.forEach(p => defaults[p.key] = p.default);
      this.paramValues.set(defaults);
    }
  }

  updateParam(key: string, value: string | number): void {
    this.paramValues.update(v => ({ ...v, [key]: value }));
  }

  resetToDefault(): void {
    const cmd = this.selectedCommand();
    if (!cmd) return;
    const defaults: Record<string, string | number> = {};
    cmd.parameters.forEach(p => defaults[p.key] = p.default);
    this.paramValues.set(defaults);
  }

  eraseParams(): void {
    const cmd = this.selectedCommand();
    if (!cmd) return;
    const cleared: Record<string, string | number> = {};
    cmd.parameters.forEach(p => cleared[p.key] = p.type === 'number' ? 0 : '');
    this.paramValues.set(cleared);
  }

  loadRecent(): void {
    // Simulated "last used" values
    const cmd = this.selectedCommand();
    if (!cmd) return;
    if (cmd.id === 'CHG-ANR-SCHED') {
      this.paramValues.set({ Cell_Num: 3, ANR_State: 'Inactive', Day: 'Sunday', Hour: '0' });
    }
  }

  addToBatch(): void {
    const ne = this.selectedNe();
    const cmd = this.selectedCommand();
    if (!ne || !cmd) return;
    const summary = Object.entries(this.paramValues()).map(([k, v]) => `${k}=${v}`).join(', ');
    this.batch.update(list => [...list, {
      id: `b${Date.now()}`,
      neLabel: ne.label,
      commandName: cmd.label,
      paramsSummary: summary
    }]);
  }

  removeFromBatch(id: string): void {
    this.batch.update(list => list.filter(b => b.id !== id));
  }

  execute(): void {
    const ne = this.selectedNe();
    const cmd = this.selectedCommand();
    if (!ne || !cmd) return;

    const now = new Date();
    const stamp = now.toLocaleDateString('en-GB').split('/').join('/') + ' ; ' +
      now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const id = `r${Date.now()}`;
    const anrState = this.paramValues()['ANR_State'];
    const staysRunning = anrState === 'Inactive';

    const newRow: ExecutionRow = {
      id,
      neName: ne.label,
      neId: ne.details.nodeId,
      commandName: cmd.label,
      requestTime: stamp,
      respondTime: stamp,
      result: 'Running'
    };

    this.rows.update(list => [newRow, ...list]);

    // While ANR_State is Inactive, the command stays "Running" indefinitely.
    // It only resolves to Completed/Failed once ANR_State is Active.
    if (staysRunning) return;

    setTimeout(() => {
      const success = Math.random() > 0.2;
      this.rows.update(list => list.map(r => r.id === id
        ? {
            ...r,
            result: success ? 'Completed' : 'Failed',
            rawResponse: success
              ? `[ ${ne.label} ] ${cmd.label} executed with parameters: ` +
                Object.entries(this.paramValues()).map(([k, v]) => `${k}="${v}"`).join(', ') +
                `;\n${ne.label}   ${stamp}\nM2878 COMMAND EXECUTION : COMPLD\nCount = 1\n;`
              : undefined
          }
        : r));
    }, 1400);
  }

  toggleRowExpand(id: string): void {
    this.expandedRowId.update(current => current === id ? null : id);
  }

  openFilterDialog(): void { this.filterDialogOpen.set(true); }
  closeFilterDialog(): void { this.filterDialogOpen.set(false); }

  toggleParentEms(name: string): void {
    this.selectedParentEms.update(set => {
      const next = new Set(set);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  toggleAllParentEms(checked: boolean): void {
    this.selectedParentEms.set(checked ? new Set(PARENT_EMS_OPTIONS) : new Set());
  }

  refreshResponses(): void {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    setTimeout(() => this.refreshing.set(false), 700);
  }

  downloadResponses(): void {
    const rows = this.rows();
    const header = ['NE Name', 'NE ID', 'Command Name', 'Request Time', 'Respond Time', 'Result'];
    const lines = [header.join(',')].concat(
      rows.map(r => [r.neName, r.neId, r.commandName, r.requestTime, r.respondTime, r.result]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ucem-response.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  toggleResponseFullscreen(): void {
    this.isResponseFullscreen.update(v => !v);
  }

  toggleResponseMenu(event?: Event): void {
    event?.stopPropagation();
    this.responseMenuOpen.update(v => !v);
  }

  closeResponseMenu(): void {
    this.responseMenuOpen.set(false);
  }

  clearResponses(): void {
    this.rows.set([]);
    this.expandedRowId.set(null);
    this.responseMenuOpen.set(false);
  }

  openNodeInfo(id: string, event?: Event): void {
    event?.stopPropagation();
    this.nodeInfoNeId.set(id);
  }

  closeNodeInfo(): void { this.nodeInfoNeId.set(null); }
}