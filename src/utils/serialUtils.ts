import { OrganizerItem, CanvasNode } from '../types/orchestrator';

/**
 * Returns type letter prefix for serial numbers:
 *   - kanban -> 'c' (as requested)
 *   - tool -> 't'
 *   - app -> 'a'
 *   - project -> 'p'
 *   - resource -> 'r'
 *   - note -> 'n'
 *   - pipeline -> 'pl'
 *   - script -> 's'
 *   - api -> 'api'
 */
export const getTypePrefix = (type?: string): string => {
  if (!type) return 'i';
  switch (type.toLowerCase()) {
    case 'kanban': return 'c';
    case 'tool': return 't';
    case 'app': return 'a';
    case 'project': return 'p';
    case 'resource': return 'r';
    case 'note': return 'n';
    case 'pipeline': return 'pl';
    case 'script': return 's';
    case 'api': return 'api';
    case 'default': return 'd';
    default: return 'i';
  }
};

/**
 * Strips 'SN-', leading zeros before main digits, and formats cleanly.
 * Examples:
 *   "SN-01" -> "1"
 *   "1c6"   -> "1c6"
 *   "2t1"   -> "2t1"
 */
export const cleanSerialNumber = (str?: string | number): string => {
  if (str === undefined || str === null || str === '') return '1';
  let raw = String(str).trim();
  // Strip "SN-" or "sn-" prefix
  raw = raw.replace(/^sn[-_\s]*/i, '');
  // Strip leading zeros if followed by numbers
  raw = raw.replace(/^0+(?=\d)/, '');
  return raw || '1';
};

/**
 * Generates a board-prefixed, type-lettered serial number for a canvas node.
 * Formula: `${canvasNumber}${typePrefix}${sequenceNumber}`
 * Example for Board 1 (index 0) with a Kanban node (6th node): "1c6"
 * Example for Board 2 (index 1) with a Tool node (1st node): "2t1"
 */
export const generateCanvasNodeSerialNumber = (
  type: string,
  existingNodesCount: number,
  boardIndex: number = 0
): string => {
  const canvasNum = boardIndex + 1;
  const prefix = getTypePrefix(type);
  const seq = existingNodesCount + 1;
  return `${canvasNum}${prefix}${seq}`;
};

/**
 * Resolves duplicate serial numbers by appending an alphabetical suffix ('a', 'b', 'c'...).
 */
export const resolveSerialNumberConflict = (
  desiredSN: string | number,
  existingList: Array<{ id?: string; serialNumber?: string }>,
  currentId?: string
): string => {
  const clean = cleanSerialNumber(desiredSN);
  const taken = new Set(
    existingList
      .filter((item) => !currentId || item.id !== currentId)
      .map((item) => cleanSerialNumber(item.serialNumber).toLowerCase())
  );

  if (!taken.has(clean.toLowerCase())) {
    return clean;
  }

  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < 26; i++) {
    const candidate = `${clean}${letters[i]}`;
    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${clean}a`;
};

/**
 * Deduplicates serial numbers across items.
 */
export const deduplicateSerialNumbers = <T extends { id?: string; serialNumber?: string }>(
  items: T[]
): T[] => {
  const seenCounts = new Map<string, number>();
  const letters = 'abcdefghijklmnopqrstuvwxyz';

  return items.map((item, idx) => {
    const raw = item.serialNumber ? cleanSerialNumber(item.serialNumber) : String(idx + 1);
    const count = seenCounts.get(raw.toLowerCase()) || 0;
    seenCounts.set(raw.toLowerCase(), count + 1);

    if (count === 0) {
      return { ...item, serialNumber: raw };
    } else {
      const suffixIdx = count - 1;
      const suffix = suffixIdx < 26 ? letters[suffixIdx] : `a${letters[suffixIdx % 26]}`;
      return { ...item, serialNumber: `${raw}${suffix}` };
    }
  });
};

/**
 * Natural comparison supporting structured serial numbers (e.g., 1t1 < 1t2 < 1c6 < 2t1).
 */
export const compareSerialNumbers = (snA?: string, snB?: string): number => {
  const cleanA = cleanSerialNumber(snA);
  const cleanB = cleanSerialNumber(snB);

  return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Calculates the next continuous serial number based on currently existing items.
 * Generates continuous sequential numbers (1, 2, 3...) rather than
 * retaining gaps or jumping to high historical numbers.
 */
export const getNextSerialNumber = (items: Array<{ serialNumber?: string }> = []): string => {
  if (!items || items.length === 0) {
    return '1';
  }

  // Collect all valid positive integers currently active in the items list
  const existingNumbers = new Set<number>();
  items.forEach((item) => {
    if (item.serialNumber) {
      const clean = cleanSerialNumber(item.serialNumber);
      const val = parseInt(clean, 10);
      if (!isNaN(val) && val > 0 && String(val) === clean) {
        existingNumbers.add(val);
      }
    }
  });

  // Check if any numbers from 1 to items.length are missing (fill gaps continuously)
  for (let i = 1; i <= items.length; i++) {
    if (!existingNumbers.has(i)) {
      return String(i);
    }
  }

  // If 1 through items.length are all present, the continuous next number is items.length + 1
  let continuousSeq = items.length + 1;
  while (existingNumbers.has(continuousSeq)) {
    continuousSeq++;
  }

  return String(continuousSeq);
};

/**
 * Ensures all organizer items have strictly unique IDs.
 */
export const ensureUniqueItemIds = (items: OrganizerItem[]): OrganizerItem[] => {
  const seen = new Set<string>();
  return items.map((item, idx) => {
    let id = item.id || `item-${Date.now()}-${idx}`;
    if (seen.has(id)) {
      id = `${id}-dup-${idx}-${Math.random().toString(36).substring(2, 7)}`;
    }
    seen.add(id);
    return { ...item, id };
  });
};

/**
 * Ensures all organizer items have clean serial numbers.
 */
export const ensureItemSerialNumbers = (
  items: OrganizerItem[],
  initialItems: OrganizerItem[] = []
): OrganizerItem[] => {
  const uniqueItems = ensureUniqueItemIds(items);
  const cleaned = uniqueItems.map((item, idx) => {
    if (item.serialNumber && item.serialNumber.trim()) {
      return { ...item, serialNumber: cleanSerialNumber(item.serialNumber) };
    }
    const match = initialItems.find(
      (init) => init.id === item.id || init.name.toLowerCase() === item.name.toLowerCase()
    );
    if (match?.serialNumber) {
      return { ...item, serialNumber: cleanSerialNumber(match.serialNumber) };
    }
    return { ...item, serialNumber: String(idx + 1) };
  });

  return deduplicateSerialNumbers(cleaned);
};

/**
 * Calculates the next unique, synchronized continuous serial number for a canvas node on a board.
 * Format: `${canvasNum}${typePrefix}${seq}`
 * Where canvasNum is boardIndex + 1, prefix is type letter, and seq is continuous
 * and guaranteed not to conflict with any existing node on the board.
 */
export const getNextBoardNodeSerialNumber = (
  type: string,
  existingNodes: CanvasNode[] = [],
  boardIndex: number = 0
): string => {
  const canvasNum = boardIndex + 1;
  const prefix = getTypePrefix(type);

  // Collect all taken sequence numbers and full serial numbers on this board
  const takenSequences = new Set<number>();
  const takenExactSNs = new Set<string>();

  existingNodes.forEach((node) => {
    if (node.serialNumber) {
      const sn = node.serialNumber.trim().toLowerCase();
      takenExactSNs.add(sn);

      // Match pattern like "1n7", "1t1", "2c3", "1api5", etc.
      const match = sn.match(/^(\d+)[a-z]+(\d+)$/i);
      if (match) {
        const bNum = parseInt(match[1], 10);
        const sNum = parseInt(match[2], 10);
        if (bNum === canvasNum && !isNaN(sNum) && sNum > 0) {
          takenSequences.add(sNum);
        }
      } else {
        const num = parseInt(sn, 10);
        if (!isNaN(num) && num > 0 && String(num) === sn) {
          takenSequences.add(num);
        }
      }
    }
  });

  // Find the smallest continuous sequence number >= 1 not currently taken
  let nextSeq = 1;
  while (
    takenSequences.has(nextSeq) ||
    takenExactSNs.has(`${canvasNum}${prefix}${nextSeq}`.toLowerCase())
  ) {
    nextSeq++;
  }

  return `${canvasNum}${prefix}${nextSeq}`;
};

/**
 * Synchronizes and deduplicates all node serial numbers on a board:
 * - Guarantees every node has a clean, board-prefixed serial number.
 * - Resolves any duplicates and sequence conflicts so the same serial number never appears multiple times.
 * - Maintains synchronized continuous sequential numbering across the board.
 */
export const deduplicateBoardNodeSerialNumbers = (
  nodes: CanvasNode[],
  boardIndex: number = 0
): CanvasNode[] => {
  const canvasNum = boardIndex + 1;
  const seenSNs = new Set<string>();
  const usedSequences = new Set<number>();

  return nodes.map((node, idx) => {
    let sn = node.serialNumber?.trim();
    const prefix = getTypePrefix(node.type);

    let needsNewSN = false;
    let sNum: number | null = null;

    if (!sn || sn.toLowerCase() === 'sn-01' || sn.toLowerCase() === '1') {
      needsNewSN = true;
    } else if (seenSNs.has(sn.toLowerCase())) {
      needsNewSN = true;
    } else {
      const match = sn.match(/^(\d+)[a-z]+(\d+)$/i);
      if (match) {
        const bNum = parseInt(match[1], 10);
        const seq = parseInt(match[2], 10);
        if (bNum === canvasNum && !isNaN(seq) && seq > 0) {
          if (usedSequences.has(seq)) {
            needsNewSN = true;
          } else {
            sNum = seq;
          }
        } else {
          // Board index mismatch, needs synchronization
          needsNewSN = true;
        }
      } else {
        needsNewSN = true;
      }
    }

    if (needsNewSN) {
      let candidateSeq = idx + 1;
      while (
        usedSequences.has(candidateSeq) ||
        seenSNs.has(`${canvasNum}${prefix}${candidateSeq}`.toLowerCase())
      ) {
        candidateSeq++;
      }
      sn = `${canvasNum}${prefix}${candidateSeq}`;
      usedSequences.add(candidateSeq);
      seenSNs.add(sn.toLowerCase());
      return { ...node, serialNumber: sn };
    }

    if (sNum !== null) {
      usedSequences.add(sNum);
    }
    const safeSN = sn || `${canvasNum}${prefix}${idx + 1}`;
    seenSNs.add(safeSN.toLowerCase());
    return { ...node, serialNumber: safeSN };
  });
};

/**
 * Ensures all canvas nodes on a specific board have board-prefixed & type-lettered serial numbers:
 * Canvas 1: 1t1, 1t2, 1t3, 1t4, 1a5, 1c6...
 * Canvas 2: 2c1, 2t2, 2a3...
 */
export const ensureNodeSerialNumbers = (
  nodes: CanvasNode[],
  organizerItems: OrganizerItem[] = [],
  boardIndex: number = 0
): CanvasNode[] => {
  const canvasNum = boardIndex + 1;
  return nodes.map((node, idx) => {
    const seq = idx + 1;
    const prefix = getTypePrefix(node.type);
    const canvasSN = `${canvasNum}${prefix}${seq}`;
    return {
      ...node,
      serialNumber: canvasSN,
    };
  });
};
