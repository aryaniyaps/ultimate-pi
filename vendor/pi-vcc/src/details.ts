export interface PiVccCompactionDetails {
  compactor: "pi-vcc" | "ultimate-pi-vcc";
  version: number;
  sections: string[];
  sourceMessageCount: number;
  previousSummaryUsed: boolean;
}
