/** Globales de compatibilidad (los módulos legados y bundles clásicos las esperan en `window`). Único lugar donde se publican; no duplican instancias. */
import { DataRepository } from '../repositories/data-repository';
import { DocStore } from '../repositories/doc-store';
import { PersonName } from '../services/person-name';
import { XLSXLite } from '../services/xlsx/xlsx-lite';
const w = window as unknown as Record<string, unknown>;
w.XLSXLite = XLSXLite; w.PersonName = PersonName; w.DocStore = DocStore; w.DataRepository = DataRepository; w.BackupStore = DataRepository;
