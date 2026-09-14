/**
 * Oriented-Direct (ospc) Safety Subsystem
 * Version: 2.0.0 (ClandleLoop)
 * Strictly zero emojis.
 */

export {
  NullState,
  NullLattice,
  TypeShape,
  AbstractEnvironment
} from './abstract_domain.js';

export {
  DiagnosticFormatter,
  CompilerDiagnosticFormatter,
  DiagnosticLevel,
  SourceSpan
} from './diagnostic_formatter.js';

export {
  SafetyAnalyzer
} from './safety_analyzer.js';

export {
  SAFETY_ERROR_CATALOG,
  getCatalogEntry
} from './error_catalog.js';

import { NullState, NullLattice, TypeShape, AbstractEnvironment } from './abstract_domain.js';
import { DiagnosticFormatter, CompilerDiagnosticFormatter, DiagnosticLevel, SourceSpan } from './diagnostic_formatter.js';
import { SafetyAnalyzer } from './safety_analyzer.js';
import { SAFETY_ERROR_CATALOG, getCatalogEntry } from './error_catalog.js';

export default {
  NullState,
  NullLattice,
  TypeShape,
  AbstractEnvironment,
  DiagnosticFormatter,
  CompilerDiagnosticFormatter,
  DiagnosticLevel,
  SourceSpan,
  SafetyAnalyzer,
  SAFETY_ERROR_CATALOG,
  getCatalogEntry
};
