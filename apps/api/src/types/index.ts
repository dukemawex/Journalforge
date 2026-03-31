// apps/api/src/types/index.ts

export interface DocumentContent {
  rawText: string;
  headings: string[];
  equations: string[];
  referencesBlock: string;
  filePath: string;
  fileType: 'docx' | 'pdf';
}

// ---- Parser stage output ----

export interface AuthorMetadata {
  name: string;
  affiliations: number[];
  corresponding: boolean;
  email: string | null;
  orcid: string | null;
}

export interface AffiliationMetadata {
  index: number;
  institution: string;
  department: string | null;
  city: string;
  country: string;
}

export interface AbstractMetadata {
  text: string;
  word_count: number;
  within_limit: boolean;
}

export interface Metadata {
  title: string;
  running_title: string | null;
  authors: AuthorMetadata[];
  affiliations: AffiliationMetadata[];
  abstract: AbstractMetadata;
  keywords: string[];
  highlights: (string | null)[];
}

export interface ContentBlock {
  type: 'paragraph' | 'equation';
  content: string;
  equation_label: string | null;
  latex: string | null;
}

export interface Section {
  id: string;
  heading: string;
  level: number;
  content_blocks: ContentBlock[];
  subsections: Section[];
}

export interface Body {
  sections: Section[];
}

export interface Figure {
  number: number;
  caption: string;
  file_reference: string | null;
  inline_position: string;
}

export interface Table {
  number: number;
  caption: string;
  content: string;
  inline_position: string;
}

export interface ParsedReference {
  authors: string[];
  year: string;
  title: string;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  type: string;
}

export interface Reference {
  id: string;
  raw: string;
  parsed: ParsedReference;
  formatted_hj: string | null;
}

export interface FormattingIssue {
  type: string;
  location: string;
  description: string;
  severity: 'blocking' | 'warning' | 'info';
}

export interface ParsedDocument {
  metadata: Metadata;
  body: Body;
  figures: Figure[];
  tables: Table[];
  references: Reference[];
  formatting_issues: FormattingIssue[];
}

// ---- Formatter stage output ----

export interface FormattedMetadata {
  title: string;
  running_title: string;
  authors_string: string;
  affiliations_formatted: string[];
  abstract: string;
  abstract_word_count: number;
  keywords: string[];
  highlights: string[];
}

export interface FormattedSection {
  heading: string;
  level: number;
  content: string;
}

export interface FormattedEquation {
  number: number;
  label: string;
  latex: string;
  display_type: string;
}

export interface FormattedReference {
  citekey: string;
  formatted: string;
}

export interface ComplianceIssue {
  field: string;
  issue: string;
  action_required: string;
}

export interface ComplianceWarning {
  field: string;
  issue: string;
  suggestion: string;
}

export interface ComplianceAutoFixed {
  field: string;
  original: string;
  fixed: string;
}

export interface ComplianceReport {
  passed: boolean;
  blocking_issues: ComplianceIssue[];
  warnings: ComplianceWarning[];
  auto_fixed: ComplianceAutoFixed[];
}

export interface FormattedDocument {
  formatted_metadata: FormattedMetadata;
  formatted_sections: FormattedSection[];
  formatted_equations: FormattedEquation[];
  formatted_references: FormattedReference[];
  compliance_report: ComplianceReport;
}

// ---- Assembler stage output ----

export interface SetPageLayoutAction {
  type: 'set_page_layout';
  paper: 'A4';
  margins_cm: number;
  line_spacing: number;
}

export interface AddLineNumberingAction {
  type: 'add_line_numbering';
  mode: 'continuous';
}

export interface AddTitleAction {
  type: 'add_title';
  content: string;
  font_size: number;
  bold: boolean;
  alignment: string;
}

export interface AddAuthorLineAction {
  type: 'add_author_line';
  content: string;
  font_size: number;
  alignment: string;
}

export interface AddAffiliationAction {
  type: 'add_affiliation';
  content: string;
  index: number;
  font_size: number;
  alignment: string;
}

export interface AddCorrespondingAction {
  type: 'add_corresponding';
  content: string;
  font_size: number;
  alignment: string;
}

export interface AddSectionHeadingAction {
  type: 'add_section_heading';
  content: string;
  level: number;
  font_size: number;
  bold: boolean;
  italic: boolean;
  alignment: string;
}

export interface AddMetadataLabelAction {
  type: 'add_metadata_label';
  content: string;
  bold: boolean;
  font_size: number;
}

export interface AddParagraphAction {
  type: 'add_paragraph';
  content: string;
  font_size: number;
  alignment: string;
}

export interface AddDisplayEquationAction {
  type: 'add_display_equation';
  latex: string;
  label: string;
  font_size: number;
}

export interface AddFigurePlaceholderAction {
  type: 'add_figure_placeholder';
  number: number;
  caption: string;
  font_size: number;
}

export interface AddTablePlaceholderAction {
  type: 'add_table_placeholder';
  number: number;
  caption: string;
  font_size: number;
}

export interface AddSectionBreakAction {
  type: 'add_section_break';
  break_type: string;
}

export interface AddReferenceEntryAction {
  type: 'add_reference_entry';
  content: string;
  font_size: number;
  hanging_indent_cm: number;
}

export type AssemblyAction =
  | SetPageLayoutAction
  | AddLineNumberingAction
  | AddTitleAction
  | AddAuthorLineAction
  | AddAffiliationAction
  | AddCorrespondingAction
  | AddSectionHeadingAction
  | AddMetadataLabelAction
  | AddParagraphAction
  | AddDisplayEquationAction
  | AddFigurePlaceholderAction
  | AddTablePlaceholderAction
  | AddSectionBreakAction
  | AddReferenceEntryAction;

export type AssemblyActionList = AssemblyAction[];

// ---- Job types (shared with frontend) ----

export type JobStatusEnum =
  | 'PENDING'
  | 'PARSING'
  | 'FORMATTING'
  | 'ASSEMBLING'
  | 'COMPLETE'
  | 'FAILED';

export interface JobRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: JobStatusEnum;
  manuscriptPath: string;
  journalSpecPath: string;
  outputPath: string | null;
  errorMessage: string | null;
  complianceReport: ComplianceReport | null;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  downloadReady: boolean;
}
