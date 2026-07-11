import { Scan } from '../models/Scan.js';

export class ScanRepository {
  create(data: Record<string, unknown>) { return Scan.create(data); }
  list(filter: Record<string, unknown>) { return Scan.find(filter).sort({ scannedAt: -1 }).limit(200); }
  findById(id: string) { return Scan.findById(id); }
  pipelines(filter: Record<string, unknown>) { return Scan.aggregate([{ $match: filter }, { $group: { _id: '$pipeline', scans: { $sum: 1 }, latestScan: { $max: '$scannedAt' }, critical: { $sum: '$summary.critical' }, high: { $sum: '$summary.high' }, totalFindings: { $sum: '$summary.total' } } }, { $sort: { latestScan: -1 } }]); }
  overview(filter: Record<string, unknown>) { return Scan.aggregate([{ $match: filter }, { $group: { _id: null, scans: { $sum: 1 }, critical: { $sum: '$summary.critical' }, high: { $sum: '$summary.high' }, medium: { $sum: '$summary.medium' }, low: { $sum: '$summary.low' }, totalFindings: { $sum: '$summary.total' } } }]); }
}
