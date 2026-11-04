import {
  TIMELINE_FILE_FORMAT,
  TIMELINE_FILE_SCHEMA_VERSION,
  timelineFileSchema,
  type TimelineFile,
} from '@/types/transfer'

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024
const MAX_LISTED_ISSUES = 3

/** The file cannot be imported. `message` is meant for the user. */
export class InvalidImportFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidImportFileError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>(
    (result, key) =>
      typeof key === 'number'
        ? `${result}[${key}]`
        : result
          ? `${result}.${String(key)}`
          : String(key),
    '',
  )
}

function describeIssues(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): string {
  const listed = issues
    .slice(0, MAX_LISTED_ISSUES)
    .map((issue) =>
      issue.path.length ? `${formatPath(issue.path)}: ${issue.message}` : issue.message,
    )
  const more = issues.length - listed.length
  if (more > 0) listed.push(`and ${more} more ${more === 1 ? 'problem' : 'problems'}`)
  return listed.join('; ')
}

/** Validates parsed JSON as an export file. Throws `InvalidImportFileError` with a readable message. */
export function parseTimelineJson(data: unknown): TimelineFile {
  if (!isRecord(data) || data.format !== TIMELINE_FILE_FORMAT) {
    throw new InvalidImportFileError('This file is not a Timeline App export.')
  }
  if (data.schema_version !== TIMELINE_FILE_SCHEMA_VERSION) {
    const version =
      typeof data.schema_version === 'number' ? ` (schema version ${data.schema_version})` : ''
    throw new InvalidImportFileError(
      `This export format${version} is not supported. Supported schema version: ${TIMELINE_FILE_SCHEMA_VERSION}.`,
    )
  }
  const result = timelineFileSchema.safeParse(data)
  if (!result.success) {
    throw new InvalidImportFileError(`The file is invalid: ${describeIssues(result.error.issues)}.`)
  }
  return result.data
}

/**
 * Reads and validates an export file. Files over `MAX_IMPORT_BYTES` are rejected before reading.
 * Throws `InvalidImportFileError` with a readable message.
 */
export async function parseTimelineFile(file: Blob): Promise<TimelineFile> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new InvalidImportFileError('The file is too large. The limit is 10 MB.')
  }
  let text: string
  try {
    text = await file.text()
  } catch {
    throw new InvalidImportFileError('The file could not be read.')
  }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new InvalidImportFileError('The file is not valid JSON.')
  }
  return parseTimelineJson(data)
}
