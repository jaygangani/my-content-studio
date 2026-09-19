/** Typed envelope returned by the HTTP client. */
export interface ApiResponse<T> {
  data: T
  status: number
}

/** Generic API error raised by the HTTP client. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}