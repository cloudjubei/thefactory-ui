/** A `data:` URI taken apart: its media type and its body, still in the encoding it came in. */
export type ParsedDataUri = {
  mediaType: string
  encoding: 'base64' | 'utf8'
  data: string
}
