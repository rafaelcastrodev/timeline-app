export class RecordNotFoundError extends Error {
  // Not named 'NotFoundError': Dexie rewraps errors whose name matches a DOMException name.
  constructor(entity: 'timeline' | 'node', id: string) {
    super(`${entity} not found: ${id}`)
    this.name = 'RecordNotFoundError'
  }
}

export class InvalidReorderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidReorderError'
  }
}
